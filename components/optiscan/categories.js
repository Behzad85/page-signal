"use client";

import { asArray, textValue } from "./utils";
import { richResultStatusLabel } from "../../lib/richResults";

// Maps the rich-result rollup onto a category status + one evidence line.
// "none" (no rich-result schema detected) is treated as neutral, not a fault.
function richResultsCategory(meta = {}) {
  const rr = meta?.richResults;
  if (!rr || !rr.summary?.total) {
    return { status: "ok", line: "Rich results: no eligible structured-data types detected." };
  }
  const { eligible, incomplete, invalid } = rr.summary;
  if (invalid) {
    return { status: "critical", line: `Rich results: ${invalid} type${invalid === 1 ? "" : "s"} not eligible (missing required fields), ${eligible} eligible.` };
  }
  if (incomplete) {
    return { status: "warning", line: `Rich results: ${eligible + incomplete} eligible, ${incomplete} missing recommended fields.` };
  }
  return { status: "ok", line: `Rich results: ${eligible} type${eligible === 1 ? "" : "s"} eligible (${richResultStatusLabel("eligible")}).` };
}

export const SEO_CATEGORY_DEFINITIONS = [
  {
    id: "on_page",
    label: "On-Page SEO",
    shortLabel: "On-Page",
    description: "Titles, descriptions, headings, content depth, internal links, media, and recommendations tied to visible page quality.",
  },
  {
    id: "technical",
    label: "Technical SEO",
    shortLabel: "Technical",
    description: "Crawlability, indexation, canonical tags, security, structured data, robots.txt, sitemap.xml, and implementation health.",
  },
  {
    id: "off_page",
    label: "Off-Page SEO",
    shortLabel: "Off-Page",
    description: "Backlinks, referring domains, authority, and link-profile quality. This needs an external backlink data source.",
  },
  {
    id: "performance",
    label: "Page Speed & Core Web Vitals",
    shortLabel: "Vitals",
    description: "Google performance signals including LCP, INP/TBT, CLS, Lighthouse diagnostics, and speed recommendations.",
  },
  {
    id: "social",
    label: "Social Media",
    shortLabel: "Social",
    description: "Links to Facebook, YouTube, Instagram, X, and LinkedIn profiles found in crawlable page markup.",
  },
];

const CATEGORY_BY_ID = Object.fromEntries(SEO_CATEGORY_DEFINITIONS.map((category) => [category.id, category]));

const CATEGORY_RULES = [
  {
    id: "performance",
    pattern: /\b(core web vitals?|page ?speed|performance|lcp|largest contentful paint|inp|interaction to next paint|tbt|total blocking time|cls|cumulative layout shift|lighthouse|load time|main thread|javascript|layout shift|speed)\b/i,
  },
  {
    id: "social",
    pattern: /\b(social|facebook|instagram|youtube|linkedin|twitter|x\.com|profiles?)\b/i,
  },
  {
    id: "off_page",
    pattern: /\b(backlinks?|referring domains?|authority score|domain authority|dofollow|nofollow|link profile|off-page|external authority)\b/i,
  },
  {
    id: "technical",
    pattern: /\b(technical|crawl|crawler|index|indexation|robots|sitemap|canonical|schema|structured data|json-ld|rich result|https|security|status|redirect|blocked|403|waf|cdn|llms\.txt|x-robots)\b/i,
  },
  {
    id: "on_page",
    pattern: /\b(on-page|title|meta description|snippet|h1|h2|heading|content|topic|thin|information gain|keyword|internal link|image|alt text|media|accessibility|entity|answer extraction|citation|source page)\b/i,
  },
];

const STATUS_WEIGHT = {
  critical: 5,
  missing: 4,
  warning: 3,
  not_measured: 2,
  ok: 1,
};

function categoryDefinition(id) {
  return CATEGORY_BY_ID[id] || CATEGORY_BY_ID.on_page;
}

