export const WEBSITE_SCAN_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["score", "summary", "ok", "not_ok", "do_next", "tracking"],
  properties: {
    score: { type: "number", minimum: 0, maximum: 100 },
    summary: { type: "string" },
    ok: {
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
    not_ok: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["area", "issue", "severity", "evidence"],
        properties: {
          area: { type: "string" },
          issue: { type: "string" },
          severity: { type: "string", enum: ["Critical", "Warning", "Info"] },
          evidence: { type: "string" },
        },
      },
    },
    do_next: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["task", "priority", "impact"],
        properties: {
          task: { type: "string" },
          priority: { type: "string", enum: ["High", "Medium", "Low"] },
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

function priority(value) {
  return ["High", "Medium", "Low"].includes(value) ? value : "Medium";
}

function severity(value) {
  return ["Critical", "Warning", "Info"].includes(value) ? value : "Warning";
}

function metricEvidence(metrics = {}) {
  return Object.values(metrics)
    .filter(Boolean)
    .map((metric) => `${metric.label}: ${metric.display} (${metric.status})`)
    .join("; ");
}

function coreWebVitalsStatus(signals = {}) {
  const vitals = signals.coreWebVitals;

  if (!vitals) {
    return {
      state: "missing",
      issue: "Core Web Vitals data was not fetched.",
      severity: "Info",
      evidence: "No Core Web Vitals provider response is present in the site signals.",
    };
  }

  if (vitals.field?.available) {
    const metrics = vitals.field.metrics || {};
    const statuses = Object.values(metrics).map((metric) => metric.status);
    const evidence = `${vitals.field.scope} ${vitals.field.formFactor}: ${metricEvidence(metrics)}`;

    if (statuses.every((status) => status === "good")) {
      return {
        state: "ok",
        finding: "CrUX field data passes Core Web Vitals.",
        evidence,
      };
    }

    return {
      state: "issue",
      issue: "CrUX field data shows Core Web Vitals metrics that need attention.",
      severity: statuses.includes("poor") ? "Critical" : "Warning",
      evidence,
    };
  }

  if (vitals.lab?.available) {
    return {
      state: "lab",
      issue: "No CrUX field data is available; Lighthouse lab data is available as a diagnostic fallback.",
      severity: "Info",
      evidence: `Mobile Lighthouse performance score ${vitals.lab.performanceScore}/100. ${metricEvidence(vitals.lab.metrics)}`,
    };
  }

  if (!vitals.configured?.crux || !vitals.configured?.pagespeed) {
    return {
      state: "not_configured",
      issue: "Core Web Vitals providers are not fully configured.",
      severity: "Info",
      evidence: "Set GOOGLE_CRUX_API_KEY for field data and GOOGLE_PAGESPEED_API_KEY for Lighthouse lab diagnostics.",
    };
  }

  if (["key_restricted", "invalid_key", "api_disabled", "quota_exceeded"].includes(vitals.status)) {
    return {
      state: vitals.status,
      issue: "Core Web Vitals providers are configured but Google rejected the request.",
      severity: vitals.status === "invalid_key" ? "Critical" : "Warning",
      evidence: vitals.summary || vitals.field?.reason || vitals.lab?.reason || `Google provider status: ${vitals.status}.`,
    };
  }

  return {
    state: "unavailable",
    issue: "No Core Web Vitals data is available for this URL or origin.",
    severity: "Info",
    evidence: vitals.summary || vitals.field?.reason || vitals.lab?.reason || "The providers returned no usable field or lab data.",
  };
}

function siteCrawlStatus(signals = {}) {
  const crawl = signals.siteCrawl;

  if (!crawl?.enabled) {
    return {
      enabled: false,
      finding: "Single-page scan only.",
      evidence: "No deeper Site Analysis crawl was requested for this analysis mode.",
    };
  }

  const totals = crawl.totals || {};
  const issues = [];

  if ((crawl.discoveredUrls || 0) === 0) {
    issues.push({
      area: "Deep crawl coverage",
      issue: "No additional same-origin pages were discovered from sitemap.xml or visible internal links.",
      severity: "Warning",
      evidence: `${totals.pagesFetched || 1} page sampled; sitemap/internal link discovery returned no extra crawlable URLs.`,
    });
  }

  if ((totals.pagesBlocked || 0) > 0) {
    issues.push({
      area: "Crawl access",
      issue: "Some sampled internal pages blocked the crawler.",
      severity: "Warning",
      evidence: `${totals.pagesBlocked} of ${totals.pagesFetched || 0} sampled pages returned access-blocking responses.`,
    });
  }

  if ((totals.missingTitles || 0) > 0 || (totals.missingMeta || 0) > 0) {
    issues.push({
      area: "Metadata templates",
      issue: "Repeated metadata gaps were found across the sampled crawl.",
      severity: totals.missingTitles > 0 ? "Critical" : "Warning",
      evidence: `${totals.missingTitles || 0} pages missing title; ${totals.missingMeta || 0} pages missing meta description.`,
    });
  }

  if ((totals.duplicateTitles || 0) > 0 || (totals.duplicateMetaDescriptions || 0) > 0) {
    issues.push({
      area: "Metadata templates",
      issue: "Duplicate title or meta description patterns were detected.",
      severity: "Warning",
      evidence: `${totals.duplicateTitles || 0} duplicate title instances; ${totals.duplicateMetaDescriptions || 0} duplicate meta description instances.`,
    });
  }

  if ((totals.missingH1 || 0) > 0) {
    issues.push({
      area: "Heading templates",
      issue: "Some sampled pages do not have exactly one H1.",
      severity: "Warning",
      evidence: `${totals.missingH1} of ${totals.pagesSuccessful || 0} fetched pages need H1 cleanup.`,
    });
  }

  if ((totals.thinPages || 0) > 0) {
    issues.push({
      area: "Content depth",
      issue: "Some sampled pages look thin.",
      severity: "Warning",
      evidence: `${totals.thinPages} of ${totals.pagesSuccessful || 0} fetched pages have fewer than 450 words.`,
    });
  }

  if ((totals.pagesWithoutSchema || 0) > 0) {
    issues.push({
      area: "Schema templates",
      issue: "Structured data is not consistently present across sampled pages.",
      severity: "Warning",
      evidence: `${totals.pagesWithSchema || 0} of ${totals.pagesSuccessful || 0} fetched pages include schema types.`,
    });
  }

  return {
    enabled: true,
    finding: "Multi-page crawl evidence was collected.",
    evidence: `${totals.pagesSuccessful || 0} of ${totals.pagesFetched || 0} sampled pages fetched successfully from ${crawl.discoveredUrls || 0} discovered URLs. Average page depth: ${totals.averageWords || 0} words and ${totals.averageH2 || 0} H2 headings.`,
    issues,
  };
}

export function scoreSignals(signals = {}) {
  const raw = signals.raw || {};
  let score = signals.access?.level === "full" ? 8 : 35;
  let ok = 0;
  let notOk = 0;

  const checks = [
    [Boolean(raw.title), 9],
    [Boolean(raw.meta_description), 8],
    [raw.h1_count === 1, 7],
    [(raw.h2_count || 0) >= 3, 5],
    [(raw.word_count || 0) >= 750, 8],
    [Boolean(raw.canonical), 5],
    [(raw.schema_types || []).length > 0, 7],
    [signals.robots?.exists, 4],
    [signals.sitemap?.exists, 5],
    [signals.llms?.exists, 4],
    [(raw.internal_links || 0) >= 3, 4],
    [(raw.image_count || 0) === 0 || (raw.images_missing_alt || 0) === 0, 3],
  ];

  checks.forEach(([passed, weight]) => {
    if (passed) {
      score += weight;
      ok += 1;
    } else {
      notOk += 1;
    }
  });

  if (signals.access?.level === "full") {
    notOk += 1;
  } else if (signals.access?.blocked) {
    score -= 10;
    notOk += 1;
  }

  const crawl = signals.siteCrawl;
  if (crawl?.enabled) {
    const totals = crawl.totals || {};
    if ((totals.pagesSuccessful || 0) >= 2) {
      score += 5;
      ok += 1;
    } else {
      score -= 4;
      notOk += 1;
    }

    const repeatedIssues =
      (totals.missingTitles || 0) +
      (totals.missingMeta || 0) +
      (totals.missingH1 || 0) +
      (totals.thinPages || 0) +
      (totals.duplicateTitles || 0) +
      (totals.duplicateMetaDescriptions || 0);

    if (repeatedIssues > 0) {
      score -= Math.min(12, repeatedIssues * 2);
      notOk += 1;
    } else {
      ok += 1;
    }
  }

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    ok,
    not_ok: notOk,
  };
}

