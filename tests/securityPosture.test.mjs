import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createJiti } from "jiti";

const securityUrl = new URL("../lib/securitySchema.mjs", import.meta.url);
const securityFetchUrl = new URL("../lib/fetchSecuritySignals.mjs", import.meta.url);
const pdfExportUrl = new URL("../components/optiscan/pdfExport.js", import.meta.url);
const EXPECTED_SECURITY_CHECK_IDS = [
  "caa",
  "clickjacking",
  "cookies",
  "cors",
  "csp",
  "debug_disclosure",
  "dnssec",
  "hsts",
  "http_redirect",
  "https",
  "iframe_policy",
  "insecure_forms",
  "mixed_content",
  "nosniff",
  "permissions_policy",
  "referrer_policy",
  "response_status",
  "sensitive_cache",
  "server_disclosure",
  "source_maps",
  "third_party_scripts",
  "tls_certificate",
];

function byId(posture, id) {
  return posture.categories.flatMap((category) => category.checks).find((check) => check.id === id);
}

test("returns known security explanations and rejects unknown check IDs", async () => {
  const { securityCheckExplanation } = await import(securityUrl.href);

  assert.equal(
    securityCheckExplanation("hsts"),
    "Tells browsers to use HTTPS automatically, helping prevent visitors from being intercepted on insecure connections."
  );
  assert.throws(() => securityCheckExplanation("unknown_check"), /Unknown security check ID: unknown_check/);
  for (const inheritedId of ["toString", "constructor", "__proto__"]) {
    assert.throws(
      () => securityCheckExplanation(inheritedId),
      new Error(`Unknown security check ID: ${inheritedId}`)
    );
  }
  assert.throws(
    () => securityCheckExplanation(42),
    new TypeError("Security check ID must be a string")
  );
});

test("marks strong public security controls as passing without exposing cookie values", async () => {
  assert.equal(existsSync(fileURLToPath(securityUrl)), true, "security schema module should exist");

  const { buildSecurityPosture } = await import(securityUrl.href);
  const posture = buildSecurityPosture({
    url: "https://example.com/",
    finalUrl: "https://example.com/",
    status: 200,
    headers: {
      "strict-transport-security": "max-age=31536000; includeSubDomains",
      "content-security-policy": "default-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'",
      "x-content-type-options": "nosniff",
      "referrer-policy": "strict-origin-when-cross-origin",
      "permissions-policy": "camera=(), microphone=(), geolocation=()",
      "cache-control": "public, max-age=300",
    },
    setCookies: ["session=super-secret-value; Path=/; Secure; HttpOnly; SameSite=Lax"],
    tls: {
      authorized: true,
      protocol: "TLSv1.3",
      validTo: "Dec 31 23:59:59 2099 GMT",
      subjectaltname: "DNS:example.com",
    },
    httpProbe: {
      tested: true,
      status: 301,
      finalUrl: "https://example.com/",
      redirects: [{ from: "http://example.com/", to: "https://example.com/", status: 301 }],
    },
    dns: { caa: ["0 issue letsencrypt.org"], dnssec: "not_tested" },
    html: '<html><body><form action="/contact"><input name="email"></form></body></html>',
  });

  assert.equal(posture.status, "good");
  assert.equal(byId(posture, "https").status, "pass");
  assert.equal(byId(posture, "http_redirect").status, "pass");
  assert.equal(byId(posture, "csp").status, "pass");
  assert.equal(byId(posture, "cookies").status, "pass");
  assert.equal(byId(posture, "dnssec").status, "not_tested");
  const checks = posture.categories.flatMap((category) => category.checks);
  assert.deepEqual(checks.map((item) => item.id).toSorted(), EXPECTED_SECURITY_CHECK_IDS);
  assert.equal(checks.every((item) => typeof item.explanation === "string" && item.explanation.length > 0), true);
  assert.match(byId(posture, "hsts").explanation, /browser.*HTTPS|HTTPS.*browser/i);
  assert.equal(
    byId(posture, "tls_certificate").explanation,
    "Helps browsers verify that the site controls this domain while TLS encrypts the connection."
  );
  assert.equal(JSON.stringify(posture).includes("super-secret-value"), false);
});

