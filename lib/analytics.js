const configuredMeasurementId = (process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "").trim();
export const GA_MEASUREMENT_ID = /^G-[A-Z0-9]+$/.test(configuredMeasurementId) ? configuredMeasurementId : "";

const MAX_PROPERTY_LENGTH = 120;

function cleanEventName(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

function cleanPropertyValue(value) {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "number" || typeof value === "boolean") return value;
  return String(value).slice(0, MAX_PROPERTY_LENGTH);
}

export function analyticsDomain(value) {
  try {
    const parsed = new URL(String(value || "").includes("://") ? value : `https://${value}`);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function scoreBand(score) {
  const value = Number(score);
  if (!Number.isFinite(value)) return "unknown";
  if (value >= 80) return "good";
  if (value >= 50) return "needs_work";
  return "poor";
}

export function ensureAnalytics() {
  if (!GA_MEASUREMENT_ID || typeof window === "undefined") {
    return;
  }

  window.dataLayer = window.dataLayer || [];
  window.gtag =
    window.gtag ||
    function gtag() {
      window.dataLayer.push(arguments);
    };

  if (!window.__optiscanGaConfigured) {
    window.gtag("js", new Date());
    window.gtag("config", GA_MEASUREMENT_ID, {
      send_page_view: true,
      anonymize_ip: true,
    });
    window.__optiscanGaConfigured = true;
  }
}

export function trackEvent(name, properties = {}) {
  if (!GA_MEASUREMENT_ID || typeof window === "undefined") {
    return;
  }

  ensureAnalytics();

  const eventName = cleanEventName(name);
  if (!eventName) {
    return;
  }

  const payload = Object.entries(properties).reduce((acc, [key, value]) => {
    const cleanValue = cleanPropertyValue(value);
    if (cleanValue !== undefined && cleanValue !== "") {
      acc[key] = cleanValue;
    }
    return acc;
  }, {});

  window.gtag("event", eventName, payload);
}
