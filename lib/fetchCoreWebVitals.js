import { normalizeUrl } from "./fetchPageMarkdown";

const CRUX_ENDPOINT = "https://chromeuxreport.googleapis.com/v1/records:queryRecord";
const PAGESPEED_ENDPOINT = "https://pagespeedonline.googleapis.com/pagespeedonline/v5/runPagespeed";
const TIMEOUT_MS = 30000;
const DEFAULT_PAGESPEED_TIMEOUT_MS = 120000;
const MAX_PAGESPEED_TIMEOUT_MS = 120000;
const CORE_METRICS = ["largest_contentful_paint", "interaction_to_next_paint", "cumulative_layout_shift"];
const PLACEHOLDER_VALUES = new Set(["your_google_api_key", "google_api_key", "replace_me", "changeme"]);
const SERVER_KEY_RESTRICTION_HELP =
  "This Google API key is restricted to HTTP referrers. PageSignal calls Google APIs from the Next.js server, so use no application restriction for local development or IP address restrictions for a deployed server. Keep API restrictions limited to Chrome UX Report API and PageSpeed Insights API.";
const ENV_ALIASES = {
  GOOGLE_CRUX_API_KEY: ["GOOGLE_CRUX_API_KEY", "SEO_OPS_GOOGLE_CRUX_API_KEY"],
  GOOGLE_PAGESPEED_API_KEY: ["GOOGLE_PAGESPEED_API_KEY", "SEO_OPS_GOOGLE_PAGESPEED_API_KEY"],
  PAGESPEED_TIMEOUT_MS: ["PAGESPEED_TIMEOUT_MS", "SEO_OPS_PAGESPEED_TIMEOUT_MS"],
};

const THRESHOLDS = {
  lcp: { good: 2500, needs: 4000, unit: "ms", label: "LCP" },
  inp: { good: 200, needs: 500, unit: "ms", label: "INP" },
  cls: { good: 0.1, needs: 0.25, unit: "", label: "CLS" },
  tbt: { good: 200, needs: 600, unit: "ms", label: "TBT" },
};

function timeoutSignal(ms = TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { controller, timer };
}

function statusFor(value, threshold) {
  if (!Number.isFinite(value)) {
    return "unknown";
  }

  if (value <= threshold.good) {
    return "good";
  }

  if (value <= threshold.needs) {
    return "needs-improvement";
  }

  return "poor";
}

function scoreFromStatuses(statuses) {
  if (!statuses.length) {
    return 0;
  }

  const points = statuses.reduce((total, status) => {
    if (status === "good") return total + 100;
    if (status === "needs-improvement") return total + 62;
    if (status === "poor") return total + 25;
    return total + 40;
  }, 0);

  return Math.round(points / statuses.length);
}

function overallStatus(metrics) {
  const statuses = Object.values(metrics || {})
    .map((metric) => metric?.status)
    .filter(Boolean);

  if (!statuses.length) {
    return "unknown";
  }

  if (statuses.includes("poor")) {
    return "poor";
  }

  if (statuses.includes("needs-improvement")) {
    return "needs-improvement";
  }

  return "good";
}

function envValue(names) {
  const list = Array.isArray(names) ? names : [names];

  for (const name of list) {
    const value = String(process.env[name] || "").trim();
    if (value && !PLACEHOLDER_VALUES.has(value.toLowerCase())) {
      return value;
    }
  }

  return "";
}

function envCredential(name) {
  return envValue(ENV_ALIASES[name] || name);
}

function pageSpeedTimeoutMs() {
  const value = Number(envValue(ENV_ALIASES.PAGESPEED_TIMEOUT_MS));
  if (!Number.isFinite(value) || value <= 0) {
    return DEFAULT_PAGESPEED_TIMEOUT_MS;
  }

  return Math.max(15000, Math.min(MAX_PAGESPEED_TIMEOUT_MS, Math.round(value)));
}

function metricKey(name) {
  if (name === "largest_contentful_paint") return "lcp";
  if (name === "interaction_to_next_paint") return "inp";
  if (name === "cumulative_layout_shift") return "cls";
  return name;
}

function formatValue(value, unit) {
  if (!Number.isFinite(value)) {
    return "Unavailable";
  }

  if (unit === "ms") {
    return value >= 1000 ? `${(value / 1000).toFixed(value >= 10000 ? 1 : 2)}s` : `${Math.round(value)}ms`;
  }

  return value.toFixed(2);
}

