"use client";

import { useEffect, useState } from "react";
import { WarningAmberOutlined as AlertTriangle } from "../design/icons";
import { ArrowForwardOutlined as ArrowRight } from "../design/icons";
import { SpeedOutlined as Gauge } from "../design/icons";
import { AutorenewOutlined as Loader2 } from "../design/icons";
import { DesktopWindowsOutlined as Monitor } from "../design/icons";
import { DevicesOutlined as MonitorSmartphone } from "../design/icons";
import { ManageSearchOutlined as SearchCheck } from "../design/icons";
import { GppGoodOutlined as ShieldCheck } from "../design/icons";
import { AutoAwesomeOutlined as Sparkles } from "../design/icons";
import { BoltOutlined as Zap } from "../design/icons";
import { asArray, textValue } from "./utils";
import { BulletList, ScoreGauge, StatTile } from "./ui";

export function cwvStatusLabel(status) {
  if (status === "good") return "Good";
  if (status === "needs-improvement") return "Needs improvement";
  if (status === "poor") return "Poor";
  if (status === "lab-only") return "Lab only";
  if (status === "key_restricted") return "Key restricted";
  if (status === "api_disabled") return "API disabled";
  if (status === "invalid_key") return "Invalid key";
  if (status === "quota_exceeded") return "Quota exceeded";
  if (status === "not_configured") return "Not configured";
  if (status === "not_requested") return "Not loaded";
  if (status === "timeout") return "Timed out";
  if (status === "lighthouse_error") return "Lighthouse error";
  if (status === "failed") return "Failed";
  return "Unavailable";
}

function cwvStatusClass(status) {
  if (status === "good") return "border-green-500/30 bg-green-500/10 text-green-700";
  if (
    status === "needs-improvement" ||
    status === "lab-only" ||
    status === "key_restricted" ||
    status === "api_disabled" ||
    status === "quota_exceeded" ||
    status === "timeout" ||
    status === "lighthouse_error" ||
    status === "failed"
  ) {
    return "border-amber-400/30 bg-amber-500/10 text-amber-700";
  }
  if (status === "poor" || status === "invalid_key") return "border-rose-400/30 bg-rose-500/10 text-rose-700";
  return "border-ink-200 bg-white text-ink-700";
}

const CWV_EXPLAINERS = {
  lcp: {
    name: "Largest Contentful Paint",
    meaning: "How long it takes for the main image, headline, or content block to appear.",
    why: "If this is slow, visitors feel the page is still loading even when some smaller UI has appeared.",
    target: "2.5s or faster",
    actions: ["Preload or compress the hero image", "Improve server response time or CDN caching", "Remove render-blocking CSS and JavaScript"],
  },
  inp: {
    name: "Interaction to Next Paint",
    meaning: "How quickly the page visibly responds after a tap, click, or key press.",
    why: "If this is slow, buttons and controls feel delayed or broken.",
    target: "200ms or faster",
    actions: ["Break up long JavaScript tasks", "Reduce third-party scripts", "Avoid heavy work during hydration and input handlers"],
  },
  cls: {
    name: "Cumulative Layout Shift",
    meaning: "How much visible content jumps around while the page loads or updates.",
    why: "If this is high, users can lose their reading position or tap the wrong thing.",
    target: "0.10 or lower",
    actions: ["Set width and height on images and videos", "Reserve space for ads, embeds, and banners", "Avoid injecting content above existing content"],
  },
  tbt: {
    name: "Total Blocking Time",
    meaning: "A Lighthouse lab signal for how long JavaScript blocks the page from responding.",
    why: "Lighthouse cannot directly measure real-user INP, so TBT is used as a lab proxy for responsiveness.",
    target: "200ms or lower",
    actions: ["Split large JavaScript bundles", "Defer non-critical scripts", "Move expensive work away from the main thread"],
  },
};

const LIGHTHOUSE_CATEGORY_EXPLAINERS = {
  performance: "How fast the page loads and becomes usable in a lab test. Used to find speed bottlenecks such as slow LCP, render-blocking files, and heavy JavaScript.",
  accessibility: "How well the page supports users with assistive technology. Used to catch contrast, labels, names, landmarks, and readable structure issues.",
  bestpractices: "How safely and reliably the page is built. Used to flag browser, security, image, console, and modern web platform problems.",
  seo: "How well basic search crawler requirements are met. Used to check crawlable links, metadata, indexability basics, and mobile-friendly SEO signals.",
};

