const MAX_SCREENSHOT_BYTES = 1500000;
const ALLOWED_STATUS = new Set(["rejected", "dismissed", "not_present", "unresolved", "unavailable"]);
const ALLOWED_METHOD = new Set(["cmp_selector", "semantic_button", "close_control", "none"]);
const USABLE_STATUS = new Set(["rejected", "dismissed", "not_present"]);

function shortText(value, max = 120) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function decodedBytes(base64) {
  if (typeof base64 !== "string" || !base64) {
    return 0;
  }
  return Math.floor((base64.length * 3) / 4) - (base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0);
}

export function normalizeConsentCapture(payload = {}) {
  const source = payload?.data && typeof payload.data === "object" ? payload.data : payload;
  const rawConsent = source?.consent || {};
  const status = ALLOWED_STATUS.has(rawConsent.status) ? rawConsent.status : "unavailable";
  const method = ALLOWED_METHOD.has(rawConsent.method) ? rawConsent.method : "none";
  const consent = {
    status,
    verified: rawConsent.verified === true,
    method,
    control: shortText(rawConsent.control),
    overlayVisibleAfter: rawConsent.overlayVisibleAfter === true,
  };
  const base64 = typeof source?.screenshot === "string" ? source.screenshot.replace(/^data:[^;]+;base64,/, "") : "";
  const bytes = decodedBytes(base64);
  const mimeType = ["image/jpeg", "image/png", "image/webp"].includes(source?.mimeType) ? source.mimeType : "image/jpeg";
  const tooLarge = bytes > MAX_SCREENSHOT_BYTES;
  const available = Boolean(base64) && !tooLarge;
  const usableForAnalysis = available && consent.verified && !consent.overlayVisibleAfter && USABLE_STATUS.has(consent.status);

  return {
    available,
    usableForAnalysis,
    source: "browserless",
    status: tooLarge ? "too_large" : available ? "available" : status === "unavailable" ? "unavailable" : "empty",
    strategy: "mobile_full_page",
    bytes,
    consent,
    screenshot: available ? `data:${mimeType};base64,${base64}` : null,
  };
}

export const BROWSERLESS_CONSENT_FUNCTION = String.raw`
export default async function ({ page, context }) {
  const rejectLabels = ["Reject all", "Reject optional", "Only necessary", "Essential only", "Decline", "Continue without accepting"];
  const rejectSelectors = [
    "#onetrust-reject-all-handler",
    "#CybotCookiebotDialogBodyButtonDecline",
    "button[data-testid='uc-deny-all-button']",
    "button[data-action='reject-all']",
    ".qc-cmp2-summary-buttons button[mode='secondary']",
    "#didomi-notice-disagree-button",
  ];
  const closeSelectors = [
    "#onetrust-close-btn-container button",
    "button[aria-label*='close' i][aria-label*='cookie' i]",
    "button[aria-label*='close' i][aria-label*='consent' i]",
  ];
  const consentSelectors = [
    "#onetrust-consent-sdk",
    "#CybotCookiebotDialog",
    "#CybotCookiebotDialogBodyUnderlay",
    ".fc-consent-root",
    ".qc-cmp2-container",
    "#usercentrics-root",
    "[id^='sp_message_container']",
    "[class*='cookie-banner' i]",
    "[class*='cookie-consent' i]",
    "[class*='consent-banner' i]",
    "[aria-label*='cookie' i][role='dialog']",
    "[aria-label*='consent' i][role='dialog']",
  ];
  const privateTarget = /^https?:\/\/(?:\[?(?:127\.|10\.|169\.254\.|192\.168\.|0\.0\.0\.0|172\.(?:1[6-9]|2\d|3[01])\.|100\.(?:6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.|::1|fc|fd|fe80))/i;
  const visible = async (handle) => Boolean(handle && await handle.boundingBox());
  const overlayVisible = async () => {
    for (const frame of page.frames()) {
      const found = await frame.evaluate((selectors) => selectors.some((selector) => {
        try {
          return [...document.querySelectorAll(selector)].some((node) => {
            const style = getComputedStyle(node);
            const rect = node.getBoundingClientRect();
            return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity || 1) > 0 && rect.width > 20 && rect.height > 20;
          });
        } catch {
          return false;
        }
      }), consentSelectors).catch(() => false);
      if (found) return true;
    }
    return false;
  };
  const clickSelector = async (selectors) => {
    for (const frame of page.frames()) {
      for (const selector of selectors) {
        const handle = await frame.$(selector).catch(() => null);
        if (await visible(handle)) {
          const label = await handle.evaluate((node) => (node.innerText || node.value || node.getAttribute("aria-label") || "").trim()).catch(() => "");
          await handle.click().catch(() => null);
          return label || selector;
        }
      }
    }
    return "";
  };
  const clickLabel = async () => {
    for (const frame of page.frames()) {
      const handles = await frame.$$("button, [role='button'], input[type='button'], input[type='submit'], a").catch(() => []);
      for (const handle of handles) {
        const label = await handle.evaluate((node) => (node.innerText || node.value || node.getAttribute("aria-label") || "").trim()).catch(() => "");
        if (rejectLabels.some((candidate) => label.toLowerCase() === candidate.toLowerCase()) && await visible(handle)) {
          await handle.click().catch(() => null);
          return label;
        }
      }
    }
    return "";
  };

  await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.setUserAgent(context.userAgent);
  await page.setRequestInterception(true);
  page.on("request", (request) => privateTarget.test(request.url()) ? request.abort() : request.continue());
  await page.goto(context.url, { waitUntil: "networkidle2", timeout: context.navigationTimeout });

  const overlayVisibleBefore = await overlayVisible();
  let status = overlayVisibleBefore ? "unresolved" : "not_present";
  let method = "none";
  let control = "";
  if (overlayVisibleBefore) {
    control = await clickSelector(rejectSelectors);
    if (control) {
      status = "rejected";
      method = "cmp_selector";
    } else {
      control = await clickLabel();
      if (control) {
        status = "rejected";
        method = "semantic_button";
      } else {
        control = await clickSelector(closeSelectors);
        if (control) {
          status = "dismissed";
          method = "close_control";
        }
      }
    }
    if (control) await new Promise((resolve) => setTimeout(resolve, 1200));
  }

  const overlayVisibleAfter = await overlayVisible();
  const verified = !overlayVisibleAfter && ["rejected", "dismissed", "not_present"].includes(status);
  if (!verified) status = "unresolved";
  const image = await page.screenshot({ fullPage: true, type: "jpeg", quality: 60 });
  return {
    data: {
      screenshot: image.toString("base64"),
      mimeType: "image/jpeg",
      consent: { status, verified, method, control, overlayVisibleAfter },
    },
    type: "application/json",
  };
}
`;
