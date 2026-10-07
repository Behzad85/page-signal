"use client";

import { NumberTicker } from "../ui/number-ticker";
import { Alert, Badge, Button, Paper, Text, ThemeIcon } from "../design/primitives";
import { MonitorHeartOutlined as Activity } from "../design/icons";
import { WarningAmberOutlined as AlertTriangle } from "../design/icons";
import { CheckCircleOutlineOutlined as CheckCircle2 } from "../design/icons";
import { ContentCopyOutlined as Copy } from "../design/icons";
import { FileDownloadOutlined as Download } from "../design/icons";
import { GppMaybeOutlined as ShieldAlert } from "../design/icons";
import { buildCrawlDiagnostics as summarizeCrawlDiagnostics } from "../../lib/crawlDiagnostics.mjs";
import { asArray, priorityClass, toneForScore } from "./utils";

export function ScoreGauge({ score = 0, label = "Health Score", compact = false, statusText = "", statusClassName = "" }) {
  const safeScore = Math.max(0, Math.min(100, Math.round(Number(score) || 0)));
  const tone = toneForScore(safeScore);

  return (
    <div className="score-meter" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={safeScore}>
      <div className="flex items-baseline gap-2"><span className={`${compact ? "text-3xl" : "text-5xl"} font-light tracking-tight text-ink-900`}><NumberTicker value={safeScore} /></span><span className="text-xs text-ink-600">/ 100</span></div>
      <div className="score-meter-track"><div className="score-meter-fill" style={{ width: `${safeScore}%`, backgroundColor: tone.color }} /></div>
      <div className="mt-3 text-xs font-semibold text-ink-800">{label}</div>
      <div className={`mt-1 text-xs ${statusClassName || tone.className}`}>{statusText || tone.text}</div>
    </div>
  );
}

export function Card({ children, className = "" }) {
  return (
    <Paper component="section" className={`rounded-md border border-ink-200 bg-white ${className}`}>
      {children}
    </Paper>
  );
}