function cwvExplainer(metric) {
  return CWV_EXPLAINERS[metric?.key] || CWV_EXPLAINERS[String(metric?.label || "").toLowerCase()] || null;
}

function cwvTargetText(metric, explainer) {
  if (explainer?.target) {
    return explainer.target;
  }

  if (!metric?.threshold) {
    return "";
  }

  return metric.threshold.label === "CLS" ? `${metric.threshold.good} or lower` : `${metric.threshold.good}ms or faster`;
}

function metricExportRow(metric, source, site = {}) {
  const explainer = cwvExplainer(metric);
  return {
    Site: site.label || "",
    URL: site.url || "",
    Source: source,
    Metric: metric?.label || "",
    "Full Name": explainer?.name || metric?.title || metric?.label || "",
    Value: metric?.display || "",
    Status: cwvStatusLabel(metric?.status),
    "Good Target": cwvTargetText(metric, explainer),
    Meaning: explainer?.meaning || metric?.note || "",
    "Why It Matters": explainer?.why || "",
    "What To Do": textValue(explainer?.actions || []),
  };
}

function deviceVitals(vitals, device = "mobile") {
  if (vitals?.devices?.[device]) {
    return vitals.devices[device];
  }

  if (device === "mobile" && (vitals?.field || vitals?.lab)) {
    return {
      label: "Mobile",
      field: vitals?.field || {},
      lab: vitals?.lab || {},
      status: vitals?.status,
      summary: vitals?.summary,
      available: Boolean(vitals?.field?.available || vitals?.lab?.available),
    };
  }

  return {
    label: device === "desktop" ? "Desktop" : "Mobile",
    field: { available: false, status: "not_requested", reason: "Desktop Lighthouse has not been requested for this report yet." },
    lab: { available: false, status: "not_requested", reason: "Desktop Lighthouse has not been requested for this report yet." },
    status: "not_requested",
    summary: "Desktop metrics are loaded on demand to keep the first scan faster.",
    available: false,
  };
}

function vitalsRowsForDevice(vitals, site = {}, device = "mobile") {
  const rows = [];
  const selected = deviceVitals(vitals, device);
  const field = selected.field || {};
  const lab = selected.lab || {};
  const label = selected.label || (device === "desktop" ? "Desktop" : "Mobile");

  rows.push({
    Section: "Core Web Vitals Summary",
    Device: label,
    Site: site.label || "",
    URL: site.url || "",
    Status: cwvStatusLabel(selected.status || vitals?.status),
    Summary: selected.summary || vitals?.summary || "Core Web Vitals data is unavailable.",
    "CrUX Configured": vitals?.configured?.crux ? "Yes" : "No",
    "PageSpeed Configured": vitals?.configured?.pagespeed ? "Yes" : "No",
  });

  if (lab.available && lab.categoryScores) {
    Object.entries(lab.categoryScores).forEach(([key, score]) => {
      rows.push({
        Section: "Lighthouse Category Scores",
        Device: label,
        Site: site.label || "",
        URL: site.url || "",
        Category: categoryLabel(key),
        Score: Number.isFinite(score) ? `${score}/100` : "Unavailable",
      });
    });
  }

  if (field.available) {
    Object.values(field.metrics || {}).forEach((metric) => rows.push({ Device: label, ...metricExportRow(metric, "CrUX field data", site) }));
  } else {
    rows.push({
      Section: "CrUX Field Data",
      Device: label,
      Site: site.label || "",
      URL: site.url || "",
      Status: cwvStatusLabel(field.status),
      Note: field.reason || "No CrUX field data available.",
    });
  }

  if (lab.available) {
    Object.values(lab.metrics || {})
      .filter((metric) => ["lcp", "tbt", "cls"].includes(metric.key))
      .forEach((metric) => rows.push({ Device: label, ...metricExportRow(metric, "PageSpeed Lighthouse lab", site) }));
    asArray(lab.opportunities).forEach((item, index) => {
      rows.push({
        Section: "Lighthouse Diagnostics",
        Device: label,
        Site: site.label || "",
        URL: site.url || "",
        Item: index + 1,
        Diagnostic: item.title,
        Value: item.displayValue,
        Detail: item.description,
      });
    });
  } else {
    rows.push({
      Section: "PageSpeed Lab Data",
      Device: label,
      Site: site.label || "",
      URL: site.url || "",
      Status: cwvStatusLabel(lab.status),
      Note: lab.reason || "No PageSpeed Insights lab data available.",
    });
  }

  return rows;
}

