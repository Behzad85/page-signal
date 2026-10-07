import { MODE_LABELS, REPORT_TABS } from "./constants";
import { coreWebVitalsRows, cwvStatusLabel } from "./coreWebVitals";
import { buildSeoCategories, categoryExportRows } from "./categories";
import { buildTickets, siteCrawlSummary, ticketExportRows } from "./tickets";
import { asArray, slugify, textValue, titleCase, toneForScore } from "./utils";
import { securityExportRows } from "../../lib/securitySchema.mjs";

function listRows(items, section, empty = "No data returned.") {
  const list = asArray(items);

  if (!list.length) {
    return [{ Section: section, Note: empty }];
  }

  return list.map((item, index) => {
    if (typeof item === "string") {
      return {
        Section: section,
        Item: index + 1,
        Detail: item,
      };
    }

    const row = {
      Section: section,
      Item: index + 1,
    };

    Object.entries(item || {}).forEach(([key, value]) => {
      row[titleCase(key)] = textValue(value);
    });

    return row;
  });
}

function crawledPageStatus(page = {}) {
  const status = Number(page.status || 0);
  if (page.ok === false || status >= 400) return status ? `HTTP ${status}` : "Blocked";
  if (status >= 300) return `HTTP ${status}`;
  return status ? `HTTP ${status}` : "Fetched";
}

function crawledPageSchemaText(page = {}) {
  const snakeCaseTypes = asArray(page.schema_types);
  return textValue(snakeCaseTypes.length ? snakeCaseTypes : page.schemaTypes);
}

function crawledPageRows(crawl, meta = {}) {
  const pages = asArray(crawl.pages);

  if (!pages.length && meta.url) {
    return [
      {
        Section: "Crawled Pages",
        Item: 1,
        URL: meta.url,
        Status: "Single page",
        Source: "Entered URL",
      },
    ];
  }

  return pages.map((page, index) => ({
    Section: "Crawled Pages",
    Item: index + 1,
    URL: page.url || "",
    Status: crawledPageStatus(page),
    "HTTP Status": page.status || "",
    Words: page.word_count ?? page.wordCount ?? page.words ?? "",
    "H1 Count": page.h1_count ?? page.h1Count ?? "",
    "H2 Count": page.h2_count ?? page.h2Count ?? "",
    Schema: crawledPageSchemaText(page),
    Source: page.source || page.profile || "crawl sample",
  }));
}

function keywordRows(analysis = {}) {
  const rows = [];

  asArray(analysis.targetKeywords).forEach((item, index) => {
    rows.push({
      Section: "Keyword Coverage",
      Item: index + 1,
      Keyword: item.keyword,
      Status: item.status,
      Locations: textValue(item.locations),
      Evidence: item.evidence,
      Recommendation: item.recommendation,
    });
  });

  asArray(analysis.detectedTerms).forEach((item, index) => {
    rows.push({
      Section: "Prominent Terms",
      Item: index + 1,
      Term: item.term,
      Count: item.count,
      Source: item.source,
    });
  });

  asArray(analysis.gaps).forEach((item, index) => {
    rows.push({
      Section: "Topic Gaps",
      Item: index + 1,
      Topic: item.topic,
      Reason: item.reason,
    });
  });

  asArray(analysis.pages).forEach((page, index) => {
    rows.push({
      Section: "Page Topic Map",
      Item: index + 1,
      Topic: page.topic,
      URL: page.url,
      Title: page.title,
      H1: page.h1,
      Words: page.words,
      Status: page.status,
    });
  });

  asArray(analysis.cannibalization).forEach((item, index) => {
    rows.push({
      Section: "Cannibalization Clues",
      Item: index + 1,
      Topic: item.topic,
      URLs: textValue(item.urls),
      Recommendation: item.recommendation,
    });
  });

  return rows.length ? rows : [{ Section: "Keywords", Note: "No keyword evidence returned." }];
}

export function reportBaseName(mode, result) {
  const modeName = MODE_LABELS[mode] || "Report";
  const label = result?.meta?.label || result?.meta?.urls?.[0]?.label || result?.meta?.url || "optiscan";
  return `optiscan-${slugify(modeName)}-${slugify(label)}`;
}

function richResultRows(meta = {}) {
  const findings = asArray(meta?.richResults?.findings);
  if (!findings.length) {
    return [{ Section: "Rich Results", Note: "No rich-result structured-data types detected." }];
  }
  return findings.map((f, index) => ({
    Section: "Rich Results",
    Item: index + 1,
    Type: f.type,
    "Rich Result": f.richResult,
    Status: f.status === "eligible" ? "Eligible" : f.status === "incomplete" ? "Missing recommended" : "Not eligible",
    "Missing Required": textValue(f.missingRequired),
    "Missing Recommended": textValue(f.missingRecommended),
  }));
}

