import dns from "node:dns/promises";

const SECURITY_RESPONSE_HEADERS = [
  "strict-transport-security",
  "content-security-policy",
  "x-content-type-options",
  "referrer-policy",
  "permissions-policy",
  "x-frame-options",
  "access-control-allow-origin",
  "access-control-allow-credentials",
  "cache-control",
  "server",
  "x-powered-by",
];

function headerValues(value) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  return value ? [String(value)] : [];
}

export function responseSecurityEvidence(response, request = {}) {
  const headers = {};

  SECURITY_RESPONSE_HEADERS.forEach((name) => {
    const values = headerValues(response?.headers?.get?.(name));
    if (values.length) headers[name] = values.join(", ");
  });

  return {
    headers,
    setCookies: headerValues(response?.headers?.get?.("set-cookie")),
    tls: response?.tls || null,
    finalUrl: request.finalUrl || "",
    redirects: Array.isArray(request.redirects) ? request.redirects : [],
  };
}

function caaText(record = {}) {
  if (record.issue) return `${record.critical || 0} issue ${record.issue}`;
  if (record.issuewild) return `${record.critical || 0} issuewild ${record.issuewild}`;
  if (record.iodef) return `${record.critical || 0} iodef ${record.iodef}`;
  return "";
}

async function fetchCaa(hostname) {
  try {
    const records = await dns.resolveCaa(hostname);
    return { caa: records.map(caaText).filter(Boolean), caaError: "", dnssec: "not_tested" };
  } catch (error) {
    if (error?.code === "ENODATA" || error?.code === "ENOTFOUND") {
      return { caa: [], caaError: "", dnssec: "not_tested" };
    }
    return { caa: null, caaError: error?.message || "CAA lookup failed.", dnssec: "not_tested" };
  }
}

const BROWSER_NAVIGATION_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 PageSignal/0.1";

export async function probeHttpRedirect(url, guardedFetch) {
  if (typeof guardedFetch !== "function") {
    return { tested: false, error: "HTTP redirect probe is unavailable." };
  }

  const probeUrl = new URL(url);
  probeUrl.protocol = "http:";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);

  try {
    const result = await guardedFetch(probeUrl.toString(), {
      method: "HEAD",
      signal: controller.signal,
      headers: {
        // This check models a browser navigation. Some load balancers reject
        // named crawlers before applying their HTTP-to-HTTPS redirect rule.
        "user-agent": BROWSER_NAVIGATION_USER_AGENT,
        accept: "text/html,*/*;q=0.5",
      },
    });
    return {
      tested: true,
      status: result.response.status,
      statusText: result.response.statusText || "",
      finalUrl: result.finalUrl,
      redirects: result.redirects || [],
    };
  } catch (error) {
    return {
      tested: false,
      error: error?.name === "AbortError" ? "HTTP redirect probe timed out." : error?.message || "HTTP redirect probe failed.",
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchSecurityNetworkSignals(url, options = {}) {
  const parsed = new URL(url);
  const [dnsEvidence, httpProbe] = await Promise.all([
    fetchCaa(parsed.hostname),
    probeHttpRedirect(url, options.guardedFetch),
  ]);

  return {
    dns: dnsEvidence,
    httpProbe,
  };
}