export function categoryForText(value, fallback = "on_page") {
  const seed = textValue(value);
  return CATEGORY_RULES.find((rule) => rule.pattern.test(seed))?.id || fallback;
}

export function categoryLabel(id) {
  return categoryDefinition(id).label;
}

export function categoryShortLabel(id) {
  return categoryDefinition(id).shortLabel;
}

export function normalizeCategoryStatus(status) {
  if (["ok", "warning", "critical", "missing", "not_measured"].includes(status)) {
    return status;
  }
  return "warning";
}

export function categoryStatusLabel(status) {
  const safeStatus = normalizeCategoryStatus(status);
  if (safeStatus === "ok") return "Present";
  if (safeStatus === "critical") return "Critical";
  if (safeStatus === "missing") return "Missing";
  if (safeStatus === "not_measured") return "Not connected";
  return "Needs work";
}

export function categoryStatusClasses(status) {
  const safeStatus = normalizeCategoryStatus(status);

  if (safeStatus === "ok") {
    return {
      icon: "text-green-700",
      border: "border-green-500/30",
      bg: "bg-green-500/10",
      text: "text-green-700",
      rail: "shadow-[inset_3px_0_0_rgba(34,197,94,1)]",
    };
  }

  if (safeStatus === "critical" || safeStatus === "missing") {
    return {
      icon: "text-rose-700",
      border: "border-rose-400/30",
      bg: "bg-rose-400/10",
      text: "text-rose-700",
      rail: "shadow-[inset_3px_0_0_rgba(251,113,133,1)]",
    };
  }

  if (safeStatus === "not_measured") {
    return {
      icon: "text-ink-600",
      border: "border-ink-200",
      bg: "bg-white",
      text: "text-ink-800",
      rail: "shadow-[inset_3px_0_0_rgba(100,116,139,1)]",
    };
  }

  return {
    icon: "text-amber-700",
    border: "border-amber-400/30",
    bg: "bg-amber-400/10",
    text: "text-amber-700",
    rail: "shadow-[inset_3px_0_0_rgba(251,191,36,1)]",
  };
}

export function categoryEvidenceStatus(value, categoryStatus = "warning") {
  const explicitStatus = typeof value === "object" && value !== null ? value.status : "";
  if (explicitStatus) {
    return normalizeCategoryStatus(explicitStatus);
  }

  // Rule order is intentional: unavailable and negative evidence must be
  // classified before broad positive words such as "available" or "present".
  const text = textValue(value).toLowerCase();

  if (
    /\b(not connected|not measured|requires? an external|require an external|not available|unavailable|was not available|needs .* evidence|only detected during)\b/.test(
      text
    )
  ) {
    return "not_measured";
  }

  if (/\b(no content gaps?|no separate technical blocker|no major competitive gap|no unique page-level blocker)\b/.test(text)) {
    return "ok";
  }

  if (/\b(blocked|invalid|not eligible|missing required|critical|failed|fatal|403|401|429)\b/.test(text)) {
    return "critical";
  }

  if (/\b(missing|none detected|not found|no .* (?:links?|profiles?|schema)|without schema)\b/.test(text)) {
    return "missing";
  }

  if (/^schema:\s*(?!none detected|missing|unavailable)\S/.test(text)) {
    return "ok";
  }

  if (/\b(thin|minimal|duplicate|issues?|warnings?|poor|needs work|needs improvement|may affect|gap|fix|resolve)\b/.test(text)) {
    return "warning";
  }

  if (
    /\b(present|detected|available|eligible|healthy|usable|supported|passed|success|unique|descriptive|proper|has alt text|have alt text|profile link detected)\b/.test(
      text
    )
  ) {
    return "ok";
  }

  const fallback = normalizeCategoryStatus(categoryStatus);
  return fallback === "ok" || fallback === "not_measured" ? fallback : "warning";
}

function strongestStatus(statuses) {
  return statuses.map(normalizeCategoryStatus).toSorted((a, b) => STATUS_WEIGHT[b] - STATUS_WEIGHT[a])[0] || "ok";
}

