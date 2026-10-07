"use client";

import { useMemo, useState } from "react";
import { CheckCircleOutlineOutlined as CheckCircle2 } from "../design/icons";
import { ExpandMoreOutlined as ChevronDown } from "../design/icons";
import { ContentCopyOutlined as Copy } from "../design/icons";
import { LayersOutlined as Layers3 } from "../design/icons";
import { SearchOutlined as Search } from "../design/icons";
import { categoryForText, categoryShortLabel } from "./categories";
import { asArray, copyToClipboard, textValue } from "./utils";
import { SeverityPill } from "./ui";
import { securityTicketFindings } from "../../lib/securitySchema.mjs";

export function siteCrawlSummary(meta = {}) {
  const crawl = meta?.crawl?.siteCrawl || {};
  const totals = crawl.totals || {};
  const pages = asArray(crawl.pages);
  const inferredSuccessfulPages = pages.filter((page) => page?.ok !== false && (!page?.status || Number(page.status) < 400)).length;
  const repeatedIssues =
    (totals.missingTitles || 0) +
    (totals.missingMeta || 0) +
    (totals.missingH1 || 0) +
    (totals.thinPages || 0) +
    (totals.duplicateTitles || 0) +
    (totals.duplicateMetaDescriptions || 0);

  return {
    enabled: Boolean(crawl.enabled),
    pages,
    discoveredUrls: crawl.discoveredUrls || 0,
    pagesFetched: totals.pagesFetched || pages.length || 1,
    pagesSuccessful: totals.pagesSuccessful || inferredSuccessfulPages,
    averageWords: totals.averageWords || 0,
    pagesWithoutSchema: totals.pagesWithoutSchema || 0,
    repeatedIssues,
  };
}

function cleanSentence(value) {
  return textValue(value).replace(/[.]+$/g, "");
}

function lowerFirst(value) {
  const text = cleanSentence(value);
  return text ? `${text.charAt(0).toLowerCase()}${text.slice(1)}` : "";
}

function firstText(values) {
  return values.map(textValue).find(Boolean) || "";
}

function normalizeTicketPriority(value, fallback = "Medium") {
  const text = String(value || "").toLowerCase();
  if (text.includes("critical") || text.includes("high")) return "High";
  if (text.includes("low") || text.includes("info")) return "Low";
  if (text.includes("medium") || text.includes("warning")) return "Medium";
  return fallback;
}

function normalizeTicketSource(value) {
  const text = textValue(value).toLowerCase();
  if (!text) return "General";
  if (text.includes("technical") || text.includes("not ok") || text.includes("gap")) return "Fix now";
  if (text.includes("action") || text.includes("do next") || text.includes("recommendation")) return "Fix later";
  if (text.includes("content")) return "Nice to have";
  if (text.includes("fix now") || text.includes("fix later") || text.includes("nice to have")) return textValue(value);
  return textValue(value);
}

function splitTicketSources(value) {
  return textValue(value)
    .split(",")
    .map(normalizeTicketSource)
    .filter(Boolean);
}

function ticketTitle(item, fallback) {
  if (typeof item === "string") {
    return cleanSentence(item);
  }

  return cleanSentence(firstText([item?.task, item?.area, item?.issue, item?.finding, item?.metric, item?.advantage, fallback]));
}

function ticketDetails(parts) {
  return parts.map(cleanSentence).filter(Boolean).join(". ");
}

const TICKET_ELEMENT_HINT_RULES = [
  {
    pattern: /\b(content security policy|csp|hsts|strict transport|x-content-type|referrer-policy|permissions-policy|clickjacking|cookie|cors|mixed content|tls|certificate|source maps?|server version|x-powered-by|iframe|subresource integrity|security posture)\b/i,
    elements: ["HTTP response headers", "Set-Cookie response headers", "TLS/CDN configuration", "public HTML markup"],
    references: ["scripts", "content"],
    clue: "Inspect the exact response headers and affected URL in browser developer tools or curl, then update the owning CDN, reverse proxy, application middleware, cookie configuration, or page markup.",
  },
  {
    pattern: /\b(403|blocked|crawler access|access denied|bot protection|waf|cdn|firewall|rate-limit|rate limit)\b/i,
    elements: ["CDN/WAF bot protection rule", "server response for the affected URL", "robots.txt"],
    references: ["crawl", "robots"],
    clue: "Check CDN/WAF, firewall, middleware, and server logs for the affected URL. Confirm Googlebot and browser-like user agents receive a 200 HTML response.",
  },
  {
    pattern: /\bmeta description\b|<meta[^>]+description/i,
    elements: ['<meta name="description">', "head metadata component", "page SEO/CMS description field"],
    references: ["metaDescription"],
    clue: 'Search the rendered source for `<meta name="description">`, then update the page metadata, CMS SEO field, or Next.js `metadata.description` owner.',
  },
  {
    pattern: /\b(title tag|page title|title evidence|titles?|duplicate titles?|<title>|title does not|missing title)\b/i,
    elements: ["<title>", "head title metadata", "page SEO title field"],
    references: ["title"],
    clue: "Search the rendered source for `<title>` and trace it back to the page metadata, layout metadata, CMS SEO title, or template title helper.",
  },
  {
    pattern: /\b(h1|multiple h1|missing h1|heading structure|heading hierarchy)\b/i,
    elements: ["<h1>", "<h2>", "main page heading component"],
    references: ["h1", "h2"],
    clue: "Inspect the rendered heading outline and search the template for `<h1>` / heading components that control the affected page section.",
  },
  {
    pattern: /\b(h2|sections|section headings|scanability|answer extraction)\b/i,
    elements: ["<h2>", "content section components", "article/main body blocks"],
    references: ["h2", "content"],
    clue: "Inspect `main` or `article` content for descriptive `<h2>` sections and update the CMS blocks or page component that owns the body structure.",
  },
  {
    pattern: /\bcanonical\b/i,
    elements: ['<link rel="canonical">', "head link metadata", "canonical URL helper"],
    references: ["canonical"],
    clue: 'Search the rendered source for `rel="canonical"` and verify the canonical URL is generated by the correct route, CMS, or metadata helper.',
  },
  {
    pattern: /\b(schema|structured data|json-ld|rich result|rich snippets?)\b/i,
    elements: ['<script type="application/ld+json">', "schema builder", "microdata itemtype markup"],
    references: ["schema"],
    clue: "Search for JSON-LD or schema builder code and validate the affected URL with structured data testing after updating the markup.",
  },
  {
    pattern: /\b(image|images|alt text|media|hero image|lcp)\b/i,
    elements: ["img[alt]", "hero image/media component", "above-the-fold image asset"],
    references: ["images"],
    clue: "Inspect rendered images for missing `alt`, dimensions, lazy-loading, and compression. Trace large hero media back to the image component or CMS asset.",
  },
  {
    pattern: /\b(cls|layout shift|visual stability)\b/i,
    elements: ["img width/height attributes", "iframe/embed containers", "ad or injected content slots"],
    references: ["images", "content"],
    clue: "Look for media, embeds, or injected components without reserved dimensions. Add stable width, height, aspect-ratio, or skeleton space.",
  },
  {
    pattern: /\b(inp|tbt|javascript|third-party|hydration|main thread|interaction)\b/i,
    elements: ["client JavaScript bundle", "interactive component event handlers", "third-party script tags"],
    references: ["scripts"],
    clue: "Profile long tasks, third-party scripts, and client component hydration around the affected interaction; split or defer blocking JavaScript.",
  },
  {
    pattern: /\b(robots\.txt|robots|indexing|noindex|crawl)\b/i,
    elements: ["/robots.txt", 'X-Robots-Tag header', '<meta name="robots">'],
    references: ["robots"],
    clue: "Fetch `/robots.txt`, inspect `X-Robots-Tag`, and search rendered source for `<meta name=\"robots\">` before changing crawl/indexing rules.",
  },
  {
    pattern: /\b(sitemap|xml sitemap)\b/i,
    elements: ["/sitemap.xml", "XML sitemap route", "robots.txt Sitemap directive"],
    references: ["sitemap"],
    clue: "Open `/sitemap.xml`, confirm the affected URL is included with a valid canonical URL, and verify `robots.txt` advertises the sitemap when appropriate.",
  },
  {
    pattern: /\b(llms\.txt|ai discoverability|ai crawler|ai readiness)\b/i,
    elements: ["/llms.txt", "AI crawler guidance file", "source/reference pages"],
    references: ["llms"],
    clue: "Check whether `/llms.txt` exists and points AI crawlers to concise source pages, definitions, citations, and answer-ready content.",
  },
  {
    pattern: /\b(internal link|internal links|navigation|orphan|link structure)\b/i,
    elements: ["nav a[href]", "main a[href]", "related links module"],
    references: ["internalLinks"],
    clue: "Inspect navigation, body links, breadcrumbs, and related-content components for crawlable internal links to and from the affected URL.",
  },
  {
    pattern: /\b(external link|citation|citations|source pages|reference section|authoritative sources)\b/i,
    elements: ["source/citation links", "reference section", "supporting evidence block"],
    references: ["externalLinks", "content"],
    clue: "Add or improve visible source links and citation sections near the claim or recommendation that needs stronger evidence.",
  },
  {
    pattern: /\b(social|facebook|instagram|youtube|linkedin|twitter|x\.com|profiles?)\b/i,
    elements: ["footer social links", "header social links", "Organization sameAs schema"],
    references: ["socialLinks", "schema", "externalLinks"],
    clue: "Search footer, header, organization profile, and schema `sameAs` markup for official social profile links.",
  },
  {
    pattern: /\b(backlinks?|referring domains?|authority score|domain authority|dofollow|nofollow|link profile|off-page)\b/i,
    elements: ["external backlink data source", "referring-domain export", "link profile dashboard"],
    references: ["externalLinks"],
    clue: "Connect or import backlink evidence before creating implementation work; page markup alone cannot validate off-page authority.",
  },
  {
    pattern: /\b(accessibility|a11y|label|aria)\b/i,
    elements: ["img[alt]", "form label", "button accessible name", "aria attributes"],
    references: ["images", "content"],
    clue: "Inspect the accessibility tree for unnamed controls, missing labels, and media without useful alternatives on the affected page.",
  },
  {
    pattern: /\b(thin|word count|content depth|content gap|missing topic|information gain|entity|entities|topic coverage)\b/i,
    elements: ["main content area", "article body", "CMS content blocks", "FAQ/definition sections"],
    references: ["content", "h2"],
    clue: "Search the page body for the missing topic or entity, then update the owning content block, FAQ, comparison section, or source-backed explanation.",
  },
];

