import { UX_PERSONAS } from "./personas.mjs";

export const FEEDBACK_STORAGE_KEY = "optiscan.feedback-library.generic.v1";
export const FEEDBACK_LIBRARY_LIMIT = 1000;

export const PERSONAS = [
  ...UX_PERSONAS,
  { value: "unknown", label: "Needs review", description: "There is not enough evidence to assign a persona confidently." },
];

export const FEEDBACK_THEMES = [
  { value: "technical-reliability", label: "Technical reliability" },
  { value: "performance", label: "Performance" },
  { value: "content-clarity", label: "Content clarity" },
  { value: "usability", label: "Usability" },
  { value: "accessibility", label: "Accessibility" },
  { value: "reporting", label: "Reporting and exports" },
  { value: "feature-request", label: "Feature request" },
  { value: "support", label: "Support" },
  { value: "pricing-value", label: "Pricing and value" },
  { value: "other", label: "Other" },
];

export const JOURNEY_STAGES = [
  { value: "discover", label: "Discover" },
  { value: "evaluate", label: "Evaluate" },
  { value: "convert", label: "Convert" },
  { value: "onboard", label: "Onboard" },
  { value: "use", label: "Use" },
  { value: "support", label: "Get support" },
  { value: "retain", label: "Retain" },
  { value: "unknown", label: "Needs review" },
];

export const SENTIMENTS = [
  { value: "positive", label: "Positive" },
  { value: "neutral", label: "Neutral" },
  { value: "negative", label: "Negative" },
];