export function pageTabRows(result, activeTab) {
  const audit = result.audit || {};
  const meta = result.meta || {};
  const tickets = buildTickets("page", result);
  const categories = buildSeoCategories("page", result, tickets);
  const infoGain = Math.max(0, Math.min(100, Math.round((audit.score || 0) * 0.72 + asArray(audit.content?.suggested_topics).length * 4)));

  if (activeTab === "vitals") {
    return coreWebVitalsRows(meta.coreWebVitals, { label: meta.label, url: meta.url });
  }

  if (activeTab === "categories") {
    return categoryExportRows(categories);
  }

  if (activeTab === "keywords") {
    return keywordRows(meta.keywordAnalysis);
  }

  if (activeTab === "technical") {
    return [
      { Section: "Technical SEO", Field: "Title", Status: audit.technical?.title || "" },
      { Section: "Technical SEO", Field: "Meta", Status: audit.technical?.meta || "" },
      { Section: "Technical SEO", Field: "H1", Status: audit.technical?.h1 || "" },
      ...listRows(audit.technical?.issues, "Technical Issues", "No technical issues returned."),
      ...richResultRows(meta),
    ];
  }

  if (activeTab === "content") {
    return [
      { Section: "Content Strategy", Field: "Information Gain", Value: infoGain },
      { Section: "Content Strategy", Field: "Gap Analysis", Value: audit.content?.gap_analysis || "" },
      { Section: "Content Strategy", Field: "AI Readiness", Value: audit.content?.ai_readiness || "" },
      ...listRows(audit.content?.suggested_topics, "Missing Topics", "No missing topics returned."),
    ];
  }

  if (activeTab === "actions") {
    return listRows(audit.checklist, "Action Plan");
  }

  if (activeTab === "tickets") {
    return ticketExportRows(tickets);
  }

  if (activeTab === "tracking") {
    return listRows([audit.tracking], "Metrics");
  }

  return [
    { Section: "Overview", Metric: "Health Score", Value: audit.score, Status: toneForScore(audit.score).text },
    { Section: "Overview", Metric: "Target URL", Value: meta.url || "" },
    { Section: "Overview", Metric: "Technical Issues", Value: asArray(audit.technical?.issues).length },
    { Section: "Overview", Metric: "Suggested Topics", Value: asArray(audit.content?.suggested_topics).length },
    { Section: "Overview", Metric: "Next Actions", Value: asArray(audit.checklist).length },
    { Section: "Overview", Metric: "Tickets", Value: tickets.length },
    { Section: "Overview", Metric: "Key Takeaway", Value: audit.content?.gap_analysis || "" },
  ];
}

export function siteTabRows(result, activeTab) {
  const audit = result.audit || {};
  const meta = result.meta || {};
  const tickets = buildTickets("site", result);
  const categories = buildSeoCategories("site", result, tickets);
  const crawl = siteCrawlSummary(meta);

  if (activeTab === "vitals") {
    return coreWebVitalsRows(meta.coreWebVitals, { label: meta.label, url: meta.url });
  }

  if (activeTab === "categories") {
    return categoryExportRows(categories);
  }

  if (activeTab === "keywords") {
    return keywordRows(meta.keywordAnalysis);
  }

  if (activeTab === "crawled") {
    return crawledPageRows(crawl, meta);
  }

  if (activeTab === "security") {
    const rows = securityExportRows(meta.security);
    return rows.length ? rows : [{ Section: "Security Posture", Note: "No passive security evidence returned." }];
  }

  if (activeTab === "ok") {
    return listRows(audit.ok, "What's OK", "No healthy signals returned.");
  }

  if (activeTab === "not_ok") {
    return listRows(audit.not_ok, "What's Not OK", "No issues returned.");
  }

  if (activeTab === "next" || activeTab === "actions") {
    return listRows(audit.do_next, "Do Next");
  }

  if (activeTab === "tickets") {
    return ticketExportRows(tickets);
  }

  if (activeTab === "tracking") {
    return listRows(audit.tracking, "Metrics");
  }

  return [
    { Section: "Overview", Metric: "Health Score", Value: audit.score, Status: toneForScore(audit.score).text },
    { Section: "Overview", Metric: "Website URL", Value: meta.url || "" },
    { Section: "Overview", Metric: "Scan Summary", Value: audit.summary || "" },
    { Section: "Overview", Metric: "OK Items", Value: asArray(audit.ok).length },
    { Section: "Overview", Metric: "Not OK Items", Value: asArray(audit.not_ok).length },
    { Section: "Overview", Metric: "Tickets", Value: tickets.length },
    { Section: "Overview", Metric: "Core Web Vitals", Value: cwvStatusLabel(meta.coreWebVitals?.status) },
    { Section: "Overview", Metric: "Crawl Sample", Value: crawl.enabled ? `${crawl.pagesSuccessful}/${crawl.pagesFetched} pages fetched` : "Single page" },
    { Section: "Overview", Metric: "Discovered URLs", Value: crawl.discoveredUrls },
    { Section: "Overview", Metric: "Repeated Root-Cause Signals", Value: crawl.repeatedIssues },
  ];
}