function uniqueTextList(items) {
  const seen = new Set();
  return items
    .map(textValue)
    .filter(Boolean)
    .filter((item) => {
      const key = item.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
}

function referencesForRules(rules, markupReferenceMap = {}) {
  return uniqueTextList(
    rules.flatMap((rule) => asArray(rule.references).flatMap((key) => asArray(markupReferenceMap[key])))
  ).slice(0, 8);
}

function inferTicketDeveloperHints(parts, markupReferenceMap = {}) {
  const seed = parts.map(textValue).filter(Boolean).join(" ");
  const matches = TICKET_ELEMENT_HINT_RULES.filter((rule) => rule.pattern.test(seed));
  const affectedElements = uniqueTextList(matches.flatMap((rule) => rule.elements)).slice(0, 6);
  const markupReferences = referencesForRules(matches, markupReferenceMap);
  const developerClue = firstText(matches.map((rule) => rule.clue));

  return {
    affectedElements: affectedElements.length
      ? affectedElements
      : ["rendered HTML for the affected URL", "owning page template, route component, or CMS content field"],
    markupReferences: markupReferences.length
      ? markupReferences
      : ["rendered HTML source for the affected URL", "owning page template, route component, or CMS content field"],
    developerClue:
      developerClue ||
      "Inspect the rendered HTML for the affected URL, then trace the failing signal back to the page template, route component, CMS field, or server response that owns it.",
  };
}

const ROOT_CAUSE_RULES = [
  {
    pattern: /\b(content security policy|csp|hsts|strict transport|x-content-type|referrer-policy|permissions-policy|clickjacking|cookie|cors|mixed content|tls|certificate|source maps?|server version|x-powered-by|iframe|subresource integrity|security posture)\b/i,
    rootCause: "Public security posture",
    impact: "High",
    effort: "Medium",
    confidence: "High",
  },
  {
    pattern: /\b(403|blocked|crawler access|access denied|bot protection|waf|cdn|firewall|robots|indexing|sitemap|crawl)\b/i,
    rootCause: "Crawler access and indexability",
    impact: "High",
    effort: "High",
    confidence: "High",
  },
  {
    pattern: /\b(meta descriptions?|duplicate meta|title tag|page title|titles?|duplicate titles?|snippet|canonical|<title>|description)\b/i,
    rootCause: "Metadata and snippets",
    impact: "High",
    effort: "Low",
    confidence: "High",
  },
  {
    pattern: /\b(h1|h2|heading|sections|section headings|heading hierarchy)\b/i,
    rootCause: "Heading and content structure",
    impact: "Medium",
    effort: "Medium",
    confidence: "High",
  },
  {
    pattern: /\b(thin|word count|content depth|content gap|missing topic|information gain|entity|entities|faq|answer extraction)\b/i,
    rootCause: "Content depth and information gain",
    impact: "High",
    effort: "Medium",
    confidence: "Medium",
  },
  {
    pattern: /\b(schema|structured data|json-ld|rich result|entity clarity)\b/i,
    rootCause: "Schema and entity clarity",
    impact: "Medium",
    effort: "Medium",
    confidence: "High",
  },
  {
    pattern: /\b(lcp|inp|cls|tbt|core web vitals|performance|javascript|layout shift|main thread)\b/i,
    rootCause: "Performance and Core Web Vitals",
    impact: "High",
    effort: "High",
    confidence: "Medium",
  },
  {
    pattern: /\b(image|images|alt text|media|accessibility|a11y|aria)\b/i,
    rootCause: "Media accessibility",
    impact: "Medium",
    effort: "Low",
    confidence: "High",
  },
  {
    pattern: /\b(internal link|internal links|navigation|orphan|link structure|breadcrumbs)\b/i,
    rootCause: "Internal linking and crawl paths",
    impact: "Medium",
    effort: "Medium",
    confidence: "Medium",
  },
  {
    pattern: /\b(llms\.txt|ai discoverability|ai crawler|ai readiness|source pages|citations)\b/i,
    rootCause: "AI discoverability and source evidence",
    impact: "Medium",
    effort: "Medium",
    confidence: "Medium",
  },
  {
    pattern: /\b(social|facebook|instagram|youtube|linkedin|twitter|x\.com|profiles?)\b/i,
    rootCause: "Social profile discoverability",
    impact: "Low",
    effort: "Low",
    confidence: "Medium",
  },
  {
    pattern: /\b(backlinks?|referring domains?|authority score|domain authority|dofollow|nofollow|link profile|off-page)\b/i,
    rootCause: "Off-page authority data gap",
    impact: "Medium",
    effort: "Medium",
    confidence: "Medium",
  },
  {
    pattern: /\b(competitor|comparison|gap|advantage|parity|wins)\b/i,
    rootCause: "Competitive parity",
    impact: "High",
    effort: "Medium",
    confidence: "Medium",
  },
];

function rankLevel(value) {
  if (value === "High") return 3;
  if (value === "Medium") return 2;
  return 1;
}

function levelFromRank(rank) {
  if (rank >= 3) return "High";
  if (rank === 2) return "Medium";
  return "Low";
}

function effortScore(value) {
  if (value === "High") return 5;
  if (value === "Medium") return 3;
  return 1;
}

function inferRootCause(parts) {
  const seed = parts.map(textValue).filter(Boolean).join(" ");
  return ROOT_CAUSE_RULES.find((rule) => rule.pattern.test(seed))?.rootCause || "General SEO implementation";
}

function inferTicketScoring({ parts, priority, markupReferences }) {
  const seed = parts.map(textValue).filter(Boolean).join(" ");
  const matches = ROOT_CAUSE_RULES.filter((rule) => rule.pattern.test(seed));
  const baseImpact = priority === "High" ? "High" : priority === "Low" ? "Low" : "Medium";
  const impact = levelFromRank(Math.max(rankLevel(baseImpact), ...matches.map((rule) => rankLevel(rule.impact))));
  const effort = levelFromRank(Math.max(1, ...matches.map((rule) => rankLevel(rule.effort))));
  const referenceText = textValue(markupReferences).toLowerCase();
  const fallbackReference = !referenceText || referenceText.includes("not captured") || referenceText.includes("rendered html source");
  const confidence = fallbackReference ? "Medium" : levelFromRank(Math.max(2, ...matches.map((rule) => rankLevel(rule.confidence))));

  return {
    seoImpact: impact,
    impactScore: rankLevel(impact) + (priority === "High" ? 2 : priority === "Medium" ? 1 : 0),
    effort,
    effortScore: effortScore(effort),
    confidence,
    priorityRationale: `${impact} SEO impact, ${effort.toLowerCase()} implementation effort, and ${confidence.toLowerCase()} confidence based on normalized evidence, priority, and markup references.`,
  };
}

function ticketUrlContext(mode, result) {
  const meta = result?.meta || {};
  const urls = asArray(meta.urls);
  const primaryUrl = meta.url || urls[0]?.url || "";

  if (mode === "compare") {
    const competitorUrls = urls.slice(1).map((item) => item.url).filter(Boolean);
    return {
      url: primaryUrl,
      detail: ticketDetails([
        primaryUrl && `User site URL: ${primaryUrl}`,
        competitorUrls.length ? `Compared against: ${competitorUrls.join(", ")}` : "",
      ]),
    };
  }

  return {
    url: primaryUrl,
    detail: primaryUrl ? `Affected URL: ${primaryUrl}` : "",
  };
}

function ticketMarkupContext(mode, result) {
  const meta = result?.meta || {};

  if (mode === "compare") {
    return asArray(meta.markupReferences)[0]?.references || {};
  }

  return meta.markupReferences || {};
}

function createTicket({
  title,
  priority,
  source,
  action,
  outcome,
  technicalDetails,
  acceptanceCriteria,
  personaAcceptanceCriteria,
  url,
  urlContext,
  affectedElements,
  markupReferenceMap,
  markupReferences,
  developerClue,
  personas,
}) {
  const safeTitle = cleanSentence(title) || "Complete SEO improvement";
  const safeAction = lowerFirst(action || safeTitle) || "complete this improvement";
  const safeOutcome = lowerFirst(outcome || "the report improves on the next scan") || "the report improves on the next scan";
  const safeUrl = textValue(url);
  const safeTechnicalDetails = cleanSentence(technicalDetails) || `Implement and validate this recommendation: ${safeTitle}.`;
  const criteria = asArray(acceptanceCriteria).map(cleanSentence).filter(Boolean);
  const personaCriteria = asArray(personaAcceptanceCriteria)
    .map((item) => ({ persona_id: cleanSentence(item?.persona_id || "shared"), criterion: cleanSentence(item?.criterion || item) }))
    .filter((item) => item.criterion);
  const inferredHints = inferTicketDeveloperHints([safeTitle, source, action, outcome, safeTechnicalDetails, urlContext, safeUrl], markupReferenceMap);
  const safeAffectedElements = uniqueTextList(asArray(affectedElements)).length
    ? uniqueTextList(asArray(affectedElements))
    : inferredHints.affectedElements;
  const safeMarkupReferences = uniqueTextList(asArray(markupReferences)).length
    ? uniqueTextList(asArray(markupReferences))
    : inferredHints.markupReferences;
  const rootCause = inferRootCause([safeTitle, source, action, outcome, safeTechnicalDetails, urlContext, safeUrl]);
  const category = categoryForText([safeTitle, rootCause, source, action, outcome, safeTechnicalDetails, urlContext, safeUrl].join(" "));
  const scoring = inferTicketScoring({
    parts: [safeTitle, rootCause, source, action, outcome, safeTechnicalDetails, urlContext, safeUrl],
    priority: normalizeTicketPriority(priority),
    markupReferences: safeMarkupReferences,
  });

  return {
    title: safeTitle,
    priority: normalizeTicketPriority(priority),
    source: normalizeTicketSource(source || "Report"),
    url: safeUrl,
    category,
    rootCause,
    relatedFindings: [safeTitle],
    personas: uniqueTextList(asArray(personas)),
    ...scoring,
    userStory: `As an SEO owner, I want to ${safeAction} so that ${safeOutcome}.`,
    technicalDetails: ticketDetails([urlContext || (safeUrl ? `URL: ${safeUrl}` : ""), safeTechnicalDetails]),
    affectedElements: safeAffectedElements,
    markupReferences: safeMarkupReferences,
    developerClue: cleanSentence(developerClue || inferredHints.developerClue),
    acceptanceCriteria: criteria.length
      ? criteria
      : [
          "The change is implemented on the affected page or site area",
          "The update is visible in rendered HTML or supporting crawl evidence",
          "A follow-up PageSignal report shows the issue resolved or reduced",
        ],
    personaAcceptanceCriteria: personaCriteria,
  };
}

function higherPriority(left, right) {
  return rankLevel(normalizeTicketPriority(left?.priority)) > rankLevel(normalizeTicketPriority(right?.priority)) ? left : right;
}

function mergeTicketGroup(existing, incoming) {
  const primary = higherPriority(incoming, existing);
  const secondary = primary === incoming ? existing : incoming;
  const relatedFindings = uniqueTextList([
    ...asArray(existing.relatedFindings),
    ...asArray(incoming.relatedFindings),
    existing.title,
    incoming.title,
  ]);
  const source = uniqueTextList([...splitTicketSources(existing.source), ...splitTicketSources(incoming.source)]).join(", ");
  const acceptanceCriteria = uniqueTextList([...asArray(existing.acceptanceCriteria), ...asArray(incoming.acceptanceCriteria)]).slice(0, 8);
  const personaAcceptanceCriteria = [...asArray(existing.personaAcceptanceCriteria), ...asArray(incoming.personaAcceptanceCriteria)]
    .filter((item, index, list) => list.findIndex((candidate) => `${candidate?.persona_id}|${candidate?.criterion}` === `${item?.persona_id}|${item?.criterion}`) === index)
    .slice(0, 12);
  const impact = levelFromRank(Math.max(rankLevel(existing.seoImpact), rankLevel(incoming.seoImpact)));
  const effort = levelFromRank(Math.max(rankLevel(existing.effort), rankLevel(incoming.effort)));
  const confidence = levelFromRank(Math.max(rankLevel(existing.confidence), rankLevel(incoming.confidence)));

  return {
    ...primary,
    source,
    relatedFindings,
    personas: uniqueTextList([...asArray(existing.personas), ...asArray(incoming.personas)]),
    seoImpact: impact,
    impactScore: Math.max(existing.impactScore || 0, incoming.impactScore || 0),
    effort,
    effortScore: Math.max(existing.effortScore || 0, incoming.effortScore || 0),
    confidence,
    priorityRationale: `${impact} SEO impact, ${effort.toLowerCase()} implementation effort, and ${confidence.toLowerCase()} confidence across ${relatedFindings.length} grouped finding${relatedFindings.length === 1 ? "" : "s"}.`,
    technicalDetails: ticketDetails([
      primary.technicalDetails,
      secondary.technicalDetails && secondary.technicalDetails !== primary.technicalDetails ? `Related finding: ${secondary.technicalDetails}` : "",
    ]),
    affectedElements: uniqueTextList([...asArray(existing.affectedElements), ...asArray(incoming.affectedElements)]).slice(0, 8),
    markupReferences: uniqueTextList([...asArray(existing.markupReferences), ...asArray(incoming.markupReferences)]).slice(0, 10),
    acceptanceCriteria,
    personaAcceptanceCriteria,
  };
}

function groupTicketsByRootCause(tickets) {
  const groups = new Map();

  tickets.forEach((ticket) => {
    const key = `${ticket.rootCause || "General SEO implementation"}|${ticket.url || ""}`.toLowerCase();
    const existing = groups.get(key);
    groups.set(key, existing ? mergeTicketGroup(existing, ticket) : ticket);
  });

  return [...groups.values()].toSorted((a, b) => {
    const priorityDiff = rankLevel(b.priority) - rankLevel(a.priority);
    if (priorityDiff) return priorityDiff;
    return (b.impactScore || 0) - (a.impactScore || 0);
  });
}

function withTicketIds(tickets) {
  const seen = new Set();
  const deduped = tickets
    .filter((ticket) => {
      const key = `${ticket.source}|${ticket.title}`.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });

  return groupTicketsByRootCause(deduped)
    .map((ticket) => ({
      ...ticket,
      id: stableTicketId(ticket),
    }));
}

function stableTicketId(ticket = {}) {
  const seed = `${ticket.rootCause || ""}|${ticket.url || ""}|${ticket.title || ""}`.toLowerCase();
  let hash = 0x811c9dc5;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `PS-${(hash >>> 0).toString(16).slice(0, 6).toUpperCase()}`;
}

function richResultTickets(result, urlContext, markupReferenceMap) {
  const findings = asArray(result?.meta?.richResults?.findings).filter((f) => f.status === "invalid" || f.status === "incomplete");

  return findings.map((finding) => {
    const invalid = finding.status === "invalid";
    const named = finding.name ? ` ("${textValue(finding.name).slice(0, 60)}")` : "";
    const title = invalid
      ? `Fix ${finding.type} structured data so it is eligible for ${finding.richResult} rich results`
      : `Complete ${finding.type} structured data for the ${finding.richResult} rich result`;
    const missing = invalid ? finding.missingRequired : finding.missingRecommended;

    return createTicket({
      title,
      priority: invalid ? "High" : "Medium",
      source: invalid ? "Fix now" : "Fix later",
      action: invalid ? `add the missing required ${finding.type} properties` : `add the recommended ${finding.type} properties`,
      outcome: invalid
        ? `the ${finding.richResult} rich result becomes eligible to appear in Google search`
        : `the ${finding.richResult} rich result is more complete and competitive in search`,
      url: urlContext.url,
      urlContext: urlContext.detail,
      markupReferenceMap,
      technicalDetails: ticketDetails([
        `${finding.type}${named} structured data is ${invalid ? "not eligible" : "eligible but incomplete"} for the ${finding.richResult} rich result.`,
        missing.length ? `${invalid ? "Missing required" : "Missing recommended"} fields: ${missing.join(", ")}.` : "",
        "Validate the fix with Google's Rich Results Test after deploying.",
      ]),
      acceptanceCriteria: [
        `The ${finding.type} JSON-LD includes ${invalid ? "all required" : "the recommended"} properties`,
        "Google's Rich Results Test reports the page as eligible with no errors",
        "A follow-up scan no longer flags this structured-data issue",
      ],
    });
  });
}

export function buildTickets(mode, result) {
  const audit = result?.audit || {};
  const urlContext = ticketUrlContext(mode, result);
  const markupReferenceMap = ticketMarkupContext(mode, result);

  if (mode === "page") {
    const actionTickets = asArray(audit.checklist).map((item) => {
      const title = ticketTitle(item, "Complete page audit recommendation");
      const impact = textValue(item?.impact);
      return createTicket({
        title,
        priority: item?.priority,
        source: "Fix later",
        action: title,
        outcome: impact || "the audited page has stronger search visibility and AI answer readiness",
        url: urlContext.url,
        urlContext: urlContext.detail,
        markupReferenceMap,
        technicalDetails: ticketDetails([`Implement this recommendation on the audited page: ${title}`, impact && `Expected impact: ${impact}`]),
        acceptanceCriteria: [
          "The recommendation is implemented on the audited page",
          "Relevant title, headings, body copy, schema, or internal links are updated as needed",
          "A follow-up Page Analysis shows this item resolved or lowered in priority",
        ],
      });
    });

    const issueTickets = asArray(audit.technical?.issues).map((issue) => {
      const title = ticketTitle(issue, "Resolve technical SEO issue");
      return createTicket({
        title,
        priority: "High",
        source: "Fix now",
        action: `resolve ${title}`,
        outcome: "crawlers and searchers can understand the page correctly",
        url: urlContext.url,
        urlContext: urlContext.detail,
        markupReferenceMap,
        technicalDetails: `Review the page title, meta description, H1, canonical, crawl access, and source HTML for this issue: ${title}.`,
        acceptanceCriteria: [
          "The issue is fixed in the page source or rendered HTML",
          "The page can be fetched by the configured crawler path",
          "A follow-up Page Analysis no longer reports this issue",
        ],
      });
    });

    const topicTickets = asArray(audit.content?.suggested_topics).map((topic) => {
      const topicText = ticketTitle(topic, "Add missing topic coverage");
      return createTicket({
        title: `Add coverage for ${topicText}`,
        priority: "Medium",
        source: "Nice to have",
        action: `add useful coverage for ${topicText}`,
        outcome: "the page closes the content gap and offers stronger information gain",
        url: urlContext.url,
        urlContext: urlContext.detail,
        markupReferenceMap,
        technicalDetails: `Add a focused section, FAQ, example, comparison, or supporting paragraph that directly covers ${topicText}.`,
        acceptanceCriteria: [
          "The new section answers the missing topic clearly and specifically",
          "The content includes original detail, examples, evidence, or useful internal links",
          "A follow-up Page Analysis shows fewer missing-topic recommendations",
        ],
      });
    });

    return withTicketIds([...actionTickets, ...issueTickets, ...topicTickets, ...richResultTickets(result, urlContext, markupReferenceMap)]);
  }

  if (mode === "ux") {
    const selectedPersonaIds = uniqueTextList([
      result?.meta?.personas?.primary?.id || result?.meta?.persona?.id,
      ...asArray(result?.meta?.personas?.secondary).map((persona) => persona?.id),
    ]);
    const accessibilityTickets = asArray(audit.accessibility?.issues).map((item) => {
      const title = ticketTitle(item?.issue || item, "Resolve accessibility issue");
      const evidence = textValue(item?.evidence);
      return createTicket({
        title,
        priority: item?.severity === "Critical" ? "High" : "Medium",
        source: item?.severity === "Critical" ? "Fix now" : "Fix later",
        action: `resolve ${title}`,
        outcome: "the page is usable with assistive technology and passes accessibility checks",
        url: urlContext.url,
        urlContext: urlContext.detail,
        markupReferenceMap,
        personas: selectedPersonaIds,
        technicalDetails: ticketDetails([`Fix this accessibility issue: ${title}`, evidence && `Evidence: ${evidence}`]),
        acceptanceCriteria: [
          "The issue is fixed in the page source or rendered HTML",
          "The related Lighthouse accessibility audit passes",
          "A follow-up UX Audit no longer reports this issue",
        ],
      });
    });

    const experienceTickets = [
      ...asArray(audit.mobile_experience?.issues).map((issue) => ({ issue, area: "mobile experience" })),
      ...asArray(audit.interaction_feedback?.issues).map((issue) => ({ issue, area: "interaction feedback" })),
      ...asArray(audit.visual_hierarchy?.issues).map((issue) => ({ issue, area: "visual hierarchy" })),
      ...asArray(audit.readability?.issues).map((issue) => ({ issue, area: "readability" })),
    ].map(({ issue, area }) => {
      const title = ticketTitle(issue, `Improve ${area}`);
      return createTicket({
        title,
        priority: "Medium",
        source: "Fix later",
        action: `resolve ${title}`,
        outcome: `the page ${area} improves for real users`,
        url: urlContext.url,
        urlContext: urlContext.detail,
        markupReferenceMap,
        personas: selectedPersonaIds,
        technicalDetails: `Address this ${area} finding from the UX Audit: ${title}.`,
        acceptanceCriteria: [
          "The finding is addressed in the page layout, markup, or interaction behavior",
          "A follow-up UX Audit shows this finding resolved or downgraded",
        ],
      });
    });

    const checklistTickets = asArray(audit.checklist).map((item) => {
      const title = ticketTitle(item, "Complete UX audit recommendation");
      const impact = textValue(item?.impact);
      return createTicket({
        title,
        priority: item?.priority,
        source: "Fix later",
        action: title,
        outcome: impact || "the audited page offers a stronger user experience",
        url: urlContext.url,
        urlContext: urlContext.detail,
        markupReferenceMap,
        personas: asArray(item?.personas).length ? item.personas : selectedPersonaIds,
        technicalDetails: ticketDetails([`Implement this UX recommendation on the audited page: ${title}`, impact && `Expected impact: ${impact}`]),
        acceptanceCriteria: [
          "The recommendation is implemented on the audited page",
          "A follow-up UX Audit shows this item resolved or lowered in priority",
        ],
        personaAcceptanceCriteria: item?.acceptance_criteria,
      });
    });

    const experimentTickets = asArray(audit.persona_analysis?.experiments).map((item) => createTicket({
      title: item?.title || "Run UX experiment",
      priority: item?.priority,
      source: "Experiment",
      action: item?.proposed_change || item?.title,
      outcome: item?.expected_outcome || "the audited journey supports an informed next step",
      url: urlContext.url,
      urlContext: urlContext.detail,
      markupReferenceMap,
      personas: item?.personas,
      technicalDetails: ticketDetails([
        item?.hypothesis && `Hypothesis: ${item.hypothesis}`,
        item?.proposed_change && `Change: ${item.proposed_change}`,
        item?.primary_metric && `Primary metric: ${item.primary_metric}`,
        item?.guardrail_metric && `Guardrail metric: ${item.guardrail_metric}`,
      ]),
      acceptanceCriteria: [
        "The experiment has one documented variant and one control",
        item?.primary_metric ? `The experiment records ${item.primary_metric}` : "The experiment records its primary outcome metric",
        "Results are reviewed without claiming uplift before sufficient evidence exists",
      ],
    }));

    const conflictTickets = asArray(audit.persona_analysis?.conflicts).map((item) => createTicket({
      title: `Resolve persona conflict: ${item?.resolution_pattern || "support competing needs"}`,
      priority: "High",
      source: "Persona conflict",
      action: item?.recommendation,
      outcome: "both affected persona needs remain supported",
      url: urlContext.url,
      urlContext: urlContext.detail,
      markupReferenceMap,
      personas: item?.personas,
      technicalDetails: ticketDetails([item?.tension, item?.recommendation]),
      personaAcceptanceCriteria: item?.acceptance_criteria,
    }));

    return withTicketIds([...accessibilityTickets, ...experienceTickets, ...checklistTickets, ...experimentTickets, ...conflictTickets]);
  }

  if (mode === "site") {
    const issueTickets = asArray(audit.not_ok).map((item) => {
      const title = ticketTitle(item, "Resolve website scan issue");
      const evidence = textValue(item?.evidence || item?.impact || item?.issue);
      return createTicket({
        title,
        priority: item?.severity || item?.priority,
        source: "Fix now",
        action: `resolve ${title}`,
        outcome: "the website scan moves the signal into a healthy state",
        url: urlContext.url,
        urlContext: urlContext.detail,
        markupReferenceMap,
        technicalDetails: ticketDetails([item?.issue || title, evidence && `Evidence: ${evidence}`]),
        acceptanceCriteria: [
          "The affected website signal is fixed or documented as intentionally out of scope",
          "The update is visible in crawl, HTML, schema, content, link, media, or accessibility evidence",
          "A follow-up Site Analysis no longer lists this as Not OK",
        ],
      });
    });

    const nextTickets = asArray(audit.do_next).map((item) => {
      const title = ticketTitle(item, "Complete website scan recommendation");
      const impact = textValue(item?.impact || item?.evidence);
      return createTicket({
        title,
        priority: item?.priority,
        source: "Fix later",
        action: title,
        outcome: impact || "the site has stronger crawlability, content quality, and AI discoverability",
        url: urlContext.url,
        urlContext: urlContext.detail,
        markupReferenceMap,
        technicalDetails: ticketDetails([`Implement this site-level recommendation: ${title}`, impact && `Expected impact: ${impact}`]),
        acceptanceCriteria: [
          "The recommendation is implemented on the relevant page template or site section",
          "The implementation can be verified with crawl evidence or source inspection",
          "A follow-up Site Analysis shows measurable improvement for this area",
        ],
      });
    });

    const securityTickets = securityTicketFindings(result?.meta?.security).map((item) =>
      createTicket({
        title: `${item.title}: ${item.status === "critical" ? "resolve critical security finding" : "strengthen public security posture"}`,
        priority: item.priority,
        source: item.status === "critical" ? "Fix now" : "Fix later",
        action: item.remediation || `resolve the ${item.title} finding`,
        outcome: "the public website exposes stronger browser and transport security controls",
        url: item.url || urlContext.url,
        urlContext: item.url ? `Affected URL: ${item.url}` : urlContext.detail,
        markupReferenceMap,
        technicalDetails: ticketDetails([
          `Security category: ${item.category}`,
          `Observed evidence: ${item.evidence}`,
          `Recommended remediation: ${item.remediation}`,
          item.reference && `Guidance: ${item.reference}`,
        ]),
        affectedElements: ["HTTP response headers", "TLS/CDN or reverse-proxy configuration", "application security middleware", "affected public page markup"],
        markupReferences: [item.title, item.reference].filter(Boolean),
        developerClue: "Reproduce the affected URL with browser developer tools or curl, verify the reported header or markup evidence, then update the CDN, reverse proxy, framework middleware, cookie settings, or page component that owns it.",
        acceptanceCriteria: [
          `${item.title} returns a passing configuration on the affected URL`,
          "The change does not break required page, authentication, embed, or third-party functionality",
          "A follow-up Site Analysis moves this security check to Pass",
        ],
      })
    );

    return withTicketIds([...issueTickets, ...nextTickets, ...securityTickets, ...richResultTickets(result, urlContext, markupReferenceMap)]);
  }

  const gapTickets = asArray(audit.gaps).map((item) => {
    const area = ticketTitle(item?.area, "Competitive gap");
    const issue = textValue(item?.issue);
    return createTicket({
      title: issue ? `${area}: ${cleanSentence(issue)}` : `Close ${area} gap`,
      priority: item?.severity,
      source: "Fix now",
      action: `close the ${area} gap`,
      outcome: "our site is more competitive against the referenced result",
      url: urlContext.url,
      urlContext: urlContext.detail,
      markupReferenceMap,
      technicalDetails: ticketDetails([issue, item?.competitor_reference && `Competitor reference: ${item.competitor_reference}`, item?.impact && `Impact: ${item.impact}`]),
      acceptanceCriteria: [
        "The user site adds or improves the missing technical, content, or AI-readiness signal",
        "The update is supported by crawlable evidence on the user site",
        "A follow-up Competitor Analysis report shows the gap reduced against the referenced competitor",
      ],
    });
  });

  const actionTickets = asArray(audit.action_plan).map((item) => {
    const title = ticketTitle(item, "Complete competitor comparison recommendation");
    const impact = textValue(item?.impact);
    return createTicket({
      title,
      priority: item?.priority,
      source: "Fix later",
      action: title,
      outcome: impact || "the user site closes a meaningful competitor advantage",
      url: urlContext.url,
      urlContext: urlContext.detail,
      markupReferenceMap,
      technicalDetails: ticketDetails([`Implement this comparison-driven recommendation: ${title}`, item?.based_on && `Based on: ${item.based_on}`, impact && `Expected impact: ${impact}`]),
      acceptanceCriteria: [
        "The recommendation is implemented on the user site",
        "The update directly addresses the competitor evidence or gap it was based on",
        "A follow-up Competitor Analysis report shows improved user score or fewer gaps",
      ],
    });
  });

  return withTicketIds([...gapTickets, ...actionTickets]);
}

export function ticketExportRows(tickets) {
  const rows = asArray(tickets);

  if (!rows.length) {
    return [{ Section: "Tickets", Note: "No tickets generated for this report." }];
  }

  return rows.map((ticket) => ({
    Section: "Tickets",
    Ticket: ticket.id,
    Title: ticket.title,
    Priority: ticket.priority,
    "Work Type": ticket.source,
    Category: categoryShortLabel(ticket.category),
    Personas: textValue(ticket.personas),
    URL: ticket.url,
    "Root Cause": ticket.rootCause,
    "SEO Impact": ticket.seoImpact,
    "Impact Score": ticket.impactScore,
    "Implementation Effort": ticket.effort,
    "Effort Score": ticket.effortScore,
    Confidence: ticket.confidence,
    "Priority Rationale": ticket.priorityRationale,
    "Related Findings": textValue(ticket.relatedFindings),
    "User Story": ticket.userStory,
    "Technical Details": ticket.technicalDetails,
    "Affected Elements": textValue(ticket.affectedElements),
    "Markup References": textValue(ticket.markupReferences),
    "Developer Clue": ticket.developerClue,
    "Acceptance Criteria": textValue(ticket.acceptanceCriteria),
    "Persona Acceptance Criteria": asArray(ticket.personaAcceptanceCriteria).map((item) => `${item.persona_id}: ${item.criterion}`).join("; "),
  }));
}

export function formatTicketForJira(ticket) {
  const header = [
    `h2. [${ticket.id}] ${ticket.title}`,
    `*Priority:* ${ticket.priority}`,
    `*Work type:* ${ticket.source}`,
    `*Category:* ${categoryShortLabel(ticket.category)}`,
    ...(asArray(ticket.personas).length ? [`*Personas:* ${ticket.personas.join(", ")}`] : []),
    `*Root Cause:* ${ticket.rootCause}`,
    `*SEO Impact:* ${ticket.seoImpact} (${ticket.impactScore}/5)`,
    `*Implementation Effort:* ${ticket.effort} (${ticket.effortScore}/5)`,
    `*Confidence:* ${ticket.confidence}`,
  ];

  if (ticket.url) {
    header.push(`*URL:* ${ticket.url}`);
  }

  return [
    ...header,
    "",
    "h3. Priority Rationale",
    ticket.priorityRationale,
    "",
    "h3. Related Findings",
    ...asArray(ticket.relatedFindings).map((finding) => `* ${finding}`),
    "",
    "h3. User Story",
    ticket.userStory,
    "",
    "h3. Technical Details",
    ticket.technicalDetails,
    "",
    "h3. Affected Elements",
    ...asArray(ticket.affectedElements).map((element) => `* ${element}`),
    "",
    "h3. Markup References",
    ...asArray(ticket.markupReferences).map((reference) => `* {{${reference}}}`),
    "",
    "h3. Developer Clue",
    ticket.developerClue,
    "",
    "h3. Acceptance Criteria",
    ...asArray(ticket.acceptanceCriteria).map((criterion) => `* ${criterion}`),
    ...asArray(ticket.personaAcceptanceCriteria).map((criterion) => `* [${criterion.persona_id}] ${criterion.criterion}`),
  ].join("\n");
}

function formatTicketForMarkdown(ticket = {}) {
  return [
    `# ${ticket.id} ${ticket.title}`,
    "",
    `Priority: ${ticket.priority}`,
    `Work type: ${ticket.source}`,
    `Category: ${categoryShortLabel(ticket.category)}`,
    ...(asArray(ticket.personas).length ? [`Personas: ${ticket.personas.join(", ")}`] : []),
    ticket.url ? `URL: ${ticket.url}` : "",
    "",
    "## Summary",
    ticket.rootCause || ticket.priorityRationale || "",
    "",
    "## User Story",
    ticket.userStory,
    "",
    "## Where to look",
    ...[...asArray(ticket.affectedElements), ...asArray(ticket.markupReferences)].map((item) => `- ${item}`),
    "",
    "## Acceptance Criteria",
    ...asArray(ticket.acceptanceCriteria).map((item) => `- ${item}`),
    ...asArray(ticket.personaAcceptanceCriteria).map((item) => `- **${item.persona_id}:** ${item.criterion}`),
  ].filter((line) => line !== "").join("\n");
}

function formatTicketForLinear(ticket = {}) {
  return [
    `${ticket.id} ${ticket.title}`,
    "",
    `Priority: ${ticket.priority}`,
    `Work type: ${ticket.source}`,
    `Category: ${categoryShortLabel(ticket.category)}`,
    ...(asArray(ticket.personas).length ? [`Personas: ${ticket.personas.join(", ")}`] : []),
    ticket.url ? `URL: ${ticket.url}` : "",
    "",
    ticket.rootCause,
    "",
    `User story: ${ticket.userStory}`,
    "",
    `Where to look: ${textValue([...asArray(ticket.affectedElements), ...asArray(ticket.markupReferences)])}`,
    "",
    `Acceptance: ${textValue(ticket.acceptanceCriteria)}`,
    ...asArray(ticket.personaAcceptanceCriteria).map((item) => `Persona acceptance (${item.persona_id}): ${item.criterion}`),
  ].filter(Boolean).join("\n");
}

function formatTicketForGithub(ticket = {}) {
  return formatTicketForMarkdown(ticket).replace(/^# /, "## ");
}

function ticketCopyFormatter(format, ticket) {
  if (format === "markdown") return formatTicketForMarkdown(ticket);
  if (format === "linear") return formatTicketForLinear(ticket);
  if (format === "github") return formatTicketForGithub(ticket);
  return formatTicketForJira(ticket);
}

function TicketMatrix({ label, value }) {
  const score = Math.max(1, Math.min(5, Number(value) || 1));
  return (
    <div>
      <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-ink-600">{label}</div>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((step) => (
          <span key={step} className={`h-2 w-5 rounded-full ${step <= score ? "bg-accent-500" : "bg-ink-100"}`} />
        ))}
      </div>
    </div>
  );
}