export const SEVERITIES = [
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const PERSONA_RULES = {
  "alex": [
    {
      "term": "very limited budget",
      "weight": 6
    },
    {
      "term": "limited budget",
      "weight": 4
    },
    {
      "term": "small budget",
      "weight": 3
    },
    {
      "term": "unexpected charges",
      "weight": 5
    },
    {
      "term": "wasting money",
      "weight": 5
    },
    {
      "term": "waste money",
      "weight": 5
    },
    {
      "term": "bad idea",
      "weight": 4
    },
    {
      "term": "need someone to tell me",
      "weight": 4
    },
    {
      "term": "low commitment",
      "weight": 4
    },
    {
      "term": "guidance",
      "weight": 1
    }
  ],
  "lucy": [
    {
      "term": "first time",
      "weight": 6
    },
    {
      "term": "first-time",
      "weight": 6
    },
    {
      "term": "setup guide",
      "weight": 5
    },
    {
      "term": "getting started",
      "weight": 4
    },
    {
      "term": "plain-language examples",
      "weight": 4
    },
    {
      "term": "transparent pricing",
      "weight": 3
    },
    {
      "term": "new to this",
      "weight": 5
    },
    {
      "term": "first useful task",
      "weight": 5
    },
    {
      "term": "small budget",
      "weight": 3
    },
    {
      "term": "guidance",
      "weight": 1
    }
  ],
  "sarah": [
    {
      "term": "used similar tools before",
      "weight": 6
    },
    {
      "term": "advanced settings",
      "weight": 6
    },
    {
      "term": "bulk actions",
      "weight": 5
    },
    {
      "term": "full control",
      "weight": 4
    },
    {
      "term": "workflow limits",
      "weight": 4
    },
    {
      "term": "export formats",
      "weight": 4
    },
    {
      "term": "detailed reporting",
      "weight": 3
    },
    {
      "term": "know what i want",
      "weight": 4
    }
  ]
};

const THEME_RULES = {
  "technical-reliability": ["crawl", "crawler", "sitemap", "canonical", "index", "schema", "403", "404", "500", "error", "failed", "broken", "timeout", "api"],
  performance: ["too slow", "slow", "speed", "performance", "loading", "load time", "timeout", "lcp", "inp", "cls", "lighthouse"],
  "content-clarity": ["content", "copy", "wording", "headline", "confusing", "unclear", "readability", "tone", "description"],
  usability: ["usability", "navigation", "journey", "workflow", "form", "button", "interaction", "hard to", "confusing", "find"],
  accessibility: ["accessibility", "screen reader", "keyboard", "contrast", "alt text", "focus", "aria"],
  reporting: ["report", "pdf", "csv", "export", "dashboard", "chart", "score", "summary"],
  "feature-request": ["feature", "request", "add", "could you", "would like", "wish", "support for"],
  support: ["support", "help", "contact", "response", "ticket", "service"],
  "pricing-value": ["price", "pricing", "cost", "expensive", "value", "subscription", "billing"],
};

const JOURNEY_RULES = {
  discover: ["search result", "found", "discover", "landing page", "first visit"],
  evaluate: ["compare", "comparison", "demo", "trial", "evaluate", "proof", "case study", "review"],
  convert: ["sign up", "signup", "buy", "purchase", "checkout", "convert", "contact form", "book"],
  onboard: ["onboard", "setup", "getting started", "first scan", "create account", "invite"],
  use: ["dashboard", "report", "scan", "export", "workflow", "using", "daily", "ticket"],
  support: ["support", "help", "problem", "issue", "contact", "documentation"],
  retain: ["renew", "cancel", "subscription", "return", "keep using", "retention"],
};

const POSITIVE_WORDS = ["good", "great", "helpful", "clear", "easy", "love", "useful", "fast", "excellent", "works well", "happy"];
const NEGATIVE_WORDS = ["bad", "broken", "confusing", "unclear", "slow", "error", "failed", "missing", "cannot", "can't", "hard", "frustrating", "wrong"];
const HIGH_SEVERITY_WORDS = ["blocked", "cannot", "can't", "broken", "failed", "failure", "403", "500", "data loss", "security", "critical", "missing"];
const CRITICAL_WORDS = ["data breach", "exposed password", "account takeover", "production down", "payment failed for everyone"];

function normalizeText(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function labelFor(options, value) {
  return options.find((option) => option.value === value)?.label || value;
}

function matchesTerm(text, term) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}(?=$|[^a-z0-9])`, "i").test(text);
}

function scoreRules(text, rules, fallback, options, config = {}) {
  const normalized = text.toLowerCase();
  const matches = Object.entries(rules).map(([value, entries]) => {
    const matchedRules = entries
      .map((entry) => typeof entry === "string" ? { term: entry, weight: 1 } : entry)
      .filter((entry) => matchesTerm(normalized, entry.term));
    return {
      value,
      score: matchedRules.reduce((total, entry) => total + entry.weight, 0),
      matched: matchedRules.map((entry) => entry.term),
    };
  });
  matches.sort((left, right) => right.score - left.score || left.value.localeCompare(right.value));

  const top = matches[0];
  const second = matches[1];
  const minScore = config.minScore || 1;
  const ambiguous = Boolean(
    config.flagAmbiguity
    && top?.score >= minScore
    && second?.score > 0
    && top.score - second.score <= (config.ambiguityMargin ?? 0)
  );
  const suggestionItems = matches
    .filter((item) => item.score > 0)
    .slice(0, 2)
    .map((item) => ({
      value: item.value,
      label: labelFor(options, item.value),
      confidence: Math.min(0.95, 0.48 + item.score * 0.04),
    }));

  if (!top || top.score < minScore || ambiguous) {
    return {
      value: fallback,
      label: labelFor(options, fallback),
      confidence: ambiguous ? 0.48 : 0.35,
      matched: ambiguous ? [...new Set([...top.matched, ...second.matched])] : top?.matched || [],
      suggestions: suggestionItems.length
        ? suggestionItems
        : config.emptySuggestions
          ? []
          : matches.slice(0, 2).map((item) => ({ value: item.value, label: labelFor(options, item.value), confidence: 0.35 })),
    };
  }

  const margin = top.score - (second?.score || 0);
  const confidence = Math.min(0.96, 0.54 + top.score * 0.08 + margin * 0.05);
  return {
    value: top.value,
    label: labelFor(options, top.value),
    confidence,
    matched: top.matched,
    suggestions: suggestionItems,
  };
}

function sentimentFor(text) {
  const normalized = text.toLowerCase();
  const positive = POSITIVE_WORDS.filter((word) => matchesTerm(normalized, word));
  const negative = NEGATIVE_WORDS.filter((word) => matchesTerm(normalized, word));
  const value = negative.length > positive.length ? "negative" : positive.length > negative.length ? "positive" : "neutral";
  const confidence = positive.length + negative.length ? Math.min(0.95, 0.62 + Math.abs(positive.length - negative.length) * 0.1) : 0.5;
  return { value, label: labelFor(SENTIMENTS, value), confidence, matched: [...positive, ...negative] };
}

function severityFor(text, sentiment) {
  const normalized = text.toLowerCase();
  const critical = CRITICAL_WORDS.filter((word) => matchesTerm(normalized, word));
  const high = HIGH_SEVERITY_WORDS.filter((word) => matchesTerm(normalized, word));
  let value = "low";
  let confidence = 0.58;
  let matched = [];
  if (critical.length) {
    value = "critical";
    confidence = 0.92;
    matched = critical;
  } else if (high.length) {
    value = "high";
    confidence = Math.min(0.9, 0.7 + high.length * 0.06);
    matched = high;
  } else if (sentiment.value === "negative") {
    value = "medium";
    confidence = 0.68;
    matched = sentiment.matched;
  }
  return { value, label: labelFor(SEVERITIES, value), confidence, matched };
}

export function classifyFeedback(message) {
  const text = normalizeText(message);
  const persona = scoreRules(text, PERSONA_RULES, "unknown", PERSONAS, {
    minScore: 4,
    flagAmbiguity: true,
    ambiguityMargin: 1,
    emptySuggestions: true,
  });
  const theme = scoreRules(text, THEME_RULES, "other", FEEDBACK_THEMES);
  const journeyStage = scoreRules(text, JOURNEY_RULES, "unknown", JOURNEY_STAGES);
  const sentiment = sentimentFor(text);
  const severity = severityFor(text, sentiment);
  const confidence = Math.round(((persona.confidence + theme.confidence + sentiment.confidence) / 3) * 100) / 100;
  const needsReview = confidence < 0.7 || persona.value === "unknown" || theme.value === "other" || journeyStage.value === "unknown";
  const matched = [...new Set([...persona.matched, ...theme.matched, ...sentiment.matched, ...severity.matched])].slice(0, 6);
  const unresolved = [];
  if (persona.value === "unknown") unresolved.push("Persona");
  if (theme.value === "other") unresolved.push("Theme");
  if (journeyStage.value === "unknown") unresolved.push("Journey stage");
  const matchedReason = matched.length
    ? `Matched signals: ${matched.join(", ")}.`
    : "Not enough specific language was found for a confident classification.";
  const unresolvedLabel = unresolved.length > 1
    ? `${unresolved.slice(0, -1).join(", ")} and ${unresolved.at(-1)}`
    : unresolved[0];
  const reason = unresolved.length ? `${unresolvedLabel} ${unresolved.length === 1 ? "needs" : "need"} confirmation. ${matchedReason}` : matchedReason;

  return {
    persona: { value: persona.value, label: persona.label, confidence: persona.confidence },
    theme: { value: theme.value, label: theme.label, confidence: theme.confidence },
    journeyStage: { value: journeyStage.value, label: journeyStage.label, confidence: journeyStage.confidence },
    sentiment: { value: sentiment.value, label: sentiment.label, confidence: sentiment.confidence },
    severity: { value: severity.value, label: severity.label, confidence: severity.confidence },
    confidence,
    needsReview,
    reason,
    suggestions: {
      persona: persona.suggestions,
      theme: theme.suggestions.length ? theme.suggestions : FEEDBACK_THEMES.filter((item) => item.value !== "other").slice(0, 2).map((item) => ({ ...item, confidence: 0.35 })),
      journeyStage: journeyStage.suggestions.length ? journeyStage.suggestions : JOURNEY_STAGES.filter((item) => item.value !== "unknown").slice(0, 2).map((item) => ({ ...item, confidence: 0.35 })),
    },
  };
}

export function feedbackReviewGaps(classification = {}) {
  const gaps = [];
  const hasValue = (options, value, unresolvedValue) => options.some((option) => option.value === value) && value !== unresolvedValue;
  if (!hasValue(PERSONAS, classification.persona?.value, "unknown")) gaps.push("persona");
  if (!hasValue(FEEDBACK_THEMES, classification.theme?.value, "other")) gaps.push("theme");
  if (!hasValue(JOURNEY_STAGES, classification.journeyStage?.value, "unknown")) gaps.push("journey stage");
  if (!hasValue(SENTIMENTS, classification.sentiment?.value)) gaps.push("sentiment");
  if (!hasValue(SEVERITIES, classification.severity?.value)) gaps.push("severity");
  return gaps;
}

function stableHash(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36).padStart(7, "0");
}

export function buildFeedbackRecord(input = {}) {
  const message = normalizeText(input.message);
  const email = normalizeText(input.email);
  const source = normalizeText(input.source) || "manual";
  const submittedAt = input.submittedAt && !Number.isNaN(Date.parse(input.submittedAt)) ? new Date(input.submittedAt).toISOString() : new Date().toISOString();
  // Keep explicit manual drafts, including unresolved dimensions, while allowing
  // untouched automatic classifications and retired libraries to be refreshed.
  const savedClassification = input.classification && typeof input.classification === "object" && [
    ["persona", PERSONAS], ["theme", FEEDBACK_THEMES], ["journeyStage", JOURNEY_STAGES],
    ["sentiment", SENTIMENTS], ["severity", SEVERITIES],
  ].every(([key, options]) => options.some((option) => option.value === input.classification[key]?.value));
  const reviewedClassification = savedClassification && input.reviewedAt && feedbackReviewGaps(input.classification).length === 0;
  const manualDraft = savedClassification && input.classificationEditedAt;
  const classification = reviewedClassification || manualDraft ? input.classification : classifyFeedback(message);
  const fingerprint = [message.toLowerCase(), email.toLowerCase(), source.toLowerCase()].join("|");

  return {
    id: input.id || `FB-${stableHash(fingerprint).toUpperCase()}`,
    message,
    email,
    source,
    submittedAt,
    importedAt: input.importedAt || new Date().toISOString(),
    context: input.context && typeof input.context === "object" ? input.context : undefined,
    reviewedAt: reviewedClassification ? input.reviewedAt : undefined,
    classificationEditedAt: manualDraft ? input.classificationEditedAt : undefined,
    classification,
  };
}

function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  const input = String(text || "").replace(/^\uFEFF/, "");

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    const next = input[index + 1];
    if (character === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && next === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }
  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

const HEADER_ALIASES = {
  message: ["message", "feedback", "comment", "review", "text"],
  email: ["email", "customer email", "user email"],
  source: ["source", "channel", "origin"],
  submittedAt: ["date", "submitted at", "created at", "timestamp"],
};

function headerIndex(headers, aliases) {
  return headers.findIndex((header) => aliases.includes(header));
}

export function parseFeedbackCsv(text) {
  const rows = parseCsvRows(text);
  if (rows.length < 2) return { items: [], errors: ["CSV must include a header row and at least one feedback row."] };

  const headers = rows[0].map((header) => normalizeText(header).toLowerCase());
  const indexes = Object.fromEntries(Object.entries(HEADER_ALIASES).map(([key, aliases]) => [key, headerIndex(headers, aliases)]));
  if (indexes.message < 0) return { items: [], errors: ["CSV needs a feedback, message, comment, review, or text column."] };

  const items = [];
  const errors = [];
  rows.slice(1, FEEDBACK_LIBRARY_LIMIT + 1).forEach((row, offset) => {
    const message = normalizeText(row[indexes.message]);
    if (!message) {
      errors.push(`Row ${offset + 2} has no feedback message.`);
      return;
    }
    const valueAt = (index) => (index >= 0 ? normalizeText(row[index]) : "");
    items.push({
      message,
      email: valueAt(indexes.email),
      source: valueAt(indexes.source) || "csv",
      submittedAt: valueAt(indexes.submittedAt) || undefined,
    });
  });
  if (rows.length - 1 > FEEDBACK_LIBRARY_LIMIT) errors.push(`Only the first ${FEEDBACK_LIBRARY_LIMIT} feedback rows were imported.`);
  return { items, errors };
}

export function mergeFeedbackRecords(existing = [], incoming = []) {
  const records = new Map();
  for (const raw of [...incoming, ...existing]) {
    const record = buildFeedbackRecord(raw);
    if (record.message && !records.has(record.id)) records.set(record.id, record);
  }
  return [...records.values()]
    .sort((left, right) => Date.parse(right.submittedAt) - Date.parse(left.submittedAt))
    .slice(0, FEEDBACK_LIBRARY_LIMIT);
}

export function loadFeedbackRecords(storage = typeof window !== "undefined" ? window.localStorage : undefined) {
  if (!storage) return [];
  try {
    const parsed = JSON.parse(storage.getItem(FEEDBACK_STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? mergeFeedbackRecords([], parsed) : [];
  } catch {
    return [];
  }
}

export function persistFeedbackRecords(records, storage = typeof window !== "undefined" ? window.localStorage : undefined) {
  const normalized = mergeFeedbackRecords([], records);
  if (storage) storage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function saveFeedbackRecord(input, storage = typeof window !== "undefined" ? window.localStorage : undefined) {
  const record = buildFeedbackRecord(input);
  return persistFeedbackRecords(mergeFeedbackRecords(loadFeedbackRecords(storage), [record]), storage);
}
