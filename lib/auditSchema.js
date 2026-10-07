export const PAGE_AUDIT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["score", "technical", "content", "checklist", "tracking"],
  properties: {
    score: { type: "number", minimum: 0, maximum: 100 },
    technical: {
      type: "object",
      additionalProperties: false,
      required: ["title", "meta", "h1", "issues"],
      properties: {
        title: { type: "string" },
        meta: { type: "string" },
        h1: { type: "string" },
        issues: { type: "array", items: { type: "string" } },
      },
    },
    content: {
      type: "object",
      additionalProperties: false,
      required: ["gap_analysis", "suggested_topics", "ai_readiness"],
      properties: {
        gap_analysis: { type: "string" },
        suggested_topics: { type: "array", items: { type: "string" } },
        ai_readiness: { type: "string" },
      },
    },
    checklist: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["task", "priority", "impact"],
        properties: {
          task: { type: "string" },
          priority: { type: "string", enum: ["High", "Medium"] },
          impact: { type: "string" },
        },
      },
    },
    tracking: {
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
};

function clampScore(value) {
  const score = Number(value);
  if (!Number.isFinite(score)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

function asString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function asArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => String(item || "").trim()).filter(Boolean);
}

function sentenceJoin(items) {
  const filtered = items.filter(Boolean);
  return filtered.length ? filtered.join(" ") : "No reliable evidence was available.";
}

function keywordIn(value, keyword) {
  if (!keyword) {
    return false;
  }

  return String(value || "").toLowerCase().includes(keyword.toLowerCase());
}

