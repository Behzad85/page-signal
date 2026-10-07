import { NextResponse } from "next/server";
import { analyzeCompetitorCompare, analyzePageAudit, analyzeUxAudit, analyzeWebsiteScan, openAiApiKey } from "@/lib/analyzeSeoContent";
import { fetchCoreWebVitals } from "@/lib/fetchCoreWebVitals";
import { fetchFullPageScreenshot, screenshotServiceConfigured } from "@/lib/fetchScreenshot";
import { validateRichResults } from "@/lib/richResults";
import { domainLabel, normalizeUrl } from "@/lib/fetchPageMarkdown";
import { fetchSiteSignals } from "@/lib/fetchSiteSignals";
import { buildKeywordAnalysis } from "@/lib/keywordAnalysis";
import { personaReportContext, personaSelectionReportContext } from "@/lib/personas.mjs";
import { resolvePersonaSelection } from "@/lib/customPersonas.mjs";
import { loadOwnedPersonas } from "@/lib/persona/server";
import { assertPublicUrl } from "@/lib/urlGuard";

export const runtime = "nodejs";
export const maxDuration = 300;

const MODES = new Set(["page", "site", "compare", "ux"]);
const SIGNAL_PROGRESS_ORDER = ["jina_reader", "origin_html", "robots", "sitemap", "llms", "security_posture", "core_web_vitals", "site_crawl", "extract_signals"];
const MAX_PAGE_KEYWORDS = 5;
const DEFAULT_SITE_CRAWL_LIMIT = 5;
const MAX_SITE_CRAWL_LIMIT = 100;

function json(data, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store", Vary: "Cookie" } });
}

function assertMode(mode) {
  if (!MODES.has(mode)) {
    throw new Error("Choose Site Analysis, Page Analysis, Competitor Analysis, or UX Audit.");
  }

  return mode;
}