export function compareTabRows(result, activeTab) {
  const audit = result.audit || {};
  const meta = result.meta || {};
  const tickets = buildTickets("compare", result);
  const categories = buildSeoCategories("compare", result, tickets);

  if (activeTab === "vitals") {
    return asArray(meta.coreWebVitals).flatMap((item) => coreWebVitalsRows(item.coreWebVitals, { label: item.label, url: item.url }));
  }

  if (activeTab === "categories") {
    return categoryExportRows(categories);
  }

  if (activeTab === "wins") {
    return listRows(audit.user_strengths, "Your Wins", "No user wins returned.");
  }

  if (activeTab === "competitors") {
    return listRows(audit.competitor_advantages, "Competitor Wins", "No competitor wins returned.");
  }

  if (activeTab === "gaps") {
    return listRows(audit.gaps, "What's Not OK", "No gaps returned.");
  }

  if (activeTab === "next" || activeTab === "actions") {
    return listRows(audit.action_plan, "Do Next");
  }

  if (activeTab === "tickets") {
    return ticketExportRows(tickets);
  }

  if (activeTab === "tracking") {
    return listRows(audit.tracking, "Metrics");
  }

  return [
    { Section: "Overview", Metric: "Comparison Summary", Value: audit.summary || "" },
    ...asArray(audit.scores).map((site, index) => ({
      Section: "Scoreboard",
      Item: index + 1,
      Site: site.label,
      URL: site.url,
      Score: site.score,
      OK: site.ok,
      "Not OK": site.not_ok,
      Words: site.words,
      "Schema Types": textValue(site.schema_types),
    })),
    { Section: "Overview", Metric: "Tickets", Value: tickets.length },
  ];
}

