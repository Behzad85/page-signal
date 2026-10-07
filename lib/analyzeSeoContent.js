import OpenAI from "openai";
import { PAGE_AUDIT_SCHEMA, heuristicPageAudit, normalizePageAudit } from "./auditSchema";
import { COMPARE_SCHEMA, heuristicCompare, normalizeCompare, siteSummaryFromSignals } from "./compareSchema";
import { truncateText } from "./fetchPageMarkdown";
import { WEBSITE_SCAN_SCHEMA, heuristicWebsiteScan, normalizeWebsiteScan, scoreSignals } from "./opportunitySchema";
import { UX_AUDIT_SCHEMA, heuristicUxAudit, normalizeUxAudit } from "./uxAuditSchema";
import { buildUxAuditPrompt } from "./uxAuditPrompt.mjs";

const DEFAULT_MODEL = "gpt-4.1-mini";
const SCORE_METHOD = "deterministic_evidence_v1";

function modelName() {
  return process.env.OPENAI_MODEL || process.env.SEO_OPS_OPENAI_MODEL || DEFAULT_MODEL;
}

export function openAiApiKey() {
  return process.env.OPENAI_API_KEY || process.env.SEO_OPS_OPENAI_API_KEY || "";
}

function hasOpenAIKey() {
  return Boolean(openAiApiKey());
}

function extractOutputText(response) {
  if (response.output_text) {
    return response.output_text;
  }

  const parts = [];
  for (const item of response.output || []) {
    for (const content of item.content || []) {
      if (content.type === "output_text" && content.text) {
        parts.push(content.text);
      }
    }
  }

  return parts.join("\n");
}

function parseJson(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed) {
    throw new Error("OpenAI returned an empty response.");
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("OpenAI response did not contain JSON.");
    }

    return JSON.parse(match[0]);
  }
}

async function requestStructuredJson({ schema, schemaName, system, user, images = [], maxOutputTokens = 2500 }) {
  const client = new OpenAI({ apiKey: openAiApiKey() });
  const userContent = images.length
    ? [{ type: "input_text", text: user }, ...images.map((imageUrl) => ({ type: "input_image", image_url: imageUrl }))]
    : user;
  const response = await client.responses.create({
    model: modelName(),
    input: [
      {
        role: "system",
        content: system,
      },
      {
        role: "user",
        content: userContent,
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: schemaName,
        strict: true,
        schema,
      },
    },
    temperature: 0.2,
    max_output_tokens: maxOutputTokens,
  });

  return parseJson(extractOutputText(response));
}

function stripScreenshot(lab) {
  if (!lab || typeof lab !== "object") {
    return lab;
  }

  const { screenshot, ...rest } = lab;
  return rest;
}

function coreWebVitalsEvidence(coreWebVitals) {
  if (!coreWebVitals || typeof coreWebVitals !== "object") {
    return null;
  }

  return {
    ...coreWebVitals,
    lab: stripScreenshot(coreWebVitals.lab),
    devices: Object.fromEntries(
      Object.entries(coreWebVitals.devices || {}).map(([device, entry]) => [device, { ...entry, lab: stripScreenshot(entry?.lab) }])
    ),
  };
}

function siteEvidence(signals) {
  return {
    url: signals.url,
    access: signals.access || {
      blocked: false,
      level: "none",
      reason: "",
      blockedSources: [],
    },
    crawl: {
      markdown_source: signals.markdown_source || "none",
      html_profile: signals.html_profile || "",
      html_attempts: signals.html_attempts || [],
      site_crawl: signals.siteCrawl
        ? {
            enabled: signals.siteCrawl.enabled,
            requestedLimit: signals.siteCrawl.requestedLimit,
            discoveredUrls: signals.siteCrawl.discoveredUrls,
            totals: signals.siteCrawl.totals,
            pages: (signals.siteCrawl.pages || []).map((page) => ({
              url: page.url,
              status: page.status,
              statusText: page.statusText,
              ok: page.ok,
              title: page.title,
              h1_count: page.h1_count,
              h2_count: page.h2_count,
              word_count: page.word_count,
              schema_types: page.schema_types,
              images_missing_alt: page.images_missing_alt,
              internal_links: page.internal_links,
              social_profiles: page.social_profiles,
            })),
          }
        : null,
    },
    raw: signals.raw,
    robots: {
      exists: signals.robots?.exists,
      status: signals.robots?.status,
      preview: truncateText(signals.robots?.preview || "", 800),
    },
    sitemap: {
      exists: signals.sitemap?.exists,
      status: signals.sitemap?.status,
      preview: truncateText(signals.sitemap?.preview || "", 800),
    },
    llms: {
      exists: signals.llms?.exists,
      status: signals.llms?.status,
      preview: truncateText(signals.llms?.preview || "", 800),
    },
    coreWebVitals: coreWebVitalsEvidence(signals.coreWebVitals),
    markdown_excerpt: truncateText(signals.markdown || "", 22000),
  };
}