function keywordCandidates(input) {
  if (Array.isArray(input)) {
    return input.flatMap((item) => keywordCandidates(item));
  }

  return String(input || "")
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function validateKeywords(body) {
  const seen = new Set();
  const keywords = keywordCandidates(body.keywords?.length ? body.keywords : body.keyword).filter((keyword) => {
    const key = keyword.toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });

  if (!keywords.length) {
    throw new Error("Enter at least one target keyword for Page Analysis.");
  }

  if (keywords.length > MAX_PAGE_KEYWORDS) {
    throw new Error(`Use ${MAX_PAGE_KEYWORDS} or fewer target keywords for Page Analysis.`);
  }

  const tooLong = keywords.find((keyword) => keyword.length > 80);
  if (tooLong) {
    throw new Error(`Each Page Analysis keyword must be 80 characters or fewer. Shorten "${tooLong}".`);
  }

  return keywords;
}

async function validateUrlField(value, label) {
  let url;
  try {
    url = normalizeUrl(value);
  } catch (error) {
    throw new Error(`${label}: ${error.message}`);
  }

  // SSRF guard: reject private/loopback/link-local targets before any
  // server-side fetch or the in-network browserless screenshot call.
  try {
    await assertPublicUrl(url);
  } catch (error) {
    throw new Error(`${label}: ${error.message}`);
  }

  return url;
}

function validateSiteCrawlLimit(value) {
  const parsed = Number(value || DEFAULT_SITE_CRAWL_LIMIT);

  if (!Number.isFinite(parsed)) {
    throw new Error("Crawl scope must be a valid page limit.");
  }

  const limit = Math.round(parsed);
  if (limit < 1 || limit > MAX_SITE_CRAWL_LIMIT) {
    throw new Error(`Crawl scope must be between 1 and ${MAX_SITE_CRAWL_LIMIT} pages.`);
  }

  return limit;
}

function requestUrlSummary(urls) {
  return urls.map((url) => ({
    label: domainLabel(url),
    url,
  }));
}

function wantsProgressStream(request) {
  const accept = request.headers.get("accept") || "";
  return accept.includes("application/x-ndjson") || request.headers.get("x-optiscan-progress") === "stream";
}

function emitProgress(onProgress, event) {
  if (!onProgress) {
    return;
  }

  onProgress({
    type: "progress",
    status: "active",
    timestamp: new Date().toISOString(),
    ...event,
  });
}

function analysisStepLabel() {
  return openAiApiKey() ? "Sending evidence to OpenAI for structured analysis" : "Running local heuristic analysis";
}

function signalProgress(event, start = 16, end = 68) {
  const id = String(event.id || "").split(":").pop();
  const index = SIGNAL_PROGRESS_ORDER.indexOf(id);

  if (index === -1) {
    return undefined;
  }

  const stepSize = (end - start) / SIGNAL_PROGRESS_ORDER.length;
  const statusOffset = event.status === "done" || event.status === "error" ? 1 : 0.35;
  return Math.min(end, Math.round(start + (index + statusOffset) * stepSize));
}

function signalProgressEmitter(onProgress, start, end) {
  return (event) => {
    emitProgress(onProgress, {
      ...event,
      progress: event.progress || signalProgress(event, start, end),
    });
  };
}

async function runAnalysis(body, startedAt, onProgress, personaSelection) {
  emitProgress(onProgress, {
    id: "validate",
    label: "Validating request",
    progress: 4,
  });

  if (body.mode === "coreWebVitals") {
    const url = await validateUrlField(body.url, "URL");
    const device = String(body.device || "desktop").toLowerCase() === "mobile" ? "mobile" : "desktop";
    const label = domainLabel(url);

    emitProgress(onProgress, {
      id: "validate",
      label: "Validating request",
      status: "done",
      detail: `Accepted ${device === "desktop" ? "Desktop" : "Mobile"} Core Web Vitals request.`,
      progress: 8,
    });

    emitProgress(onProgress, {
      id: "core_web_vitals",
      label: `Fetching ${device === "desktop" ? "desktop" : "mobile"} Core Web Vitals evidence for ${label}`,
      progress: 20,
    });

    const coreWebVitals = await fetchCoreWebVitals(url, { devices: [device] });

    emitProgress(onProgress, {
      id: "core_web_vitals",
      label: `Fetching ${device === "desktop" ? "desktop" : "mobile"} Core Web Vitals evidence for ${label}`,
      status: "done",
      detail: coreWebVitals.devices?.[device]?.summary || coreWebVitals.summary,
      progress: 92,
    });

    return {
      audit: {},
      meta: {
        mode: "coreWebVitals",
        url,
        label,
        device,
        durationMs: Date.now() - startedAt,
        fetchedAt: new Date().toISOString(),
        coreWebVitals,
      },
    };
  }

  const mode = assertMode(body.mode);

  emitProgress(onProgress, {
    id: "validate",
    label: "Validating request",
    status: "done",
    detail: `Accepted ${mode === "page" ? "Page Analysis" : mode === "site" ? "Site Analysis" : mode === "ux" ? "UX Audit" : "Competitor Analysis"} request.`,
    progress: 8,
  });

  if (mode === "page") {
    const url = await validateUrlField(body.url, "Target URL");
    const keywords = validateKeywords(body);
    const keyword = keywords[0];
    const label = domainLabel(url);

    emitProgress(onProgress, {
      id: "fetch_evidence",
      label: `Collecting page evidence for ${label}`,
      progress: 12,
    });
    const signals = await fetchSiteSignals(url, {
      progressLabel: label,
      progressPrefix: "target",
      onProgress: signalProgressEmitter(onProgress, 16, 68),
    });
    emitProgress(onProgress, {
      id: "fetch_evidence",
      label: `Collecting page evidence for ${label}`,
      status: "done",
      detail: `Evidence collected from ${signals.markdown_source}.`,
      progress: 70,
    });

    emitProgress(onProgress, {
      id: "analyze",
      label: analysisStepLabel(),
      progress: 78,
    });
    const result = await analyzePageAudit({
      url,
      keyword,
      keywords,
      markdown: signals.markdown,
      signals,
    });
    const keywordAnalysis = buildKeywordAnalysis({
      mode,
      signals,
      audit: result.audit,
      targetKeywords: keywords,
    });
    emitProgress(onProgress, {
      id: "analyze",
      label: analysisStepLabel(),
      status: "done",
      detail: `Analysis source: ${result.meta.source}.`,
      progress: 92,
    });

    emitProgress(onProgress, {
      id: "finalize",
      label: "Normalizing report for the dashboard",
      progress: 96,
    });
    const response = {
      audit: result.audit,
      meta: {
        mode,
        url,
        label,
        keyword,
        keywords,
        durationMs: Date.now() - startedAt,
        fetchedAt: new Date().toISOString(),
        coreWebVitals: signals.coreWebVitals,
        security: signals.security,
        keywordAnalysis,
        richResults: validateRichResults(signals.raw?.structured_data_items),
        markupReferences: signals.markupReferences,
        crawl: {
          markdownSource: signals.markdown_source,
          htmlProfile: signals.html_profile,
          htmlAttempts: signals.html_attempts,
        },
        access: {
          label,
          url,
          ...signals.access,
        },
        ...result.meta,
      },
    };
    emitProgress(onProgress, {
      id: "finalize",
      label: "Normalizing report for the dashboard",
      status: "done",
      detail: "Report payload is ready.",
      progress: 99,
    });
    return response;
  }

  if (mode === "ux") {
    const url = await validateUrlField(body.url, "Page URL");
    const label = domainLabel(url);

    emitProgress(onProgress, {
      id: "fetch_evidence",
      label: `Collecting page evidence and rendered screenshot for ${label}`,
      detail: screenshotServiceConfigured() ? "Capturing a full-page screenshot and verifying cookie-consent handling in parallel." : "Collecting structural evidence without a rendered screenshot.",
      progress: 12,
    });
    const [signals, fullPageShot] = await Promise.all([
      fetchSiteSignals(url, {
        progressLabel: label,
        progressPrefix: "target",
        onProgress: signalProgressEmitter(onProgress, 16, 68),
      }),
      fetchFullPageScreenshot(url),
    ]);
    const screenshot = fullPageShot?.available
      ? {
          source: "browserless",
          fullPage: true,
          usableForAnalysis: fullPageShot.usableForAnalysis === true,
          consent: fullPageShot.consent,
          image: fullPageShot.screenshot,
          status: fullPageShot.status,
          durationMs: fullPageShot.durationMs,
        }
      : {
          source: "none",
          fullPage: false,
          usableForAnalysis: false,
          consent: fullPageShot?.consent || { status: "unavailable", verified: false, method: "none", control: "", overlayVisibleAfter: false },
          image: null,
          status: fullPageShot?.status || "not_configured",
          reason: fullPageShot?.reason || "",
        };
    emitProgress(onProgress, {
      id: "fetch_evidence",
      label: `Collecting page evidence and rendered screenshot for ${label}`,
      status: "done",
      detail:
        screenshot.usableForAnalysis
          ? "Evidence and a consent-verified full-page screenshot were collected."
          : screenshot.source === "browserless"
            ? "Evidence collected. The screenshot was excluded because consent handling could not be verified."
            : "Evidence collected. No verified rendered screenshot was available.",
      progress: 70,
    });

    emitProgress(onProgress, {
      id: "analyze",
      label: analysisStepLabel(),
      progress: 78,
    });
    const result = await analyzeUxAudit({
      url,
      signals,
      fullPageScreenshot: screenshot.usableForAnalysis ? screenshot.image : null,
      primaryPersona: personaSelection.primary,
      secondaryPersonas: personaSelection.secondary,
    });
    emitProgress(onProgress, {
      id: "analyze",
      label: analysisStepLabel(),
      status: "done",
      detail: `Analysis source: ${result.meta.source}${result.meta.visionUsed ? " with screenshot vision review" : ""}.`,
      progress: 92,
    });

    emitProgress(onProgress, {
      id: "finalize",
      label: "Normalizing UX report for the dashboard",
      progress: 96,
    });
    const response = {
      audit: result.audit,
      meta: {
        mode,
        url,
        label,
        durationMs: Date.now() - startedAt,
        fetchedAt: new Date().toISOString(),
        persona: personaReportContext(personaSelection.primary),
        personas: personaSelectionReportContext(personaSelection),
        coreWebVitals: signals.coreWebVitals,
        screenshot,
        markupReferences: signals.markupReferences,
        crawl: {
          markdownSource: signals.markdown_source,
          htmlProfile: signals.html_profile,
          htmlAttempts: signals.html_attempts,
        },
        access: {
          label,
          url,
          ...signals.access,
        },
        ...result.meta,
      },
    };
    emitProgress(onProgress, {
      id: "finalize",
      label: "Normalizing UX report for the dashboard",
      status: "done",
      detail: "Report payload is ready.",
      progress: 99,
    });
    return response;
  }

  if (mode === "site") {
    const url = await validateUrlField(body.url, "Website URL");
    const label = domainLabel(url);
    const crawlLimit = validateSiteCrawlLimit(body.crawlLimit);

    emitProgress(onProgress, {
      id: "fetch_evidence",
      label: `Collecting website evidence for ${label}`,
      progress: 12,
    });
    const signals = await fetchSiteSignals(url, {
      progressLabel: label,
      progressPrefix: "target",
      crawlLimit,
      onProgress: signalProgressEmitter(onProgress, 16, 68),
    });
    emitProgress(onProgress, {
      id: "fetch_evidence",
      label: `Collecting website evidence for ${label}`,
      status: "done",
      detail: `Evidence collected from ${signals.markdown_source}.`,
      progress: 70,
    });

    emitProgress(onProgress, {
      id: "analyze",
      label: analysisStepLabel(),
      progress: 78,
    });
    const result = await analyzeWebsiteScan(signals);
    const keywordAnalysis = buildKeywordAnalysis({
      mode,
      signals,
      audit: result.audit,
      targetKeywords: [],
    });
    emitProgress(onProgress, {
      id: "analyze",
      label: analysisStepLabel(),
      status: "done",
      detail: `Analysis source: ${result.meta.source}.`,
      progress: 92,
    });

    emitProgress(onProgress, {
      id: "finalize",
      label: "Normalizing report for the dashboard",
      progress: 96,
    });
    const response = {
      audit: result.audit,
      meta: {
        mode,
        url,
        label,
        durationMs: Date.now() - startedAt,
        fetchedAt: new Date().toISOString(),
        signals: {
          wordCount: signals.raw.word_count,
          schemaTypes: signals.raw.schema_types,
          canonical: Boolean(signals.raw.canonical),
          robots: signals.robots?.exists,
          sitemap: signals.sitemap?.exists,
          llms: signals.llms?.exists,
          socialProfiles: signals.raw.social_profiles,
        },
        coreWebVitals: signals.coreWebVitals,
        security: signals.security,
        keywordAnalysis,
        richResults: validateRichResults(signals.raw?.structured_data_items),
        markupReferences: signals.markupReferences,
        crawl: {
          requestedLimit: crawlLimit,
          markdownSource: signals.markdown_source,
          htmlProfile: signals.html_profile,
          htmlAttempts: signals.html_attempts,
          siteCrawl: signals.siteCrawl,
        },
        access: {
          label,
          url,
          ...signals.access,
        },
        ...result.meta,
      },
    };
    emitProgress(onProgress, {
      id: "finalize",
      label: "Normalizing report for the dashboard",
      status: "done",
      detail: "Report payload is ready.",
      progress: 99,
    });
    return response;
  }

  const userUrl = await validateUrlField(body.userUrl || body.url, "Your website URL");
  const firstCompetitorUrl = await validateUrlField(body.firstCompetitorUrl || body.competitor1 || body.competitorA, "First competitor URL");
  const secondCompetitorUrl = await validateUrlField(body.secondCompetitorUrl || body.competitor2 || body.competitorB, "Second competitor URL");
  const urls = [userUrl, firstCompetitorUrl, secondCompetitorUrl];

  emitProgress(onProgress, {
    id: "fetch_evidence",
    label: "Fetching all three websites in parallel",
    progress: 12,
  });
  const signalsList = await Promise.all(
    urls.map((url, index) =>
      fetchSiteSignals(url, {
        progressLabel: domainLabel(url),
        progressPrefix: `site_${index + 1}`,
        onProgress: signalProgressEmitter(onProgress, 16, 68),
      })
    )
  );
  emitProgress(onProgress, {
    id: "fetch_evidence",
    label: "Fetching all three websites in parallel",
    status: "done",
    detail: "Evidence collected for your site and both competitor URLs.",
    progress: 70,
  });

  emitProgress(onProgress, {
    id: "analyze",
    label: analysisStepLabel(),
    progress: 78,
  });
  const result = await analyzeCompetitorCompare(signalsList);
  emitProgress(onProgress, {
    id: "analyze",
    label: analysisStepLabel(),
    status: "done",
    detail: `Analysis source: ${result.meta.source}.`,
    progress: 92,
  });

  emitProgress(onProgress, {
    id: "finalize",
    label: "Normalizing report and replacing generic competitor labels",
    progress: 96,
  });
  const response = {
    audit: result.audit,
    meta: {
      mode,
      url: userUrl,
      urls: requestUrlSummary(urls),
      access: signalsList.map((signals) => ({
        label: domainLabel(signals.url),
        url: signals.url,
        ...signals.access,
      })),
      coreWebVitals: signalsList.map((signals) => ({
        label: domainLabel(signals.url),
        url: signals.url,
        coreWebVitals: signals.coreWebVitals,
      })),
      markupReferences: signalsList.map((signals) => ({
        label: domainLabel(signals.url),
        url: signals.url,
        references: signals.markupReferences,
      })),
      crawl: signalsList.map((signals) => ({
        label: domainLabel(signals.url),
        url: signals.url,
        markdownSource: signals.markdown_source,
        htmlProfile: signals.html_profile,
        htmlAttempts: signals.html_attempts,
      })),
      durationMs: Date.now() - startedAt,
      fetchedAt: new Date().toISOString(),
      ...result.meta,
    },
  };
  emitProgress(onProgress, {
    id: "finalize",
    label: "Normalizing report and replacing generic competitor labels",
    status: "done",
    detail: "Report payload is ready.",
    progress: 99,
  });
  return response;
}

function ndjsonHeaders() {
  return {
    "content-type": "application/x-ndjson; charset=utf-8",
    "cache-control": "private, no-store, no-transform",
    "vary": "Cookie",
    "x-accel-buffering": "no",
  };
}

function ndjsonErrorResponse(message) {
  return new Response(`${JSON.stringify({ type: "error", error: message, timestamp: new Date().toISOString() })}\n`, {
    headers: ndjsonHeaders(),
  });
}

function ndjsonResponse(body, startedAt, personaSelection) {
  const encoder = new TextEncoder();

  return new Response(
    new ReadableStream({
      async start(controller) {
        function send(payload) {
          controller.enqueue(encoder.encode(`${JSON.stringify(payload)}\n`));
        }

        try {
          const data = await runAnalysis(body, startedAt, send, personaSelection);
          send({
            type: "progress",
            id: "complete",
            label: "Report ready",
            status: "done",
            detail: "Dashboard report rendered from normalized analysis output.",
            progress: 100,
            timestamp: new Date().toISOString(),
          });
          send({ type: "result", data });
        } catch (error) {
          send({
            type: "error",
            error: error.message || "Unable to analyze this request.",
            timestamp: new Date().toISOString(),
          });
        } finally {
          controller.close();
        }
      },
    }),
    {
      headers: ndjsonHeaders(),
    }
  );
}

export async function POST(request) {
  const startedAt = Date.now();
  const streamProgress = wantsProgressStream(request);
  let body;

  try {
    body = await request.json();
  } catch {
    const message = "Request body must be valid JSON.";
    if (streamProgress) {
      return ndjsonErrorResponse(message);
    }

    return json(
      {
        error: message,
      },
      400
    );
  }

  // Resolve private data before starting a stream so auth refresh cookies reach
  // the response and inaccessible IDs fail before any target URL is fetched.
  let personaSelection;
  try {
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Provide a JSON object.");
    if (body.mode === "ux") personaSelection = await resolvePersonaSelection(body.personaId, body.secondaryPersonaIds ?? [], loadOwnedPersonas);
  } catch (error) {
    return json({ error: error.message || "This persona selection is unavailable." }, error.status || 400);
  }
  if (streamProgress) {
    return ndjsonResponse(body, startedAt, personaSelection);
  }

  try {
    return json(await runAnalysis(body, startedAt, undefined, personaSelection));
  } catch (error) {
    return json(
      {
        error: error.message || "Unable to analyze this request.",
      },
      400
    );
  }
}
