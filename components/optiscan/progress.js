"use client";

import { WarningAmberOutlined as AlertTriangle } from "../design/icons";
import { CheckCircleOutlineOutlined as CheckCircle2 } from "../design/icons";
import { ScheduleOutlined as Clock3 } from "../design/icons";
import { AutorenewOutlined as Loader2 } from "../design/icons";
import { CloseOutlined as X } from "../design/icons";
import { useEffect, useMemo, useState } from "react";
import { INITIAL_PROGRESS_EVENT } from "./constants";
import { BorderBeam } from "../ui/border-beam";
import { Card } from "./ui";

export function normalizeProgressEvent(event) {
  const status = ["active", "done", "error"].includes(event?.status) ? event.status : "active";
  return {
    ...event,
    id: event?.id || `${status}-${Date.now()}`,
    label: event?.label || "Working",
    detail: event?.detail || "",
    progress: Number.isFinite(Number(event?.progress)) ? Math.max(0, Math.min(100, Number(event.progress))) : undefined,
    status,
    timestamp: event?.timestamp || new Date().toISOString(),
  };
}

export function upsertProgressEvent(events, event) {
  const progressEvent = normalizeProgressEvent(event);
  const index = events.findIndex((item) => item.id === progressEvent.id);

  if (index === -1) {
    return [...events, progressEvent];
  }

  const next = [...events];
  next[index] = {
    ...next[index],
    ...progressEvent,
  };
  return next;
}

export function progressPercent(events) {
  const explicitProgress = events.map((event) => event.progress).filter((value) => Number.isFinite(value));

  if (explicitProgress.length) {
    return Math.max(4, Math.min(100, Math.max(...explicitProgress)));
  }

  const completed = events.filter((event) => event.status === "done" || event.status === "error").length;
  return Math.max(4, Math.min(96, Math.round((completed / Math.max(events.length, 1)) * 100)));
}

function currentProgressEvent(events) {
  return [...events].reverse().find((event) => event.status === "active") || events[events.length - 1] || INITIAL_PROGRESS_EVENT;
}

export async function readAnalyzeStream(response, onProgress) {
  const contentType = response.headers.get("content-type") || "";

  if (!response.body || !contentType.includes("application/x-ndjson")) {
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Analysis failed.");
    }
    return data;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result = null;
  let streamError = "";

  function handleLine(line) {
    if (!line.trim()) {
      return;
    }

    const event = JSON.parse(line);
    if (event.type === "progress") {
      onProgress(event);
      return;
    }

    if (event.type === "result") {
      result = event.data;
      return;
    }

    if (event.type === "error") {
      streamError = event.error || "Analysis failed.";
    }
  }

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    lines.forEach(handleLine);

    if (done) {
      break;
    }
  }

  handleLine(buffer);

  if (streamError) {
    throw new Error(streamError);
  }

  if (!result) {
    throw new Error("Analysis finished before a report was returned.");
  }

  return result;
}

function ProgressStatusIcon({ status }) {
  if (status === "done") {
    return <CheckCircle2 className="h-4 w-4 text-green-700" aria-hidden="true" />;
  }

  if (status === "error") {
    return <AlertTriangle className="h-4 w-4 text-rose-700" aria-hidden="true" />;
  }

  if (status === "idle") {
    return <span className="h-2.5 w-2.5 rounded-full bg-slate-600" aria-hidden="true" />;
  }

  return <Loader2 className="h-4 w-4 animate-spin text-sky-700 motion-reduce:animate-none" aria-hidden="true" />;
}

const PROGRESS_STAGES = [
  { id: "submit", label: "Submit", match: ["submit", "validate"] },
  { id: "crawl", label: "Crawl", match: ["fetch_evidence", "site_", "target:", "browser_", "robots", "sitemap"] },
  { id: "parse", label: "Parse", match: ["extract_signals", "parse", "signals"] },
  { id: "vitals", label: "Vitals", match: ["core_web_vitals", "crux", "pagespeed", "lighthouse", "vitals"] },
  { id: "ai", label: "AI score", match: ["analyze", "openai", "heuristic"] },
  { id: "tickets", label: "Tickets", match: ["finalize", "complete"] },
];

const EXPECTED_SCAN_MS = {
  page: 60000,
  site: 90000,
  compare: 120000,
};

function eventStageId(event = {}, index = 0) {
  const id = String(event.id || "").toLowerCase();
  const label = String(event.label || "").toLowerCase();
  const detail = String(event.detail || "").toLowerCase();
  const seed = `${id} ${label} ${detail}`;
  const explicit = PROGRESS_STAGES.find((stage) => stage.match.some((token) => seed.includes(token)));

  if (explicit) {
    return explicit.id;
  }

  return PROGRESS_STAGES[Math.min(index, PROGRESS_STAGES.length - 1)].id;
}