function firstNonEmpty(values, fallback = "") {
  return values.map(textValue).find(Boolean) || fallback;
}

function findingText(item = {}) {
  if (typeof item === "string") return item;
  return firstNonEmpty([item.issue, item.finding, item.task, item.area, item.metric, item.advantage, item.impact, item.evidence]);
}

function findingCategoryStatus(item = {}) {
  const severity = textValue(item?.severity).toLowerCase();
  if (severity === "critical") return "critical";
  if (severity === "warning" || severity === "info") return "warning";

  const priority = textValue(item?.priority).toLowerCase();
  if (priority === "high") return "critical";
  if (priority === "medium" || priority === "low") return "warning";

  return categoryEvidenceStatus(findingText(item), "warning");
}

function evidenceItem(value, status) {
  const text = textValue(value);
  return text ? { text, status: normalizeCategoryStatus(status) } : null;
}

function evidenceText(value) {
  return typeof value === "object" && value !== null && "text" in value ? textValue(value.text) : textValue(value);
}

function normalizeEvidenceItem(value) {
  const text = evidenceText(value);
  if (!text) return null;

  if (typeof value === "object" && value !== null && value.status) {
    return { text, status: normalizeCategoryStatus(value.status) };
  }

  return text;
}

function hasUnavailableVitals(coreWebVitals = {}) {
  const status = textValue(coreWebVitals.status).toLowerCase();
  return !coreWebVitals || ["", "not_configured", "key_restricted", "unavailable"].includes(status);
}

function vitalsStatus(coreWebVitals = {}) {
  if (hasUnavailableVitals(coreWebVitals)) return "not_measured";

  const values = [
    coreWebVitals.field?.status,
    coreWebVitals.lab?.status,
    coreWebVitals.devices?.mobile?.field?.status,
    coreWebVitals.devices?.mobile?.lab?.status,
    coreWebVitals.devices?.desktop?.field?.status,
    coreWebVitals.devices?.desktop?.lab?.status,
  ]
    .map(textValue)
    .join(" ")
    .toLowerCase();

  if (/\b(critical|poor|fail)\b/.test(values)) return "critical";
  if (/\b(needs|warning|improvement|unavailable)\b/.test(values)) return "warning";
  return "ok";
}

function issueRowsForCategory(items, categoryId) {
  return asArray(items).filter((item) => categoryForText(findingText(item), "") === categoryId);
}

function signalValue(meta = {}, key) {
  return meta?.signals?.[key];
}

function socialProfiles(meta = {}) {
  return asArray(signalValue(meta, "socialProfiles")).filter((profile) => profile?.network || profile?.url);
}

function makeCategory(id, overrides = {}) {
  const definition = categoryDefinition(id);
  const status = normalizeCategoryStatus(overrides.status);

  return {
    id,
    label: definition.label,
    shortLabel: definition.shortLabel,
    description: definition.description,
    status,
    statusText: categoryStatusLabel(status),
    ok: overrides.ok || 0,
    issues: overrides.issues || 0,
    tickets: overrides.tickets || 0,
    evidence: asArray(overrides.evidence).map(normalizeEvidenceItem).filter(Boolean).slice(0, 6),
    recommendation: textValue(overrides.recommendation),
  };
}

