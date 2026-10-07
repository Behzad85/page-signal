import { domainLabel } from "./fetchPageMarkdown";
import { scoreSignals } from "./opportunitySchema";

export const COMPARE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "scores", "user_strengths", "competitor_advantages", "gaps", "action_plan", "tracking"],
  properties: {
    summary: { type: "string" },
    scores: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "url", "score", "ok", "not_ok", "words", "schema_types"],
        properties: {
          label: { type: "string" },
          url: { type: "string" },
          score: { type: "number", minimum: 0, maximum: 100 },
          ok: { type: "number" },
          not_ok: { type: "number" },
          words: { type: "number" },
          schema_types: { type: "array", items: { type: "string" } },
        },
      },
    },
    user_strengths: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["area", "finding", "evidence"],
        properties: {
          area: { type: "string" },
          finding: { type: "string" },
          evidence: { type: "string" },
        },
      },
    },
    competitor_advantages: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["competitor", "area", "advantage", "evidence"],
        properties: {
          competitor: { type: "string" },
          area: { type: "string" },
          advantage: { type: "string" },
          evidence: { type: "string" },
        },
      },
    },
    gaps: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["area", "issue", "severity", "competitor_reference", "impact"],
        properties: {
          area: { type: "string" },
          issue: { type: "string" },
          severity: { type: "string", enum: ["Critical", "Warning", "Info"] },
          competitor_reference: { type: "string" },
          impact: { type: "string" },
        },
      },
    },
    action_plan: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["task", "priority", "based_on", "impact"],
        properties: {
          task: { type: "string" },
          priority: { type: "string", enum: ["High", "Medium", "Low"] },
          based_on: { type: "string" },
          impact: { type: "string" },
        },
      },
    },
    tracking: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["metric", "tool", "method"],
        properties: {
          metric: { type: "string" },
          tool: { type: "string" },
          method: { type: "string" },
        },
      },
    },
  },
};

function clampScore(value) {
  const score = Number(value);
  return Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : 0;
}

function text(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
}

function severity(value) {
  return ["Critical", "Warning", "Info"].includes(value) ? value : "Warning";
}

function priority(value) {
  return ["High", "Medium", "Low"].includes(value) ? value : "Medium";
}

function replaceGenericLabels(value, labels) {
  if (typeof value === "string") {
    return value
      .replace(/\bCompetitor\s*1\b/gi, labels[1] || "first competitor")
      .replace(/\bCompetitor\s*2\b/gi, labels[2] || "second competitor");
  }

  if (Array.isArray(value)) {
    return value.map((item) => replaceGenericLabels(item, labels));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, replaceGenericLabels(item, labels)]));
  }

  return value;
}

export function normalizeCompare(input = {}, sites = []) {
  const labels = sites.map((site) => site.label || domainLabel(site.url));
  const clean = replaceGenericLabels(input, labels);
  const scoreRows = Array.isArray(clean.scores) ? clean.scores : [];
  const normalizedScores = sites.map((site, index) => {
    const row = scoreRows[index] || scoreRows.find((item) => item?.url === site.url || item?.label === site.label) || {};
    return {
      label: site.label,
      url: site.url,
      score: clampScore(site.score),
      ok: number(site.ok),
      not_ok: number(site.not_ok),
      words: number(row.words ?? site.words),
      schema_types: Array.isArray(row.schema_types)
        ? row.schema_types.map((item) => String(item || "").trim()).filter(Boolean)
        : site.schema_types || [],
    };
  });

  return {
    summary: text(clean.summary, "The comparison completed with normalized SEO evidence across the three sites."),
    scores: normalizedScores,
    user_strengths: Array.isArray(clean.user_strengths)
      ? clean.user_strengths
          .map((item) => ({
            area: text(item?.area, "User advantage"),
            finding: text(item?.finding, "Your page has a measurable advantage."),
            evidence: text(item?.evidence, "Evidence was found in the fetched page signals."),
          }))
          .slice(0, 10)
      : [],
    competitor_advantages: Array.isArray(clean.competitor_advantages)
      ? clean.competitor_advantages
          .map((item) => ({
            competitor: text(item?.competitor, labels[1] || "competitor"),
            area: text(item?.area, "Competitor advantage"),
            advantage: text(item?.advantage, "A competitor has a measurable advantage."),
            evidence: text(item?.evidence, "Evidence was found in the fetched page signals."),
          }))
          .slice(0, 12)
      : [],
    gaps: Array.isArray(clean.gaps)
      ? clean.gaps
          .map((item) => ({
            area: text(item?.area, "SEO gap"),
            issue: text(item?.issue, "Your site has a gap to close."),
            severity: severity(item?.severity),
            competitor_reference: text(item?.competitor_reference, labels.slice(1).join(" and ")),
            impact: text(item?.impact, "Closing this gap improves search and AI answer competitiveness."),
          }))
          .slice(0, 12)
      : [],
    action_plan: Array.isArray(clean.action_plan)
      ? clean.action_plan
          .map((item) => ({
            task: text(item?.task, "Close the highest-impact competitor gap."),
            priority: priority(item?.priority),
            based_on: text(item?.based_on, labels.slice(1).join(" and ")),
            impact: text(item?.impact, "Improves relevance, discoverability, or answer extraction."),
          }))
          .slice(0, 10)
      : [],
    tracking: Array.isArray(clean.tracking)
      ? clean.tracking
          .map((item) => ({
            metric: text(item?.metric, "Organic comparison performance"),
            tool: text(item?.tool, "Google Search Console"),
            method: text(item?.method, "Track the target URLs before and after optimization."),
          }))
          .slice(0, 8)
      : [],
  };
}