function normalizedKeywordList(keyword, keywords) {
  const input = Array.isArray(keywords) && keywords.length ? keywords : [keyword];
  return input.map((item) => String(item || "").trim()).filter(Boolean);
}

export function buildPageAuditPrompt({ url, keyword, keywords, markdown, signals }) {
  const targetKeywords = normalizedKeywordList(keyword, keywords);

  return {
    system:
      "You are an expert SEO strategist and AI answer optimization analyst. Return strict JSON only. Be specific, evidence-led, and action oriented. Do not include markdown fences.",
    user: JSON.stringify(
      {
        task: "Audit this page for the target keyword set using the exact schema. Score 0-100. Treat the page as a public SEO landing page or content page.",
        url,
        primary_keyword: targetKeywords[0] || keyword,
        target_keywords: targetKeywords,
        raw_signals: signals?.raw || {},
        crawl_files: {
          robots: Boolean(signals?.robots?.exists),
          sitemap: Boolean(signals?.sitemap?.exists),
          llms: Boolean(signals?.llms?.exists),
        },
        markdown: truncateText(markdown, 45000),
        requirements: [
          "If access.blocked is true, call it out as a crawlability issue and avoid pretending missing content evidence is normal content weakness.",
          "technical.title, technical.meta, and technical.h1 should each be a short status sentence with evidence.",
          "technical.issues must list concrete issues only.",
          "Treat the first keyword as the primary query and the remaining keywords as supporting query variants.",
          "content.gap_analysis must explain search intent gaps, information gain, and AI answer extraction gaps.",
          "content.suggested_topics must be missing or underdeveloped topics.",
          "tracking must be specific to Google Search Console.",
        ],
      },
      null,
      2
    ),
  };
}

export function buildWebsiteScanPrompt(signals) {
  return {
    system:
      "You are an expert technical SEO, content quality, and AI discoverability auditor. Return strict JSON only. Prioritize concrete OK / Not OK / Do Next / Tracking output.",
    user: JSON.stringify(
      {
        task: "Scan this website page and produce an SEO diagnosis using the exact schema.",
        evidence: siteEvidence(signals),
        coverage_requirements: [
          "crawler access and 403/access-denied handling",
          "multi-page crawl coverage and repeated template issues",
          "traditional SEO",
          "technical SEO",
          "content quality",
          "information gain",
          "schema",
          "crawl/indexing",
          "snippets",
          "internal links",
          "images/media",
          "accessibility",
          "Core Web Vitals notes",
          "AI answer extraction",
          "entity clarity",
          "citations/source pages",
          "AI discoverability",
        ],
      },
      null,
      2
    ),
  };
}

export function buildComparePrompt(signalsList) {
  const summaries = signalsList.map(siteSummaryFromSignals);

  return {
    system:
      "You are an expert SEO competitor analyst. Return strict JSON only. Never write Competitor 1 or Competitor 2; use the provided domain labels exactly.",
    user: JSON.stringify(
      {
        task: "Compare the user's website against two competitor URLs using the exact schema.",
        labels: {
          user: summaries[0]?.label,
          competitors: summaries.slice(1).map((item) => item.label),
        },
        site_summaries: summaries,
        evidence: signalsList.map(siteEvidence),
        comparison_requirements: [
          "crawler access and blocked fetch evidence",
          "technical SEO",
          "crawlability",
          "structured data",
          "content depth",
          "heading structure",
          "Core Web Vitals",
          "AI readiness",
          "entity clarity",
          "answer extraction",
        ],
        label_rule: "Use website domains as labels. Do not use generic competitor numbering anywhere.",
      },
      null,
      2
    ),
  };
}

export async function analyzeUxAudit({ url, signals, fullPageScreenshot = null, primaryPersona, secondaryPersonas = [] }) {
  const coreWebVitals = signals.coreWebVitals || null;
  const heuristicInput = { url, signals, coreWebVitals, primaryPersona, secondaryPersonas };
  const deterministicScore = heuristicUxAudit(heuristicInput).score;

  if (!hasOpenAIKey()) {
    return {
      audit: heuristicUxAudit(heuristicInput),
      meta: {
        source: "heuristic",
        openaiUsed: false,
        visionUsed: false,
        model: null,
        scoreMethod: SCORE_METHOD,
        reason: "OPENAI_API_KEY or SEO_OPS_OPENAI_API_KEY is missing.",
      },
    };
  }

  // UX vision conclusions require a consent-verified capture. Lighthouse's
  // viewport image has no consent outcome, so it remains diagnostic evidence
  // and is never attached to the model request.
  const screenshot = fullPageScreenshot || null;
  const fullPage = Boolean(fullPageScreenshot);

  try {
    const prompt = buildUxAuditPrompt({ url, evidence: siteEvidence(signals), screenshot, fullPage, primaryPersona, secondaryPersonas });
    const output = await requestStructuredJson({
      schema: UX_AUDIT_SCHEMA,
      schemaName: "ux_audit",
      system: prompt.system,
      user: prompt.user,
      images: screenshot ? [screenshot] : [],
      maxOutputTokens: 6500,
    });

    return {
      audit: {
        ...normalizeUxAudit(output),
        score: deterministicScore,
      },
      meta: {
        source: "openai",
        openaiUsed: true,
        visionUsed: Boolean(screenshot),
        visionFullPage: fullPage,
        model: modelName(),
        scoreMethod: SCORE_METHOD,
      },
    };
  } catch (error) {
    return {
      audit: heuristicUxAudit(heuristicInput),
      meta: {
        source: "heuristic",
        openaiUsed: false,
        visionUsed: false,
        model: modelName(),
        scoreMethod: SCORE_METHOD,
        reason: `OpenAI analysis failed: ${error.message}`,
      },
    };
  }
}

