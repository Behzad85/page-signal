"use client";

import { WarningAmberOutlined as AlertTriangle } from "../design/icons";
import { CheckCircleOutlineOutlined as CheckCircle2 } from "../design/icons";
import { HelpOutlineOutlined as CircleHelp } from "../design/icons";
import { OpenInNewOutlined as ExternalLink } from "../design/icons";
import { InfoOutlined as Info } from "../design/icons";
import { GppMaybeOutlined as ShieldAlert } from "../design/icons";
import { GppGoodOutlined as ShieldCheck } from "../design/icons";
import { securityStatusLabel } from "../../lib/securitySchema.mjs";
import { ScoreGauge } from "./ui";
import { asArray } from "./utils";

const STATUS_STYLE = {
  pass: {
    icon: CheckCircle2,
    text: "text-green-700",
    iconClass: "text-green-700",
    border: "border-green-500/25",
    bg: "bg-green-500/10",
  },
  warning: {
    icon: AlertTriangle,
    text: "text-amber-700",
    iconClass: "text-amber-700",
    border: "border-amber-400/30",
    bg: "bg-amber-400/10",
  },
  critical: {
    icon: ShieldAlert,
    text: "text-rose-700",
    iconClass: "text-rose-700",
    border: "border-rose-400/30",
    bg: "bg-rose-400/10",
  },
  info: {
    icon: Info,
    text: "text-sky-700",
    iconClass: "text-sky-700",
    border: "border-sky-400/25",
    bg: "bg-sky-400/10",
  },
  not_tested: {
    icon: CircleHelp,
    text: "text-ink-800",
    iconClass: "text-ink-600",
    border: "border-ink-200",
    bg: "bg-white",
  },
};

function statusStyle(status) {
  return STATUS_STYLE[status] || STATUS_STYLE.not_tested;
}

function StatusPill({ status, label = "" }) {
  const style = statusStyle(status);
  const Icon = style.icon;
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${style.border} ${style.bg} ${style.text}`}>
      <Icon className={`h-3.5 w-3.5 ${style.iconClass}`} aria-hidden="true" />
      {label || securityStatusLabel(status)}
    </span>
  );
}

function CountTile({ label, value, status }) {
  const style = statusStyle(status);
  return (
    <div className={`rounded-md border px-3 py-3 ${style.border} ${style.bg}`}>
      <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-600">{label}</div>
      <div className={`mt-1 text-xl font-semibold ${style.text}`}>{value || 0}</div>
    </div>
  );
}

function SecurityCheck({ item }) {
  const style = statusStyle(item.status);
  const Icon = style.icon;

  return (
    <li className={`rounded-md border p-4 ${style.border} ${style.bg}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${style.iconClass}`} aria-hidden="true" />
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-ink-900">{item.label}</h4>
            {item.url ? (
              <a className="mt-1 inline-flex max-w-full items-center gap-1 break-all text-xs text-sky-700 hover:text-sky-700 hover:underline" href={item.url} target="_blank" rel="noreferrer">
                {item.url}
                <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
              </a>
            ) : null}
          </div>
        </div>
        <StatusPill status={item.status} />
      </div>
      {item.explanation ? (
        <div className="mt-3">
          <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-600">Why it matters</div>
          <p className="mt-1 text-sm leading-6 text-ink-700">{item.explanation}</p>
        </div>
      ) : null}
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-600">Evidence</div>
          <p className="mt-1 text-xs leading-5 text-ink-700">{item.evidence}</p>
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-600">What to do</div>
          <p className="mt-1 text-xs leading-5 text-ink-700">{item.remediation || "No action required for this measured check."}</p>
          {item.reference ? (
            <a className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-sky-700 hover:text-sky-700 hover:underline" href={item.reference} target="_blank" rel="noreferrer">
              Security guidance
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
          ) : null}
        </div>
      </div>
    </li>
  );
}

export function SecurityPostureReport({ posture }) {
  if (!posture) {
    return (
      <div className="rounded-md border border-ink-200 bg-white p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink-800">
          <CircleHelp className="h-4 w-4 text-ink-600" aria-hidden="true" />
          Security posture evidence is unavailable for this report.
        </div>
      </div>
    );
  }

  const counts = posture.counts || {};
  const headlineStatus = posture.status === "critical" ? "critical" : posture.status === "needs_attention" ? "warning" : posture.status === "good" ? "pass" : "not_tested";
  const HeadlineIcon = posture.status === "good" ? ShieldCheck : posture.status === "critical" ? ShieldAlert : AlertTriangle;

  return (
    <div className="grid gap-4">
      <section className="rounded-md border border-ink-200 bg-white p-5">
        <div className="grid gap-5 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-center">
          {Number.isFinite(posture.score) ? (
            <ScoreGauge
              score={posture.score}
              label="Posture score"
              compact
              statusText={securityStatusLabel(headlineStatus)}
              statusClassName={statusStyle(headlineStatus).text}
            />
          ) : (
            <div className="grid h-20 w-20 place-items-center rounded-full border-8 border-ink-200 text-sm font-semibold text-ink-600">N/A</div>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <HeadlineIcon className={`h-5 w-5 ${statusStyle(headlineStatus).iconClass}`} aria-hidden="true" />
              <h2 className="text-lg font-semibold text-ink-900">Public Security Posture</h2>
              <StatusPill status={headlineStatus} />
            </div>
            <p className="mt-2 text-sm leading-6 text-ink-700">{posture.summary}</p>
            <p className="mt-2 text-xs leading-5 text-ink-600">{posture.scope}</p>
            <p className="mt-2 text-xs font-medium leading-5 text-amber-700">{posture.disclaimer}</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          <CountTile label="Pass" value={counts.pass} status="pass" />
          <CountTile label="Needs attention" value={counts.warning} status="warning" />
          <CountTile label="Critical" value={counts.critical} status="critical" />
          <CountTile label="Informational" value={counts.info} status="info" />
          <CountTile label="Not tested" value={counts.not_tested} status="not_tested" />
        </div>
      </section>

      {asArray(posture.categories).map((category) => {
        const categoryStyle = statusStyle(category.status);
        return (
          <section key={category.id} className={`rounded-md border bg-white p-4 ${categoryStyle.border}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-ink-900">{category.label}</h3>
                <p className="mt-1 text-xs leading-5 text-ink-600">{category.description}</p>
              </div>
              <StatusPill
                status={category.status}
                label={category.status === "not_tested" && (category.counts?.pass || category.counts?.info) ? "Partially tested" : ""}
              />
            </div>
            <ul className="mt-4 grid gap-3">
              {asArray(category.checks).map((item) => (
                <SecurityCheck key={item.id} item={item} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