export function siteSummaryFromSignals(signals) {
  const scored = scoreSignals(signals);
  const raw = signals.raw || {};
  return {
    label: domainLabel(signals.url),
    url: signals.url,
    score: scored.score,
    ok: scored.ok,
    not_ok: scored.not_ok,
    words: raw.word_count || 0,
    schema_types: raw.schema_types || [],
    h2_count: raw.h2_count || 0,
    h1_count: raw.h1_count || 0,
    has_title: Boolean(raw.title),
    has_meta: Boolean(raw.meta_description),
    has_canonical: Boolean(raw.canonical),
    has_robots: Boolean(signals.robots?.exists),
    has_sitemap: Boolean(signals.sitemap?.exists),
    has_llms: Boolean(signals.llms?.exists),
    internal_links: raw.internal_links || 0,
    social_profiles: raw.social_profiles || [],
    core_web_vitals_status: signals.coreWebVitals?.status || "unavailable",
    core_web_vitals_score: signals.coreWebVitals?.field?.available
      ? signals.coreWebVitals.field.score
      : signals.coreWebVitals?.lab?.available
        ? signals.coreWebVitals.lab.performanceScore
        : 0,
    crawl_profile: signals.html_profile || "",
    markdown_source: signals.markdown_source || "none",
    access: signals.access || {
      blocked: false,
      level: "none",
      reason: "",
      blockedSources: [],
      contentAvailable: true,
    },
  };
}

