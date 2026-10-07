"use client";

import { Button, Paper, Select, TextInput } from "./design/primitives";
import { WarningAmberOutlined as AlertTriangle } from "./design/icons";
import { AutorenewOutlined as Loader2 } from "./design/icons";
import { AutoAwesomeOutlined as Sparkles } from "./design/icons";
import { CloseOutlined as X } from "./design/icons";
import { Tabs, Tab } from "./design/primitives";
import { PageHeading } from "./design/AppShell";
import { useEffect, useMemo, useRef, useState } from "react";
import { CRAWL_LIMIT_OPTIONS, INITIAL_PROGRESS_EVENT, SEO_MODES } from "./optiscan/constants";
import { LoadingState, normalizeProgressEvent, progressPercent, readAnalyzeStream, upsertProgressEvent } from "./optiscan/progress";
import { Report } from "./optiscan/reports";
import ReportFeedback from "./optiscan/ReportFeedback";
import { analyticsDomain, scoreBand, trackEvent } from "../lib/analytics";

const MAX_KEYWORDS = 5;
const DEFAULT_CRAWL_LIMIT = 5;

function parseKeywordInput(value) {
  return String(value || "")
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeUrlInput(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function InlineField({ label, value, onChange, placeholder, required = true, disabled = false, ...props }) {
  return (
    <TextInput
      label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      {...props}
      className={`min-w-0 ${disabled ? "opacity-65" : ""}`}
    />
  );
}

function ConfirmPageAnalysisModal({ request, onKeywordChange, onCancel, onConfirm, isLoading }) {
  const formRef = useRef(null);
  const previousActiveElementRef = useRef(null);
  const onCancelRef = useRef(onCancel);
  const isOpen = Boolean(request);

  useEffect(() => {
    onCancelRef.current = onCancel;
  }, [onCancel]);

  useEffect(() => {
    if (!isOpen) return undefined;

    previousActiveElementRef.current = document.activeElement;
    const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const focusable = () => Array.from(formRef.current?.querySelectorAll(focusableSelector) || []).filter((element) => !element.disabled);
    window.setTimeout(() => {
      const keywordInput = formRef.current?.querySelector('input[name="page-analysis-keywords"]');
      if (keywordInput && typeof keywordInput.focus === "function") {
        keywordInput.focus();
        return;
      }
      focusable()[0]?.focus();
    }, 0);

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancelRef.current();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const items = focusable();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (previousActiveElementRef.current && typeof previousActiveElementRef.current.focus === "function") {
        previousActiveElementRef.current.focus();
      }
    };
  }, [isOpen]);

  if (!request) {
    return null;
  }

  const keyword = request.keyword || "";
  const keywordCount = parseKeywordInput(keyword).length;
  const canConfirm = Boolean(request.url && keywordCount > 0 && keywordCount <= MAX_KEYWORDS) && !isLoading;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-ink-950/50 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="page-analysis-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onCancel();
        }
      }}
    >
      <form ref={formRef} className="w-full max-w-lg rounded-lg border border-ink-200 bg-white p-5" onSubmit={onConfirm}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-amber-300/30 bg-amber-400/10 text-amber-700">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2 id="page-analysis-title" className="text-base font-semibold text-ink-900">
                Analyze this page?
              </h2>
              <p className="mt-2 text-sm leading-6 text-ink-600">
                This will replace the current Site Analysis report with a Page Analysis report for the selected URL. To return to the current site-wide report, you will need to run Site Analysis again.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-ink-600 transition hover:bg-white hover:text-ink-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500"
            aria-label="Cancel page analysis"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-5 grid gap-3">
          <div className="rounded-md border border-ink-200 bg-white p-3">
            <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-600">Selected URL</div>
            <p className="mt-2 break-words text-sm font-semibold text-ink-900">{request.url}</p>
          </div>
          <InlineField
            label="Keywords"
            name="page-analysis-keywords"
            value={keyword}
            onChange={onKeywordChange}
            placeholder="target keyword, supporting keyword"
          />
          <p className={`text-xs leading-5 ${keywordCount > MAX_KEYWORDS ? "text-amber-700" : "text-ink-600"}`}>
            Page Analysis supports up to {MAX_KEYWORDS} comma-separated keywords. The first keyword is treated as the primary target.
          </p>
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex min-h-10 items-center justify-center rounded-md border border-ink-200 bg-white px-4 text-sm font-bold text-ink-800 transition hover:border-slate-500 hover:text-ink-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canConfirm}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-accent-500 px-4 text-sm font-bold text-white transition hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />}
            Analyze page
          </button>
        </div>
      </form>
    </div>
  );
}