export function AccessBanner({ meta }) {
  // Rendering consumes normalized diagnostics; status parsing and HTTP status
  // formatting remain owned by the server-safe crawl diagnostics module.
  const diagnostics = summarizeCrawlDiagnostics(meta);
  const { blockedPathCount, cleanPageCount, failedPageCount, fetchFallbackCount, sampledPageCount, warnings } = diagnostics;

  if (!warnings.length) {
    return null;
  }

  const hasCritical = diagnostics.level === "critical";
  const fallbackOnly = !failedPageCount && !blockedPathCount && fetchFallbackCount > 0;
  const borderClass = hasCritical ? "border-rose-400/40 bg-rose-500/10" : "border-amber-400/40 bg-amber-500/10";
  const titleClass = hasCritical ? "text-rose-700" : "text-amber-700";
  const textClass = hasCritical ? "text-rose-700/80" : "text-amber-700/85";
  const itemClass = hasCritical ? "border-rose-300/20" : "border-amber-300/20";
  const title = blockedPathCount
    ? "Crawler access problem detected"
    : failedPageCount
      ? "Some crawled pages did not return 200"
      : "Crawl completed using a fallback";
  const summary = blockedPathCount
    ? `${blockedPathCount} configured fetch path${blockedPathCount === 1 ? "" : "s"} could not read the target. The affected URL and provider responses are listed below.`
    : failedPageCount
      ? `${failedPageCount} of ${sampledPageCount || failedPageCount} sampled URL${(sampledPageCount || failedPageCount) === 1 ? "" : "s"} did not return a clean 200 response. Each failed URL and response is listed below.`
      : `${sampledPageCount ? `All ${cleanPageCount} sampled pages returned 200. ` : ""}One evidence fetch path was blocked, but another succeeded. This is not a failed page crawl.`;

  return (
    <Alert
      className={`mb-5 rounded-md border p-4 ${borderClass}`}
      icon={hasCritical ? <ShieldAlert className="h-4 w-4" aria-hidden="true" /> : <AlertTriangle className="h-4 w-4" aria-hidden="true" />}
      title={title}
      color={hasCritical ? "red" : "yellow"}
      variant="light"
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0">
          <p className={`mt-1 text-sm leading-6 ${textClass}`}>
            {summary}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {failedPageCount ? (
              <span className={`rounded-full border ${itemClass} bg-white px-2.5 py-1 font-bold ${titleClass}`}>
                {failedPageCount} failed page{failedPageCount === 1 ? "" : "s"}
              </span>
            ) : null}
            {blockedPathCount ? (
              <span className={`rounded-full border ${itemClass} bg-white px-2.5 py-1 font-bold ${titleClass}`}>
                {blockedPathCount} blocked fetch path{blockedPathCount === 1 ? "" : "s"}
              </span>
            ) : null}
            {fetchFallbackCount ? (
              <span className={`rounded-full border ${itemClass} bg-white px-2.5 py-1 font-bold ${titleClass}`}>
                {fetchFallbackCount} recovered fallback{fetchFallbackCount === 1 ? "" : "s"}
              </span>
            ) : null}
            {fallbackOnly && sampledPageCount ? (
              <span className="rounded-full border border-green-400/30 bg-green-500/10 px-2.5 py-1 font-bold text-green-700">
                {cleanPageCount}/{sampledPageCount} pages returned 200
              </span>
            ) : null}
          </div>
          <div className={`mt-3 grid gap-2 text-xs ${textClass}`}>
            {warnings.slice(0, 6).map((item, index) => {
              const itemCritical = item.severity === "critical";
              return (
                <div
                  key={`${item.source}-${item.title}-${index}`}
                  className={`rounded-md border ${itemCritical ? "border-rose-300/25" : "border-amber-300/25"} bg-white px-3 py-2`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`font-semibold ${itemCritical ? "text-rose-700" : "text-amber-700"}`}>{item.title}</span>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${itemCritical ? "border-rose-300/25 text-rose-700" : "border-amber-300/25 text-amber-700"}`}>
                      {item.kind === "page_failure" ? "Failed page" : item.kind === "access_block" ? "Blocked access" : "Fallback recovered"}
                    </span>
                  </div>
                  <div className="mt-1 leading-5">{item.detail}</div>
                  {item.url ? (
                    <a className="mt-1 block break-all text-sky-700 hover:text-sky-700 hover:underline" href={item.url} target="_blank" rel="noreferrer">
                      {item.url}
                    </a>
                  ) : null}
                </div>
              );
            })}
            {warnings.length > 6 ? <div className="text-ink-600">+{warnings.length - 6} more crawl status issue{warnings.length - 6 === 1 ? "" : "s"} in sampled pages.</div> : null}
          </div>
        </div>
      </div>
    </Alert>
  );
}

export function StatTile({ label, value, subcopy, icon: Icon = Activity }) {
  return (
    <Paper className="rounded-lg border border-ink-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-600">{label}</div>
        <ThemeIcon variant="light" color="emerald" radius="md" size="sm">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </ThemeIcon>
      </div>
      <div className="mt-2 text-2xl font-semibold text-ink-900">{value}</div>
      {subcopy ? <div className="mt-1 text-xs leading-5 text-ink-600">{subcopy}</div> : null}
    </Paper>
  );
}

export function SeverityPill({ value }) {
  return (
    <Badge variant="light" radius="xl" className={`border px-2 py-1 text-[11px] font-semibold ${priorityClass(value)}`}>
      {value}
    </Badge>
  );
}

export function ExportButton({ children, icon: Icon, onClick, variant = "secondary", disabled = false }) {
  const classes =
    variant === "primary"
      ? "border-accent-300/50 bg-accent-500 text-white hover:bg-accent-600"
      : "border-ink-200 bg-white text-ink-800 hover:border-accent-400/50 hover:text-accent-700";

  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={disabled}
      leftSection={<Icon className="h-3.5 w-3.5" aria-hidden="true" />}
      variant="filled"
      className={`min-h-9 rounded-md border px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500 ${classes}`}
    >
      {children}
    </Button>
  );
}

export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {tabs.map(([id, label]) => (
        <button
          type="button"
          key={id}
          onClick={() => onChange(id)}
          className={`whitespace-nowrap border-b-2 px-3 pb-3 text-sm font-semibold transition ${
            active === id
              ? "border-accent-400 text-accent-700"
              : "border-transparent text-ink-600 hover:text-ink-800"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function TabExportActions({ description, copied, onExportCsv, onCopyTable }) {
  return (
    <div className="mb-5 flex flex-col gap-3 rounded-lg border border-ink-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-600">About this section</div>
        <div className="mt-1 max-w-3xl text-sm font-semibold leading-6 text-ink-900">{description}</div>
      </div>
      <div className="flex flex-wrap gap-2">
        <ExportButton icon={Download} onClick={onExportCsv}>
          Export CSV
        </ExportButton>
        <ExportButton icon={Copy} onClick={onCopyTable}>
          {copied ? "Copied" : "Copy table"}
        </ExportButton>
      </div>
    </div>
  );
}

export function BulletList({ items, icon: Icon = CheckCircle2, empty = "No items returned." }) {
  const list = asArray(items);
  if (!list.length) {
    return <Paper component="p" className="rounded-lg border border-ink-200 bg-white p-4 text-sm text-ink-600">{empty}</Paper>;
  }

  return (
    <div className="grid gap-3">
      {list.map((item, index) => (
        <Paper key={`${String(item.task || item.area || item.metric || item)}-${index}`} className="flex gap-3 rounded-lg border border-ink-200 bg-white p-4">
          <ThemeIcon variant="light" color="emerald" radius="xl" size="sm" className="mt-0.5 shrink-0">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </ThemeIcon>
          <div className="min-w-0">
            {typeof item === "string" ? (
              <Text component="p" className="text-sm leading-6 text-ink-700">{item}</Text>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-sm font-semibold text-ink-900">{item.task || item.area || item.metric}</h4>
                  {item.priority ? <SeverityPill value={item.priority} /> : null}
                  {item.severity ? <SeverityPill value={item.severity} /> : null}
                </div>
                <p className="mt-1 break-words text-sm leading-6 text-ink-700">
                  {item.finding || item.issue || item.advantage || item.impact || item.method || item.evidence}
                </p>
                {item.evidence && (item.finding || item.issue || item.advantage) ? (
                  <p className="mt-2 break-words text-xs leading-5 text-ink-600">{item.evidence}</p>
                ) : null}
                {item.based_on ? <p className="mt-2 break-words text-xs leading-5 text-ink-600">Based on: {item.based_on}</p> : null}
                {item.competitor_reference ? (
                  <p className="mt-2 break-words text-xs leading-5 text-ink-600">Reference: {item.competitor_reference}</p>
                ) : null}
              </>
            )}
          </div>
        </Paper>
      ))}
    </div>
  );
}

export function TechnicalRows({ audit }) {
  const rows = [
    ["Title", audit.technical?.title],
    ["Meta", audit.technical?.meta],
    ["H1", audit.technical?.h1],
  ];

  return (
    <div className="grid gap-3">
      {rows.map(([label, value]) => (
        <Paper key={label} className="grid gap-2 rounded-lg border border-ink-200 bg-white p-4 md:grid-cols-[8rem_1fr] md:items-start">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-600">{label}</div>
          <div className="text-sm leading-6 text-ink-800">{value}</div>
        </Paper>
      ))}
    </div>
  );
}