test("uses the same explanation for available and unavailable HSTS results", async () => {
  const { buildSecurityPosture } = await import(securityUrl.href);
  const commonInput = {
    url: "https://example.com/",
    finalUrl: "https://example.com/",
    setCookies: [],
    httpProbe: { tested: false },
    dns: { caa: null, dnssec: "not_tested" },
  };
  const available = buildSecurityPosture({
    ...commonInput,
    status: 200,
    headers: { "strict-transport-security": "max-age=31536000" },
    html: "<html><body>Available</body></html>",
  });
  const unavailable = buildSecurityPosture({
    ...commonInput,
    status: 0,
    headers: {},
    html: "",
    responseAvailable: false,
  });

  assert.equal(byId(available, "hsts").status, "pass");
  assert.equal(byId(unavailable, "hsts").status, "not_tested");
  assert.equal(byId(available, "hsts").explanation, byId(unavailable, "hsts").explanation);
});

test("reports unsafe CORS, CSP, cookies, and exposed server versions with exact evidence", async () => {
  const { buildSecurityPosture } = await import(securityUrl.href);
  const posture = buildSecurityPosture({
    url: "https://example.com/account",
    finalUrl: "https://example.com/account",
    status: 200,
    headers: {
      "content-security-policy": "default-src * 'unsafe-inline' 'unsafe-eval'",
      "access-control-allow-origin": "*",
      "access-control-allow-credentials": "true",
      server: "Apache/2.4.49",
      "x-powered-by": "Express 4.17.1",
      "cache-control": "public, max-age=3600",
    },
    setCookies: ["session=secret; Domain=.example.com; Path=/"],
    tls: { authorized: true, protocol: "TLSv1.2", validTo: "Dec 31 23:59:59 2099 GMT" },
    httpProbe: { tested: true, status: 200, finalUrl: "http://example.com/account", redirects: [] },
    dns: { caa: [] },
    html: "<html><body>Account</body></html>",
  });

  assert.equal(posture.status, "critical");
  assert.equal(byId(posture, "cors").status, "critical");
  assert.match(byId(posture, "cors").evidence, /wildcard origin.*credentials/i);
  assert.equal(byId(posture, "csp").status, "critical");
  assert.match(byId(posture, "csp").evidence, /unsafe-inline/);
  assert.equal(byId(posture, "cookies").status, "critical");
  assert.match(byId(posture, "cookies").evidence, /session/);
  assert.equal(byId(posture, "server_disclosure").status, "warning");
  assert.equal(byId(posture, "sensitive_cache").status, "warning");
});

test("detects mixed content, insecure forms, password transport, and third-party scripts without integrity", async () => {
  const { buildSecurityPosture } = await import(securityUrl.href);
  const posture = buildSecurityPosture({
    url: "https://example.com/login",
    finalUrl: "https://example.com/login",
    status: 200,
    headers: {},
    setCookies: [],
    tls: { authorized: true, protocol: "TLSv1.3", validTo: "Dec 31 23:59:59 2099 GMT" },
    httpProbe: { tested: false, error: "Probe timed out" },
    dns: { caa: [], dnssec: "not_tested" },
    html: `
      <html><body>
        <img src="http://cdn.example.com/hero.jpg">
        <form action="http://example.com/login"><input type="password" name="password"></form>
        <script src="https://cdn.vendor.test/widget.js"></script>
        <iframe src="https://video.vendor.test/embed/1"></iframe>
      </body></html>
    `,
  });

  assert.equal(byId(posture, "mixed_content").status, "critical");
  assert.equal(byId(posture, "insecure_forms").status, "critical");
  assert.equal(byId(posture, "third_party_scripts").status, "warning");
  assert.match(byId(posture, "third_party_scripts").evidence, /cdn\.vendor\.test/);
  assert.equal(byId(posture, "iframe_policy").status, "warning");
});