function normalizeHistogram(metric) {
  return (metric.histogram || []).map((bin, index) => ({
    label: index === 0 ? "good" : index === 1 ? "needs-improvement" : "poor",
    start: bin.start ?? null,
    end: bin.end ?? null,
    density: Number(bin.density || 0),
  }));
}

function normalizeCruxMetric(name, metric) {
  const key = metricKey(name);
  const threshold = THRESHOLDS[key];
  const rawP75 = metric?.percentiles?.p75;
  const value = key === "cls" ? Number.parseFloat(rawP75) : Number(rawP75);
  const status = statusFor(value, threshold);

  return {
    key,
    label: threshold.label,
    value,
    display: formatValue(value, threshold.unit),
    unit: threshold.unit,
    status,
    threshold,
    histogram: normalizeHistogram(metric),
  };
}

function normalizePsiMetric(key, audit, thresholdKey = key) {
  const threshold = THRESHOLDS[thresholdKey];
  const value = Number(audit?.numericValue);

  return {
    key,
    label: threshold.label,
    title: audit?.title || threshold.label,
    value,
    display: audit?.displayValue || formatValue(value, threshold.unit),
    unit: threshold.unit,
    status: statusFor(value, threshold),
    threshold,
  };
}

async function fetchJson(url, options) {
  const startedAt = Date.now();
  const { controller, timer } = timeoutSignal(options.timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      next: { revalidate: 0 },
    });
    const text = await response.text();
    let json = null;

    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }

    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      json,
      text,
      durationMs: Date.now() - startedAt,
      timeoutMs: options.timeoutMs,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      statusText: "",
      json: null,
      text: "",
      error: error.name === "AbortError" ? "Request timed out." : error.message,
      durationMs: Date.now() - startedAt,
      timeoutMs: options.timeoutMs,
    };
  } finally {
    clearTimeout(timer);
  }
}

function googleApiMessage(result = {}) {
  return result.json?.error?.message || result.error || result.statusText || "";
}

function googleApiDetails(result = {}) {
  const details = result.json?.error?.details;
  if (!Array.isArray(details)) {
    return [];
  }

  return details
    .map((detail) => detail?.reason || detail?.message || detail?.metadata?.reason || detail?.["@type"] || "")
    .filter(Boolean);
}

function compactAttempt(result = {}) {
  return {
    status: result.status,
    message: googleApiMessage(result) || "Google PageSpeed request failed.",
    details: googleApiDetails(result),
    durationMs: result.durationMs || null,
    timeoutMs: result.timeoutMs || pageSpeedTimeoutMs(),
  };
}

function classifyGoogleApiFailure(result = {}) {
  const message = googleApiMessage(result);

  if (/refer{1,2}er/i.test(message) && /blocked|restriction|restricted/i.test(message)) {
    return {
      status: "key_restricted",
      reason: SERVER_KEY_RESTRICTION_HELP,
    };
  }

  if (/api key not valid|invalid api key/i.test(message)) {
    return {
      status: "invalid_key",
      reason:
        "The Google API key was rejected. Check GOOGLE_CRUX_API_KEY / SEO_OPS_GOOGLE_CRUX_API_KEY and GOOGLE_PAGESPEED_API_KEY / SEO_OPS_GOOGLE_PAGESPEED_API_KEY for copy/paste errors.",
    };
  }

  if (/has not been used|disabled|not enabled|enable it by visiting/i.test(message)) {
    return {
      status: "api_disabled",
      reason: "The Google API key is valid, but the required Google API is not enabled for this project. Enable Chrome UX Report API and PageSpeed Insights API.",
    };
  }

  if (/quota|rate limit/i.test(message)) {
    return {
      status: "quota_exceeded",
      reason: "Google rejected the Core Web Vitals request because quota or rate limits were exceeded.",
    };
  }

  return null;
}

async function queryCrux({ key, body }) {
  const endpoint = new URL(CRUX_ENDPOINT);
  endpoint.searchParams.set("key", key);

  return fetchJson(endpoint.toString(), {
    method: "POST",
    timeoutMs: TIMEOUT_MS,
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      ...body,
      metrics: CORE_METRICS,
    }),
  });
}

