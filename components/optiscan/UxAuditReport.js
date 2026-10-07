"use client";

/* eslint-disable @next/next/no-img-element */

import { WarningAmberOutlined as AlertTriangle } from "../design/icons";
import { ArrowForwardOutlined as ArrowRight } from "../design/icons";
import { ScienceOutlined as Beaker } from "../design/icons";
import { CheckCircleOutlineOutlined as CheckCircle2 } from "../design/icons";
import { VisibilityOutlined as Eye } from "../design/icons";
import { SpeedOutlined as Gauge } from "../design/icons";
import { HelpOutlineOutlined as HelpCircle } from "../design/icons";
import { RouteOutlined as Route } from "../design/icons";
import { AdjustOutlined as Target } from "../design/icons";
import { PeopleOutlineOutlined as Users } from "../design/icons";
import { CoreWebVitalsReport } from "./coreWebVitals";
import { TicketsReport } from "./tickets";
import { asArray, textValue, toneForScore } from "./utils";
import { ScoreGauge } from "./ui";

function Panel({ title, copy, children, className = "" }) {
  return (
    <section className={`rounded-md border border-ink-200 bg-white p-4 ${className}`}>
      <div>
        <h3 className="text-sm font-semibold text-ink-900">{title}</h3>
        {copy ? <p className="mt-1 text-xs leading-5 text-ink-600">{copy}</p> : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function fitTone(status) {
  if (["Supported", "Ready", "Good"].includes(status)) return "border-green-400/30 bg-green-500/10 text-green-700";
  if (["Friction", "Partially ready", "Needs work", "Needs improvement"].includes(status)) return "border-amber-300/30 bg-amber-400/10 text-amber-700";
  if (["Missing", "Not ready", "Critical", "Poor"].includes(status)) return "border-rose-400/30 bg-rose-500/10 text-rose-700";
  return "border-ink-200 bg-white text-ink-700";
}

function Status({ value }) {
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${fitTone(value)}`}>{value || "Not enough evidence"}</span>;
}

function PersonaHeading({ persona, fallback }) {
  const value = persona || fallback || {};
  return (
    <div className="flex min-w-0 items-center gap-3">
      {value.image ? (
        <img src={value.image} alt={value.imageAlt || ""} className="h-12 w-12 shrink-0 rounded-full border border-ink-200 object-cover" />
      ) : (
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-ink-200 bg-white text-ink-700"><Users className="h-5 w-5" /></span>
      )}
      <div className="min-w-0">
        <h3 className="truncate text-sm font-semibold text-ink-900">{value.label || value.persona_id || "Selected persona"}</h3>
        {value.auditFocus ? <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-ink-600">{value.auditFocus}</p> : null}
      </div>
    </div>
  );
}

function EvidenceQuality({ meta }) {
  const capture = meta?.screenshot || {};
  const consent = capture.consent || {};
  const usable = capture.usableForAnalysis === true && meta?.visionUsed;
  const label = usable ? "Visual evidence verified" : "Structural evidence only";
  const detail = usable
    ? consent.status === "not_present" ? "No blocking consent overlay was present when the page was captured." : `Cookie consent was ${consent.status} and the cleared page was verified before analysis.`
    : consent.status === "unresolved" ? "A consent overlay could not be cleared confidently, so the screenshot was excluded from AI conclusions." : "No consent-verified screenshot was available; visual conclusions remain limited.";

  return (
    <div className={`rounded-md border p-3 ${usable ? "border-green-400/25 bg-green-500/8" : "border-amber-300/25 bg-amber-400/8"}`}>
      <div className="flex items-start gap-2">
        {usable ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-700" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />}
        <div><div className="text-xs font-semibold text-ink-900">{label}</div><p className="mt-1 text-xs leading-5 text-ink-600">{detail}</p></div>
      </div>
    </div>
  );
}

function Overview({ audit, meta, tickets }) {
  const analysis = audit.persona_analysis || {};
  const needs = asArray(analysis.needs_coverage);
  const selected = [meta?.personas?.primary || meta?.persona, ...asArray(meta?.personas?.secondary)].filter(Boolean);
  const statusCounts = needs.reduce((counts, item) => ({ ...counts, [item.status]: (counts[item.status] || 0) + 1 }), {});

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <Panel title="Shared UX score" copy="Evidence-derived and comparable across persona selections.">
          <div className="grid justify-items-center gap-3"><ScoreGauge score={audit.score} label="UX" /><Status value={toneForScore(audit.score).text} /></div>
        </Panel>
        <Panel title="Key takeaway" copy="What the available evidence says about this page.">
          <p className="text-base leading-7 text-ink-800">{audit.summary}</p>
          <div className="mt-4"><EvidenceQuality meta={meta} /></div>
        </Panel>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Supported needs", statusCounts.Supported || 0, "text-green-700"],
          ["Needs with friction", statusCounts.Friction || 0, "text-amber-700"],
          ["Missing needs", statusCounts.Missing || 0, "text-rose-700"],
          ["Needs more evidence", statusCounts["Not enough evidence"] || 0, "text-ink-700"],
        ].map(([label, value, tone]) => <div key={label} className="rounded-md border border-ink-200 bg-white p-3"><div className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-600">{label}</div><div className={`mt-2 text-2xl font-semibold ${tone}`}>{value}</div></div>)}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Decision readiness" copy="Whether each persona has enough information to take the next step.">
          <div className="grid gap-3">{asArray(analysis.decision_readiness).map((item) => <div key={item.persona_id} className="rounded-md border border-ink-200 bg-white p-3"><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-sm font-semibold text-ink-900">{item.label}</span><Status value={item.status} /></div><p className="mt-2 text-xs leading-5 text-ink-700">{item.assessment}</p></div>)}</div>
        </Panel>
        <Panel title="Selected lenses" copy={`${selected.length} persona${selected.length === 1 ? "" : "s"} applied to the same evidence.`}>
          <div className="grid gap-3">{selected.map((persona) => <PersonaHeading key={persona.id} persona={persona} />)}</div>
        </Panel>
      </div>

      {asArray(analysis.conflicts).length ? <Panel title="Priority conflict" copy="A design decision must protect both needs rather than averaging them away."><p className="text-sm leading-6 text-ink-800">{analysis.conflicts[0].tension}</p><p className="mt-2 text-sm leading-6 text-amber-700"><span className="font-semibold">Resolution:</span> {analysis.conflicts[0].recommendation}</p></Panel> : null}
      <Panel title="Top actions" copy={`${tickets.length} implementation ticket${tickets.length === 1 ? "" : "s"} available in the backlog.`}><div className="grid gap-2">{asArray(audit.checklist).slice(0, 3).map((item) => <div key={item.task} className="flex items-start gap-2 text-sm leading-6 text-ink-700"><ArrowRight className="mt-1 h-4 w-4 shrink-0 text-accent-700" /><span>{item.task}</span></div>)}</div></Panel>
    </div>
  );
}

function PersonaAnalysis({ audit, meta }) {
  const analysis = audit.persona_analysis || {};
  const selected = [meta?.personas?.primary || meta?.persona, ...asArray(meta?.personas?.secondary)].filter(Boolean);

  return (
    <div className="grid gap-4">
      <Panel title="Needs coverage matrix" copy="Each goal and blocker is tied to observed evidence. Uncertain evidence stays uncertain.">
        <div className="grid gap-4">
          {selected.map((persona) => {
            const needs = asArray(analysis.needs_coverage).filter((item) => item.persona_id === persona.id);
            return <div key={persona.id} className="grid gap-3"><PersonaHeading persona={persona} /><div className="grid gap-2">{needs.map((item) => <article key={item.need_id} className="grid gap-3 rounded-md border border-ink-200 bg-white p-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-start"><div><div className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-600">{item.need_type}</div><p className="mt-1 text-sm font-semibold text-ink-900">{item.need}</p><p className="mt-2 text-xs leading-5 text-ink-600">{item.evidence}</p></div><div className="flex flex-wrap gap-2 md:justify-end"><Status value={item.status} /><span className="rounded-full border border-ink-200 px-2.5 py-1 text-[11px] font-semibold text-ink-700">{item.confidence} confidence</span></div></article>)}</div></div>;
          })}
        </div>
      </Panel>
      <div className="grid gap-4 lg:grid-cols-2">
        {[
          ["CTA suitability", analysis.cta_suitability],
          ["Content fit", analysis.content_fit],
        ].map(([title, items]) => <Panel key={title} title={title}>{<div className="grid gap-3">{asArray(items).map((item) => <article key={item.persona_id} className="rounded-md border border-ink-200 bg-white p-3"><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-sm font-semibold text-ink-900">{item.label}</span><Status value={item.status} /></div>{item.cta ? <p className="mt-2 text-xs font-semibold text-sky-700">Detected CTA: {item.cta}</p> : null}<p className="mt-2 text-xs leading-5 text-ink-700">{item.assessment}</p><p className="mt-2 text-xs leading-5 text-ink-600">Evidence: {item.evidence}</p>{item.recommendation ? <p className="mt-2 text-xs leading-5 text-accent-700">Recommendation: {item.recommendation}</p> : null}</article>)}</div>}</Panel>)}
      </div>
      {asArray(analysis.conflicts).map((conflict, index) => <Panel key={`${textValue(conflict.personas)}-${index}`} title="Conflict resolution" copy={`${asArray(conflict.personas).join(" + ")} · ${conflict.resolution_pattern}`}><p className="text-sm leading-6 text-ink-800">{conflict.tension}</p><p className="mt-2 text-sm leading-6 text-amber-700">{conflict.recommendation}</p><div className="mt-3 grid gap-2">{asArray(conflict.acceptance_criteria).map((criterion) => <div key={`${criterion.persona_id}-${criterion.criterion}`} className="text-xs leading-5 text-ink-700"><span className="font-semibold text-sky-700">{criterion.persona_id}:</span> {criterion.criterion}</div>)}</div></Panel>)}
    </div>
  );
}

function Journey({ audit }) {
  return <div className="grid gap-4">{asArray(audit.persona_analysis?.journey_implications).map((item) => <Panel key={item.persona_id} title={item.label} copy={`${item.page_role} · ${item.confidence} confidence`}><span className="inline-flex rounded-full border border-sky-400/30 bg-sky-500/10 px-2.5 py-1 text-[11px] font-bold text-sky-700">Hypothesis, not observed behaviour</span><div className="mt-4 grid gap-3 lg:grid-cols-3">{[["Before", item.before],["On this page", item.on_page],["Likely next step", item.next_step]].map(([label, value]) => <div key={label} className="rounded-md border border-ink-200 bg-white p-3"><div className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-600">{label}</div><p className="mt-2 text-sm leading-6 text-ink-800">{value}</p></div>)}</div>{asArray(item.risks).length ? <div className="mt-4"><div className="text-xs font-semibold text-amber-700">Risks and missing transitions</div><ul className="mt-2 grid gap-1 text-xs leading-5 text-ink-700">{asArray(item.risks).map((risk) => <li key={risk}>• {risk}</li>)}</ul></div> : null}<p className="mt-4 text-xs leading-5 text-ink-600">Evidence basis: {item.evidence}</p></Panel>)}</div>;
}

function Experiments({ audit }) {
  return <div className="grid gap-3">{asArray(audit.persona_analysis?.experiments).map((item, index) => <article key={`${item.title}-${index}`} className="rounded-md border border-ink-200 bg-white p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap gap-2">{asArray(item.personas).map((persona) => <span key={persona} className="rounded-full border border-sky-400/25 bg-sky-500/10 px-2 py-0.5 text-[10px] font-bold text-sky-700">{persona}</span>)}</div><h3 className="mt-2 text-sm font-semibold text-ink-900">{item.title}</h3></div><div className="flex gap-2"><span className="rounded-full border border-ink-200 px-2.5 py-1 text-[11px] font-semibold text-ink-700">{item.confidence} confidence</span><Status value={item.priority === "High" ? "Friction" : "Not enough evidence"} /></div></div><div className="mt-4 grid gap-3 lg:grid-cols-2"><div><div className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-600">Hypothesis</div><p className="mt-1 text-sm leading-6 text-ink-800">{item.hypothesis}</p></div><div><div className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-600">Proposed change</div><p className="mt-1 text-sm leading-6 text-ink-800">{item.proposed_change}</p></div></div><div className="mt-4 flex flex-wrap gap-2 text-xs text-ink-700"><span className="rounded-[6px] border border-ink-200 bg-white px-2.5 py-1.5">Primary: {item.primary_metric}</span>{item.guardrail_metric ? <span className="rounded-[6px] border border-ink-200 bg-white px-2.5 py-1.5">Guardrail: {item.guardrail_metric}</span> : null}</div></article>)}</div>;
}

function Evidence({ audit, meta, coreWebVitals, onFetchDesktopVitals, desktopVitalsState }) {
  const screenshot = meta?.screenshot?.usableForAnalysis ? meta.screenshot.image : null;
  return <div className="grid gap-4"><EvidenceQuality meta={meta} />{screenshot ? <figure className="overflow-hidden rounded-md border border-ink-200 bg-white"><div className="max-h-[36rem] overflow-y-auto"><img src={screenshot} alt="Consent-verified full-page mobile screenshot used in the UX audit" className="w-full" /></div><figcaption className="border-t border-ink-200 p-3 text-xs text-ink-600">Consent-verified rendered mobile page. Scroll to inspect the full capture.</figcaption></figure> : null}<Panel title="Visual hierarchy" copy={audit.visual_hierarchy?.finding}><div className="grid gap-2">{asArray(audit.visual_hierarchy?.issues).map((issue) => <p key={textValue(issue)} className="text-sm leading-6 text-ink-700">{textValue(issue)}</p>)}</div></Panel><div className="grid gap-4 lg:grid-cols-2"><Panel title="Accessibility" copy={audit.accessibility?.assessment}><div className="grid gap-2">{asArray(audit.accessibility?.issues).map((issue) => <div key={textValue(issue)} className="rounded-[6px] border border-ink-200 p-3 text-xs leading-5 text-ink-700">{issue.issue || textValue(issue)}{issue.evidence ? <p className="mt-1 text-ink-600">{issue.evidence}</p> : null}</div>)}</div></Panel><Panel title="Mobile and interaction"><div className="grid gap-3 text-sm leading-6 text-ink-700"><p><span className="font-semibold text-ink-900">Viewport:</span> {audit.mobile_experience?.viewport}</p><p><span className="font-semibold text-ink-900">Tap targets:</span> {audit.mobile_experience?.tap_targets}</p><p><span className="font-semibold text-ink-900">Forms:</span> {audit.interaction_feedback?.forms}</p><p><span className="font-semibold text-ink-900">Navigation:</span> {audit.interaction_feedback?.navigation}</p></div></Panel></div>{coreWebVitals ? <Panel title="Performance evidence" copy="Core Web Vitals and Lighthouse remain diagnostic evidence, separate from screenshot consent verification."><CoreWebVitalsReport coreWebVitals={coreWebVitals} onFetchDesktopVitals={onFetchDesktopVitals} desktopVitalsState={desktopVitalsState} /></Panel> : null}</div>;
}

export default function UxAuditReport({ audit, activeTab, coreWebVitals, tickets, meta, onFetchDesktopVitals, desktopVitalsState }) {
  if (activeTab === "personas") return <PersonaAnalysis audit={audit} meta={meta} />;
  if (activeTab === "journey") return <Journey audit={audit} />;
  if (activeTab === "experiments") return <Experiments audit={audit} />;
  if (activeTab === "evidence") return <Evidence audit={audit} meta={meta} coreWebVitals={coreWebVitals} onFetchDesktopVitals={onFetchDesktopVitals} desktopVitalsState={desktopVitalsState} />;
  if (activeTab === "tickets") return <TicketsReport tickets={tickets} />;
  return <Overview audit={audit} meta={meta} tickets={tickets} />;
}
