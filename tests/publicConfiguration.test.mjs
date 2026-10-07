import assert from "node:assert/strict";
import test from "node:test";
import { createJiti } from "jiti";

const feedbackInput = { category: "general", message: "Example feedback", fromEmail: "reader@example.com" };

async function loadModule(path) {
  const jiti = createJiti(import.meta.url, { moduleCache: false });
  return jiti.import(path);
}

test("feedback without deployment configuration makes no outbound request", async (t) => {
  for (const name of ["FEEDBACK_GAS_URL", "FEEDBACK_GAS_TOKEN", "FEEDBACK_RECIPIENT_EMAIL"]) {
    const previous = process.env[name];
    delete process.env[name];
    t.after(() => previous === undefined ? delete process.env[name] : process.env[name] = previous);
  }
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => { calls++; return Response.json({ status: "success" }); });
  const { sendFeedbackEmail } = await loadModule("../lib/sendFeedbackEmail.js");
  await assert.rejects(sendFeedbackEmail(feedbackInput), /not configured/i);
  assert.equal(calls, 0);
});

test("feedback sends only to the configured HTTPS service and recipient", async (t) => {
  const config = {
    FEEDBACK_GAS_URL: "https://feedback.example.com/submit",
    FEEDBACK_GAS_TOKEN: "test-only-token",
    FEEDBACK_RECIPIENT_EMAIL: "owner@example.com",
  };
  for (const [name, value] of Object.entries(config)) {
    const previous = process.env[name];
    process.env[name] = value;
    t.after(() => previous === undefined ? delete process.env[name] : process.env[name] = previous);
  }
  let received;
  t.mock.method(globalThis, "fetch", async (url, options) => {
    received = { url, options };
    return Response.json({ status: "success" });
  });
  const { sendFeedbackEmail } = await loadModule("../lib/sendFeedbackEmail.js");
  assert.deepEqual(await sendFeedbackEmail(feedbackInput), { ok: true });
  assert.equal(received.url, "https://feedback.example.com/submit");
  assert.equal(JSON.parse(received.options.body).email, "owner@example.com");
  assert.equal(JSON.parse(received.options.body).token, "test-only-token");
  process.env.FEEDBACK_GAS_URL = "http://feedback.example.com/submit";
  await assert.rejects(sendFeedbackEmail(feedbackInput), /HTTPS/);
});

test("analytics creates no tracking globals or events without an explicit measurement ID", async (t) => {
  const previous = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  delete process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  t.after(() => previous === undefined ? delete process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID : process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = previous);
  const previousWindow = globalThis.window;
  globalThis.window = {};
  t.after(() => previousWindow === undefined ? delete globalThis.window : globalThis.window = previousWindow);
  const { trackEvent } = await loadModule("../lib/analytics.js");
  trackEvent("audit_started", { mode: "page" });
  assert.equal(globalThis.window.gtag, undefined);
  assert.equal(globalThis.window.dataLayer, undefined);
});