function normalizeCruxResponse(result, attempt) {
  const metrics = result.json?.record?.metrics || {};
  const normalizedMetrics = {};

  CORE_METRICS.forEach((name) => {
    if (metrics[name]) {
      const normalized = normalizeCruxMetric(name, metrics[name]);
      normalizedMetrics[normalized.key] = normalized;
    }
  });

  const status = overallStatus(normalizedMetrics);

  return {
    available: Object.keys(normalizedMetrics).length > 0,
    source: "crux",
    scope: attempt.scope,
    formFactor: attempt.formFactor || "ALL",
    status,
    score: scoreFromStatuses(Object.values(normalizedMetrics).map((metric) => metric.status)),
    metrics: normalizedMetrics,
    collectionPeriod: result.json?.record?.collectionPeriod || null,
    urlNormalizationDetails: result.json?.urlNormalizationDetails || null,
    key: result.json?.record?.key || null,
  };
}

async function fetchCrux(url, origin, apiKey, formFactor = "PHONE") {
  if (!apiKey) {
    return {
      available: false,
      source: "crux",
      status: "not_configured",
      reason: "GOOGLE_CRUX_API_KEY or SEO_OPS_GOOGLE_CRUX_API_KEY is not configured.",
      attempts: [],
    };
  }

  const attempts = [
    { scope: "url", formFactor, body: { url, formFactor } },
    { scope: "origin", formFactor, body: { origin, formFactor } },
    { scope: "url", formFactor: "ALL", body: { url } },
    { scope: "origin", formFactor: "ALL", body: { origin } },
  ];
  const errors = [];

  for (const attempt of attempts) {
    const result = await queryCrux({ key: apiKey, body: attempt.body });
    const failure = classifyGoogleApiFailure(result);

    if (result.ok && result.json?.record?.metrics) {
      return {
        ...normalizeCruxResponse(result, attempt),
        attempts: errors,
      };
    }

    if (failure) {
      return {
        available: false,
        source: "crux",
        status: failure.status,
        reason: failure.reason,
        attempts: [
          ...errors,
          {
            scope: attempt.scope,
            formFactor: attempt.formFactor,
            status: result.status,
            message: googleApiMessage(result) || "Google API request failed.",
          },
        ],
      };
    }

    errors.push({
      scope: attempt.scope,
      formFactor: attempt.formFactor,
      status: result.status,
      message: googleApiMessage(result) || "No CrUX data returned.",
    });
  }

  return {
    available: false,
    source: "crux",
    status: "no_data",
    reason: errors[0]?.message || "No CrUX field data is available for this URL or origin.",
    attempts: errors,
  };
}

function normalizeCategoryScores(categories = {}) {
  return {
    performance: Math.round((categories.performance?.score || 0) * 100),
    accessibility: Math.round((categories.accessibility?.score || 0) * 100),
    bestPractices: Math.round((categories["best-practices"]?.score || 0) * 100),
    seo: Math.round((categories.seo?.score || 0) * 100),
  };
}

function normalizeCategoryAudits(categories = {}, audits = {}) {
  return Object.entries(categories)
    .filter(([key]) => ["performance", "accessibility", "best-practices", "seo"].includes(key))
    .flatMap(([key, category]) =>
      (category.auditRefs || [])
        .map((ref) => audits[ref.id])
        .filter((audit) => audit && audit.score !== null && audit.score !== 1 && !["notApplicable", "manual", "informative"].includes(audit.scoreDisplayMode))
        .map((audit) => ({
          category: category.title || key,
          id: audit.id,
          title: audit.title,
          displayValue: audit.displayValue || "",
          score: audit.score,
          description: audit.description || "",
        }))
        .slice(0, 5)
    );
}

const MAX_SCREENSHOT_DATA_URL_LENGTH = 500000;

function extractFinalScreenshot(audits = {}) {
  const data = audits["final-screenshot"]?.details?.data || "";
  if (!data.startsWith("data:image/") || data.length > MAX_SCREENSHOT_DATA_URL_LENGTH) {
    return null;
  }

  return data;
}