export function uxTabRows(result, activeTab) {
  const audit = result.audit || {};
  const meta = result.meta || {};
  const tickets = buildTickets("ux", result);
  const primaryPersona = meta.personas?.primary || meta.persona || {};
  const secondaryPersonas = asArray(meta.personas?.secondary);
  const personaAnalysis = audit.persona_analysis || {};

  if (activeTab === "personas") {
    return [
      ...asArray(personaAnalysis.needs_coverage).map((item) => ({
        Section: "Needs coverage",
        Persona: item.persona_id,
        Type: item.need_type,
        Need: item.need,
        Status: item.status,
        Evidence: item.evidence,
        Confidence: item.confidence,
      })),
      ...asArray(personaAnalysis.decision_readiness).map((item) => ({
        Section: "Decision readiness",
        Persona: item.label || item.persona_id,
        Status: item.status,
        Assessment: item.assessment,
        Evidence: item.evidence,
        Missing: textValue(item.missing_information),
      })),
      ...asArray(personaAnalysis.cta_suitability).map((item) => ({
        Section: "CTA suitability",
        Persona: item.label || item.persona_id,
        CTA: item.cta,
        Status: item.status,
        Assessment: item.assessment,
        Evidence: item.evidence,
        Recommendation: item.recommendation,
      })),
      ...asArray(personaAnalysis.content_fit).map((item) => ({
        Section: "Content fit",
        Persona: item.label || item.persona_id,
        Status: item.status,
        Assessment: item.assessment,
        Evidence: item.evidence,
        Gaps: textValue(item.gaps),
      })),
      ...asArray(personaAnalysis.conflicts).flatMap((conflict) => [
        {
          Section: "Conflict resolution",
          Persona: textValue(conflict.personas),
          Status: conflict.resolution_pattern,
          Assessment: conflict.tension,
          Recommendation: conflict.recommendation,
        },
        ...asArray(conflict.acceptance_criteria).map((criterion) => ({
          Section: "Conflict acceptance criteria",
          Persona: criterion.persona_id,
          Assessment: criterion.criterion,
        })),
      ]),
    ];
  }

  if (activeTab === "journey") {
    return asArray(personaAnalysis.journey_implications).map((item) => ({
      Section: "Journey hypothesis",
      Persona: item.label || item.persona_id,
      "Page role": item.page_role,
      Before: item.before,
      "On page": item.on_page,
      "Next step": item.next_step,
      Risks: textValue(item.risks),
      Evidence: item.evidence,
      Confidence: item.confidence,
    }));
  }

  if (activeTab === "experiments") {
    return asArray(personaAnalysis.experiments).map((item) => ({
      Section: "Experiment",
      Personas: textValue(item.personas),
      Title: item.title,
      Hypothesis: item.hypothesis,
      Change: item.proposed_change,
      "Expected outcome": item.expected_outcome,
      "Primary metric": item.primary_metric,
      "Guardrail metric": item.guardrail_metric,
      Confidence: item.confidence,
      Priority: item.priority,
    }));
  }

  if (activeTab === "evidence") {
    return [
      { Section: "Evidence quality", Field: "Consent outcome", Value: meta.screenshot?.consent?.status || "unavailable" },
      { Section: "Evidence quality", Field: "Screenshot used", Value: meta.screenshot?.usableForAnalysis ? "Yes" : "No" },
      { Section: "Visual", Field: "Visual hierarchy", Value: audit.visual_hierarchy?.finding || "" },
      { Section: "Visual", Field: "Readability", Value: audit.readability?.finding || "" },
      { Section: "Accessibility", Field: "Assessment", Value: audit.accessibility?.assessment || "" },
      { Section: "Mobile Experience", Field: "Viewport", Value: audit.mobile_experience?.viewport || "" },
      { Section: "Mobile Experience", Field: "Tap Targets", Value: audit.mobile_experience?.tap_targets || "" },
      { Section: "Interaction", Field: "Forms", Value: audit.interaction_feedback?.forms || "" },
      { Section: "Interaction", Field: "Navigation", Value: audit.interaction_feedback?.navigation || "" },
      ...listRows(audit.visual_hierarchy?.issues, "Visual issues", "No visual issues returned."),
      ...listRows(audit.readability?.issues, "Readability issues", "No readability issues returned."),
      ...listRows(audit.accessibility?.issues, "Accessibility issues", "No accessibility issues returned."),
      ...listRows(audit.mobile_experience?.issues, "Mobile Issues", "No mobile issues returned."),
      ...listRows(audit.interaction_feedback?.issues, "Interaction Issues", "No interaction issues returned."),
      ...coreWebVitalsRows(meta.coreWebVitals, { label: meta.label, url: meta.url }),
    ];
  }

  if (activeTab === "tickets") {
    return ticketExportRows(tickets);
  }

  if (activeTab === "tracking") {
    return listRows([audit.tracking], "Metrics");
  }

  return [
    { Section: "Overview", Metric: "UX Score", Value: audit.score, Status: toneForScore(audit.score).text },
    { Section: "Overview", Metric: "Page URL", Value: meta.url || "" },
    { Section: "Overview", Metric: "Primary persona", Value: primaryPersona.label || "Not specified" },
    { Section: "Overview", Metric: "Compared personas", Value: secondaryPersonas.map((persona) => persona.label).join(", ") || "None" },
    { Section: "Persona lenses", Metric: personaAnalysis.primary?.label || primaryPersona.label || "Primary", Value: personaAnalysis.primary?.assessment || primaryPersona.auditFocus || "" },
    ...asArray(personaAnalysis.secondary).map((lens) => ({
      Section: "Persona lenses",
      Metric: lens.label || lens.persona_id,
      Value: lens.assessment || "",
    })),
    ...asArray(personaAnalysis.conflicts).map((conflict) => ({
      Section: "Persona conflicts",
      Metric: textValue(conflict.personas),
      Value: [conflict.tension, conflict.recommendation].filter(Boolean).join(" Recommendation: "),
    })),
    { Section: "Overview", Metric: "Summary", Value: audit.summary || "" },
    { Section: "Overview", Metric: "Accessibility Issues", Value: asArray(audit.accessibility?.issues).length },
    { Section: "Overview", Metric: "Mobile Issues", Value: asArray(audit.mobile_experience?.issues).length },
    { Section: "Overview", Metric: "Interaction Issues", Value: asArray(audit.interaction_feedback?.issues).length },
    { Section: "Overview", Metric: "Tickets", Value: tickets.length },
    {
      Section: "Overview",
      Metric: "Screenshot Review",
      Value: meta.visionUsed
        ? meta.visionFullPage
          ? "AI vision review of a consent-verified full rendered page"
          : "AI vision review of a consent-verified rendered viewport"
        : "Not available for this run",
    },
  ];
}

export function reportTabRows(mode, result, activeTab) {
  if (mode === "page") {
    return pageTabRows(result, activeTab);
  }

  if (mode === "ux") {
    return uxTabRows(result, activeTab);
  }

  if (mode === "site") {
    return siteTabRows(result, activeTab);
  }

  return compareTabRows(result, activeTab);
}

export function reportSections(mode, result) {
  return REPORT_TABS[mode].map(([tabId, label]) => ({
    title: label,
    rows: reportTabRows(mode, result, tabId),
  }));
}