function normalizeKeywordList(keyword, keywords) {
  const input = Array.isArray(keywords) && keywords.length ? keywords : [keyword];
  const seen = new Set();

  return input
    .map((item) => String(item || "").trim())
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

export function normalizePageAudit(input = {}) {
  const technical = input.technical || {};
  const content = input.content || {};

  return {
    score: clampScore(input.score),
    technical: {
      title: asString(technical.title, "Title evidence was not found."),
      meta: asString(technical.meta, "Meta description evidence was not found."),
      h1: asString(technical.h1, "H1 evidence was not found."),
      issues: asArray(technical.issues).slice(0, 12),
    },
    content: {
      gap_analysis: asString(content.gap_analysis, "Add specific, source-backed sections that answer the target keyword more directly."),
      suggested_topics: asArray(content.suggested_topics).slice(0, 12),
      ai_readiness: asString(content.ai_readiness, "Improve answer clarity, entity definitions, and citation-worthy source sections."),
    },
    checklist: Array.isArray(input.checklist)
      ? input.checklist
          .map((item) => ({
            task: asString(item?.task, "Improve the page with clearer SEO evidence."),
            priority: item?.priority === "High" ? "High" : "Medium",
            impact: asString(item?.impact, "Raises relevance and eligibility for stronger organic visibility."),
          }))
          .slice(0, 10)
      : [],
    tracking: {
      metric: asString(input.tracking?.metric, "Query impressions and average position"),
      tool: asString(input.tracking?.tool, "Google Search Console"),
      method: asString(input.tracking?.method, "Track the target keyword and URL before and after implementation."),
    },
  };
}

export function heuristicPageAudit({ url, keyword, keywords, markdown = "", signals = {} }) {
  const raw = signals.raw || {};
  const issues = [];
  const positives = [];
  const words = raw.word_count || (markdown.match(/\b[\p{L}\p{N}][\p{L}\p{N}'-]*\b/gu) || []).length;
  const targetKeywords = normalizeKeywordList(keyword, keywords);
  const primaryKeyword = targetKeywords[0] || "";
  const keywordLabel = targetKeywords.length > 1 ? `${primaryKeyword} plus ${targetKeywords.length - 1} supporting keyword${targetKeywords.length === 2 ? "" : "s"}` : primaryKeyword;

  if (signals.access?.level === "full") {
    const blockedEvidence = signals.access.blockedSources
      .map((item) => `${item.source} returned ${item.status}`)
      .join("; ");

    return normalizePageAudit({
      score: 8,
      technical: {
        title: "Blocked: title evidence could not be read.",
        meta: "Blocked: meta description evidence could not be read.",
        h1: "Blocked: H1 evidence could not be read.",
        issues: [
          "Crawler access is blocked, so page content and technical tags could not be audited.",
          blockedEvidence || "The target page returned an access-blocking status.",
          "Allow trusted SEO crawlers or provide a crawlable HTML snapshot for analysis.",
        ],
      },
      content: {
        gap_analysis:
          "PageSignal could not inspect the content because the page blocked crawler access. Treat this as a crawlability issue before making content strategy decisions.",
        suggested_topics: [
          "Crawler access policy and bot protection rules",
          "Server-side rendered HTML availability",
          "Robots.txt and firewall allowlist review",
          "Search Console URL Inspection validation",
        ],
        ai_readiness:
          "Critical: if search and AI crawlers cannot access the page, they cannot reliably extract answers, entities, or source evidence.",
      },
      checklist: [
        {
          task: "Confirm whether Googlebot and other search crawlers can fetch the URL.",
          priority: "High",
          impact: "Restores the minimum crawlability needed for indexing, ranking, and AI answer extraction.",
        },
        {
          task: "Review WAF, CDN, bot protection, authentication, geo blocking, and rate-limit rules.",
          priority: "High",
          impact: "Prevents SEO tools and legitimate crawlers from receiving 403-style access denials.",
        },
        {
          task: "Run Google Search Console URL Inspection after access rules are changed.",
          priority: "Medium",
          impact: "Verifies that Google can fetch and render the URL.",
        },
      ],
      tracking: {
        metric: "URL Inspection fetch status, crawl errors, and indexing state",
        tool: "Google Search Console",
        method: `Inspect ${url}, test the live URL, and monitor Pages > Not indexed for blocked or access-denied errors.`,
      },
    });
  }

  if (signals.access?.blocked) {
    issues.push(signals.access.reason);
    signals.access.blockedSources.forEach((item) => {
      issues.push(`${item.source} returned ${item.status}; analysis is based on the remaining available evidence.`);
    });
  }

  let score = 42;

  if (raw.title) {
    score += 9;
    positives.push("title found");
  } else {
    issues.push("Missing or unreadable title tag.");
  }

  if (keywordIn(raw.title, primaryKeyword)) {
    score += 10;
  } else if (primaryKeyword) {
    issues.push(`Title does not clearly include "${primaryKeyword}".`);
  }

  if (raw.meta_description) {
    score += 8;
  } else {
    issues.push("Missing meta description.");
  }

  if (keywordIn(raw.meta_description, primaryKeyword)) {
    score += 6;
  }

  if (raw.h1_count === 1) {
    score += 8;
  } else if (raw.h1_count > 1) {
    score -= 4;
    issues.push("Multiple H1 tags can dilute the page topic.");
  } else {
    issues.push("Missing H1 tag.");
  }

  if (keywordIn(raw.h1, primaryKeyword)) {
    score += 6;
  } else if (primaryKeyword) {
    issues.push(`H1 does not directly target "${primaryKeyword}".`);
  }

  if (words >= 900) {
    score += 8;
  } else if (words < 450) {
    score -= 7;
    issues.push("Content depth is thin for a competitive SEO page.");
  }

  if (raw.h2_count >= 3) {
    score += 4;
  } else {
    issues.push("Add more descriptive H2 sections for scanability and answer extraction.");
  }

  if (raw.schema_types?.length) {
    score += 5;
  } else {
    issues.push("No structured data types were detected.");
  }

  if (raw.canonical) {
    score += 4;
  } else {
    issues.push("Canonical URL was not detected.");
  }

  if (raw.images_missing_alt > 0) {
    score -= 3;
    issues.push(`${raw.images_missing_alt} image${raw.images_missing_alt === 1 ? "" : "s"} appear to be missing alt text.`);
  }

  const suggestedTopics = [
    primaryKeyword ? `${primaryKeyword} buyer intent and common comparison criteria` : "Search intent and decision criteria",
    ...targetKeywords.slice(1, 3).map((item) => `${item} supporting search intent and related questions`),
    "Concise answer block for AI summaries",
    "Original data, benchmarks, or examples that competitors cannot copy easily",
    "FAQ section with source-backed answers",
    "Internal links to supporting topic clusters",
  ];

  return normalizePageAudit({
    score,
    technical: {
      title: raw.title
        ? `${keywordIn(raw.title, primaryKeyword) ? "Pass" : "Needs work"}: ${raw.title}`
        : "Critical: title tag was not detected.",
      meta: raw.meta_description
        ? `${keywordIn(raw.meta_description, primaryKeyword) ? "Pass" : "Needs work"}: ${raw.meta_description}`
        : "Critical: meta description was not detected.",
      h1: raw.h1
        ? `${raw.h1_count === 1 ? "Pass" : "Needs work"}: ${raw.h1}`
        : "Critical: H1 was not detected.",
      issues,
    },
    content: {
      gap_analysis: sentenceJoin([
        `The page has approximately ${words} words and ${raw.h2_count || 0} H2 sections.`,
        positives.length ? `Core positives: ${positives.join(", ")}.` : "",
        keywordLabel
          ? `Tighten the page around ${keywordLabel} with a direct answer block, unique evidence, and stronger supporting subtopics.`
          : "Add a target keyword to get more specific gap analysis.",
      ]),
      suggested_topics: suggestedTopics,
      ai_readiness:
        words >= 700 && raw.h2_count >= 3
          ? "Moderate: the page has enough structure to support AI extraction, but it needs clearer answer-first sections and source-backed details."
          : "Low: the page needs stronger structure, entity clarity, and concise answer sections before it is ready for AI answer extraction.",
    },
    checklist: [
      {
        task: primaryKeyword
          ? `Rewrite the title, meta description, and H1 around "${primaryKeyword}" without keyword stuffing, then cover supporting keyword variants in H2 sections.`
          : "Set precise target keywords and align title, meta description, and H1.",
        priority: "High",
        impact: "Improves relevance signals for the primary query and raises CTR potential.",
      },
      {
        task: "Add a 40-60 word answer block near the top of the content.",
        priority: "High",
        impact: "Helps featured snippets and AI answer engines extract a clean summary.",
      },
      {
        task: "Add missing topic sections, FAQs, and internal links to supporting pages.",
        priority: "Medium",
        impact: "Improves topical coverage, entity clarity, and crawl paths.",
      },
      {
        task: "Add or validate relevant schema markup.",
        priority: "Medium",
        impact: "Makes page entities and content type clearer to search engines.",
      },
    ],
    tracking: {
      metric: "Query clicks, impressions, CTR, average position, and page indexing state",
      tool: "Google Search Console",
      method: `Use Performance > Search results filtered by ${url}. Compare the target query window before and 14-28 days after changes.`,
    },
  });
}