export default function PageSignalApp() {
  const [mode, setMode] = useState("site");
  const [url, setUrl] = useState("");
  const [keyword, setKeyword] = useState("");
  const [userUrl, setUserUrl] = useState("");
  const [firstCompetitorUrl, setFirstCompetitorUrl] = useState("");
  const [secondCompetitorUrl, setSecondCompetitorUrl] = useState("");
  const [crawlLimit, setCrawlLimit] = useState(String(DEFAULT_CRAWL_LIMIT));
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [progressEvents, setProgressEvents] = useState([]);
  const [pageAnalysisRequest, setPageAnalysisRequest] = useState(null);
  const [lastPayload, setLastPayload] = useState(null);
  const [desktopVitalsState, setDesktopVitalsState] = useState({ loading: false, error: "" });
  const abortControllerRef = useRef(null);

  const activeMode = useMemo(() => SEO_MODES.find((item) => item.id === mode) || SEO_MODES[0], [mode]);

  useEffect(() => {
    trackEvent("app_loaded", { default_mode: "site" });
  }, []);

  async function runAnalysis(payload) {
    const normalizedPayload =
      payload.mode === "compare"
        ? {
            ...payload,
            userUrl: normalizeUrlInput(payload.userUrl),
            firstCompetitorUrl: normalizeUrlInput(payload.firstCompetitorUrl),
            secondCompetitorUrl: normalizeUrlInput(payload.secondCompetitorUrl),
          }
        : { ...payload, url: normalizeUrlInput(payload.url) };

    setError("");
    setResult(null);
    setDesktopVitalsState({ loading: false, error: "" });
    setProgressEvents([normalizeProgressEvent(INITIAL_PROGRESS_EVENT)]);
    setIsLoading(true);
    setLastPayload(normalizedPayload);

    trackEvent("scan_started", {
      mode: normalizedPayload.mode,
      domain:
        normalizedPayload.mode === "compare"
          ? analyticsDomain(normalizedPayload.userUrl)
          : analyticsDomain(normalizedPayload.url),
      crawl_limit: normalizedPayload.crawlLimit,
      keyword_count: Array.isArray(normalizedPayload.keywords) ? normalizedPayload.keywords.length : undefined,
      persona: normalizedPayload.personaId,
      persona_count: normalizedPayload.personaId ? 1 + (normalizedPayload.secondaryPersonaIds?.length || 0) : undefined,
    });

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/x-ndjson",
          "x-optiscan-progress": "stream",
        },
        body: JSON.stringify(normalizedPayload),
        signal: controller.signal,
      });
      const data = await readAnalyzeStream(response, (progressEvent) => {
        setProgressEvents((events) => upsertProgressEvent(events, progressEvent));
      });

      setResult(data);
      trackEvent("scan_completed", {
        mode: normalizedPayload.mode,
        domain:
          normalizedPayload.mode === "compare"
            ? analyticsDomain(normalizedPayload.userUrl)
            : analyticsDomain(normalizedPayload.url),
        duration_ms: data?.meta?.durationMs,
        source: data?.meta?.source,
        score: data?.audit?.score,
        score_band: scoreBand(data?.audit?.score),
        pages_crawled: data?.meta?.crawl?.siteCrawl?.totals?.pagesFetched,
        persona: normalizedPayload.personaId,
        persona_count: normalizedPayload.personaId ? 1 + (normalizedPayload.secondaryPersonaIds?.length || 0) : undefined,
      });
    } catch (requestError) {
      const cancelled = requestError?.name === "AbortError";
      setProgressEvents((events) =>
        upsertProgressEvent(events, {
          id: cancelled ? "request_cancelled" : "request_error",
          label: cancelled ? "Scan cancelled" : "Analysis stopped",
          status: "error",
          detail: cancelled ? "The scan was stopped before the backend returned a report." : requestError.message,
          progress: progressPercent(events),
        })
      );
      setError(cancelled ? "Scan cancelled." : requestError.message);
      trackEvent(cancelled ? "scan_cancelled" : "scan_failed", {
        mode: normalizedPayload.mode,
        domain:
          normalizedPayload.mode === "compare"
            ? analyticsDomain(normalizedPayload.userUrl)
            : analyticsDomain(normalizedPayload.url),
        error_type: cancelled ? "cancelled" : requestError.message,
      });
    } finally {
      setIsLoading(false);
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  }

  function handleCancelAnalysis() {
    abortControllerRef.current?.abort();
    setIsLoading(false);
    setError("Scan cancelled.");
  }

  async function handleFetchDesktopVitals() {
    const targetUrl = result?.meta?.url;
    if (!targetUrl || desktopVitalsState.loading) {
      return;
    }

    setDesktopVitalsState({ loading: true, error: "" });
    trackEvent("desktop_vitals_requested", {
      mode,
      domain: analyticsDomain(targetUrl),
    });

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({
          mode: "coreWebVitals",
          url: targetUrl,
          device: "desktop",
        }),
      });
      const responseText = await response.text();
      let data = null;

      try {
        data = responseText ? JSON.parse(responseText) : null;
      } catch {
        data = null;
      }

      if (!response.ok) {
        const fallback = response.status >= 500
          ? "The desktop Lighthouse request hit a server error. Restart the dev server if this happened after a build, then try again."
          : "Unable to fetch desktop metrics.";
        throw new Error(data?.error || responseText || fallback);
      }

      if (!data?.meta?.coreWebVitals) {
        throw new Error("Desktop Lighthouse returned an unexpected response. Try the request again.");
      }

      setResult((current) => {
        if (!current?.meta) return current;
        const existing = current.meta.coreWebVitals || {};
        const incoming = data.meta?.coreWebVitals || {};
        const devices = {
          ...(existing.devices || {}),
          ...(incoming.devices || {}),
        };
        const mobile = devices.mobile || {};
        const requestedDevices = Array.from(
          new Set([...(existing.requestedDevices || []), ...(incoming.requestedDevices || []), ...Object.keys(devices)])
        );

        return {
          ...current,
          meta: {
            ...current.meta,
            coreWebVitals: {
              ...existing,
              ...incoming,
              devices,
              requestedDevices,
              status: mobile.status || existing.status || incoming.status,
              summary: mobile.summary || existing.summary || incoming.summary,
              field: mobile.field || existing.field || incoming.field,
              lab: mobile.lab || existing.lab || incoming.lab,
              fetchedAt: incoming.fetchedAt || existing.fetchedAt,
            },
          },
        };
      });
      setDesktopVitalsState({ loading: false, error: "" });
      trackEvent("desktop_vitals_completed", {
        mode,
        domain: analyticsDomain(targetUrl),
        status: data?.meta?.coreWebVitals?.devices?.desktop?.status,
      });
    } catch (requestError) {
      setDesktopVitalsState({ loading: false, error: requestError.message || "Unable to fetch desktop metrics." });
      trackEvent("desktop_vitals_failed", {
        mode,
        domain: analyticsDomain(targetUrl),
        error_type: requestError.message || "Unable to fetch desktop metrics.",
      });
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const payload =
      mode === "compare"
        ? { mode, userUrl, firstCompetitorUrl, secondCompetitorUrl }
        : {
            mode,
            url,
            crawlLimit: mode === "site" ? Number(crawlLimit) || DEFAULT_CRAWL_LIMIT : undefined,
            keyword: mode === "page" ? parseKeywordInput(keyword)[0] || keyword : undefined,
            keywords: mode === "page" ? parseKeywordInput(keyword) : undefined,
          };

    await runAnalysis(payload);
  }

  async function handleDemoSubmit() {
    if (isLoading) {
      return;
    }

    if (mode === "compare") {
      const demoPayload = {
        mode,
        userUrl: "example.com",
        firstCompetitorUrl: "example.org",
        secondCompetitorUrl: "example.net",
      };
      setUserUrl(demoPayload.userUrl);
      setFirstCompetitorUrl(demoPayload.firstCompetitorUrl);
      setSecondCompetitorUrl(demoPayload.secondCompetitorUrl);
      await runAnalysis(demoPayload);
      return;
    }

    if (mode === "page") {
      const demoKeyword = "example domain";
      const demoPayload = {
        mode,
        url: "example.com",
        keyword: demoKeyword,
        keywords: [demoKeyword],
      };
      setUrl(demoPayload.url);
      setKeyword(demoKeyword);
      await runAnalysis(demoPayload);
      return;
    }

    const demoPayload = {
      mode,
      url: "example.com",
      crawlLimit: mode === "site" ? Number(crawlLimit) || DEFAULT_CRAWL_LIMIT : undefined,
    };
    setUrl(demoPayload.url);
    await runAnalysis(demoPayload);
  }

  function handleRequestPageAnalysis(page) {
    const pageUrl = typeof page === "string" ? page : page?.url;
    if (!pageUrl || isLoading) {
      return;
    }

    setPageAnalysisRequest({
      url: pageUrl,
      keyword: keyword || page?.title || page?.h1 || "",
    });
  }

  function handlePageAnalysisKeywordChange(value) {
    setPageAnalysisRequest((request) => (request ? { ...request, keyword: value } : request));
  }

  async function handleConfirmPageAnalysis(event) {
    event.preventDefault();

    const pageUrl = pageAnalysisRequest?.url;
    const pageKeyword = String(pageAnalysisRequest?.keyword || "").trim();
    if (!pageUrl || !pageKeyword || isLoading) {
      return;
    }

    setPageAnalysisRequest(null);
    setMode("page");
    setUrl(pageUrl);
    setKeyword(pageKeyword);
    await runAnalysis({
      mode: "page",
      url: pageUrl,
      keyword: parseKeywordInput(pageKeyword)[0] || pageKeyword,
      keywords: parseKeywordInput(pageKeyword),
    });
  }

  return (
    <main>
      <PageHeading title="Find the next useful improvement." description="Read the evidence behind your website. Explore what is working, find what needs attention, and turn your findings into a clear plan." />
      <div className="grid min-w-0 grid-cols-1 gap-6">
        <Paper component="form" className="analysis-form" onSubmit={handleSubmit} aria-busy={isLoading}>
          <Tabs className="analysis-tabs" value={mode} aria-label="Analysis mode" onChange={(_, id) => { setMode(id); setResult(null); setError(""); setProgressEvents([]); trackEvent("mode_selected", { mode: id }); }}>
            {SEO_MODES.map(({ id, label, Icon }) => <Tab key={id} value={id} disabled={isLoading} icon={<Icon />} label={label} />)}
          </Tabs>
          <div className="grid min-w-0 gap-5">
              <div className={`grid min-w-0 gap-3 ${mode === "compare" ? "lg:grid-cols-3" : mode === "page" ? "lg:grid-cols-[minmax(0,1.2fr)_minmax(14rem,.8fr)]" : mode === "site" ? "lg:grid-cols-[minmax(0,1fr)_16rem]" : ""}`}>
                {mode === "compare" ? (
                  <>
                    <InlineField label="Your website" value={userUrl} onChange={setUserUrl} placeholder="yourdomain.com/page" disabled={isLoading} />
                    <InlineField label="Rival website" value={firstCompetitorUrl} onChange={setFirstCompetitorUrl} placeholder="competitor.com/page" disabled={isLoading} />
                    <InlineField label="Second rival" value={secondCompetitorUrl} onChange={setSecondCompetitorUrl} placeholder="another-rival.com/page" disabled={isLoading} />
                  </>
                ) : (
                  <>
                    <InlineField label={mode === "page" ? "Page URL" : "Website URL"} value={url} onChange={setUrl} placeholder="example.com" disabled={isLoading} />
                    {mode === "page" ? (
                      <InlineField label="Keywords" value={keyword} onChange={setKeyword} placeholder="seo audit tool, technical seo audit" disabled={isLoading} />
                    ) : null}
                    {mode === "site" ? (
                      <Select
                        label="Crawl scope"
                        value={crawlLimit}
                        onChange={(value) => setCrawlLimit(value || String(DEFAULT_CRAWL_LIMIT))}
                        disabled={isLoading}
                        data={CRAWL_LIMIT_OPTIONS.map((option) => ({
                          value: String(option.value),
                          label: `${option.label} · ${option.detail}`,
                        }))}
                        className={`min-w-0 ${isLoading ? "opacity-65" : ""}`}
                      />
                    ) : null}
                  </>
                )}
              </div>

              <div className="flex flex-col gap-3 text-xs leading-5 text-ink-600 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <div className="flex min-w-0 max-w-full flex-wrap gap-x-4 gap-y-1">
                  <span>We&apos;ll add https:// for you</span>
                  <span className="basis-full sm:basis-auto">
                    {mode === "site" && Number(crawlLimit) > DEFAULT_CRAWL_LIMIT ? "Deep scans can take 2-5 min" : "Typical scan: 30-60s"}
                  </span>
                </div>
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
                  <Button
                    type="button"
                    disabled={isLoading}
                    onClick={handleDemoSubmit}
                    variant="outline"
                    className="min-h-11 rounded-md border-ink-200 bg-white px-4 text-sm font-bold text-ink-900 transition hover:border-sky-300/60 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500"
                  >
                    Try with a demo site
                  </Button>
                  <Button
                    type="submit"
                    disabled={isLoading}
                    leftSection={isLoading ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />}
                    className="min-h-11 rounded-md bg-accent-500 px-5 text-sm font-bold text-white transition hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500"
                  >
                    {isLoading ? activeMode.loadingLabel : activeMode.ctaLabel}
                  </Button>
                </div>
              </div>
          </div>
          {error ? <div role="alert" className="mt-5 rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div> : null}
        </Paper>
        {isLoading ? <LoadingState events={progressEvents} mode={mode} onCancel={handleCancelAnalysis} /> : null}
        <Report
          key={`${mode}-${result?.meta?.fetchedAt || "empty"}`}
          mode={mode}
          result={result}
          onAnalyzePage={handleRequestPageAnalysis}
          onFetchDesktopVitals={handleFetchDesktopVitals}
          desktopVitalsState={desktopVitalsState}
          onRerun={() => {
            if (lastPayload && !isLoading) {
              runAnalysis(lastPayload);
            }
          }}
          isLoading={isLoading}
        />

        {result?.audit && !isLoading ? <ReportFeedback result={result} mode={mode} /> : null}

      </div>
      <ConfirmPageAnalysisModal
        request={pageAnalysisRequest}
        onKeywordChange={handlePageAnalysisKeywordChange}
        onCancel={() => setPageAnalysisRequest(null)}
        onConfirm={handleConfirmPageAnalysis}
        isLoading={isLoading}
      />
    </main>
  );
}
