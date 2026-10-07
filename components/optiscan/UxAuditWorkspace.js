"use client";

import { Button, Paper, TextInput } from "../design/primitives";
import { ScienceOutlined as Beaker } from "../design/icons";
import { AutoAwesomeOutlined as Bot } from "../design/icons";
import { VisibilityOutlined as Eye } from "../design/icons";
import { AutorenewOutlined as Loader2 } from "../design/icons";
import { AutoAwesomeOutlined as Sparkles } from "../design/icons";
import { PageHeading } from "../design/AppShell";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { analyticsDomain, scoreBand, trackEvent } from "../../lib/analytics";
import { Avatar } from "../design/primitives";
import SavedPersonaLibrary from "../personas/SavedPersonaLibrary";
import { UX_PERSONAS } from "../../lib/personas.mjs";
import ReportFeedback from "./ReportFeedback";
import { INITIAL_PROGRESS_EVENT } from "./constants";
import { LoadingState, normalizeProgressEvent, progressPercent, readAnalyzeStream, upsertProgressEvent } from "./progress";
import { Report } from "./reports";

function normalizeUrlInput(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function PersonaCard({ persona, primary, compared, disabled, comparisonFull, onPrimary, onCompared }) {
  return (
    <article className={`flex min-w-0 flex-col rounded-md border p-3 transition ${primary ? "border-accent-400/55 bg-accent-500/8" : compared ? "border-sky-400/40 bg-sky-500/8" : "border-ink-200 bg-white"}`}>
      <div className="flex min-w-0 items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {persona.image ? <img src={persona.image} alt={persona.imageAlt} className="h-11 w-11 shrink-0 rounded-full border border-ink-200 object-cover" /> : <Avatar>{persona.shortLabel.slice(0,1)}</Avatar>}
        <div className="min-w-0">
          <div className="text-sm font-semibold text-ink-900">{persona.shortLabel}<span className="ml-2 text-[10px] font-normal text-ink-600">{UX_PERSONAS.some((example) => example.id === persona.id) ? "Example" : "Saved"}</span></div>
          <p className="mt-0.5 text-xs leading-5 text-ink-600">{persona.description}</p>
        </div>
      </div>
      <div className="mt-auto grid grid-cols-2 gap-2 pt-3">
        <label className={`flex min-h-9 cursor-pointer items-center justify-center gap-2 rounded-[6px] border px-2 text-xs font-semibold ${primary ? "border-accent-400/40 bg-accent-500/15 text-accent-700" : "border-ink-200 text-ink-700"}`}>
          <input type="radio" name="primary-persona" checked={primary} disabled={disabled} onChange={onPrimary} className="accent-accent-400" />
          Primary
        </label>
        <label className={`flex min-h-9 items-center justify-center gap-2 rounded-[6px] border px-2 text-xs font-semibold ${primary ? "cursor-not-allowed border-ink-200 text-ink-500" : compared ? "cursor-pointer border-sky-400/40 bg-sky-400/10 text-sky-700" : "cursor-pointer border-ink-200 text-ink-700"}`}>
          <input type="checkbox" checked={compared} disabled={disabled || primary || (comparisonFull && !compared)} onChange={(event) => onCompared(event.target.checked)} className="accent-sky-400" />
          Compare
        </label>
      </div>
    </article>
  );
}

export default function UxAuditWorkspace() {
  const [url, setUrl] = useState("");
  const [{ primaryPersonaId, secondaryPersonaIds }, setSelection] = useState({ primaryPersonaId: "lucy", secondaryPersonaIds: [] });
  const setPrimaryPersonaId = (id) => setSelection((current) => ({ ...current, primaryPersonaId: id, secondaryPersonaIds: current.secondaryPersonaIds.filter((item) => item !== id) }));
  const setSecondaryPersonaIds = (update) => setSelection((current) => ({ ...current, secondaryPersonaIds: update(current.secondaryPersonaIds).filter((id) => id !== current.primaryPersonaId) }));
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [progressEvents, setProgressEvents] = useState([]);
  const [lastPayload, setLastPayload] = useState(null);
  const abortControllerRef = useRef(null);
  const [savedPersonas, setSavedPersonas] = useState([]);
  const personas = useMemo(() => [...UX_PERSONAS, ...savedPersonas], [savedPersonas]);
  const primaryPersona = useMemo(() => personas.find((persona) => persona.id === primaryPersonaId), [primaryPersonaId, personas]);
  const updateSavedPersonas = useCallback((saved) => {
    setSavedPersonas(saved);
    const ids = new Set([...UX_PERSONAS, ...saved].map((persona) => persona.id));
    setSelection((current) => {
      const primaryPersonaId = ids.has(current.primaryPersonaId) ? current.primaryPersonaId : "lucy";
      return { primaryPersonaId, secondaryPersonaIds: current.secondaryPersonaIds.filter((id) => ids.has(id) && id !== primaryPersonaId) };
    });
  }, []);
  const usePrimaryPersona = (id) => {
    setPrimaryPersonaId(id);
    setSecondaryPersonaIds((selected) => selected.filter((item) => item !== id));
  };

  useEffect(() => {
    trackEvent("app_loaded", { workspace: "ux_audit", default_persona: "lucy" });
  }, []);

  async function runAnalysis(payload) {
    const normalizedPayload = { ...payload, url: normalizeUrlInput(payload.url) };
    setError("");
    setResult(null);
    setProgressEvents([normalizeProgressEvent(INITIAL_PROGRESS_EVENT)]);
    setIsLoading(true);
    setLastPayload(normalizedPayload);
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    trackEvent("scan_started", {
      mode: "ux",
      workspace: "ux_audit",
      domain: analyticsDomain(normalizedPayload.url),
      persona_count: 1 + normalizedPayload.secondaryPersonaIds.length,
    });

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/x-ndjson", "x-optiscan-progress": "stream" },
        body: JSON.stringify(normalizedPayload),
        signal: controller.signal,
      });
      const data = await readAnalyzeStream(response, (event) => setProgressEvents((events) => upsertProgressEvent(events, event)));
      setResult(data);
      trackEvent("scan_completed", {
        mode: "ux",
        workspace: "ux_audit",
        domain: analyticsDomain(normalizedPayload.url),
        duration_ms: data?.meta?.durationMs,
        source: data?.meta?.source,
        score_band: scoreBand(data?.audit?.score),
        persona_count: 1 + normalizedPayload.secondaryPersonaIds.length,
        consent_outcome: data?.meta?.screenshot?.consent?.status,
        screenshot_usable: data?.meta?.screenshot?.usableForAnalysis === true,
      });
    } catch (requestError) {
      const cancelled = requestError?.name === "AbortError";
      setProgressEvents((events) => upsertProgressEvent(events, {
        id: cancelled ? "request_cancelled" : "request_error",
        label: cancelled ? "UX audit cancelled" : "UX audit stopped",
        status: "error",
        detail: cancelled ? "The audit was stopped before a report was returned." : requestError.message,
        progress: progressPercent(events),
      }));
      setError(cancelled ? "UX audit cancelled." : requestError.message);
      trackEvent(cancelled ? "scan_cancelled" : "scan_failed", { mode: "ux", workspace: "ux_audit", error_type: cancelled ? "cancelled" : requestError.message });
    } finally {
      setIsLoading(false);
      if (abortControllerRef.current === controller) abortControllerRef.current = null;
    }
  }

  function submit(event) {
    event?.preventDefault();
    runAnalysis({ mode: "ux", url, personaId: primaryPersonaId, secondaryPersonaIds });
  }

  function runDemo() {
    if (isLoading) return;
    setUrl("example.com");
    runAnalysis({ mode: "ux", url: "example.com", personaId: primaryPersonaId, secondaryPersonaIds });
  }

  return (
    <main>
      <PageHeading title="See the page through another lens." description="Explore how a page supports different needs. Use example personas or your saved profiles, examine the evidence, and shape a testable next step." />
      <div className="grid min-w-0 gap-6">
        <SavedPersonaLibrary disabled={isLoading} onPersonasChange={updateSavedPersonas} onUsePersona={usePrimaryPersona} onSignedOut={() => { setResult(null); setLastPayload(null); }} />
        <Paper component="form" onSubmit={submit} aria-busy={isLoading} className="rounded-lg border border-ink-200 bg-white p-4 sm:p-5">
          <div className="grid gap-8">
            <div className="grid content-start gap-4 max-w-3xl">
              <TextInput
                label="Page URL"
                required
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                disabled={isLoading}
                placeholder="example.com/product"
              />
              <div className="rounded-md border border-sky-400/20 bg-sky-500/8 p-3 text-xs leading-5 text-ink-700">
                PageSignal attempts to reject optional cookies before capture. Screenshot conclusions are withheld unless the consent overlay is verified as cleared.
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button type="submit" disabled={isLoading || !url.trim()} leftSection={isLoading ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <Sparkles className="h-4 w-4" />} className="min-h-11 rounded-md bg-accent-500 px-5 text-sm font-bold text-white hover:bg-accent-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500">{isLoading ? "Auditing UX" : "Audit UX"}</Button>
                <Button type="button" disabled={isLoading} onClick={runDemo} variant="outline" className="min-h-11 rounded-md border-ink-200 bg-white px-4 text-sm font-bold text-ink-900 hover:border-sky-300/60 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500">Try a demo page</Button>
              </div>
            </div>

            <fieldset disabled={isLoading} className="min-w-0 border-t border-ink-200 pt-6">
              <legend className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-600">Persona lenses</legend>
              <p className="mt-1 text-xs leading-5 text-ink-600">Choose one primary persona and up to two comparisons. The shared evidence score remains unchanged.</p>
              <div className="mt-4 grid gap-4 xl:grid-cols-3">
                {personas.map((persona) => (
                  <PersonaCard
                    key={persona.id}
                    persona={persona}
                    primary={persona.id === primaryPersonaId}
                    compared={secondaryPersonaIds.includes(persona.id)}
                    disabled={isLoading}
                    comparisonFull={secondaryPersonaIds.length >= 2}
                    onPrimary={() => {
                      setPrimaryPersonaId(persona.id);
                      setSecondaryPersonaIds((ids) => ids.filter((id) => id !== persona.id));
                    }}
                    onCompared={(checked) => setSecondaryPersonaIds((ids) => checked ? [...ids, persona.id].slice(0, 2) : ids.filter((id) => id !== persona.id))}
                  />
                ))}
              </div>
              <p className="mt-3 text-xs text-ink-600">Primary lens: <span className="font-semibold text-ink-800">{primaryPersona?.label}</span></p>
            </fieldset>
          </div>
          {error ? <div className="mt-4 rounded-md border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-700">{error}</div> : null}
        </Paper>

        {isLoading ? <LoadingState events={progressEvents} mode="ux" onCancel={() => abortControllerRef.current?.abort()} /> : null}
        {result?.audit ? <Report key={`ux-${result.meta?.fetchedAt || "report"}`} mode="ux" result={result} onRerun={() => lastPayload && !isLoading && runAnalysis(lastPayload)} isLoading={isLoading} /> : null}
        {result?.audit && !isLoading ? <ReportFeedback result={result} mode="ux" /> : null}

        {!result?.audit && !isLoading ? (
          <div className="workflow-steps">
            {[
              ["Needs coverage", "See which persona goals are supported, blocked, missing, or still uncertain.", Eye],
              ["Journey decisions", "Understand readiness, CTA fit, content gaps, and likely next-step friction.", Bot],
              ["Experiments and tickets", "Turn evidence into testable changes with persona-tagged acceptance criteria.", Beaker],
            ].map(([title, copy, Icon]) => (
              <Paper key={title} className="workflow-step !bg-transparent">
                <Icon className="h-5 w-5 text-accent-700" aria-hidden="true" />
                <h2 className="mt-3 text-sm font-semibold text-ink-900">{title}</h2>
                <p className="mt-1 text-xs leading-5 text-ink-600">{copy}</p>
              </Paper>
            ))}
          </div>
        ) : null}
      </div>
    </main>
  );
}