function stagedProgress(events) {
  const progressEvents = events.length ? events : [INITIAL_PROGRESS_EVENT];
  const percent = progressPercent(progressEvents);
  const stageIds = progressEvents.map(eventStageId);
  const activeStageId = eventStageId(currentProgressEvent(progressEvents), stageIds.length - 1);
  const activeIndex = PROGRESS_STAGES.findIndex((stage) => stage.id === activeStageId);
  const hasError = progressEvents.some((event) => event.status === "error");

  return PROGRESS_STAGES.map((stage, index) => {
    const touched = stageIds.includes(stage.id);
    let status = "todo";

    if (percent >= 100 || index < activeIndex || (touched && index < PROGRESS_STAGES.length - 1 && activeStageId !== stage.id)) {
      status = "done";
    } else if (activeStageId === stage.id || (touched && index === activeIndex)) {
      status = hasError ? "error" : "active";
    }

    return { ...stage, status };
  });
}

function elapsedSinceStartMs(events, now) {
  const firstTimestamp = events[0]?.timestamp ? Date.parse(events[0].timestamp) : NaN;
  return Number.isFinite(firstTimestamp) ? Math.max(0, now - firstTimestamp) : 0;
}

function estimateRemainingMs(events, percent, now, mode = "site") {
  const elapsedMs = elapsedSinceStartMs(events, now);
  const expectedTotalMs = EXPECTED_SCAN_MS[mode] || EXPECTED_SCAN_MS.site;

  if (percent >= 99) {
    return 0;
  }

  const baselineRemainingMs = Math.max(0, expectedTotalMs - elapsedMs);

  if (!elapsedMs || percent <= 5) {
    return baselineRemainingMs || expectedTotalMs;
  }

  const paceRemainingMs = elapsedMs * ((100 - percent) / Math.max(percent, 1));
  return Math.max(5000, Math.min(120000, Math.max(baselineRemainingMs, paceRemainingMs)));
}

function durationText(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function LoadingState({ events, mode = "site", onCancel }) {
  const [now, setNow] = useState(() => Date.now());
  const progressEvents = useMemo(() => (events.length ? events : [INITIAL_PROGRESS_EVENT]), [events]);
  const current = currentProgressEvent(progressEvents);
  const percent = progressPercent(progressEvents);
  const stages = stagedProgress(progressEvents);
  const elapsed = durationText(elapsedSinceStartMs(progressEvents, now));
  const remaining = durationText(estimateRemainingMs(progressEvents, percent, now, mode));

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <Card className="relative overflow-hidden p-5">
      <BorderBeam duration={7} size={160} borderWidth={2} />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between" aria-live="polite" data-progress-current>
        <div className="flex min-w-0 items-start gap-3">
          <Loader2 className="h-5 w-5 shrink-0 animate-spin text-sky-700 motion-reduce:animate-none" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-700">Scanning for wins</div>
            <div className="mt-1 text-sm font-semibold text-ink-900">{current.label}</div>
            {current.detail ? <div className="mt-1 text-xs leading-5 text-ink-600">{current.detail}</div> : null}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <span className="inline-flex min-h-8 items-center gap-2 rounded-full border border-ink-200 bg-white px-3 text-xs font-bold text-ink-800">
            <Clock3 className="h-3.5 w-3.5 text-sky-700" aria-hidden="true" />
            Elapsed {elapsed}
          </span>
          <span className="inline-flex min-h-8 items-center gap-2 rounded-full border border-ink-200 bg-white px-3 text-xs font-bold text-ink-800">
            <Clock3 className="h-3.5 w-3.5 text-amber-700" aria-hidden="true" />
            About {remaining} left
          </span>
          {onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex min-h-8 items-center gap-2 rounded-full border border-rose-400/30 bg-rose-500/10 px-3 text-xs font-bold text-rose-700 transition hover:border-rose-300/60 hover:bg-rose-500/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              Cancel scan
            </button>
          ) : null}
        </div>
      </div>

      <ol className="mt-5 grid gap-2 sm:grid-cols-3 lg:grid-cols-6" aria-label="Scan progress stages">
        {stages.map((stage) => (
          <li
            key={stage.id}
            className={`rounded-lg border px-3 py-3 ${
              stage.status === "done"
                ? "border-green-500/30 bg-green-500/10 text-green-700"
                : stage.status === "active"
                  ? "border-sky-400/40 bg-sky-500/10 text-sky-700"
                  : stage.status === "error"
                    ? "border-rose-400/35 bg-rose-500/10 text-rose-700"
                    : "border-ink-200 bg-white text-ink-600"
            }`}
          >
            <div className="flex items-center gap-2">
              <ProgressStatusIcon status={stage.status === "todo" ? "idle" : stage.status} />
              <span className="text-xs font-bold">{stage.label}</span>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white" aria-hidden="true">
        <div className="h-full rounded-full bg-sky-300 transition-[width] duration-300" style={{ width: `${percent}%` }} />
      </div>
    </Card>
  );
}