function normalizePsiResponse(result, strategy) {
  if (!result.ok || !result.json?.lighthouseResult) {
    const failure = classifyGoogleApiFailure(result);
    const message = googleApiMessage(result);
    const timedOut = /timed out/i.test(message);
    const lighthouseError = /lighthouse returned error|something went wrong/i.test(message);
    const details = googleApiDetails(result);

    return {
      available: false,
      source: "pagespeed",
      status: failure?.status || (timedOut ? "timeout" : lighthouseError ? "lighthouse_error" : result.status === 0 ? "error" : "failed"),
      reason:
        failure?.reason ||
        (timedOut
          ? `Google PageSpeed did not finish within ${Math.round((result.timeoutMs || pageSpeedTimeoutMs()) / 1000)} seconds.`
          : message || "PageSpeed Insights did not return Lighthouse data."),
      providerMessage: message || "",
      details,
      durationMs: result.durationMs || null,
      timeoutMs: result.timeoutMs || pageSpeedTimeoutMs(),
      attempts: [compactAttempt(result)],
    };
  }

  const lighthouse = result.json.lighthouseResult;
  const audits = lighthouse.audits || {};
  const metrics = {};

  if (audits["largest-contentful-paint"]) {
    metrics.lcp = normalizePsiMetric("lcp", audits["largest-contentful-paint"]);
  }

  if (audits["cumulative-layout-shift"]) {
    metrics.cls = normalizePsiMetric("cls", audits["cumulative-layout-shift"]);
  }

  if (audits["total-blocking-time"]) {
    metrics.tbt = {
      ...normalizePsiMetric("tbt", audits["total-blocking-time"]),
      label: "TBT",
      note: "Lab proxy for INP. INP itself needs real-user field data.",
    };
  }

  if (audits["first-contentful-paint"]) {
    metrics.fcp = {
      key: "fcp",
      label: "FCP",
      title: audits["first-contentful-paint"].title,
      value: Number(audits["first-contentful-paint"].numericValue),
      display: audits["first-contentful-paint"].displayValue,
      unit: "ms",
      status: "informational",
    };
  }

  if (audits["speed-index"]) {
    metrics.speedIndex = {
      key: "speedIndex",
      label: "Speed Index",
      title: audits["speed-index"].title,
      value: Number(audits["speed-index"].numericValue),
      display: audits["speed-index"].displayValue,
      unit: "ms",
      status: "informational",
    };
  }

  const opportunityIds = [
    "largest-contentful-paint-element",
    "render-blocking-resources",
    "unused-javascript",
    "unused-css-rules",
    "server-response-time",
    "uses-optimized-images",
    "modern-image-formats",
    "uses-responsive-images",
    "third-party-summary",
  ];
  const opportunities = opportunityIds
    .map((id) => audits[id])
    .filter((audit) => audit && audit.score !== 1)
    .map((audit) => ({
      id: audit.id,
      title: audit.title,
      displayValue: audit.displayValue || "",
      score: audit.score,
      description: audit.description || "",
    }))
    .slice(0, 8);

  return {
    available: true,
    source: "pagespeed",
    status: "available",
    strategy,
    durationMs: result.durationMs || null,
    timeoutMs: result.timeoutMs || pageSpeedTimeoutMs(),
    performanceScore: Math.round((lighthouse.categories?.performance?.score || 0) * 100),
    categoryScores: normalizeCategoryScores(lighthouse.categories || {}),
    categoryAudits: normalizeCategoryAudits(lighthouse.categories || {}, audits),
    screenshot: extractFinalScreenshot(audits),
    finalUrl: lighthouse.finalUrl,
    fetchTime: lighthouse.fetchTime,
    lighthouseVersion: lighthouse.lighthouseVersion,
    metrics,
    opportunities,
  };
}

async function fetchPageSpeed(url, apiKey, strategy = "mobile") {
  if (!apiKey) {
    return {
      available: false,
      source: "pagespeed",
      status: "not_configured",
      reason: "GOOGLE_PAGESPEED_API_KEY or SEO_OPS_GOOGLE_PAGESPEED_API_KEY is not configured.",
    };
  }

  const endpoint = new URL(PAGESPEED_ENDPOINT);
  endpoint.searchParams.set("url", url);
  endpoint.searchParams.set("strategy", strategy);
  ["PERFORMANCE", "ACCESSIBILITY", "BEST_PRACTICES", "SEO"].forEach((category) => {
    endpoint.searchParams.append("category", category);
  });
  endpoint.searchParams.set("key", apiKey);

  const requestOptions = {
    method: "GET",
    timeoutMs: pageSpeedTimeoutMs(),
    headers: {
      accept: "application/json",
    },
  };

  const result = await fetchJson(endpoint.toString(), requestOptions);
  const normalized = normalizePsiResponse(result, strategy);

  if (
    !normalized.available &&
    ["lighthouse_error", "failed", "error"].includes(normalized.status) &&
    (result.status >= 500 || /something went wrong/i.test(normalized.reason || ""))
  ) {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    const retryResult = await fetchJson(endpoint.toString(), requestOptions);
    const retryNormalized = normalizePsiResponse(retryResult, strategy);

    if (!retryNormalized.available) {
      return {
        ...retryNormalized,
        attempts: [compactAttempt(result), compactAttempt(retryResult)],
        retryCount: 1,
      };
    }

    return {
      ...retryNormalized,
      retryCount: 1,
      firstAttempt: compactAttempt(result),
    };
  }

  return normalized;
}