function pageCategoryEvidence(result = {}, tickets = []) {
  const audit = result.audit || {};
  const meta = result.meta || {};
  const ticketList = asArray(tickets);
  const pageIssues = asArray(audit.technical?.issues);
  const topics = asArray(audit.content?.suggested_topics);
  const statusIssues = [audit.technical?.title, audit.technical?.meta, audit.technical?.h1].filter((item) => /missing|not ok|issue|warning|critical/i.test(textValue(item)));
  const byCategoryTickets = (id) => ticketList.filter((ticket) => ticket.category === id);
  const pageRichResults = richResultsCategory(meta);

  return [
    makeCategory("on_page", {
      status: pageIssues.length || topics.length || statusIssues.length ? "warning" : "ok",
      ok: 3 - Math.min(3, statusIssues.length),
      issues: pageIssues.length + topics.length + statusIssues.length,
      tickets: byCategoryTickets("on_page").length,
      evidence: [
        audit.technical?.title && `Title: ${audit.technical.title}`,
        audit.technical?.meta && `Meta: ${audit.technical.meta}`,
        audit.technical?.h1 && `H1: ${audit.technical.h1}`,
        topics.length ? `${topics.length} content gap${topics.length === 1 ? "" : "s"} suggested.` : "No content gaps returned.",
      ],
      recommendation: pageIssues.length || topics.length ? "Fix visible page elements and content gaps first because they directly affect relevance and snippet quality." : "Keep monitoring page copy, headings, and snippets after changes.",
    }),
    makeCategory("technical", {
      status: strongestStatus([
        pageIssues.length ? strongestStatus(pageIssues.map((issue) => categoryEvidenceStatus(issue, "warning"))) : "ok",
        pageRichResults.status,
      ]),
      ok: pageIssues.length ? 0 : 1,
      issues: pageIssues.length,
      tickets: byCategoryTickets("technical").length,
      evidence: [
        ...(pageIssues.length ? pageIssues.map((issue) => evidenceItem(issue, "warning")) : [evidenceItem("No separate technical blocker was returned in the Page Analysis response.", "ok")]),
        evidenceItem(pageRichResults.line, pageRichResults.status),
      ],
      recommendation: pageRichResults.status === "critical" ? "Fix the structured-data required-field errors so the page becomes eligible for rich results, then resolve remaining crawl/canonical issues." : pageIssues.length ? "Resolve crawl, schema, canonical, or implementation issues before expanding the content plan." : "Technical evidence looks usable for this page-level pass.",
    }),
    makeCategory("off_page", {
      status: "not_measured",
      evidence: ["Backlink, referring-domain, Authority Score, and dofollow/nofollow data are not connected in this MVP."],
      recommendation: "Connect a backlink provider or imported GSC link data before treating this as a real off-page audit.",
    }),
    makeCategory("performance", {
      status: vitalsStatus(meta.coreWebVitals),
      tickets: byCategoryTickets("performance").length,
      evidence: [hasUnavailableVitals(meta.coreWebVitals) ? "Core Web Vitals data is not available for this run." : "Core Web Vitals evidence is available in the Vitals tab."],
      recommendation: "Use the Vitals tab for metric definitions, affected symptoms, and exact performance fixes.",
    }),
    makeCategory("social", {
      status: "not_measured",
      evidence: ["Social profile links are only detected during Site Analysis HTML evidence collection."],
      recommendation: "Run Site Analysis when social profile presence matters for a domain-level audit.",
    }),
  ];
}