export function heuristicCompare(siteSignals = []) {
  const sites = siteSignals.map(siteSummaryFromSignals);
  const [user, ...competitors] = sites;
  const bestCompetitor = competitors.toSorted((a, b) => b.score - a.score)[0] || competitors[0];
  const userStrengths = [];
  const competitorAdvantages = [];
  const gaps = [];

  if (!user) {
    return normalizeCompare({}, sites);
  }

  sites.forEach((site) => {
    if (site.access?.blocked) {
      gaps.push({
        area: "Crawl access",
        issue:
          site.access.level === "full"
            ? `${site.label} blocked crawler access, so content evidence could not be compared.`
            : `${site.label} partially blocked crawler access, so comparison evidence may be incomplete.`,
        severity: site.access.level === "full" ? "Critical" : "Warning",
        competitor_reference: site.label,
        impact: "Blocked crawler access prevents reliable SEO diagnosis, indexing validation, and AI answer extraction.",
      });
    }
  });

  const compareMetric = (area, label, userValue, competitorValue, better = (a, b) => a > b) => {
    if (better(userValue, competitorValue)) {
      userStrengths.push({
        area,
        finding: `Your site leads ${label}.`,
        evidence: `${user.label}: ${userValue}; ${bestCompetitor.label}: ${competitorValue}.`,
      });
    } else if (better(competitorValue, userValue)) {
      competitorAdvantages.push({
        competitor: bestCompetitor.label,
        area,
        advantage: `${bestCompetitor.label} leads ${label}.`,
        evidence: `${bestCompetitor.label}: ${competitorValue}; ${user.label}: ${userValue}.`,
      });
      gaps.push({
        area,
        issue: `Improve ${label} to close the gap with ${bestCompetitor.label}.`,
        severity: area === "Content depth" || area === "Structured data" ? "Warning" : "Info",
        competitor_reference: bestCompetitor.label,
        impact: "Raises topical coverage, machine readability, and competitive parity.",
      });
    }
  };

  if (bestCompetitor) {
    compareMetric("Content depth", "word count", user.words, bestCompetitor.words);
    compareMetric("Heading structure", "H2 coverage", user.h2_count, bestCompetitor.h2_count);
    compareMetric("Internal links", "internal link count", user.internal_links, bestCompetitor.internal_links);
    compareMetric("Structured data", "schema type coverage", user.schema_types.length, bestCompetitor.schema_types.length);
  }

  if (user.has_title && user.has_meta && user.h1_count === 1) {
    userStrengths.push({
      area: "Technical SEO",
      finding: "Core metadata and H1 are present.",
      evidence: `${user.label} has title, meta description, and a single H1 in the fetched HTML pass.`,
    });
  } else {
    gaps.push({
      area: "Technical SEO",
      issue: "Core metadata or H1 structure needs cleanup.",
      severity: "Critical",
      competitor_reference: competitors.map((item) => item.label).join(", "),
      impact: "Improves page topic clarity and snippet control.",
    });
  }

  competitors.forEach((competitor) => {
    if (competitor.has_sitemap && !user.has_sitemap) {
      competitorAdvantages.push({
        competitor: competitor.label,
        area: "Crawlability",
        advantage: `${competitor.label} exposes sitemap.xml at the default path.`,
        evidence: `${competitor.label} sitemap detected; ${user.label} sitemap not detected.`,
      });
    }

    if (competitor.has_llms && !user.has_llms) {
      competitorAdvantages.push({
        competitor: competitor.label,
        area: "AI discoverability",
        advantage: `${competitor.label} exposes llms.txt.`,
        evidence: `${competitor.label} llms.txt detected; ${user.label} llms.txt not detected.`,
      });
    }
  });

  const actionPlan = [
    {
      task: "Match or exceed the strongest competitor's content depth with original examples and answer-first sections.",
      priority: "High",
      based_on: bestCompetitor ? `${bestCompetitor.label} content and heading coverage` : "Competitor content coverage",
      impact: "Improves topical completeness and AI answer extraction.",
    },
    {
      task: "Add or validate structured data for the page type and organization/entity context.",
      priority: "Medium",
      based_on: competitors.map((item) => `${item.label}: ${item.schema_types.join(", ") || "no schema detected"}`).join("; "),
      impact: "Improves entity clarity and rich-result eligibility.",
    },
    {
      task: "Publish crawl and AI discovery files if missing.",
      priority: "Medium",
      based_on: "robots.txt, sitemap.xml, and llms.txt availability checks",
      impact: "Improves crawl guidance and AI crawler comprehension.",
    },
    ...(sites.some((site) => site.access?.blocked)
      ? [
          {
            task: "Resolve crawler blocking before treating score differences as final.",
            priority: "High",
            based_on: sites
              .filter((site) => site.access?.blocked)
              .map((site) => `${site.label}: ${site.access.blockedSources.map((item) => `${item.source} ${item.status}`).join(", ")}`)
              .join("; "),
            impact: "Restores comparable SEO evidence across all three URLs.",
          },
        ]
      : []),
  ];

  return normalizeCompare(
    {
      summary: `${user.label} scored ${user.score}/100 against ${competitors.map((item) => `${item.label} at ${item.score}/100`).join(" and ")}. The biggest opportunities are content depth, structured data, crawl hints, and answer extraction.`,
      scores: sites,
      user_strengths: userStrengths.length ? userStrengths : [
        {
          area: "Baseline coverage",
          finding: user.access?.blocked
            ? "The site needs crawler access fixes before strengths can be trusted."
            : "The site was fetchable and produced analyzable SEO evidence.",
          evidence: user.access?.blocked
            ? user.access.blockedSources.map((item) => `${item.source} returned ${item.status}`).join("; ")
            : `${user.label} returned ${user.words} words and ${user.schema_types.length} schema types.`,
        },
      ],
      competitor_advantages: competitorAdvantages,
      gaps,
      action_plan: actionPlan,
      tracking: [
        {
          metric: "Share of top queries vs competitor topics",
          tool: "Google Search Console",
          method: "Track query clusters mapped to newly added competitor-gap sections.",
        },
        {
          metric: "Average position and CTR",
          tool: "Google Search Console",
          method: `Filter by ${user.url} and compare 14-28 days before and after updates.`,
        },
        {
          metric: "Snippet and AI answer coverage",
          tool: "Manual SERP checks and AI answer logs",
          method: "Check whether answer blocks and FAQ sections are being extracted for target prompts.",
        },
      ],
    },
    sites
  );
}