export function normalizeWebsiteScan(input = {}) {
  return {
    score: clampScore(input.score),
    summary: text(input.summary, "The scan completed with local SEO evidence and prioritized next steps."),
    ok: Array.isArray(input.ok)
      ? input.ok
          .map((item) => ({
            area: text(item?.area, "SEO signal"),
            finding: text(item?.finding, "A positive SEO signal was detected."),
            evidence: text(item?.evidence, "Evidence was detected in the fetched page signals."),
          }))
          .slice(0, 14)
      : [],
    not_ok: Array.isArray(input.not_ok)
      ? input.not_ok
          .map((item) => ({
            area: text(item?.area, "SEO opportunity"),
            issue: text(item?.issue, "An SEO improvement opportunity was detected."),
            severity: severity(item?.severity),
            evidence: text(item?.evidence, "Evidence was detected in the fetched page signals."),
          }))
          .slice(0, 14)
      : [],
    do_next: Array.isArray(input.do_next)
      ? input.do_next
          .map((item) => ({
            task: text(item?.task, "Improve the highest-impact SEO issue."),
            priority: priority(item?.priority),
            impact: text(item?.impact, "Improves crawlability, relevance, or AI answer extraction."),
          }))
          .slice(0, 10)
      : [],
    tracking: Array.isArray(input.tracking)
      ? input.tracking
          .map((item) => ({
            metric: text(item?.metric, "Organic search performance"),
            tool: text(item?.tool, "Google Search Console"),
            method: text(item?.method, "Track the page before and after the changes."),
          }))
          .slice(0, 8)
      : [],
  };
}