function siteCategoryEvidence(result = {}, tickets = []) {
  const audit = result.audit || {};
  const meta = result.meta || {};
  const ticketList = asArray(tickets);
  const notOk = asArray(audit.not_ok);
  const ok = asArray(audit.ok);
  const social = socialProfiles(meta);
  const socialNetworks = social.map((profile) => profile.network).filter(Boolean);
  const byCategoryTickets = (id) => ticketList.filter((ticket) => ticket.category === id);
  const categoryIssues = (id) => issueRowsForCategory(notOk, id);
  const categoryOk = (id) => issueRowsForCategory(ok, id);
  const hasRawSignals = Boolean(meta.signals);

  const onPageIssues = categoryIssues("on_page");
  const technicalIssues = categoryIssues("technical");
  const performanceStatus = vitalsStatus(meta.coreWebVitals);
  const siteRichResults = richResultsCategory(meta);

  return [
    makeCategory("on_page", {
      status: onPageIssues.length ? strongestStatus(onPageIssues.map(findingCategoryStatus)) : "ok",
      ok: categoryOk("on_page").length,
      issues: onPageIssues.length,
      tickets: byCategoryTickets("on_page").length,
      evidence: [
        ...categoryOk("on_page").slice(0, 2).map((item) => evidenceItem(findingText(item), "ok")),
        ...onPageIssues.slice(0, 3).map((item) => evidenceItem(findingText(item), findingCategoryStatus(item))),
        signalValue(meta, "wordCount") ? evidenceItem(`${signalValue(meta, "wordCount")} words detected.`, "ok") : null,
      ],
      recommendation: onPageIssues.length ? "Prioritize title, snippet, headings, content depth, media, and internal-link fixes that affect visible relevance." : "On-page basics are present in the sampled evidence.",
    }),
    makeCategory("technical", {
      status: strongestStatus([technicalIssues.length ? strongestStatus(technicalIssues.map(findingCategoryStatus)) : "ok", siteRichResults.status]),
      ok: categoryOk("technical").length,
      issues: technicalIssues.length,
      tickets: byCategoryTickets("technical").length,
      evidence: [
        ...technicalIssues.slice(0, 3).map((item) => evidenceItem(findingText(item), findingCategoryStatus(item))),
        evidenceItem(`Robots: ${signalValue(meta, "robots") ? "present" : "missing"}`, signalValue(meta, "robots") ? "ok" : "missing"),
        evidenceItem(`Sitemap: ${signalValue(meta, "sitemap") ? "present" : "missing"}`, signalValue(meta, "sitemap") ? "ok" : "missing"),
        evidenceItem(`Canonical: ${signalValue(meta, "canonical") ? "present" : "missing"}`, signalValue(meta, "canonical") ? "ok" : "missing"),
        evidenceItem(
          `Schema: ${asArray(signalValue(meta, "schemaTypes")).length ? asArray(signalValue(meta, "schemaTypes")).join(", ") : "none detected"}`,
          asArray(signalValue(meta, "schemaTypes")).length ? "ok" : "missing"
        ),
        evidenceItem(siteRichResults.line, siteRichResults.status),
      ],
      recommendation: siteRichResults.status === "critical" ? "Fix structured-data required-field errors so pages become rich-result eligible, then resolve crawl/indexation and canonical issues." : technicalIssues.length ? "Resolve crawl/indexation, canonical, schema, and structured-data issues before relying on content recommendations." : "Core technical files and markup are present in the sampled evidence.",
    }),
    makeCategory("off_page", {
      status: "not_measured",
      evidence: ["Backlinks, referring domains, Authority Score, and dofollow/nofollow balance require an external link index."],
      recommendation: "Add a backlink data provider or upload/link GSC external-link exports to make this category actionable.",
    }),
    makeCategory("performance", {
      status: performanceStatus,
      tickets: byCategoryTickets("performance").length,
      evidence: [hasUnavailableVitals(meta.coreWebVitals) ? "Google Core Web Vitals evidence is unavailable for this run." : "Mobile and Desktop performance evidence is available in the Vitals tab."],
      recommendation: performanceStatus === "ok" ? "Keep monitoring mobile and desktop because performance can regress after releases." : "Use the Vitals tab to fix LCP, INP/TBT, CLS, and Lighthouse opportunities.",
    }),
    makeCategory("social", {
      status: hasRawSignals ? (social.length ? "ok" : "missing") : "not_measured",
      ok: social.length,
      issues: hasRawSignals && !social.length ? 1 : 0,
      tickets: byCategoryTickets("social").length,
      evidence: social.length ? socialNetworks.map((network) => `${network} profile link detected.`) : ["No Facebook, YouTube, Instagram, X, or LinkedIn profile links were found in crawlable markup."],
      recommendation: social.length ? "Keep profile links crawlable and current in the footer, header, or organization profile area." : "Add official social profile links where users and search engines can verify the brand presence.",
    }),
  ];
}