function TicketFilterSelect({ label, value, onChange, options: selectOptions }) {
  return (
    <label className="grid gap-1 text-xs">
      <span className="font-bold uppercase tracking-[0.12em] text-ink-600">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-9 rounded-md border border-ink-200 bg-white px-3 text-sm font-semibold text-ink-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500"
      >
        {selectOptions.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function readPersistedDoneTickets() {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem("optiscan.doneTickets") || "{}");
  } catch {
    return {};
  }
}

export function TicketsReport({ tickets }) {
  const [copiedTicket, setCopiedTicket] = useState("");
  const [expandedId, setExpandedId] = useState("");
  const [copyMenu, setCopyMenu] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [sourceFilter, setSourceFilter] = useState("All");
  const [urlFilter, setUrlFilter] = useState("All");
  const [sortMode, setSortMode] = useState("impact-desc");
  const [search, setSearch] = useState("");
  const [doneTickets, setDoneTickets] = useState(readPersistedDoneTickets);
  const list = asArray(tickets);

  function persistDone(next) {
    setDoneTickets(next);
    try {
      localStorage.setItem("optiscan.doneTickets", JSON.stringify(next));
    } catch {
      // Local persistence is a convenience only.
    }
  }

  const options = useMemo(() => {
    const unique = (values) => ["All", ...Array.from(new Set(values.filter(Boolean))).sort()];
    return {
      priorities: unique(list.map((ticket) => ticket.priority)),
      categories: unique(list.map((ticket) => categoryShortLabel(ticket.category))),
      sources: unique(list.map((ticket) => ticket.source)),
      urls: unique(list.map((ticket) => ticket.url || "Site-wide")),
    };
  }, [list]);

  const filteredTickets = useMemo(() => {
    const term = search.trim().toLowerCase();
    return list
      .filter((ticket) => priorityFilter === "All" || ticket.priority === priorityFilter)
      .filter((ticket) => categoryFilter === "All" || categoryShortLabel(ticket.category) === categoryFilter)
      .filter((ticket) => sourceFilter === "All" || ticket.source === sourceFilter)
      .filter((ticket) => urlFilter === "All" || (ticket.url || "Site-wide") === urlFilter)
      .filter((ticket) => {
        if (!term) return true;
        return textValue(ticket).toLowerCase().includes(term);
      })
      .toSorted((a, b) => {
        if (sortMode === "impact-asc") return (a.impactScore || 0) - (b.impactScore || 0);
        if (sortMode === "effort-asc") return (a.effortScore || 0) - (b.effortScore || 0);
        if (sortMode === "effort-desc") return (b.effortScore || 0) - (a.effortScore || 0);
        return (b.impactScore || 0) - (a.impactScore || 0);
      });
  }, [list, priorityFilter, categoryFilter, sourceFilter, urlFilter, sortMode, search]);

  if (!list.length) {
    return <p className="rounded-lg border border-ink-200 bg-white p-4 text-sm text-ink-600">No tickets generated for this report.</p>;
  }

  async function handleCopyTicket(ticket, format = "jira") {
    try {
      await copyToClipboard(ticketCopyFormatter(format, ticket));
      setCopiedTicket(`${ticket.id}:${format}`);
      window.setTimeout(() => setCopiedTicket(""), 1600);
    } catch {
      setCopiedTicket(`error:${ticket.id}`);
      window.setTimeout(() => setCopiedTicket(""), 1600);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="rounded-lg border border-ink-200 bg-white p-3">
        <div className="grid gap-3 lg:grid-cols-[repeat(4,minmax(0,1fr))_minmax(12rem,1fr)]">
          <TicketFilterSelect label="Priority" value={priorityFilter} onChange={setPriorityFilter} options={options.priorities} />
          <TicketFilterSelect label="Category" value={categoryFilter} onChange={setCategoryFilter} options={options.categories} />
          <TicketFilterSelect label="Work type" value={sourceFilter} onChange={setSourceFilter} options={options.sources} />
          <TicketFilterSelect label="URL" value={urlFilter} onChange={setUrlFilter} options={options.urls} />
          <label className="grid gap-1 text-xs">
            <span className="font-bold uppercase tracking-[0.12em] text-ink-600">Search</span>
            <span className="flex min-h-9 items-center gap-2 rounded-md border border-ink-200 bg-white px-3">
              <Search className="h-3.5 w-3.5 text-ink-600" aria-hidden="true" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Find ticket text"
                className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-ink-900 outline-none placeholder:text-ink-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500"
              />
            </span>
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-ink-600">{filteredTickets.length} of {list.length} tickets shown</p>
          <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-ink-600">
            Sort
            <select
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value)}
              className="min-h-9 rounded-md border border-ink-200 bg-white px-3 text-sm font-semibold normal-case tracking-normal text-ink-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500"
            >
              <option value="impact-desc">Impact ↓</option>
              <option value="impact-asc">Impact ↑</option>
              <option value="effort-desc">Effort ↓</option>
              <option value="effort-asc">Effort ↑</option>
            </select>
          </label>
        </div>
      </div>

      {filteredTickets.map((ticket) => {
        const expanded = expandedId === ticket.id;
        const done = Boolean(doneTickets[ticket.id]);
        return (
          <article key={ticket.id} className={`rounded-lg border ${done ? "border-green-500/25 bg-green-500/5" : "border-ink-200 bg-white"}`}>
            <div className="grid gap-3 p-4 xl:grid-cols-[auto_minmax(0,1fr)_16rem_auto] xl:items-center">
              <input
                type="checkbox"
                checked={done}
                onChange={(event) => persistDone({ ...doneTickets, [ticket.id]: event.target.checked })}
                className="h-5 w-5 rounded border-ink-200 bg-white text-accent-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500"
                aria-label={`Mark ${ticket.id} done`}
              />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-accent-700">{ticket.id}</span>
                  <SeverityPill value={ticket.priority} />
                  <span className="rounded-full border border-ink-200 bg-white px-2 py-1 text-[11px] font-bold text-ink-700">
                    {categoryShortLabel(ticket.category)}
                  </span>
                  <span className="rounded-full border border-ink-200 bg-white px-2 py-1 text-[11px] font-semibold text-ink-700">
                    {ticket.url ? "1 URL" : "Site-wide"}
                  </span>
                  {asArray(ticket.personas).map((persona) => (
                    <span key={persona} className="rounded-full border border-sky-400/25 bg-sky-500/10 px-2 py-1 text-[11px] font-semibold capitalize text-sky-700">
                      {persona}
                    </span>
                  ))}
                </div>
                <h3 className="mt-2 text-sm font-semibold leading-6 text-ink-900">{ticket.title}</h3>
                <p className="mt-1 line-clamp-1 text-xs leading-5 text-ink-600">{ticket.rootCause || ticket.priorityRationale}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <TicketMatrix label="Impact" value={ticket.impactScore} />
                <TicketMatrix label="Effort" value={ticket.effortScore} />
              </div>
              <div className="flex items-center gap-2 xl:justify-end">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setCopyMenu(copyMenu === ticket.id ? "" : ticket.id)}
                    className="inline-flex min-h-9 items-center gap-2 rounded-md border border-ink-200 bg-white px-2.5 text-xs font-semibold text-ink-800 transition hover:border-sky-300/60 hover:text-sky-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500"
                  >
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                    {copiedTicket.startsWith(`${ticket.id}:`) ? "Copied" : "Copy as"}
                  </button>
                  {copyMenu === ticket.id ? (
                    <div className="absolute right-0 top-10 z-10 w-40 overflow-hidden rounded-md border border-ink-200 bg-white">
                      {[
                        ["jira", "Jira"],
                        ["markdown", "Markdown"],
                        ["linear", "Linear"],
                        ["github", "GitHub Issue"],
                      ].map(([format, label]) => (
                        <button
                          key={format}
                          type="button"
                          onClick={() => {
                            handleCopyTicket(ticket, format);
                            setCopyMenu("");
                          }}
                          className="block w-full px-3 py-2 text-left text-xs font-semibold text-ink-800 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? "" : ticket.id)}
                  className="inline-grid h-9 w-9 place-items-center rounded-md border border-ink-200 bg-white text-ink-800 transition hover:border-sky-300/60 hover:text-sky-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500"
                  aria-expanded={expanded}
                  aria-label={`${expanded ? "Collapse" : "Expand"} ${ticket.title}`}
                >
                  <ChevronDown className={`h-4 w-4 transition ${expanded ? "rotate-180" : ""}`} aria-hidden="true" />
                </button>
              </div>
            </div>

            {expanded ? (
              <div className="grid gap-4 border-t border-ink-200 p-4">
            <section>
              <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-600">Priority Rationale</h4>
              <p className="mt-2 text-sm leading-6 text-ink-700">{ticket.priorityRationale}</p>
            </section>

            {asArray(ticket.relatedFindings).length > 1 ? (
              <section>
                <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-600">Grouped Findings</h4>
                <ul className="mt-2 grid gap-2">
                  {asArray(ticket.relatedFindings).map((finding, index) => (
                    <li key={`${ticket.id}-finding-${index}`} className="flex gap-2 text-sm leading-6 text-ink-700">
                      <Layers3 className="mt-1 h-3.5 w-3.5 shrink-0 text-accent-700" aria-hidden="true" />
                      <span>{finding}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section>
              <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-600">User Story</h4>
              <p className="mt-2 text-sm leading-6 text-ink-700">{ticket.userStory}</p>
            </section>

            <section>
              <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-600">Technical Details</h4>
              <p className="mt-2 text-sm leading-6 text-ink-700">{ticket.technicalDetails}</p>
            </section>

            <section>
              <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-600">Where to look</h4>
              <ul className="mt-2 grid gap-2">
                {[...asArray(ticket.affectedElements), ...asArray(ticket.markupReferences)].map((element, index) => (
                  <li key={`${ticket.id}-look-${index}`} className="flex gap-2 text-sm leading-6 text-ink-700">
                    <Layers3 className="mt-1 h-3.5 w-3.5 shrink-0 text-accent-700" aria-hidden="true" />
                    <code className="rounded border border-ink-200 bg-white px-1.5 py-0.5 text-[0.8rem] text-ink-800">{element}</code>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-600">Confidence</h4>
              <p className="mt-2 text-sm leading-6 text-ink-700">{ticket.confidence}. {ticket.developerClue}</p>
            </section>

            <section>
              <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-600">Developer Clue</h4>
              <p className="mt-2 text-sm leading-6 text-ink-700">{ticket.developerClue}</p>
            </section>

            <section>
              <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-600">Acceptance Criteria</h4>
              <ul className="mt-2 grid gap-2">
                {asArray(ticket.acceptanceCriteria).map((criterion, index) => (
                  <li key={`${ticket.id}-criterion-${index}`} className="flex gap-2 text-sm leading-6 text-ink-700">
                    <CheckCircle2 className="mt-1 h-3.5 w-3.5 shrink-0 text-accent-700" aria-hidden="true" />
                    <span>{criterion}</span>
                  </li>
                ))}
                {asArray(ticket.personaAcceptanceCriteria).map((criterion, index) => (
                  <li key={`${ticket.id}-persona-criterion-${index}`} className="flex gap-2 text-sm leading-6 text-ink-700">
                    <CheckCircle2 className="mt-1 h-3.5 w-3.5 shrink-0 text-sky-700" aria-hidden="true" />
                    <span><strong className="text-sky-700">{criterion.persona_id}:</strong> {criterion.criterion}</span>
                  </li>
                ))}
              </ul>
            </section>
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