export function heuristicWebsiteScan(signals = {}) {
  const raw = signals.raw || {};
  const ok = [];
  const notOk = [];
  const scored = scoreSignals(signals);

  const addOk = (area, finding, evidence) => ok.push({ area, finding, evidence });
  const addIssue = (area, issue, severity, evidence) => notOk.push({ area, issue, severity, evidence });
  const blockedEvidence = signals.access?.blockedSources?.map((item) => `${item.source} returned ${item.status}`).join("; ");
  const vitalsStatus = coreWebVitalsStatus(signals);
  const crawlStatus = siteCrawlStatus(signals);

  if (signals.access?.blocked) {
    addIssue(
      "Crawl access",
      signals.access.level === "full"
        ? "Crawler access is blocked, so PageSignal could not read the page content."
        : "Crawler access is partially blocked, so the scan is based on incomplete evidence.",
      signals.access.level === "full" ? "Critical" : "Warning",
      blockedEvidence || signals.access.reason
    );
  }

  if (raw.title) addOk("Traditional SEO", "Title tag is present.", `${raw.title_length} characters: ${raw.title}`);
  else addIssue("Traditional SEO", "Missing title tag.", "Critical", "No <title> element was detected in raw HTML.");

  if (raw.meta_description) addOk("Snippets", "Meta description is present.", raw.meta_description);
  else addIssue("Snippets", "Missing meta description.", "Critical", "No name=description meta tag was detected.");

  if (raw.h1_count === 1) addOk("Heading structure", "Single H1 detected.", raw.h1);
  else addIssue("Heading structure", "H1 structure needs cleanup.", raw.h1_count ? "Warning" : "Critical", `${raw.h1_count || 0} H1 tags detected.`);

  if ((raw.h2_count || 0) >= 3) addOk("Content quality", "Page uses multiple H2 sections.", `${raw.h2_count} H2 headings detected.`);
  else addIssue("Content quality", "Add more descriptive H2 sections.", "Warning", `${raw.h2_count || 0} H2 headings detected.`);

  if ((raw.word_count || 0) >= 750) addOk("Information gain", "Content depth is likely sufficient for a first-pass scan.", `${raw.word_count} words detected.`);
  else addIssue("Information gain", "Content depth appears thin.", "Warning", `${raw.word_count || 0} words detected.`);

  if (raw.canonical) addOk("Technical SEO", "Canonical URL is present.", raw.canonical);
  else addIssue("Technical SEO", "Canonical URL is missing.", "Warning", "No rel=canonical link was detected.");

  if (raw.schema_types?.length) addOk("Schema", "Structured data was detected.", raw.schema_types.join(", "));
  else addIssue("Schema", "Structured data was not detected.", "Warning", "No JSON-LD or microdata schema types were found.");

  if (signals.robots?.exists) addOk("Crawl/indexing", "robots.txt is reachable.", `Status ${signals.robots.status}.`);
  else addIssue("Crawl/indexing", "robots.txt was not reachable.", "Info", `Status ${signals.robots?.status || 0}.`);

  if (signals.sitemap?.exists) addOk("Crawl/indexing", "sitemap.xml is reachable.", `Status ${signals.sitemap.status}.`);
  else addIssue("Crawl/indexing", "sitemap.xml was not reachable at the default path.", "Warning", `Status ${signals.sitemap?.status || 0}.`);

  if (signals.llms?.exists) addOk("AI discoverability", "llms.txt is reachable.", `Status ${signals.llms.status}.`);
  else addIssue("AI discoverability", "llms.txt was not detected.", "Info", "Add /llms.txt if AI crawler guidance is part of the content strategy.");

  if ((raw.internal_links || 0) >= 3) addOk("Internal links", "Internal links are present.", `${raw.internal_links} internal links detected.`);
  else addIssue("Internal links", "Internal link coverage looks light.", "Warning", `${raw.internal_links || 0} internal links detected.`);

  if ((raw.image_count || 0) > 0 && (raw.images_missing_alt || 0) > 0) {
    addIssue("Images/media accessibility", "Some images appear to be missing alt text.", "Warning", `${raw.images_missing_alt} of ${raw.image_count} images missing alt text.`);
  } else {
    addOk("Accessibility", "No missing image alt text was detected in the raw HTML pass.", `${raw.image_count || 0} images detected.`);
  }

  if (crawlStatus.enabled) {
    addOk("Deep crawl coverage", crawlStatus.finding, crawlStatus.evidence);
    crawlStatus.issues.forEach((item) => addIssue(item.area, item.issue, item.severity, item.evidence));
  }

  if (vitalsStatus.state === "ok") {
    addOk("Core Web Vitals", vitalsStatus.finding, vitalsStatus.evidence);
  } else {
    addIssue("Core Web Vitals", vitalsStatus.issue, vitalsStatus.severity, vitalsStatus.evidence);
  }

  addIssue(
    "Citations/source pages",
    "Source-backed citation depth requires manual review.",
    "Info",
    "The MVP checks content and link signals, but not source credibility scoring."
  );

  return normalizeWebsiteScan({
    score: scored.score,
    summary: `Local scan found ${ok.length} healthy signals and ${notOk.length} opportunities across technical SEO, content, crawlability, schema, accessibility, and AI discoverability.`,
    ok,
    not_ok: notOk,
    do_next: [
      ...(signals.access?.blocked
        ? [
            {
              task: "Fix crawler access before relying on SEO content recommendations.",
              priority: "High",
              impact: "Allows search engines, AI crawlers, and SEO tools to read the page evidence needed for indexing and answer extraction.",
            },
          ]
        : []),
      ...(["issue", "lab", "not_configured", "unavailable", "key_restricted", "invalid_key", "api_disabled", "quota_exceeded"].includes(vitalsStatus.state)
        ? [
            {
              task:
                vitalsStatus.state === "not_configured"
                  ? "Configure GOOGLE_CRUX_API_KEY and GOOGLE_PAGESPEED_API_KEY for Core Web Vitals evidence."
                  : vitalsStatus.state === "key_restricted"
                    ? "Change the Google API key from HTTP referrer restriction to no application restriction for local dev or IP address restriction for deployment."
                    : vitalsStatus.state === "api_disabled"
                      ? "Enable Chrome UX Report API and PageSpeed Insights API in the Google Cloud project for this key."
                  : "Use the Core Web Vitals tab to prioritize LCP, INP, and CLS fixes.",
              priority: vitalsStatus.severity === "Critical" ? "High" : "Medium",
              impact: "Adds real-user and lab performance evidence to SEO prioritization.",
            },
          ]
        : []),
      ...(crawlStatus.enabled && crawlStatus.issues.length
        ? [
            {
              task: "Fix repeated template-level issues found in the multi-page crawl sample.",
              priority: "High",
              impact: "Reduces duplicate SEO tickets by addressing the shared metadata, heading, schema, or content template that affects multiple pages.",
            },
          ]
        : []),
      {
        task: "Fix critical metadata and H1 issues first.",
        priority: "High",
        impact: "Improves query relevance, SERP snippets, and page topic clarity.",
      },
      {
        task: "Add concise answer-first sections, FAQs, and unique evidence.",
        priority: "High",
        impact: "Improves information gain and AI answer extraction.",
      },
      {
        task: "Publish or validate schema, sitemap.xml, robots.txt, and llms.txt.",
        priority: "Medium",
        impact: "Improves machine readability, crawl hints, and AI discoverability.",
      },
      {
        task: "Run Lighthouse or PageSpeed Insights for Core Web Vitals evidence.",
        priority: "Low",
        impact: "Adds performance validation beyond the server-side scan.",
      },
    ],
    tracking: [
      {
        metric: "Indexing status and crawl issues",
        tool: "Google Search Console",
        method: "Use URL Inspection and Pages reports after publishing metadata and crawl-file updates.",
      },
      {
        metric: "Queries, clicks, CTR, and average position",
        tool: "Google Search Console",
        method: "Compare the page and target queries before and 14-28 days after content changes.",
      },
      {
        metric: "Rich result eligibility",
        tool: "Rich Results Test",
        method: "Validate schema types after deployment and monitor enhancement reports.",
      },
    ],
  });
}