function compareCategoryEvidence(result = {}, tickets = []) {
  const audit = result.audit || {};
  const ticketList = asArray(tickets);
  const gaps = asArray(audit.gaps);
  const actions = asArray(audit.action_plan);
  const strengths = asArray(audit.user_strengths);
  const byCategoryTickets = (id) => ticketList.filter((ticket) => ticket.category === id);
  const categoryGaps = (id) => [...gaps, ...actions].filter((item) => categoryForText(findingText(item), "") === id);
  const categoryWins = (id) => strengths.filter((item) => categoryForText(findingText(item), "") === id);

  return SEO_CATEGORY_DEFINITIONS.map((definition) => {
    if (definition.id === "off_page" || definition.id === "social") {
      return makeCategory(definition.id, {
        status: "not_measured",
        evidence: [`${definition.label} comparison needs ${definition.id === "off_page" ? "backlink/authority" : "social-profile"} evidence for all three sites.`],
        recommendation: definition.id === "off_page" ? "Connect backlink data before scoring off-page competitive strength." : "Collect social-profile evidence for all compared domains before scoring this category.",
      });
    }

    const issues = categoryGaps(definition.id);
    const wins = categoryWins(definition.id);
    const categoryTickets = byCategoryTickets(definition.id);
    return makeCategory(definition.id, {
      status: issues.length ? strongestStatus(issues.map(findingCategoryStatus)) : "ok",
      ok: wins.length,
      issues: issues.length,
      tickets: categoryTickets.length,
      evidence: [
        ...issues.slice(0, 3).map((item) => evidenceItem(findingText(item), findingCategoryStatus(item))),
        ...wins.slice(0, 2).map((item) => evidenceItem(findingText(item), "ok")),
      ],
      recommendation: issues.length ? `Close the ${definition.shortLabel.toLowerCase()} gaps that competitors are using as an advantage.` : `${definition.label} has no major competitive gap in the normalized report.`,
    });
  });
}

export const UX_CATEGORY_DEFINITIONS = [
  {
    id: "ux_visual",
    label: "Visual Design",
    shortLabel: "Visual",
    description: "Visual hierarchy, above-the-fold clarity, CTA prominence, and layout quality from the rendered screenshot review.",
  },
  {
    id: "ux_accessibility",
    label: "Accessibility",
    shortLabel: "A11y",
    description: "Lighthouse accessibility evidence plus raw HTML signals such as alt text coverage and form labeling.",
  },
  {
    id: "ux_mobile",
    label: "Mobile Experience",
    shortLabel: "Mobile",
    description: "Viewport configuration, tap target risks, and layout stability on mobile devices.",
  },
  {
    id: "ux_interaction",
    label: "Interaction & Forms",
    shortLabel: "Interaction",
    description: "Form labeling, navigation link clarity, and real-user interaction latency.",
  },
  {
    id: "ux_stability",
    label: "Speed & Stability",
    shortLabel: "Stability",
    description: "Core Web Vitals evidence covering loading, interaction latency, and layout shift.",
  },
];

function makeUxCategory(definition, overrides = {}) {
  const status = normalizeCategoryStatus(overrides.status);

  return {
    id: definition.id,
    label: definition.label,
    shortLabel: definition.shortLabel,
    description: definition.description,
    status,
    statusText: categoryStatusLabel(status),
    ok: overrides.ok || 0,
    issues: overrides.issues || 0,
    tickets: overrides.tickets || 0,
    evidence: asArray(overrides.evidence).map(normalizeEvidenceItem).filter(Boolean).slice(0, 6),
    recommendation: textValue(overrides.recommendation),
  };
}

