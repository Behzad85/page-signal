import assert from "node:assert/strict";
import test from "node:test";

import {
  BROWSERLESS_CONSENT_FUNCTION,
  normalizeConsentCapture,
} from "../lib/consentCapture.mjs";

test("admits a screenshot only after a verified privacy-preserving outcome", () => {
  const capture = normalizeConsentCapture({
    data: {
      screenshot: Buffer.from("jpeg").toString("base64"),
      mimeType: "image/jpeg",
      consent: {
        status: "rejected",
        verified: true,
        method: "semantic_button",
        control: "Reject all",
        overlayVisibleAfter: false,
      },
    },
  });

  assert.equal(capture.available, true);
  assert.equal(capture.usableForAnalysis, true);
  assert.match(capture.screenshot, /^data:image\/jpeg;base64,/);
  assert.equal(capture.consent.status, "rejected");
});

test("excludes screenshots when consent remains unresolved or unverified", () => {
  const unresolved = normalizeConsentCapture({
    screenshot: Buffer.from("jpeg").toString("base64"),
    mimeType: "image/jpeg",
    consent: {
      status: "unresolved",
      verified: false,
      method: "none",
      control: "",
      overlayVisibleAfter: true,
    },
  });
  const contradictory = normalizeConsentCapture({
    screenshot: Buffer.from("jpeg").toString("base64"),
    consent: {
      status: "dismissed",
      verified: true,
      method: "close_control",
      overlayVisibleAfter: true,
    },
  });

  assert.equal(unresolved.available, true);
  assert.equal(unresolved.usableForAnalysis, false);
  assert.equal(contradictory.usableForAnalysis, false);
});

test("normalizes unknown and oversized capture responses safely", () => {
  const unknown = normalizeConsentCapture({ consent: { status: "accepted", verified: true, control: "x".repeat(500) } });
  const oversized = normalizeConsentCapture({
    screenshot: Buffer.alloc(1500001).toString("base64"),
    consent: { status: "not_present", verified: true, method: "none", overlayVisibleAfter: false },
  });

  assert.equal(unknown.consent.status, "unavailable");
  assert.equal(unknown.consent.control.length, 120);
  assert.equal(unknown.usableForAnalysis, false);
  assert.equal(oversized.available, false);
  assert.equal(oversized.status, "too_large");
});

test("uses static Browserless code that never accepts all cookies", () => {
  assert.match(BROWSERLESS_CONSENT_FUNCTION, /context\.url/);
  assert.match(BROWSERLESS_CONSENT_FUNCTION, /Reject all/);
  assert.doesNotMatch(BROWSERLESS_CONSENT_FUNCTION, /click\([^\n]*Accept all/i);
  assert.match(BROWSERLESS_CONSENT_FUNCTION, /overlayVisibleAfter/);
  assert.doesNotThrow(() => new Function(BROWSERLESS_CONSENT_FUNCTION.replace("export default async function", "return async function")));
});