export function coreWebVitalsRows(vitals, site = {}) {
  if (vitals?.devices) {
    return Object.keys(vitals.devices).flatMap((device) => vitalsRowsForDevice(vitals, site, device));
  }

  return vitalsRowsForDevice(vitals, site, "mobile");
}

function CwvMetricCard({ metric }) {
  if (!metric) {
    return null;
  }

  const explainer = cwvExplainer(metric);
  const target = cwvTargetText(metric, explainer);

  return (
    <div className="rounded-lg border border-ink-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-600">{metric.label}</div>
          <div className="mt-2 text-2xl font-semibold text-ink-900">{metric.display}</div>
          {explainer ? <div className="mt-1 text-xs font-semibold text-ink-700">{explainer.name}</div> : null}
        </div>
        <span className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${cwvStatusClass(metric.status)}`}>
          {cwvStatusLabel(metric.status)}
        </span>
      </div>
      {explainer ? (
        <div className="mt-4 grid gap-3 text-xs leading-5 text-ink-600">
          <p>{explainer.meaning}</p>
          <p className="text-ink-600">{explainer.why}</p>
        </div>
      ) : metric.note ? (
        <p className="mt-3 text-xs leading-5 text-ink-600">{metric.note}</p>
      ) : null}
      {target ? (
        <div className="mt-4 rounded-md border border-ink-200 bg-white px-3 py-2 text-xs text-ink-700">
          <span className="font-semibold text-ink-900">Good target:</span> {target}
        </div>
      ) : null}
      {metric.note && explainer ? <p className="mt-3 text-xs leading-5 text-ink-600">{metric.note}</p> : null}
      {explainer?.actions?.length ? (
        <div className="mt-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-ink-600">What to do</div>
          <ul className="grid gap-2">
            {explainer.actions.map((action) => (
              <li key={action} className="flex gap-2 text-xs leading-5 text-ink-700">
                <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-700" aria-hidden="true" />
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function categoryLabel(key) {
  if (key === "bestPractices") return "Best Practices";
  return `${String(key || "").charAt(0).toUpperCase()}${String(key || "").slice(1)}`;
}

function categoryIcon(key) {
  if (key === "accessibility") return ShieldCheck;
  if (key === "bestPractices") return Sparkles;
  if (key === "seo") return SearchCheck;
  return Zap;
}

function CategoryScore({ label, score, icon: Icon }) {
  const hasScore = Number.isFinite(score);
  const safeScore = hasScore ? Math.max(0, Math.min(100, Math.round(score))) : 0;
  const status = !hasScore ? "unavailable" : safeScore >= 90 ? "good" : safeScore >= 50 ? "needs-improvement" : "poor";
  const explainer = LIGHTHOUSE_CATEGORY_EXPLAINERS[String(label || "").replace(/\s+/g, "").toLowerCase()] || LIGHTHOUSE_CATEGORY_EXPLAINERS[String(label || "").toLowerCase()];

  return (
    <div className="rounded-lg border border-ink-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-600">{label}</div>
        <Icon className="h-4 w-4 text-accent-700" aria-hidden="true" />
      </div>
      <div className="mt-4">
        <div className="text-3xl font-light tracking-tight text-ink-900">{hasScore ? safeScore : "—"}<span className="ml-2 text-xs text-ink-600">{hasScore ? "/ 100" : "Unavailable"}</span></div>
        {hasScore ? <div className="score-meter-track" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={safeScore}><div className="score-meter-fill" style={{ width: `${safeScore}%`, backgroundColor: status === "good" ? "#287554" : status === "needs-improvement" ? "#92600c" : "#b33143" }} /></div> : null}
        <div className={`mt-3 text-xs ${status === "good" ? "text-green-700" : status === "needs-improvement" ? "text-amber-700" : status === "poor" ? "text-rose-700" : "text-ink-600"}`}>{cwvStatusLabel(status)}</div>
      </div>
      {explainer ? <p className="mt-4 text-xs leading-5 text-ink-600">{explainer}</p> : null}
    </div>
  );
}

function DeviceSwitcher({ active, onChange }) {
  return (
    <div className="inline-flex rounded-lg border border-ink-200 bg-white p-1">
      {[
        ["mobile", "Mobile", MonitorSmartphone],
        ["desktop", "Desktop", Monitor],
      ].map(([id, label, Icon]) => (
        <button
          type="button"
          key={id}
          onClick={() => onChange(id)}
          className={`inline-flex min-h-9 items-center gap-2 rounded-md px-3 text-xs font-bold transition ${
            active === id ? "bg-accent-500/15 text-accent-700 ring-1 ring-accent-400/30" : "text-ink-600 hover:bg-white hover:text-ink-900"
          }`}
        >
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          {label}
        </button>
      ))}
    </div>
  );
}

function deviceDataSummary(device = {}) {
  const parts = [];

  if (device.field?.available) {
    parts.push(`CrUX ${device.field.scope} ${device.field.formFactor}`);
  } else {
    parts.push(`CrUX ${cwvStatusLabel(device.field?.status)}`);
  }

  if (device.lab?.available) {
    parts.push(`PageSpeed ${device.lab.strategy}`);
  } else {
    parts.push(`PageSpeed ${cwvStatusLabel(device.lab?.status)}`);
  }

  return parts.join(" / ");
}

function metricStatusDotClass(status) {
  if (status === "good") return "bg-accent-300";
  if (status === "needs-improvement" || status === "lab-only" || status === "informational") return "bg-amber-300";
  if (status === "poor") return "bg-rose-300";
  return "bg-slate-500";
}

function CwvMetricRows({ metrics }) {
  const rows = asArray(metrics).filter(Boolean);

  if (!rows.length) {
    return (
      <div className="rounded-lg border border-ink-200 bg-white p-4 text-sm leading-6 text-ink-600">
        Core Web Vitals metrics are unavailable for this device.
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      {rows.map((metric) => {
        const explainer = cwvExplainer(metric);
        const target = cwvTargetText(metric, explainer);
        const action = explainer?.actions?.[0] || metric.note || "Review the owning template and Lighthouse diagnostics.";

        return (
          <div
            key={metric.key || metric.label}
            className="rounded-lg border border-ink-200 bg-white p-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-bold uppercase tracking-[0.12em] text-ink-700">{metric.label}</div>
                {explainer ? <div className="mt-0.5 text-[11px] leading-4 text-ink-600">{explainer.name}</div> : null}
              </div>
              <div className="text-right">
                <div className="text-xl font-semibold text-ink-900">{metric.display}</div>
                <span className={`mt-1 inline-flex items-center gap-2 rounded-full border px-2 py-1 text-[11px] font-semibold ${cwvStatusClass(metric.status)}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${metricStatusDotClass(metric.status)}`} />
                  {cwvStatusLabel(metric.status)}
                </span>
              </div>
            </div>
            <div className="mt-3 grid gap-1 text-xs leading-5">
              {target ? <div className="text-ink-600"><span className="font-semibold text-ink-800">Target:</span> {target}</div> : null}
              <div className="text-ink-600"><span className="font-semibold text-ink-700">Developer cue:</span> {action}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function metricGridClass(count) {
  if (count <= 1) return "grid gap-3";
  if (count === 2) return "grid gap-3 md:grid-cols-2";
  if (count === 3) return "grid gap-3 md:grid-cols-3";
  return "grid gap-3 md:grid-cols-2 xl:grid-cols-4";
}

function labFailureHint(lab = {}) {
  if (lab.status === "timeout") {
    return "Google could reach the page, but Lighthouse did not finish before the timeout. Heavy scripts, redirects, bot challenges, or slow page load can cause this.";
  }

  if ((lab.status === "lighthouse_error" || lab.status === "failed") && lab.durationMs && lab.durationMs < 5000) {
    return "Google rejected the Lighthouse run before it could measure the page. Check whether the page blocks Google Lighthouse/PageSpeed, requires cookies or login, shows an interstitial, redirects by region, or fails in a clean browser session.";
  }

  if (lab.status === "key_restricted" || lab.status === "invalid_key" || lab.status === "api_disabled" || lab.status === "quota_exceeded") {
    return "This is a Google API configuration issue rather than a page performance result.";
  }

  return "Lighthouse could not return lab scores for this device. Try again once, then verify the URL directly in PageSpeed Insights if it keeps failing.";
}

function AdaptiveMetricGrid({ metrics }) {
  const list = asArray(metrics).filter(Boolean);

  if (!list.length) {
    return null;
  }

  return (
    <div className={metricGridClass(list.length)}>
      {list.map((metric) => (
        <CwvMetricCard key={metric.key || metric.label} metric={metric} />
      ))}
    </div>
  );
}

function PerformanceOverview({ vitals, activeDevice, onDeviceChange, hideDeviceSwitcher = false }) {
  const selected = deviceVitals(vitals, activeDevice);
  const alternateDevice = activeDevice === "mobile" ? "desktop" : "mobile";
  const alternate = deviceVitals(vitals, alternateDevice);
  const mobile = deviceVitals(vitals, "mobile");
  const desktop = deviceVitals(vitals, "desktop");
  const field = selected.field || {};
  const lab = selected.lab || {};
  const labMetrics = lab.metrics || {};
  const scores = lab.categoryScores || {};
  const snapshotMetrics = [field.metrics?.lcp || labMetrics.lcp, field.metrics?.inp || labMetrics.tbt, field.metrics?.cls || labMetrics.cls].filter(Boolean);
  const scoreItems = [
    ["performance", "Performance", scores.performance ?? lab.performanceScore, categoryIcon("performance")],
    ["accessibility", "Accessibility", scores.accessibility, categoryIcon("accessibility")],
    ["bestPractices", "Best Practices", scores.bestPractices, categoryIcon("bestPractices")],
    ["seo", "SEO", scores.seo, categoryIcon("seo")],
  ];
  const audits = asArray(lab.categoryAudits).slice(0, 8);

  return (
    <section className="rounded-lg border border-ink-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.14em] text-sky-700">Performance Overview</div>
          <h3 className="mt-2 text-lg font-semibold text-ink-900">Google lab and field evidence</h3>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-600">
            Mobile evidence loads during the first analysis. Desktop evidence is fetched separately when requested.
          </p>
          <p className="mt-2 text-xs leading-5 text-ink-600">
            Current view: {selected.label || activeDevice} · {deviceDataSummary(selected)}
          </p>
        </div>
        {!hideDeviceSwitcher ? (
          <div className="grid gap-2 sm:justify-items-end">
            <DeviceSwitcher active={activeDevice} onChange={onDeviceChange} />
            <div className="max-w-md text-right text-[11px] leading-4 text-ink-600 max-sm:text-left">
              Mobile: {deviceDataSummary(mobile)} · Desktop: {deviceDataSummary(desktop)}
            </div>
          </div>
        ) : null}
      </div>

      {lab.available ? (
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {scoreItems.map(([key, label, score, Icon]) => (
            <CategoryScore key={key} label={label} score={Number(score)} icon={Icon} />
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-lg border border-amber-300/25 bg-amber-400/10 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h4 className="text-sm font-semibold text-amber-700">Lighthouse lab data is not available for {selected.label || activeDevice}.</h4>
              <p className="mt-1 text-xs leading-5 text-amber-700/75">
                {lab.reason || "PageSpeed Insights did not return Lighthouse category scores for this device."}
              </p>
              {lab.durationMs || lab.timeoutMs ? (
                <p className="mt-2 text-xs leading-5 text-amber-700/60">
                  Request time: {lab.durationMs ? `${Math.round(lab.durationMs / 1000)}s` : "unknown"}
                  {lab.timeoutMs ? ` / timeout ${Math.round(lab.timeoutMs / 1000)}s` : ""}. {labFailureHint(lab)}
                </p>
              ) : null}
              {asArray(lab.details).length ? (
                <ul className="mt-2 grid gap-1 text-xs leading-5 text-amber-700/60">
                  {asArray(lab.details).slice(0, 3).map((detail) => (
                    <li key={detail}>Google detail: {detail}</li>
                  ))}
                </ul>
              ) : null}
            </div>
            {alternate.lab?.available ? (
              <button
                type="button"
                onClick={() => onDeviceChange(alternateDevice)}
                className="inline-flex min-h-9 items-center justify-center rounded-lg border border-amber-200/35 bg-white px-3 text-xs font-bold text-amber-700 transition hover:border-accent-300/50 hover:text-accent-700"
              >
                View {alternate.label || alternateDevice} Lighthouse
              </button>
            ) : null}
          </div>
        </div>
      )}

      <div className="mt-5 grid gap-3">
        <div className="rounded-md border border-ink-200 bg-white p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h4 className="text-sm font-semibold text-ink-900">Run Details</h4>
            <span className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${cwvStatusClass(lab.status || selected.status)}`}>
              {lab.available ? "Lighthouse available" : cwvStatusLabel(lab.status)}
            </span>
          </div>
          <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2 2xl:grid-cols-5">
            {[
              ["Device", selected.label || activeDevice],
              ["Field data", field.available ? `${field.scope} ${field.formFactor}` : cwvStatusLabel(field.status)],
              ["Lab data", lab.available ? `${lab.strategy} Lighthouse` : cwvStatusLabel(lab.status)],
              ["Version", lab.lighthouseVersion || "Unavailable"],
              ["Request time", lab.durationMs ? `${Math.round(lab.durationMs / 1000)}s` : "Unavailable"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-[6px] border border-ink-200 bg-white px-3 py-2">
                <dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-600">{label}</dt>
                <dd className="mt-1 break-words font-semibold text-ink-900" title={value}>{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="rounded-md border border-ink-200 bg-white p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-ink-900">Core Web Vitals Snapshot</h4>
              <p className="mt-1 text-xs leading-5 text-ink-600">
                {field.available ? `CrUX ${field.scope} ${field.formFactor} field data plus PageSpeed lab diagnostics.` : "PageSpeed lab diagnostics are shown when real-user field data is unavailable."}
              </p>
            </div>
            <span className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${cwvStatusClass(selected.status || vitals?.status)}`}>
              {cwvStatusLabel(selected.status || vitals?.status)}
            </span>
          </div>
          <CwvMetricRows metrics={snapshotMetrics} />
        </div>
      </div>

      {lab.available && (asArray(lab.opportunities).length || audits.length) ? (
        <div className="mt-5 grid gap-5">
          {asArray(lab.opportunities).length ? (
            <div>
              <h4 className="mb-3 text-sm font-semibold text-ink-900">Top Opportunities</h4>
              <BulletList
                icon={AlertTriangle}
                items={lab.opportunities.slice(0, 5).map((item) => ({
                  area: item.title,
                  issue: item.displayValue || "Review this Lighthouse opportunity.",
                  severity: item.score === 0 ? "Warning" : "Info",
                  evidence: item.description,
                }))}
              />
            </div>
          ) : null}
          {audits.length ? (
            <div>
              <h4 className="mb-3 text-sm font-semibold text-ink-900">Diagnostics</h4>
              <BulletList
                icon={AlertTriangle}
                items={audits.map((item) => ({
                  area: item.title,
                  issue: item.displayValue || item.category,
                  severity: item.score === 0 ? "Warning" : "Info",
                  evidence: item.description,
                }))}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function CwvCompactMetricRow({ metric, fallbackKey }) {
  const safeMetric = metric || { key: fallbackKey, label: String(fallbackKey || "").toUpperCase(), display: "Unavailable", status: "unavailable" };
  const explainer = cwvExplainer(safeMetric);
  return (
    <div className="grid gap-3 rounded-md border border-ink-200 bg-white p-3 sm:grid-cols-[4rem_minmax(0,1fr)_auto] sm:items-center">
      <div title={explainer?.name || safeMetric.label} className="text-sm font-black uppercase tracking-[0.14em] text-ink-800">
        {safeMetric.label || String(fallbackKey || "").toUpperCase()}
      </div>
      <div className="min-w-0">
        <div className="text-xs font-semibold text-ink-900">{explainer?.name || safeMetric.title || safeMetric.label}</div>
        <p className="mt-1 text-xs leading-5 text-ink-600">{explainer?.meaning || safeMetric.note || "This metric was not returned for this device."}</p>
      </div>
      <div className="flex items-center gap-2 sm:justify-end">
        <span className="text-sm font-bold text-ink-900">{safeMetric.display || "Unavailable"}</span>
        <span className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${cwvStatusClass(safeMetric.status)}`}>
          {cwvStatusLabel(safeMetric.status)}
        </span>
      </div>
    </div>
  );
}

function DesktopLighthouseProgress() {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const startedAt = Date.now();
    const interval = window.setInterval(() => {
      setElapsedSeconds(Math.max(1, Math.round((Date.now() - startedAt) / 1000)));
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  const progress = Math.min(95, Math.max(8, Math.round((elapsedSeconds / 120) * 95)));

  return (
    <div className="mt-4 rounded-md border border-sky-300/25 bg-sky-400/10 p-3" role="status" aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.14em] text-sky-700">Desktop Lighthouse is running</div>
          <p className="mt-1 text-xs leading-5 text-sky-700/75">
            Google PageSpeed is loading the desktop version, running Lighthouse, and returning lab scores.
          </p>
        </div>
        <span className="rounded-full border border-sky-200/30 bg-white px-2 py-1 text-[11px] font-bold text-sky-700">
          {elapsedSeconds || 1}s elapsed
        </span>
      </div>
      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-ink-950/50"
        role="progressbar"
        aria-label="Desktop Lighthouse loading progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
      >
        <div
          className="h-full rounded-full bg-sky-300 shadow-[0_0_18px_rgba(125,211,252,0.35)] transition-[width] duration-700 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="mt-2 text-[11px] leading-4 text-sky-700/60">
        Desktop Lighthouse can take up to 120s on heavy pages. The bar is an estimate until Google returns the result.
      </p>
    </div>
  );
}

function DeviceVitalsCard({ vitals, device, onFetchDesktopVitals, desktopVitalsState }) {
  const [open, setOpen] = useState(false);
  const hasDevice = Boolean(vitals?.devices?.[device] || (device === "mobile" && (vitals?.field || vitals?.lab)));
  const selected = deviceVitals(vitals, device);
  const field = selected.field || {};
  const lab = selected.lab || {};
  const metrics = field.available ? field.metrics || {} : lab.metrics || {};
  const diagnosticCount = asArray(lab.opportunities).length + asArray(lab.categoryAudits).length;
  const score = field.available ? field.score : lab.available ? lab.performanceScore : 0;

  if (!hasDevice && device === "desktop") {
    return (
      <article className="rounded-lg border border-ink-200 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-ink-900">Desktop</h3>
            <p className="mt-1 text-xs leading-5 text-ink-600">
              Desktop Lighthouse is slower, so PageSignal loads it only when you ask for it.
            </p>
          </div>
          <Monitor className="h-5 w-5 text-ink-600" aria-hidden="true" />
        </div>
        <div className="mt-4 rounded-md border border-ink-200 bg-white p-3 text-sm leading-6 text-ink-700">
          Mobile results are shown first for faster feedback. Run desktop when you need a separate Lighthouse view for larger screens.
        </div>
        {desktopVitalsState?.loading ? <DesktopLighthouseProgress /> : null}
        {desktopVitalsState?.error ? (
          <p className="mt-3 rounded-md border border-rose-400/30 bg-rose-500/10 p-3 text-xs leading-5 text-rose-700">
            {desktopVitalsState.error}
          </p>
        ) : null}
        <button
          type="button"
          onClick={onFetchDesktopVitals}
          disabled={!onFetchDesktopVitals || desktopVitalsState?.loading}
          className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-md border border-sky-300/40 bg-sky-400/10 px-3 text-sm font-bold text-sky-700 transition hover:border-sky-200/70 hover:bg-sky-400/15 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500"
        >
          {desktopVitalsState?.loading ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Monitor className="h-4 w-4" aria-hidden="true" />}
          {desktopVitalsState?.loading ? "Fetching desktop metrics" : "Fetch desktop Lighthouse"}
        </button>
      </article>
    );
  }

  return (
    <article className="rounded-lg border border-ink-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-ink-900">{selected.label || (device === "desktop" ? "Desktop" : "Mobile")}</h3>
          <p className="mt-1 text-xs leading-5 text-ink-600">
            <span title="Chrome User Experience Report">Real user data:</span>{" "}
            {field.available ? `Available (${field.scope || "URL"} ${field.formFactor || ""})` : "Not yet enough samples"}
          </p>
        </div>
        <ScoreGauge score={score} label={field.available ? "Field" : "Lab"} compact />
      </div>

      <div className="mt-4 grid gap-2">
        <CwvCompactMetricRow metric={metrics.lcp} fallbackKey="lcp" />
        <CwvCompactMetricRow metric={metrics.inp || metrics.tbt} fallbackKey={metrics.tbt ? "tbt" : "inp"} />
        <CwvCompactMetricRow metric={metrics.cls} fallbackKey="cls" />
      </div>

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="mt-4 inline-flex min-h-9 items-center gap-2 rounded-full border border-ink-200 bg-white px-3 text-xs font-bold text-ink-900 transition hover:border-sky-300/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500"
        aria-expanded={open}
      >
        View {diagnosticCount} diagnostics
        <ArrowRight className={`h-3.5 w-3.5 transition ${open ? "rotate-90" : ""}`} aria-hidden="true" />
      </button>

      {open ? (
        <div className="mt-4">
          <PerformanceOverview vitals={vitals} activeDevice={device} onDeviceChange={() => {}} hideDeviceSwitcher />
        </div>
      ) : null}
    </article>
  );
}

export function CoreWebVitalsReport({ coreWebVitals, onFetchDesktopVitals, desktopVitalsState }) {
  const vitals = coreWebVitals || {};

  return (
    <div className="grid gap-5">
      <div className="rounded-lg border border-ink-200 bg-white p-4">
        <div className="text-xs font-bold uppercase tracking-[0.14em] text-sky-700">Core Web Vitals</div>
        <h3 className="mt-2 text-lg font-semibold text-ink-900">Mobile first, desktop on demand</h3>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-600">
          LCP checks loading speed, INP checks interaction responsiveness, and CLS checks visual stability. Mobile loads by default so the first report returns faster; fetch Desktop Lighthouse separately when you need it.
        </p>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <DeviceVitalsCard vitals={vitals} device="mobile" />
        <DeviceVitalsCard vitals={vitals} device="desktop" onFetchDesktopVitals={onFetchDesktopVitals} desktopVitalsState={desktopVitalsState} />
      </div>
    </div>
  );
}

function cwvScore(vitals = {}) {
  if (vitals.field?.available) {
    return vitals.field.score;
  }

  if (vitals.lab?.available) {
    return vitals.lab.performanceScore;
  }

  return 0;
}

function CwvMiniMetric({ metric }) {
  if (!metric) {
    return null;
  }

  const explainer = cwvExplainer(metric);

  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-white px-3 py-2">
      <span className="min-w-0">
        <span className="block text-xs font-semibold text-ink-700">{metric.label}</span>
        {explainer ? <span className="block truncate text-[10px] text-ink-600">{explainer.name}</span> : null}
      </span>
      <span className="flex items-center gap-2 text-xs">
        <span className="font-semibold text-ink-900">{metric.display}</span>
        <span className={`rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${cwvStatusClass(metric.status)}`}>
          {cwvStatusLabel(metric.status)}
        </span>
      </span>
    </div>
  );
}

export function CoreWebVitalsCompare({ items }) {
  const rows = asArray(items);

  if (!rows.length) {
    return <CoreWebVitalsReport coreWebVitals={null} />;
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {rows.map((item) => {
        const vitals = item.coreWebVitals || {};
        const field = vitals.field || {};
        const lab = vitals.lab || {};
        const metrics = field.available ? field.metrics || {} : lab.metrics || {};

        return (
          <div key={item.url || item.label} className="rounded-lg border border-ink-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold text-ink-900">{item.label}</h3>
                <p className="mt-1 truncate text-xs text-ink-600">{item.url}</p>
              </div>
              <span className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${cwvStatusClass(vitals.status)}`}>
                {cwvStatusLabel(vitals.status)}
              </span>
            </div>
            <div className="mt-4">
              <ScoreGauge score={cwvScore(vitals)} label={field.available ? "Field Score" : "Lab Score"} compact />
            </div>
            <div className="mt-4 grid gap-2">
              <CwvMiniMetric metric={metrics.lcp} />
              <CwvMiniMetric metric={metrics.inp || metrics.tbt} />
              <CwvMiniMetric metric={metrics.cls} />
            </div>
            <p className="mt-3 text-xs leading-5 text-ink-600">
              {vitals.summary || "No Core Web Vitals evidence available for this site."}
            </p>
          </div>
        );
      })}
    </div>
  );
}