function uxCategoryEvidence(result = {}, tickets = []) {
  const audit = result.audit || {};
  const meta = result.meta || {};
  const ticketList = asArray(tickets);
  const [visual, accessibility, mobile, interaction, stability] = UX_CATEGORY_DEFINITIONS;
  const accessibilityIssues = asArray(audit.accessibility?.issues);
  const mobileIssues = asArray(audit.mobile_experience?.issues);
  const interactionIssues = asArray(audit.interaction_feedback?.issues);
  const visualIssues = [...asArray(audit.visual_hierarchy?.issues), ...asArray(audit.readability?.issues)];
  const visionUsed = Boolean(meta.visionUsed);

  return [
    makeUxCategory(visual, {
      status: !visionUsed ? "not_measured" : visualIssues.length ? "warning" : "ok",
      issues: visualIssues.length,
      evidence: visionUsed ? [textValue(audit.visual_hierarchy?.finding), ...visualIssues.slice(0, 2).map(textValue)] : ["Screenshot vision review was not available for this run."],
      recommendation: visionUsed
        ? visualIssues.length
          ? "Address the screenshot-backed design findings first; they shape the first impression for every visitor."
          : "Visual hierarchy looks coherent in the rendered screenshot."
        : "Configure an OpenAI API key and Google PageSpeed key to enable the screenshot-backed design review.",
    }),
    makeUxCategory(accessibility, {
      status: accessibilityIssues.some((item) => item?.severity === "Critical") ? "critical" : accessibilityIssues.length ? "warning" : "ok",
      issues: accessibilityIssues.length,
      tickets: ticketList.filter((ticket) => /accessib|alt text|label|contrast/i.test(textValue(ticket.title))).length,
      evidence: accessibilityIssues.length ? accessibilityIssues.slice(0, 3).map((item) => textValue(item?.issue)) : [textValue(audit.accessibility?.assessment)],
      recommendation: accessibilityIssues.length ? "Fix accessibility issues before cosmetic design work; they block real users and carry compliance risk." : "Keep accessibility checks in CI to hold this state.",
    }),
    makeUxCategory(mobile, {
      status: mobileIssues.length ? "warning" : "ok",
      issues: mobileIssues.length,
      evidence: [textValue(audit.mobile_experience?.viewport), textValue(audit.mobile_experience?.tap_targets), ...mobileIssues.slice(0, 2).map(textValue)],
      recommendation: mobileIssues.length ? "Resolve viewport and layout stability issues; most traffic and the Lighthouse evidence are mobile-first." : "Mobile configuration evidence looks healthy.",
    }),
    makeUxCategory(interaction, {
      status: interactionIssues.length ? "warning" : "ok",
      issues: interactionIssues.length,
      evidence: [textValue(audit.interaction_feedback?.forms), textValue(audit.interaction_feedback?.navigation), ...interactionIssues.slice(0, 2).map(textValue)],
      recommendation: interactionIssues.length ? "Label form fields and clarify link text so every interactive element communicates its purpose." : "Forms and navigation evidence look usable.",
    }),
    makeUxCategory(stability, {
      status: vitalsStatus(meta.coreWebVitals),
      evidence: [hasUnavailableVitals(meta.coreWebVitals) ? "Core Web Vitals data is not available for this run." : "Core Web Vitals evidence is available in the Vitals tab."],
      recommendation: "Use the Vitals tab for INP, CLS, and Lighthouse diagnostics with exact fixes.",
    }),
  ];
}

export function buildSeoCategories(mode, result = {}, tickets = []) {
  if (mode === "page") return pageCategoryEvidence(result, tickets);
  if (mode === "site") return siteCategoryEvidence(result, tickets);
  if (mode === "ux") return uxCategoryEvidence(result, tickets);
  return compareCategoryEvidence(result, tickets);
}

export function categoryExportRows(categories = []) {
  const rows = asArray(categories);

  if (!rows.length) {
    return [{ Section: "SEO Categories", Note: "No category evidence returned." }];
  }

  return rows.map((category) => ({
    Section: "SEO Categories",
    Category: category.label,
    Status: category.statusText,
    "Healthy Signals": category.ok,
    Issues: category.issues,
    Tickets: category.tickets,
    Evidence: asArray(category.evidence).map(evidenceText).filter(Boolean).join("; "),
    Recommendation: category.recommendation,
  }));
}