test("excludes unavailable checks from the measured score and reports them separately", async () => {
  const { buildSecurityPosture } = await import(securityUrl.href);
  const posture = buildSecurityPosture({
    url: "https://example.com/",
    finalUrl: "https://example.com/",
    status: 0,
    headers: {},
    setCookies: [],
    tls: null,
    httpProbe: { tested: false, error: "Unavailable" },
    dns: { caa: null, dnssec: "not_tested" },
    html: "",
    responseAvailable: false,
  });

  assert.ok(posture.counts.not_tested > 0);
  assert.equal(posture.scoreBasis.measured, posture.counts.pass + posture.counts.warning + posture.counts.critical + posture.counts.info);
  assert.equal(posture.scoreBasis.notTested, posture.counts.not_tested);
  assert.match(posture.disclaimer, /not a penetration test/i);
});

test("collects only the response headers needed for passive checks", async () => {
  assert.equal(existsSync(fileURLToPath(securityFetchUrl)), true, "security fetch module should exist");

  const { responseSecurityEvidence } = await import(securityFetchUrl.href);
  const sourceHeaders = {
    "Content-Security-Policy": "default-src 'self'",
    "Set-Cookie": ["session=secret; Secure; HttpOnly; SameSite=Lax"],
    Authorization: "Bearer must-not-be-collected",
    Server: "nginx",
  };
  const response = {
    headers: {
      get(name) {
        const key = Object.keys(sourceHeaders).find((candidate) => candidate.toLowerCase() === name.toLowerCase());
        return key ? sourceHeaders[key] : null;
      },
    },
    tls: { authorized: true, protocol: "TLSv1.3" },
  };

  const evidence = responseSecurityEvidence(response, {
    finalUrl: "https://example.com/",
    redirects: [{ from: "http://example.com/", to: "https://example.com/", status: 301 }],
  });

  assert.deepEqual(evidence.headers, {
    "content-security-policy": "default-src 'self'",
    server: "nginx",
  });
  assert.deepEqual(evidence.setCookies, ["session=secret; Secure; HttpOnly; SameSite=Lax"]);
  assert.equal(JSON.stringify(evidence).includes("must-not-be-collected"), false);
});

