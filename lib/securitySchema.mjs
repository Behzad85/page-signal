const STATUS_POINTS = {
  pass: 1,
  warning: 0.45,
  critical: 0,
  info: 1,
};

const STATUS_WEIGHT = {
  pass: 0,
  info: 0,
  not_tested: 0.5,
  warning: 1,
  critical: 2,
};

const CHECK_EXPLANATIONS = {
  https: "Encrypts information between the visitor and the website so others cannot easily read or alter it in transit.",
  http_redirect: "Moves visitors from an insecure HTTP address to the protected HTTPS version automatically.",
  response_status: "Confirms the public page responds normally instead of failing, redirecting unexpectedly, or blocking visitors.",
  tls_certificate: "Helps browsers verify that the site controls this domain while TLS encrypts the connection.",
  hsts: "Tells browsers to use HTTPS automatically, helping prevent visitors from being intercepted on insecure connections.",
  csp: "Limits which scripts and resources a browser may run, reducing the impact of injected malicious code.",
  clickjacking: "Stops another website from disguising this page inside a frame and tricking users into clicking it.",
  nosniff: "Stops browsers from guessing file types in ways that could cause untrusted content to run as code.",
  referrer_policy: "Controls how much information about a visitor's current page is shared when they follow a link.",
  permissions_policy: "Restricts access to sensitive browser features such as the camera, microphone, and location.",
  cookies: "Checks whether browser cookies are protected from insecure connections, scripts, and unwanted cross-site use.",
  server_disclosure: "Reduces public clues about server software that attackers could use to target known weaknesses.",
  sensitive_cache: "Helps prevent private or account-specific information from being stored in shared browser or proxy caches.",
  cors: "Controls which other websites may read responses from this website through a visitor's browser.",
  mixed_content: "Ensures a secure page does not load unencrypted resources that could be intercepted or changed.",
  insecure_forms: "Ensures information entered into forms is sent over an encrypted connection.",
  third_party_scripts: "Highlights code supplied by other companies because it runs with access to the page and its visitors.",
  iframe_policy: "Limits what embedded external pages can do inside this website.",
  source_maps: "Public developer source code can reveal implementation details or weaknesses that attackers could use.",
  debug_disclosure: "Looks for public error details or secret-like data that could help an attacker or expose credentials.",
  caa: "Limiting which providers can issue HTTPS certificates reduces the risk of attackers impersonating the website.",
  dnssec: "Protects website address lookups from tampering so visitors are less likely to be sent to an impersonating server.",
};

export function securityCheckExplanation(id) {
  if (typeof id !== "string") {
    throw new TypeError("Security check ID must be a string");
  }
  if (!Object.hasOwn(CHECK_EXPLANATIONS, id)) {
    throw new Error(`Unknown security check ID: ${id}`);
  }
  return CHECK_EXPLANATIONS[id];
}

const CATEGORY_DEFINITIONS = [
  { id: "transport", label: "Transport & Response", description: "HTTPS, TLS, redirects, and the public response status." },
  { id: "browser", label: "Browser Protections", description: "Response policies that reduce script injection, clickjacking, and data leakage risk." },
  { id: "cookies", label: "Cookie Security", description: "Security attributes observed on cookies set by the audited response." },
  { id: "exposure", label: "Information Exposure", description: "Public implementation details, debug output, source maps, and cache behaviour." },
  { id: "client", label: "Page & Third-Party Risk", description: "Mixed content, forms, scripts, iframes, and passive CORS evidence." },
  { id: "dns", label: "Domain Security", description: "Public certificate-authority restrictions and DNSSEC availability." },
];

function text(value) {
  return String(value ?? "").trim();
}

function headerMap(headers = {}) {
  return Object.fromEntries(Object.entries(headers || {}).map(([key, value]) => [key.toLowerCase(), text(value)]));
}

