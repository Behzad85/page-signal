import assert from "node:assert/strict";
import test from "node:test";

import {
  buildFeedbackRecord,
  classifyFeedback,
  feedbackReviewGaps,
  mergeFeedbackRecords,
  parseFeedbackCsv,
  persistFeedbackRecords,
  loadFeedbackRecords,
} from "../lib/feedbackClassification.mjs";

test("does not infer a generic persona from technical SEO vocabulary", () => {
  const result = classifyFeedback(
    "While using the dashboard, the sitemap crawl returns a 403 and canonical tags are missing from product pages."
  );

  assert.equal(result.persona.value, "unknown");
  assert.equal(result.theme.value, "technical-reliability");
  assert.equal(result.journeyStage.value, "use");
  assert.equal(result.sentiment.value, "negative");
  assert.equal(result.severity.value, "high");
  assert.equal(result.needsReview, true);
  assert.deepEqual(result.suggestions.persona, []);
  assert.match(result.reason, /sitemap|crawl|canonical/i);
});

test("classifies Alex from budget anxiety and a need for hands-on guidance", () => {
  const result = classifyFeedback(
    "I'm a founder with a very limited budget. I'm worried about wasting money and need someone to tell me if this purchase is a bad idea."
  );

  assert.equal(result.persona.value, "alex");
  assert.ok(result.persona.confidence >= 0.7);
  assert.match(result.reason, /founder|limited budget|wasting money|bad idea/i);
});

test("classifies Lucy from first-time evaluation and onboarding evidence", () => {
  const result = classifyFeedback(
    "I am evaluating this kind of tool for the first time. I need a setup guide, plain-language examples, and transparent pricing."
  );

  assert.equal(result.persona.value, "lucy");
  assert.ok(result.persona.confidence >= 0.7);
  assert.match(result.reason, /first time|setup guide|transparent pricing/i);
});

test("classifies Sarah from prior buying experience and demand for control", () => {
  const result = classifyFeedback(
    "I have used similar tools before. I need advanced settings, full control, bulk actions, and detailed reporting."
  );

  assert.equal(result.persona.value, "sarah");
  assert.ok(result.persona.confidence >= 0.7);
  assert.match(result.reason, /used similar tools before|advanced settings|bulk actions|detailed reporting/i);
});

test("keeps overlapping persona evidence in Needs review", () => {
  const result = classifyFeedback("I have a small budget and would like guidance on how to spend it.");

  assert.equal(result.persona.value, "unknown");
  assert.equal(result.needsReview, true);
  assert.ok(result.suggestions.persona.some((item) => item.value === "alex"));
  assert.ok(result.suggestions.persona.some((item) => item.value === "lucy"));
});

test("does not infer retention from the word returns", () => {
  const result = classifyFeedback(
    "The sitemap crawl returns a 403 and canonical tags are missing from product pages."
  );

  assert.equal(result.journeyStage.value, "unknown");
  assert.equal(result.needsReview, true);
  assert.match(result.reason, /persona and journey stage need confirmation/i);
});

test("keeps ambiguous feedback in Needs review with suggestions", () => {
  const result = classifyFeedback("It could be better for our team.");

  assert.equal(result.needsReview, true);
  assert.ok(result.confidence < 0.7);
  assert.ok(result.suggestions.theme.length >= 1);
});

test("parses quoted CSV feedback and reports rows without a message", () => {
  const csv = [
    "feedback,email,source,date",
    '"The report is clear, but PDF export is slow",alex@example.com,survey,2026-08-17',
    '"",missing@example.com,survey,2026-08-18',
    '"Navigation, labels and forms are confusing",sam@example.com,interview,2026-08-19',
  ].join("\n");

  const result = parseFeedbackCsv(csv);

  assert.equal(result.items.length, 2);
  assert.equal(result.items[0].message, "The report is clear, but PDF export is slow");
  assert.equal(result.items[1].message, "Navigation, labels and forms are confusing");
  assert.deepEqual(result.errors, ["Row 3 has no feedback message."]);
});