test("probes HTTP redirects as a browser navigation rather than a named crawler", async () => {
  const { probeHttpRedirect } = await import(securityFetchUrl.href);
  const calls = [];

  const result = await probeHttpRedirect("https://example.com/", async (url, init) => {
    calls.push({ url, init });
    const isBrowser = /Mozilla\/5\.0/.test(init.headers["user-agent"]);

    return isBrowser
      ? {
          response: { status: 200, statusText: "OK" },
          finalUrl: "https://example.com/",
          redirects: [{ from: "http://example.com/", to: "https://example.com/", status: 301 }],
        }
      : {
          response: { status: 403, statusText: "Forbidden" },
          finalUrl: "http://example.com/",
          redirects: [],
        };
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "http://example.com/");
  assert.match(calls[0].init.headers["user-agent"], /Mozilla\/5\.0/);
  assert.equal(result.status, 200);
  assert.equal(result.finalUrl, "https://example.com/");
  assert.equal(result.redirects.length, 1);
});

test("treats a TLS handshake certificate failure as critical evidence", async () => {
  const { buildSecurityPosture } = await import(securityUrl.href);
  const posture = buildSecurityPosture({
    url: "https://expired.example/",
    finalUrl: "https://expired.example/",
    status: 0,
    headers: {},
    setCookies: [],
    tls: null,
    tlsError: "certificate has expired",
    responseAvailable: false,
    httpProbe: { tested: false },
    dns: { caa: null, dnssec: "not_tested" },
    html: "",
  });

  assert.equal(byId(posture, "tls_certificate").status, "critical");
  assert.match(byId(posture, "tls_certificate").evidence, /certificate has expired/i);
});

test("exports every measured check but creates work only for warnings and critical findings", async () => {
  const { buildSecurityPosture, securityExportRows, securityTicketFindings } = await import(securityUrl.href);
  const posture = buildSecurityPosture({
    url: "https://example.com/",
    finalUrl: "https://example.com/",
    status: 200,
    headers: { "x-content-type-options": "nosniff" },
    setCookies: [],
    tls: { authorized: true, protocol: "TLSv1.3", validTo: "Dec 31 23:59:59 2099 GMT" },
    httpProbe: { tested: false },
    dns: { caa: [], dnssec: "not_tested" },
    html: "<html><body>Safe</body></html>",
  });

  const rows = securityExportRows(posture);
  const tickets = securityTicketFindings(posture);

  assert.equal(rows.length, posture.categories.flatMap((category) => category.checks).length);
  assert.ok(rows.some((row) => row.Status === "Pass"));
  assert.ok(rows.some((row) => row.Status === "Not tested"));
  const hstsRow = rows.find((row) => row.Check === "Strict Transport Security");
  assert.equal(
    hstsRow?.["Why it matters"],
    "Tells browsers to use HTTPS automatically, helping prevent visitors from being intercepted on insecure connections."
  );
  assert.ok(tickets.length > 0);
  assert.equal(tickets.every((item) => item.status === "warning" || item.status === "critical"), true);
  assert.equal(tickets.some((item) => item.checkId === "hsts"), true);
});

test("keeps the complete HSTS explanation readable in the Site Analysis PDF", async () => {
  const { buildSecurityPosture } = await import(securityUrl.href);
  const jiti = createJiti(import.meta.url, { interopDefault: true, jsx: true });
  const { buildPdfBlob } = await jiti.import(fileURLToPath(pdfExportUrl));
  const security = buildSecurityPosture({
    url: "https://example.com/",
    finalUrl: "https://example.com/",
    status: 200,
    headers: { "strict-transport-security": "max-age=31536000" },
    setCookies: [],
    tls: {
      authorized: true,
      protocol: "TLSv1.3",
      validTo: "Dec 31 23:59:59 2099 GMT",
    },
    httpProbe: {
      tested: true,
      status: 301,
      finalUrl: "https://example.com/",
      redirects: [],
    },
    dns: { caa: [], dnssec: "not_tested" },
    html: "<html><body>Example</body></html>",
  });
  const result = {
    meta: { url: "https://example.com/", security },
    audit: {},
  };

  const pdfText = await buildPdfBlob("site", result).text();

  assert.ok(
    pdfText.includes(
      "Tells browsers to use HTTPS automatically, helping prevent visitors from being intercepted on insecure connections."
    )
  );
});

test("paginates every Security field with complete continuation context", async () => {
  const { buildSecurityPosture } = await import(securityUrl.href);
  const jiti = createJiti(import.meta.url, { interopDefault: true, jsx: true });
  const { buildPdfBlob, measureHelveticaText } = await jiti.import(fileURLToPath(pdfExportUrl));
  const security = buildSecurityPosture({
    url: "https://example.com/",
    finalUrl: "https://example.com/",
    status: 200,
    headers: { "strict-transport-security": "max-age=31536000" },
    setCookies: [],
    tls: {
      authorized: true,
      protocol: "TLSv1.3",
      validTo: "Dec 31 23:59:59 2099 GMT",
    },
    httpProbe: {
      tested: true,
      status: 301,
      finalUrl: "https://example.com/",
      redirects: [],
    },
    dns: { caa: [], dnssec: "not_tested" },
    html: "<html><body>Example</body></html>",
  });
  const longField = (word, sentinel) => `${Array.from({ length: 600 }, () => word).join(" ")} ${sentinel}`;
  const sentinels = {
    url: "URL_TAIL_SENTINEL",
    explanation: "EXPLANATION_TAIL_SENTINEL",
    evidence: "EVIDENCE_TAIL_SENTINEL",
    recommendation: "RECOMMENDATION_TAIL_SENTINEL",
    reference: "REFERENCE_TAIL_SENTINEL",
  };
  const uninterruptedWideUrl = `https://example.com/${"W".repeat(6690)}`;

  security.categories.push({
    id: "stress",
    label: "Stress Security Category",
    description: "PDF pagination stress fixture.",
    checks: [
      {
        id: "pagination_stress",
        label: "Pagination Stress Check",
        status: "pass",
        url: `${uninterruptedWideUrl}${sentinels.url}`,
        explanation: longField("explanation-detail", sentinels.explanation),
        evidence: longField("evidence-detail", sentinels.evidence),
        remediation: longField("recommendation-detail", sentinels.recommendation),
        reference: `${uninterruptedWideUrl}${sentinels.reference}`,
      },
    ],
  });

  const pdfText = await buildPdfBlob("site", {
    meta: { url: "https://example.com/", security },
    audit: {},
  }).text();

  Object.values(sentinels).forEach((sentinel) => {
    assert.ok(pdfText.includes(sentinel), `missing ${sentinel}`);
  });
  assert.ok((pdfText.match(/\/Type \/Page\b/g) || []).length > 1);
  assert.ok((pdfText.match(/\(Stress Security Category\) Tj/g) || []).length > 1);
  assert.ok(pdfText.includes("Pagination Stress Check \\(continued\\)"));
  ["URL", "Why it matters", "Evidence", "What to do", "Guidance / reference"].forEach((label) => {
    assert.ok(pdfText.includes(`${label} \\(continued\\)`), `missing continued ${label} context`);
  });

  const textYCoordinates = [...pdfText.matchAll(/\/F[12]\s+\d+(?:\.\d+)?\s+Tf\s+-?\d+(?:\.\d+)?\s+(-?\d+(?:\.\d+)?)\s+Td\s+\(/g)].map(
    (match) => Number(match[1])
  );
  assert.ok(textYCoordinates.length > 0);
  assert.ok(
    textYCoordinates.every((coordinate) => coordinate >= 40 && coordinate <= 756),
    `text escaped page margins: ${Math.min(...textYCoordinates)} to ${Math.max(...textYCoordinates)}`
  );

  const securityStart = pdfText.indexOf("(Security) Tj ET");
  const ticketsStart = pdfText.indexOf("(Tickets) Tj ET", securityStart);
  const securityPdfText = pdfText.slice(securityStart, ticketsStart);
  const securityBodyLines = [
    ...securityPdfText.matchAll(/\/F1 8\.5 Tf 36\.00 -?\d+(?:\.\d+)? Td \(((?:\\.|[^\\)])*)\) Tj ET/g),
  ].map((match) => match[1].replace(/\\([\\()])/g, "$1"));
  const uninterruptedWLines = securityBodyLines.filter((line) => /^W+$/.test(line));

  assert.ok(uninterruptedWLines.length > 0);
  assert.ok(
    uninterruptedWLines.every((line) => (line.length * 944 * 8.5) / 1000 <= 540),
    "an uninterrupted Helvetica W line exceeds the 540-point content width"
  );
  assert.equal(typeof measureHelveticaText, "function");
  assert.equal(measureHelveticaText("W".repeat(122), 8.5), (122 * 944 * 8.5) / 1000);
  assert.ok(
    securityBodyLines.every((line) => measureHelveticaText(line, 8.5) <= 540),
    "a measured Security body line exceeds the 540-point content width"
  );
  assert.ok(
    pdfText.includes(
      "Tells browsers to use HTTPS automatically, helping prevent visitors from being intercepted on insecure connections."
    )
  );
  assert.ok(pdfText.includes("(Overview) Tj"));
});