function check({ id, category, label, status, evidence, remediation, url, reference }) {
  return {
    id,
    category,
    label,
    status,
    explanation: securityCheckExplanation(id),
    evidence: text(evidence),
    remediation: text(remediation),
    url: text(url),
    reference: text(reference),
  };
}

function unavailable(id, category, label, url, reason = "No response evidence was available for this check.") {
  return check({ id, category, label, status: "not_tested", evidence: reason, url });
}

function isSensitivePath(url) {
  try {
    return /\/(?:account|admin|dashboard|login|sign-in|signin|checkout|billing|profile|settings)(?:\/|$)/i.test(new URL(url).pathname);
  } catch {
    return false;
  }
}

function hostname(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function cookieNames(setCookies = []) {
  return setCookies.map((cookie) => text(cookie).split(";", 1)[0].split("=", 1)[0].trim()).filter(Boolean);
}

function cookieCheck(setCookies, url) {
  if (!setCookies.length) {
    return check({
      id: "cookies",
      category: "cookies",
      label: "Cookie attributes",
      status: "info",
      evidence: "The audited response did not set cookies.",
      remediation: "No action is required unless authenticated or personalized routes set cookies elsewhere.",
      url,
    });
  }

  const issues = [];
  setCookies.forEach((rawCookie, index) => {
    const cookie = text(rawCookie);
    const name = cookieNames([cookie])[0] || `cookie ${index + 1}`;
    if (!/;\s*secure(?:;|$)/i.test(cookie)) issues.push(`${name}: missing Secure`);
    if (!/;\s*httponly(?:;|$)/i.test(cookie)) issues.push(`${name}: missing HttpOnly`);
    if (!/;\s*samesite=(?:strict|lax|none)(?:;|$)/i.test(cookie)) issues.push(`${name}: missing SameSite`);
    if (/;\s*samesite=none(?:;|$)/i.test(cookie) && !/;\s*secure(?:;|$)/i.test(cookie)) issues.push(`${name}: SameSite=None without Secure`);
    if (/;\s*domain=\./i.test(cookie)) issues.push(`${name}: broad parent-domain scope`);
  });

  return check({
    id: "cookies",
    category: "cookies",
    label: "Cookie attributes",
    status: issues.some((issue) => /missing Secure|missing HttpOnly|SameSite=None/.test(issue)) ? "critical" : issues.length ? "warning" : "pass",
    evidence: issues.length ? issues.join("; ") : `${setCookies.length} cookie${setCookies.length === 1 ? "" : "s"} use Secure, HttpOnly, and SameSite attributes.`,
    remediation: issues.length ? "Add Secure, HttpOnly, and an appropriate SameSite policy; restrict Domain and Path to the narrowest required scope." : "Keep cookie scope and attributes under review as authentication flows change.",
    url,
    reference: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie",
  });
}

function tagAttribute(tag, name) {
  const match = new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, "i").exec(tag);
  return match?.[1] || "";
}

