import dns from "node:dns/promises";
import dnsCallback from "node:dns";
import net from "node:net";
import http from "node:http";
import https from "node:https";
import zlib from "node:zlib";

// SSRF guard. PageSignal fetches user-supplied URLs server-side (raw HTML in
// fetchSiteSignals) and forwards them to the in-network browserless service
// (UX Audit screenshots). normalizeUrl() only checks syntax, so without this a
// caller could point those fetches at loopback, link-local, or private targets
// (e.g. http://127.0.0.1 or the cloud metadata endpoint http://169.254.169.254)
// and reach internal services. We resolve the host and reject any non-public
// address. PageSignal only audits public sites, so this never blocks valid use.

function ipv4ToInt(ip) {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) {
    return null;
  }
  return ((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
}

function inV4Range(int, cidrBase, bits) {
  const base = ipv4ToInt(cidrBase);
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (int & mask) === (base & mask);
}

// RFC 1918 / 5735 / 6598 / 3927 etc. — anything not routable on the public net.
const BLOCKED_V4 = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10], // CGNAT
  ["127.0.0.0", 8], // loopback
  ["169.254.0.0", 16], // link-local (incl. 169.254.169.254 metadata)
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4], // multicast
  ["240.0.0.0", 4], // reserved
];

function isBlockedIpv4(ip) {
  const int = ipv4ToInt(ip);
  if (int === null) {
    return true; // unparseable → treat as unsafe
  }
  return BLOCKED_V4.some(([base, bits]) => inV4Range(int, base, bits));
}

function isBlockedIpv6(ip) {
  // Canonicalize both DNS answers and literals: WHATWG URLs convert dotted
  // IPv4-mapped addresses to hexadecimal before assertPublicUrl sees them.
  const canonical = new URL(`http://[${ip}]/`).hostname.slice(1, -1).toLowerCase();
  const mapped = canonical.match(/^::ffff:([a-f0-9]{1,4}):([a-f0-9]{1,4})$/);
  if (mapped) {
    const high = parseInt(mapped[1], 16);
    const low = parseInt(mapped[2], 16);
    return isBlockedIpv4(`${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`);
  }
  // Accept ordinary global unicast only, excluding documentation and IPv4
  // transition ranges. Private, local, multicast and reserved ranges fail closed.
  return !/^[23]/.test(canonical) || /^2001:(?:db8:|:)/.test(canonical) || /^2002:/.test(canonical);
}

function isBlockedIp(ip) {
  const kind = net.isIP(ip);
  if (kind === 4) {
    return isBlockedIpv4(ip);
  }
  if (kind === 6) {
    return isBlockedIpv6(ip);
  }
  return true; // not a valid IP → unsafe
}

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const MAX_REDIRECTS = 5;
// Bound the downloaded and expanded representations independently so a small
// compressed payload cannot inflate into an unbounded in-memory response.
const MAX_ENCODED_RESPONSE_BYTES = 8 * 1024 * 1024;
const MAX_DECODED_RESPONSE_BYTES = 16 * 1024 * 1024;

// A DNS resolver that re-validates every candidate address AT CONNECTION TIME
// and pins the socket to a vetted one. Because the address the socket connects
// to is the exact address checked here, a hostname that passed the pre-flight
// assertPublicUrl check but then rebinds to a private/link-local target (e.g.
// 169.254.169.254) can no longer slip through the window between validation and
// connection (DNS-rebinding / TOCTOU). Only the connect IP is overridden — the
// original hostname is still used for TLS SNI and certificate verification.
function guardedLookup(hostname, options, callback) {
  const cb = typeof options === "function" ? options : callback;
  const opts = typeof options === "function" ? {} : options || {};

  dnsCallback.lookup(hostname, { ...opts, all: true }, (error, addresses) => {
    if (error) {
      cb(error);
      return;
    }

    const safe = addresses.filter((entry) => !isBlockedIp(entry.address));
    if (!safe.length) {
      cb(new Error("Analyzing private, loopback, or link-local addresses is not allowed."));
      return;
    }

    if (opts.all) {
      cb(null, safe);
    } else {
      cb(null, safe[0].address, safe[0].family);
    }
  });
}

function decodeBody(res, buffer) {
  if (!buffer.length) return Promise.resolve(buffer);

  const encoding = String(res.headers["content-encoding"] || "").toLowerCase();
  const decoder =
    encoding === "gzip" || encoding === "x-gzip"
      ? zlib.gunzip
      : encoding === "deflate"
        ? zlib.inflate
        : encoding === "br"
          ? zlib.brotliDecompress
          : null;

  if (!decoder) return Promise.resolve(buffer);

  return new Promise((resolve, reject) => {
    decoder(buffer, { maxOutputLength: MAX_DECODED_RESPONSE_BYTES }, (error, decoded) => {
      if (error) {
        if (error.code === "ERR_BUFFER_TOO_LARGE") {
          reject(new Error("Response exceeded the 16 MiB decompressed limit."));
          return;
        }
        reject(error);
        return;
      }
      resolve(decoded);
    });
  });
}

