import { BROWSERLESS_CONSENT_FUNCTION, normalizeConsentCapture } from "./consentCapture.mjs";

const DEFAULT_TIMEOUT_MS = 45000;
const MIN_TIMEOUT_MS = 10000;
const MAX_TIMEOUT_MS = 90000;
const SPOOF_USER_AGENT = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";

function configuredValue(value) {
  const trimmed = String(value || "").trim();
  return /^your_/i.test(trimmed) ? "" : trimmed;
}

function screenshotServiceUrl() {
  return configuredValue(process.env.SCREENSHOT_SERVICE_URL || process.env.SEO_OPS_SCREENSHOT_SERVICE_URL);
}

function screenshotServiceToken() {
  return configuredValue(process.env.SCREENSHOT_SERVICE_TOKEN || process.env.SEO_OPS_SCREENSHOT_SERVICE_TOKEN);
}

function screenshotTimeoutMs() {
  const parsed = Number(process.env.SCREENSHOT_TIMEOUT_MS || process.env.SEO_OPS_SCREENSHOT_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_TIMEOUT_MS;
  }
  return Math.max(MIN_TIMEOUT_MS, Math.min(MAX_TIMEOUT_MS, Math.round(parsed)));
}

export function screenshotServiceConfigured() {
  return Boolean(screenshotServiceUrl());
}

const unavailableConsent = () => ({ status: "unavailable", verified: false, method: "none", control: "", overlayVisibleAfter: false });

export async function fetchFullPageScreenshot(url) {
  const baseUrl = screenshotServiceUrl();
  if (!baseUrl) {
    return {
      available: false,
      usableForAnalysis: false,
      source: "browserless",
      status: "not_configured",
      reason: "SCREENSHOT_SERVICE_URL or SEO_OPS_SCREENSHOT_SERVICE_URL is not configured.",
      consent: unavailableConsent(),
    };
  }

  const endpoint = new URL("/function", baseUrl);
  const token = screenshotServiceToken();
  if (token) {
    endpoint.searchParams.set("token", token);
  }
  endpoint.searchParams.set("blockAds", "true");
  endpoint.searchParams.set("launch", JSON.stringify({ args: [`--user-agent=${SPOOF_USER_AGENT}`] }));

  const timeoutMs = screenshotTimeoutMs();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();

  try {
    const response = await fetch(endpoint.toString(), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        code: BROWSERLESS_CONSENT_FUNCTION,
        context: {
          url,
          userAgent: SPOOF_USER_AGENT,
          navigationTimeout: Math.max(MIN_TIMEOUT_MS, timeoutMs - 5000),
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = (await response.text().catch(() => "")).slice(0, 300);
      return {
        available: false,
        usableForAnalysis: false,
        source: "browserless",
        status: "failed",
        reason: `Screenshot service returned ${response.status}${detail ? `: ${detail}` : "."}`,
        durationMs: Date.now() - startedAt,
        consent: unavailableConsent(),
      };
    }

    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("application/json") ? await response.json() : JSON.parse(await response.text());
    const capture = normalizeConsentCapture(payload);
    return {
      ...capture,
      durationMs: Date.now() - startedAt,
      reason: capture.available ? "" : capture.status === "too_large" ? "Full-page screenshot exceeded the 1.5MB analysis cap." : "Screenshot service returned no usable image.",
    };
  } catch (error) {
    const timedOut = error?.name === "AbortError";
    return {
      available: false,
      usableForAnalysis: false,
      source: "browserless",
      status: timedOut ? "timeout" : "error",
      reason: timedOut ? `Screenshot service did not finish within ${Math.round(timeoutMs / 1000)} seconds.` : `Screenshot service request failed: ${error.message}`,
      durationMs: Date.now() - startedAt,
      consent: unavailableConsent(),
    };
  } finally {
    clearTimeout(timer);
  }
}