function markupChecks(html, url, available) {
  if (!available) {
    return [
      unavailable("mixed_content", "client", "Mixed content", url),
      unavailable("insecure_forms", "client", "Form transport", url),
      unavailable("third_party_scripts", "client", "Third-party scripts", url),
      unavailable("iframe_policy", "client", "Embedded content", url),
      unavailable("source_maps", "exposure", "Public source maps", url),
      unavailable("debug_disclosure", "exposure", "Debug and secret exposure", url),
    ];
  }

  const pageHost = hostname(url);
  const insecureAssets = [...html.matchAll(/<(?:img|script|link|iframe|source|video|audio)\b[^>]*(?:src|href)=["'](http:\/\/[^"']+)["'][^>]*>/gi)].map((match) => match[1]);
  const forms = html.match(/<form\b[^>]*>[\s\S]*?<\/form>/gi) || [];
  const insecureForms = forms.filter((form) => /^http:\/\//i.test(tagAttribute(form, "action")));
  const insecurePasswordForms = insecureForms.filter((form) => /<input\b[^>]*type=["']password["']/i.test(form));
  const scripts = html.match(/<script\b[^>]*src=["'][^"']+["'][^>]*>/gi) || [];
  const thirdPartyScripts = scripts.filter((tag) => {
    const src = tagAttribute(tag, "src");
    const sourceHost = hostname(src.startsWith("//") ? `https:${src}` : src);
    return sourceHost && pageHost && sourceHost !== pageHost;
  });
  const missingIntegrity = thirdPartyScripts.filter((tag) => !/\sintegrity\s*=/i.test(tag));
  const thirdPartyHosts = [...new Set(thirdPartyScripts.map((tag) => hostname(tagAttribute(tag, "src"))).filter(Boolean))];
  const iframes = html.match(/<iframe\b[^>]*>/gi) || [];
  const unrestrictedIframes = iframes.filter((tag) => !/\ssandbox(?:\s|=|>)/i.test(tag));
  const sourceMapReferences = [...html.matchAll(/(?:sourceMappingURL\s*=\s*|src=["'])([^\s"']+\.map)(?:\s|["']|$)/gi)].map((match) => match[1]);
  const disclosurePatterns = [
    ["private key marker", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i],
    ["AWS access-key pattern", /AKIA[0-9A-Z]{16}/],
    ["stack trace", /(?:Error:\s.+\n\s+at\s|Traceback \(most recent call last\))/i],
    ["debug toolbar", /(?:django-debug-toolbar|__debug__|laravel-debugbar)/i],
  ];
  const disclosures = disclosurePatterns.filter(([, pattern]) => pattern.test(html)).map(([label]) => label);

  return [
    check({
      id: "mixed_content",
      category: "client",
      label: "Mixed content",
      status: insecureAssets.length ? "critical" : "pass",
      evidence: insecureAssets.length ? `${insecureAssets.length} HTTP asset reference${insecureAssets.length === 1 ? "" : "s"} found on an HTTPS page.` : "No HTTP asset references were found in the collected HTML.",
      remediation: insecureAssets.length ? "Serve every image, script, stylesheet, frame, and media asset over HTTPS." : "Continue enforcing HTTPS for all page dependencies.",
      url,
    }),
    check({
      id: "insecure_forms",
      category: "client",
      label: "Form transport",
      status: insecurePasswordForms.length ? "critical" : insecureForms.length ? "warning" : "pass",
      evidence: insecurePasswordForms.length ? `${insecurePasswordForms.length} password form${insecurePasswordForms.length === 1 ? "" : "s"} submit over HTTP.` : insecureForms.length ? `${insecureForms.length} form${insecureForms.length === 1 ? "" : "s"} submit over HTTP.` : "No form actions submitting over HTTP were found.",
      remediation: insecureForms.length ? "Submit forms only to HTTPS endpoints and verify that authentication routes never downgrade transport." : "Keep form actions same-origin or explicitly HTTPS.",
      url,
    }),
    check({
      id: "third_party_scripts",
      category: "client",
      label: "Third-party scripts",
      status: missingIntegrity.length ? "warning" : "pass",
      evidence: thirdPartyScripts.length ? `${thirdPartyScripts.length} third-party script${thirdPartyScripts.length === 1 ? "" : "s"} from ${thirdPartyHosts.join(", ")}; ${missingIntegrity.length} lack integrity metadata.` : "No cross-origin script tags were found.",
      remediation: missingIntegrity.length ? "Remove unnecessary third-party scripts. Pin trusted CDN resources and add Subresource Integrity where the provider supports stable versioned assets." : "Review third-party script ownership and necessity regularly.",
      url,
    }),
    check({
      id: "iframe_policy",
      category: "client",
      label: "Embedded content",
      status: unrestrictedIframes.length ? "warning" : "pass",
      evidence: unrestrictedIframes.length ? `${unrestrictedIframes.length} iframe${unrestrictedIframes.length === 1 ? "" : "s"} have no sandbox attribute.` : iframes.length ? "All detected iframes include a sandbox policy." : "No iframes were found.",
      remediation: unrestrictedIframes.length ? "Review each embed and apply the narrowest practical sandbox and referrer policy without breaking required functionality." : "Keep embed permissions narrowly scoped.",
      url,
    }),
    check({
      id: "source_maps",
      category: "exposure",
      label: "Public source maps",
      status: sourceMapReferences.length ? "warning" : "pass",
      evidence: sourceMapReferences.length ? `${sourceMapReferences.length} source-map reference${sourceMapReferences.length === 1 ? "" : "s"} found in public markup.` : "No source-map references were found in the collected HTML.",
      remediation: sourceMapReferences.length ? "Do not publish production source maps unless access is restricted and source content is intentionally exposed." : "Keep production debugging artifacts out of public responses.",
      url,
    }),
    check({
      id: "debug_disclosure",
      category: "exposure",
      label: "Debug and secret exposure",
      status: disclosures.length ? "critical" : "pass",
      evidence: disclosures.length ? `Potential public exposure indicators: ${disclosures.join(", ")}. Sensitive values are intentionally omitted.` : "No common stack-trace, debug-toolbar, private-key, or access-key patterns were found.",
      remediation: disclosures.length ? "Remove the exposed material, rotate any potentially affected credential, disable production debug output, and validate the incident scope." : "Keep production error responses generic and prevent credentials from entering client bundles.",
      url,
    }),
  ];
}

function strongestStatus(checks) {
  return checks.map((item) => item.status).toSorted((left, right) => STATUS_WEIGHT[right] - STATUS_WEIGHT[left])[0] || "not_tested";
}

function buildCategories(checks) {
  return CATEGORY_DEFINITIONS.map((definition) => {
    const categoryChecks = checks.filter((item) => item.category === definition.id);
    const counts = categoryChecks.reduce((result, item) => ({ ...result, [item.status]: (result[item.status] || 0) + 1 }), {});
    return {
      ...definition,
      status: strongestStatus(categoryChecks),
      counts: {
        pass: counts.pass || 0,
        warning: counts.warning || 0,
        critical: counts.critical || 0,
        info: counts.info || 0,
        not_tested: counts.not_tested || 0,
      },
      checks: categoryChecks,
    };
  });
}

export function buildSecurityPosture(input = {}) {
  const url = text(input.finalUrl || input.url);
  const headers = headerMap(input.headers);
  const responseAvailable = input.responseAvailable !== false && Boolean(input.status || Object.keys(headers).length || input.html);
  const isHttps = /^https:\/\//i.test(url);
  const csp = headers["content-security-policy"] || "";
  const framePolicy = /(?:^|;)\s*frame-ancestors\s+/i.test(csp) || Boolean(headers["x-frame-options"]);
  const cspRisks = [
    csp.includes("'unsafe-inline'") ? "unsafe-inline" : "",
    csp.includes("'unsafe-eval'") ? "unsafe-eval" : "",
    /(?:^|;)\s*default-src\s+\*/i.test(csp) ? "wildcard default-src" : "",
  ].filter(Boolean);
  const corsOrigin = headers["access-control-allow-origin"] || "";
  const corsCredentials = headers["access-control-allow-credentials"]?.toLowerCase() === "true";
  const tls = input.tls;
  const tlsError = /(?:certificate|tls|ssl|self[- ]signed|hostname.*match)/i.test(text(input.tlsError)) ? text(input.tlsError) : "";
  const validTo = tls?.validTo ? Date.parse(tls.validTo) : Number.NaN;
  const certificateExpired = Number.isFinite(validTo) && validTo <= Date.now();
  const httpProbe = input.httpProbe || {};
  const redirectedToHttps = /^https:\/\//i.test(httpProbe.finalUrl || "") && Array.isArray(httpProbe.redirects) && httpProbe.redirects.length > 0;
  const serverHeaders = [headers.server && `Server: ${headers.server}`, headers["x-powered-by"] && `X-Powered-By: ${headers["x-powered-by"]}`].filter(Boolean);
  const sensitiveCache = isSensitivePath(url) && /(?:^|,)\s*public\b/i.test(headers["cache-control"] || "");
  const caa = input.dns?.caa;
  const checks = [
    check({
      id: "https",
      category: "transport",
      label: "HTTPS",
      status: isHttps ? "pass" : "critical",
      evidence: isHttps ? "The audited response uses HTTPS." : "The audited response is not using HTTPS.",
      remediation: isHttps ? "Keep TLS enabled across every public route." : "Enable HTTPS and redirect all HTTP traffic to HTTPS.",
      url,
    }),
    httpProbe.tested
      ? check({
          id: "http_redirect",
          category: "transport",
          label: "HTTP to HTTPS redirect",
          status: redirectedToHttps ? "pass" : "warning",
          evidence: redirectedToHttps ? `HTTP redirects to ${httpProbe.finalUrl}.` : `The HTTP probe ended at ${httpProbe.finalUrl || "an HTTP response"} without a confirmed HTTPS redirect.`,
          remediation: redirectedToHttps ? "Keep the redirect permanent and consistent." : "Add a permanent server-side redirect from HTTP to the matching HTTPS URL.",
          url,
        })
      : unavailable("http_redirect", "transport", "HTTP to HTTPS redirect", url, httpProbe.error || "The HTTP redirect probe was unavailable."),
    responseAvailable
      ? check({
          id: "response_status",
          category: "transport",
          label: "Public response status",
          status: input.status >= 400 ? "critical" : input.status >= 300 ? "warning" : input.status >= 200 ? "pass" : "warning",
          evidence: `The final public response returned HTTP ${input.status || "unknown"}.`,
          remediation: input.status >= 400 ? "Resolve the server, access-control, or routing failure before relying on the page." : "Keep the canonical public URL returning a clean 200 response.",
          url,
        })
      : unavailable("response_status", "transport", "Public response status", url),
    tls
      ? check({
          id: "tls_certificate",
          category: "transport",
          label: "TLS certificate",
          status: tls.authorized === false || certificateExpired ? "critical" : "pass",
          evidence: tls.authorized === false ? "The TLS connection did not report an authorized certificate." : certificateExpired ? `The certificate expired on ${tls.validTo}.` : `Certificate accepted; protocol ${tls.protocol || "available"}${tls.validTo ? `; valid until ${tls.validTo}` : ""}.`,
          remediation: tls.authorized === false || certificateExpired ? "Replace or renew the certificate and verify hostname, chain, and expiry." : "Monitor certificate renewal and retain modern TLS configuration.",
          url,
        })
      : tlsError
        ? check({
            id: "tls_certificate",
            category: "transport",
            label: "TLS certificate",
            status: "critical",
            evidence: `The HTTPS connection failed certificate validation: ${tlsError}`,
            remediation: "Replace or renew the certificate and verify hostname, trust chain, and expiry.",
            url,
          })
        : unavailable("tls_certificate", "transport", "TLS certificate", url, isHttps ? "TLS certificate metadata was unavailable." : "TLS does not apply to the HTTP response."),
    responseAvailable
      ? check({
          id: "hsts",
          category: "browser",
          label: "Strict Transport Security",
          status: headers["strict-transport-security"] ? "pass" : "warning",
          evidence: headers["strict-transport-security"] || "Strict-Transport-Security is missing.",
          remediation: headers["strict-transport-security"] ? "Keep a long max-age and review includeSubDomains before enabling it broadly." : "Add Strict-Transport-Security after confirming every affected subdomain supports HTTPS.",
          url,
        })
      : unavailable("hsts", "browser", "Strict Transport Security", url),
    responseAvailable
      ? check({
          id: "csp",
          category: "browser",
          label: "Content Security Policy",
          status: !csp ? "warning" : cspRisks.length ? "critical" : "pass",
          evidence: !csp ? "Content-Security-Policy is missing." : cspRisks.length ? `Risky directives found: ${cspRisks.join(", ")}.` : "A CSP is present without the common high-risk directives checked by PageSignal.",
          remediation: !csp ? "Deploy a restrictive Content-Security-Policy in report-only mode first, then enforce it." : cspRisks.length ? "Replace broad and unsafe directives with nonces, hashes, and narrow source allowlists." : "Continue testing and tightening the policy as page dependencies change.",
          url,
          reference: "https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html",
        })
      : unavailable("csp", "browser", "Content Security Policy", url),
    responseAvailable
      ? check({
          id: "clickjacking",
          category: "browser",
          label: "Clickjacking protection",
          status: framePolicy ? "pass" : "warning",
          evidence: framePolicy ? "Framing is controlled by CSP frame-ancestors or X-Frame-Options." : "No CSP frame-ancestors or X-Frame-Options policy was found.",
          remediation: framePolicy ? "Keep framing restricted to explicitly trusted origins." : "Set CSP frame-ancestors; use X-Frame-Options as legacy defence where appropriate.",
          url,
        })
      : unavailable("clickjacking", "browser", "Clickjacking protection", url),
    ...[
      ["nosniff", "Content type sniffing", "x-content-type-options", (value) => value.toLowerCase() === "nosniff", "Set X-Content-Type-Options: nosniff."],
      ["referrer_policy", "Referrer policy", "referrer-policy", Boolean, "Set a privacy-conscious Referrer-Policy such as strict-origin-when-cross-origin."],
      ["permissions_policy", "Browser permissions policy", "permissions-policy", Boolean, "Restrict unneeded camera, microphone, location, and other browser capabilities."],
    ].map(([id, label, header, validator, remediation]) =>
      responseAvailable
        ? check({ id, category: "browser", label, status: validator(headers[header] || "") ? "pass" : "warning", evidence: headers[header] || `${header} is missing.`, remediation, url })
        : unavailable(id, "browser", label, url)
    ),
    responseAvailable ? cookieCheck(input.setCookies || [], url) : unavailable("cookies", "cookies", "Cookie attributes", url),
    responseAvailable
      ? check({
          id: "server_disclosure",
          category: "exposure",
          label: "Server version disclosure",
          status: serverHeaders.length ? "warning" : "pass",
          evidence: serverHeaders.length ? serverHeaders.join("; ") : "No Server or X-Powered-By implementation header was exposed.",
          remediation: serverHeaders.length ? "Remove unnecessary product and version headers; do not treat header removal as a substitute for patching." : "Continue minimizing unnecessary implementation metadata.",
          url,
        })
      : unavailable("server_disclosure", "exposure", "Server version disclosure", url),
    responseAvailable
      ? check({
          id: "sensitive_cache",
          category: "exposure",
          label: "Sensitive-page caching",
          status: sensitiveCache ? "warning" : "pass",
          evidence: sensitiveCache ? `A sensitive-looking route returned Cache-Control: ${headers["cache-control"]}.` : isSensitivePath(url) ? `No explicitly public cache policy was found on this sensitive-looking route.` : "The audited URL does not look like an authenticated or sensitive route.",
          remediation: sensitiveCache ? "Use private or no-store caching where responses contain user-specific or sensitive data." : "Review cache policy separately on authenticated responses.",
          url,
        })
      : unavailable("sensitive_cache", "exposure", "Sensitive-page caching", url),
    responseAvailable
      ? check({
          id: "cors",
          category: "client",
          label: "CORS response policy",
          status: corsOrigin === "*" && corsCredentials ? "critical" : corsOrigin === "*" ? "warning" : "pass",
          evidence: corsOrigin === "*" && corsCredentials ? "The response combines a wildcard origin with credentials enabled." : corsOrigin === "*" ? "The response permits any origin; confirm the resource is intentionally public." : corsOrigin ? `Access-Control-Allow-Origin: ${corsOrigin}.` : "No permissive CORS response header was observed.",
          remediation: corsOrigin === "*" ? "Allow only explicitly trusted origins and never combine wildcard origins with credentialed access." : "Keep origin allowlists narrow and validate them server-side.",
          url,
        })
      : unavailable("cors", "client", "CORS response policy", url),
    ...markupChecks(input.html || "", url, Boolean(input.html)),
    Array.isArray(caa)
      ? check({
          id: "caa",
          category: "dns",
          label: "CAA records",
          status: caa.length ? "pass" : "info",
          evidence: caa.length ? `${caa.length} CAA record${caa.length === 1 ? "" : "s"} restrict certificate issuance.` : "No CAA records were found. CAA is optional but can restrict which authorities issue certificates.",
          remediation: caa.length ? "Keep CAA records aligned with the certificate authorities you use." : "Consider publishing CAA records for the approved certificate authorities.",
          url,
        })
      : unavailable("caa", "dns", "CAA records", url, input.dns?.caaError || "CAA lookup was unavailable."),
    unavailable("dnssec", "dns", "DNSSEC validation", url, "DNSSEC is not tested by the current resolver; absence of evidence is not a failure."),
  ];

  const categories = buildCategories(checks);
  const counts = checks.reduce(
    (result, item) => ({ ...result, [item.status]: result[item.status] + 1 }),
    { pass: 0, warning: 0, critical: 0, info: 0, not_tested: 0 }
  );
  const measuredChecks = checks.filter((item) => item.status !== "not_tested");
  const score = measuredChecks.length
    ? Math.round((measuredChecks.reduce((total, item) => total + STATUS_POINTS[item.status], 0) / measuredChecks.length) * 100)
    : null;
  const status = counts.critical ? "critical" : counts.warning ? "needs_attention" : measuredChecks.length ? "good" : "not_tested";

  return {
    score,
    status,
    summary:
      status === "critical"
        ? `${counts.critical} critical public security posture finding${counts.critical === 1 ? "" : "s"} need attention.`
        : status === "needs_attention"
          ? `${counts.warning} public security posture improvement${counts.warning === 1 ? "" : "s"} identified.`
          : status === "good"
            ? "The measured public security posture checks passed."
            : "Public security posture evidence was unavailable.",
    scope: "Primary URL response headers, TLS metadata, DNS CAA records, and collected HTML.",
    disclaimer: "This is a passive public security posture review, not a penetration test or proof that the application is vulnerability-free.",
    counts,
    scoreBasis: {
      measured: measuredChecks.length,
      notTested: counts.not_tested,
    },
    categories,
  };
}

export function securityStatusLabel(status) {
  if (status === "pass") return "Pass";
  if (status === "critical") return "Critical";
  if (status === "warning") return "Needs attention";
  if (status === "info") return "Informational";
  return "Not tested";
}

export function securityExportRows(posture = {}) {
  return (posture.categories || []).flatMap((category) =>
    (category.checks || []).map((item) => ({
      Section: "Security Posture",
      Category: category.label,
      Check: item.label,
      Status: securityStatusLabel(item.status),
      "Why it matters": item.explanation || "",
      URL: item.url || "",
      Evidence: item.evidence || "",
      Recommendation: item.remediation || "",
      Reference: item.reference || "",
    }))
  );
}

export function securityTicketFindings(posture = {}) {
  return (posture.categories || []).flatMap((category) =>
    (category.checks || [])
      .filter((item) => item.status === "warning" || item.status === "critical")
      .map((item) => ({
        checkId: item.id,
        category: category.label,
        title: item.label,
        status: item.status,
        priority: item.status === "critical" ? "High" : "Medium",
        url: item.url || "",
        evidence: item.evidence || "",
        remediation: item.remediation || "",
        reference: item.reference || "",
      }))
  );
}