function tlsEvidence(socket) {
  if (!socket || typeof socket.getPeerCertificate !== "function") {
    return null;
  }

  const certificate = socket.getPeerCertificate();
  return {
    authorized: socket.authorized !== false,
    authorizationError: socket.authorizationError || "",
    protocol: typeof socket.getProtocol === "function" ? socket.getProtocol() || "" : "",
    validFrom: certificate?.valid_from || "",
    validTo: certificate?.valid_to || "",
    subjectaltname: certificate?.subjectaltname || "",
    fingerprint256: certificate?.fingerprint256 || "",
  };
}

// Performs ONE request (no automatic redirect following) over node's http/https
// transport so we can install guardedLookup at the socket layer. Returns a
// minimal Response-compatible shim covering what callers use.
function requestOnce(rawUrl, init) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const resolveOnce = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    const rejectOnce = (error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };

    let parsed;
    try {
      parsed = new URL(rawUrl);
    } catch {
      rejectOnce(new Error("Enter a valid URL."));
      return;
    }

    const transport = parsed.protocol === "https:" ? https : http;
    const request = transport.request(
      parsed,
      {
        method: init.method || "GET",
        headers: { "accept-encoding": "gzip, deflate, br", ...init.headers },
        lookup: guardedLookup,
        signal: init.signal,
      },
      (res) => {
        const chunks = [];
        let receivedBytes = 0;
        res.on("data", (chunk) => {
          if (settled) return;
          const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          receivedBytes += buffer.length;
          if (receivedBytes > MAX_ENCODED_RESPONSE_BYTES) {
            const error = new Error("Response exceeded the 8 MiB download limit.");
            rejectOnce(error);
            res.destroy(error);
            return;
          }
          chunks.push(buffer);
        });
        res.on("end", async () => {
          if (settled) return;
          try {
            const body = await decodeBody(res, Buffer.concat(chunks));
            resolveOnce({
              ok: res.statusCode >= 200 && res.statusCode < 300,
              status: res.statusCode,
              statusText: res.statusMessage || "",
              headers: { get: (name) => res.headers[String(name).toLowerCase()] ?? null },
              tls: tlsEvidence(res.socket),
              text: async () => body.toString("utf8"),
              arrayBuffer: async () => body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength),
            });
          } catch (error) {
            rejectOnce(error);
          }
        });
        res.on("error", rejectOnce);
      }
    );

    request.on("error", rejectOnce);
    if (init.body) {
      request.write(init.body);
    }
    request.end();
  });
}

// SSRF-safe fetch for user-supplied URLs. Follows redirects MANUALLY and
// re-runs assertPublicUrl on every hop, AND re-validates the resolved address
// at connection time via guardedLookup, so neither a redirect nor a DNS rebind
// to a private/link-local target (e.g. 169.254.169.254) can reach the network.
export async function guardedFetch(rawUrl, init = {}) {
  let current = rawUrl;
  const redirects = [];

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    await assertPublicUrl(current);
    const response = await requestOnce(current, init);

    if (!REDIRECT_STATUSES.has(response.status)) {
      return { response, finalUrl: current, redirects };
    }

    const location = response.headers.get("location");
    if (!location) {
      return { response, finalUrl: current, redirects };
    }

    try {
      const nextUrl = new URL(location, current).toString();
      redirects.push({ from: current, to: nextUrl, status: response.status });
      current = nextUrl;
    } catch {
      throw new Error("Redirect pointed to an invalid URL.");
    }
  }

  throw new Error("Too many redirects.");
}

// Throws if the URL is not a public http(s) destination. Resolves the host and
// rejects when ANY resolved address is private/reserved (defends against a
// public hostname that maps to an internal IP).
export async function assertPublicUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("Enter a valid URL.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only http and https URLs can be analyzed.");
  }

  const host = parsed.hostname.replace(/^\[|\]$/g, ""); // unwrap [ipv6]
  if (!host) {
    throw new Error("URL is missing a host.");
  }

  // Obvious local hostnames never resolve to anything we should fetch.
  if (/^(localhost|.*\.localhost|.*\.local|.*\.internal|.*\.lan)$/i.test(host)) {
    throw new Error("Analyzing local or internal addresses is not allowed.");
  }

  let addresses;
  if (net.isIP(host)) {
    addresses = [host];
  } else {
    try {
      addresses = (await dns.lookup(host, { all: true })).map((entry) => entry.address);
    } catch {
      throw new Error("Could not resolve that URL's host.");
    }
  }

  if (!addresses.length) {
    throw new Error("Could not resolve that URL's host.");
  }

  if (addresses.some((ip) => isBlockedIp(ip))) {
    throw new Error("Analyzing private, loopback, or link-local addresses is not allowed.");
  }
}