export async function analyzePageAudit({ url, keyword, keywords, markdown, signals }) {
  const deterministicScore = heuristicPageAudit({ url, keyword, keywords, markdown, signals }).score;

  if (!hasOpenAIKey()) {
    return {
      audit: heuristicPageAudit({ url, keyword, keywords, markdown, signals }),
      meta: {
        source: "heuristic",
        openaiUsed: false,
        model: null,
        scoreMethod: SCORE_METHOD,
        reason: "OPENAI_API_KEY or SEO_OPS_OPENAI_API_KEY is missing.",
      },
    };
  }

  try {
    const prompt = buildPageAuditPrompt({ url, keyword, keywords, markdown, signals });
    const output = await requestStructuredJson({
      schema: PAGE_AUDIT_SCHEMA,
      schemaName: "page_audit",
      system: prompt.system,
      user: prompt.user,
      maxOutputTokens: 2600,
    });

    return {
      audit: {
        ...normalizePageAudit(output),
        score: deterministicScore,
      },
      meta: {
        source: "openai",
        openaiUsed: true,
        model: modelName(),
        scoreMethod: SCORE_METHOD,
      },
    };
  } catch (error) {
    return {
      audit: heuristicPageAudit({ url, keyword, keywords, markdown, signals }),
      meta: {
        source: "heuristic",
        openaiUsed: false,
        model: modelName(),
        scoreMethod: SCORE_METHOD,
        reason: `OpenAI analysis failed: ${error.message}`,
      },
    };
  }
}

export async function analyzeWebsiteScan(signals) {
  const deterministicScore = scoreSignals(signals).score;

  if (!hasOpenAIKey()) {
    return {
      audit: heuristicWebsiteScan(signals),
      meta: {
        source: "heuristic",
        openaiUsed: false,
        model: null,
        scoreMethod: SCORE_METHOD,
        reason: "OPENAI_API_KEY or SEO_OPS_OPENAI_API_KEY is missing.",
      },
    };
  }

  try {
    const prompt = buildWebsiteScanPrompt(signals);
    const output = await requestStructuredJson({
      schema: WEBSITE_SCAN_SCHEMA,
      schemaName: "website_scan",
      system: prompt.system,
      user: prompt.user,
      maxOutputTokens: 3600,
    });

    return {
      audit: {
        ...normalizeWebsiteScan(output),
        score: deterministicScore,
      },
      meta: {
        source: "openai",
        openaiUsed: true,
        model: modelName(),
        scoreMethod: SCORE_METHOD,
      },
    };
  } catch (error) {
    return {
      audit: heuristicWebsiteScan(signals),
      meta: {
        source: "heuristic",
        openaiUsed: false,
        model: modelName(),
        scoreMethod: SCORE_METHOD,
        reason: `OpenAI analysis failed: ${error.message}`,
      },
    };
  }
}

export async function analyzeCompetitorCompare(signalsList) {
  const siteSummaries = signalsList.map(siteSummaryFromSignals);

  if (!hasOpenAIKey()) {
    return {
      audit: heuristicCompare(signalsList),
      meta: {
        source: "heuristic",
        openaiUsed: false,
        model: null,
        scoreMethod: SCORE_METHOD,
        reason: "OPENAI_API_KEY or SEO_OPS_OPENAI_API_KEY is missing.",
      },
    };
  }

  try {
    const prompt = buildComparePrompt(signalsList);
    const output = await requestStructuredJson({
      schema: COMPARE_SCHEMA,
      schemaName: "competitor_compare",
      system: prompt.system,
      user: prompt.user,
      maxOutputTokens: 4200,
    });

    return {
      audit: normalizeCompare(output, siteSummaries),
      meta: {
        source: "openai",
        openaiUsed: true,
        model: modelName(),
        scoreMethod: SCORE_METHOD,
      },
    };
  } catch (error) {
    return {
      audit: heuristicCompare(signalsList),
      meta: {
        source: "heuristic",
        openaiUsed: false,
        model: modelName(),
        scoreMethod: SCORE_METHOD,
        reason: `OpenAI analysis failed: ${error.message}`,
      },
    };
  }
}