test("builds stable IDs and deduplicates imported records", () => {
  const input = {
    message: "The report export is too slow.",
    email: "alex@example.com",
    source: "csv",
    submittedAt: "2026-08-17T10:00:00.000Z",
  };
  const first = buildFeedbackRecord(input);
  const duplicate = buildFeedbackRecord({ ...input, submittedAt: "2026-08-18T10:00:00.000Z" });

  assert.equal(first.id, duplicate.id);
  assert.equal(first.classification.theme.value, "performance");
  assert.equal(mergeFeedbackRecords([first], [duplicate]).length, 1);
});

test("preserves reviewer corrections when records are normalized again", () => {
  const record = buildFeedbackRecord({ message: "The wording is confusing.", source: "manual" });
  const reviewed = {
    ...record,
    reviewedAt: "2026-08-20T10:00:00.000Z",
    classification: {
      ...record.classification,
      persona: { value: "sarah", label: "Sarah - experienced operator", confidence: 1 },
      journeyStage: { value: "use", label: "Use", confidence: 1 },
      needsReview: false,
    },
  };

  const [normalized] = mergeFeedbackRecords([], [reviewed]);

  assert.equal(normalized.classification.persona.value, "sarah");
  assert.equal(normalized.classification.needsReview, false);
  assert.equal(normalized.reviewedAt, "2026-08-20T10:00:00.000Z");
});

test("retires reviewed role-based personas and reclassifies them with the current library", () => {
  const record = buildFeedbackRecord({
    message: "The sitemap crawl returns a 403.",
    source: "manual",
  });
  const stale = {
    ...record,
    reviewedAt: "2026-08-20T10:00:00.000Z",
    classification: {
      ...record.classification,
      persona: { value: "seo-specialist", label: "SEO specialist", confidence: 1 },
      journeyStage: { value: "use", label: "Use", confidence: 1 },
      needsReview: false,
    },
  };

  const [normalized] = mergeFeedbackRecords([], [stale]);

  assert.equal(normalized.classification.persona.value, "unknown");
  assert.equal(normalized.classification.needsReview, true);
  assert.equal(normalized.reviewedAt, undefined);
});

test("requires unresolved dimensions before feedback can be marked reviewed", () => {
  const classification = classifyFeedback("The sitemap crawl returns a 403.");

  assert.deepEqual(feedbackReviewGaps(classification), ["persona", "journey stage"]);
});

test("reclassifies unreviewed records when classifier rules improve", () => {
  const record = buildFeedbackRecord({
    message: "The sitemap crawl returns a 403.",
    source: "manual",
  });
  const stale = {
    ...record,
    classification: {
      ...record.classification,
      journeyStage: { value: "retain", label: "Retain", confidence: 0.8 },
      needsReview: false,
    },
  };

  const [normalized] = mergeFeedbackRecords([], [stale]);

  assert.equal(normalized.classification.journeyStage.value, "unknown");
  assert.equal(normalized.classification.needsReview, true);
});

test("preserves partial manual corrections through storage before review is complete", () => {
  let stored;
  const storage = { setItem: (_key, value) => { stored = value; }, getItem: () => stored };
  const record = buildFeedbackRecord({ message: "It could be better for our team." });
  const draft = {
    ...record,
    classificationEditedAt: "2026-10-06T12:00:00.000Z",
    classification: {
      ...record.classification,
      theme: { value: "content-clarity", label: "Content clarity", confidence: 1 },
      needsReview: true,
    },
  };
  persistFeedbackRecords([draft], storage);
  const [reloaded] = loadFeedbackRecords(storage);
  assert.equal(reloaded.classification.theme.value, "content-clarity");
  assert.equal(reloaded.classification.persona.value, "unknown");
  assert.equal(reloaded.classification.needsReview, true);
  assert.equal(reloaded.reviewedAt, undefined);
  assert.equal(reloaded.classificationEditedAt, draft.classificationEditedAt);
});

test("retires manual drafts with classifications absent from the current library", () => {
  const record = buildFeedbackRecord({ message: "The sitemap crawl returns a 403." });
  const [reloaded] = mergeFeedbackRecords([], [{
    ...record,
    classificationEditedAt: "2026-10-06T12:00:00.000Z",
    classification: { ...record.classification, persona: { value: "retired-persona", label: "Retired", confidence: 1 } },
  }]);
  assert.equal(reloaded.classification.persona.value, "unknown");
  assert.equal(reloaded.classificationEditedAt, undefined);
});