function summarize(field, lab) {
  if (field.available) {
    const label = field.scope === "origin" ? "origin-level" : "URL-level";
    return `CrUX ${label} field data is available for ${field.formFactor}. Overall status: ${field.status}.`;
  }

  if (lab.available) {
    return "CrUX field data is unavailable, but PageSpeed Insights Lighthouse lab data is available.";
  }

  if (field.status === "not_configured" && lab.status === "not_configured") {
    return "Core Web Vitals providers are not configured. Add GOOGLE_CRUX_API_KEY / SEO_OPS_GOOGLE_CRUX_API_KEY and GOOGLE_PAGESPEED_API_KEY / SEO_OPS_GOOGLE_PAGESPEED_API_KEY.";
  }

  const setupIssue = [field, lab].find((item) =>
    ["key_restricted", "invalid_key", "api_disabled", "quota_exceeded"].includes(item.status)
  );
  if (setupIssue) {
    return setupIssue.reason;
  }

  return field.reason || lab.reason || "Core Web Vitals data is unavailable.";
}

function combinedStatus(field, lab) {
  if (field.available) {
    return field.status;
  }

  if (lab.available) {
    return "lab-only";
  }

  const setupStatus = ["key_restricted", "invalid_key", "api_disabled", "quota_exceeded"].find((status) => field.status === status || lab.status === status);
  if (setupStatus) {
    return setupStatus;
  }

  if (field.status === "not_configured" && lab.status === "not_configured") {
    return "not_configured";
  }

  return "unavailable";
}

export async function fetchCoreWebVitals(inputUrl, options = {}) {
  return fetchCoreWebVitalsForDevices(inputUrl, { devices: options.devices || options.device || ["mobile"] });
}

function normalizeRequestedDevices(devices) {
  const list = Array.isArray(devices) ? devices : [devices];
  const normalized = list
    .map((device) => String(device || "").toLowerCase())
    .map((device) => (device === "desktop" ? "desktop" : "mobile"));
  return Array.from(new Set(normalized.length ? normalized : ["mobile"]));
}

async function fetchDeviceVitals({ url, origin, cruxKey, pageSpeedKey, device }) {
  const isDesktop = device === "desktop";
  const [field, lab] = await Promise.all([
    fetchCrux(url, origin, cruxKey, isDesktop ? "DESKTOP" : "PHONE"),
    fetchPageSpeed(url, pageSpeedKey, isDesktop ? "desktop" : "mobile"),
  ]);

  return {
    label: isDesktop ? "Desktop" : "Mobile",
    field,
    lab,
    status: combinedStatus(field, lab),
    summary: summarize(field, lab),
    available: Boolean(field.available || lab.available),
  };
}

export async function fetchCoreWebVitalsForDevices(inputUrl, options = {}) {
  const url = normalizeUrl(inputUrl);
  const origin = new URL(url).origin;
  const cruxKey = envCredential("GOOGLE_CRUX_API_KEY");
  const pageSpeedKey = envCredential("GOOGLE_PAGESPEED_API_KEY");
  const requestedDevices = normalizeRequestedDevices(options.devices || options.device || ["mobile"]);

  const deviceEntries = await Promise.all(
    requestedDevices.map(async (device) => [
      device,
      await fetchDeviceVitals({ url, origin, cruxKey, pageSpeedKey, device }),
    ])
  );
  const devices = Object.fromEntries(deviceEntries);
  const primary = devices.mobile || devices.desktop || {};

  return {
    available: Object.values(devices).some((device) => device.field?.available || device.lab?.available),
    configured: {
      crux: Boolean(cruxKey),
      pagespeed: Boolean(pageSpeedKey),
    },
    status: primary.status || "unavailable",
    summary: primary.summary || "Core Web Vitals data is unavailable.",
    field: primary.field || {},
    lab: primary.lab || {},
    devices,
    requestedDevices,
    thresholds: THRESHOLDS,
    fetchedAt: new Date().toISOString(),
  };
}
