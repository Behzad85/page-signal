"use client";

import {
  Badge,
  Button,
  FileButton,
  Paper,
  Select,
  Textarea,
  TextInput,
} from "../design/primitives";
import { WarningAmberOutlined as AlertTriangle } from "../design/icons";
import { CheckCircleOutlineOutlined as CheckCircle2 } from "../design/icons";
import { ExpandMoreOutlined as ChevronDown } from "../design/icons";
import { ExpandLessOutlined as ChevronUp } from "../design/icons";
import { FileUploadOutlined as FileUp } from "../design/icons";
import { FilterListOutlined as Filter } from "../design/icons";
import { InboxOutlined as Inbox } from "../design/icons";
import { AddCommentOutlined as MessageSquarePlus } from "../design/icons";
import { SearchOutlined as Search } from "../design/icons";
import { DeleteOutlineOutlined as Trash2 } from "../design/icons";
import { PeopleOutlineOutlined as Users } from "../design/icons";
import { PageHeading } from "../design/AppShell";
import { useEffect, useMemo, useState } from "react";
import {
  FEEDBACK_THEMES,
  JOURNEY_STAGES,
  PERSONAS,
  SENTIMENTS,
  SEVERITIES,
  buildFeedbackRecord,
  feedbackReviewGaps,
  loadFeedbackRecords,
  mergeFeedbackRecords,
  parseFeedbackCsv,
  persistFeedbackRecords,
} from "../../lib/feedbackClassification.mjs";
import { trackEvent } from "../../lib/analytics";
import { FEEDBACK_OPEN_EVENT } from "./FeedbackButton";

const ALL_OPTION = { value: "all", label: "All" };
const DEFAULT_FORM = { message: "", email: "", source: "Manual entry" };

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function sourceLabel(value) {
  if (value === "optiscan") return "PageSignal form";
  if (value === "csv") return "CSV import";
  return value || "Manual entry";
}

function toneFor(value, type) {
  if (type === "sentiment") {
    if (value === "positive") return "green";
    if (value === "negative") return "red";
    return "gray";
  }
  if (type === "severity") {
    if (value === "critical" || value === "high") return "red";
    if (value === "medium") return "yellow";
    return "gray";
  }
  return "blue";
}

function ClassificationBadge({ label, value, type }) {
  return (
    <div className="min-w-0">
      <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-ink-600">{label}</div>
      <Badge color={toneFor(value.value, type)} variant="light" radius="xl" className="max-w-full normal-case tracking-normal">
        <span className="truncate">{value.label}</span>
      </Badge>
    </div>
  );
}

function FeedbackCard({ record, expanded, onToggle, onChange, onMarkReviewed, onRemove }) {
  const classification = record.classification;
  const reviewGaps = feedbackReviewGaps(classification);

  function updateDimension(key, options, value) {
    const option = options.find((item) => item.value === value);
    if (!option) return;
    onChange(record.id, {
      ...classification,
      [key]: { value: option.value, label: option.label, confidence: 1 },
    });
  }

  function applySuggestion(key, options, suggestion) {
    updateDimension(key, options, suggestion.value);
  }

  return (
    <Paper component="article" className="rounded-lg border border-ink-200 bg-white p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs text-ink-600">
            <span className="font-semibold text-ink-700">{record.id}</span>
            <span aria-hidden="true">·</span>
            <span>{sourceLabel(record.source)}</span>
            <span aria-hidden="true">·</span>
            <time dateTime={record.submittedAt}>{formatDate(record.submittedAt)}</time>
          </div>
          <p className="mt-3 max-w-4xl whitespace-pre-wrap text-sm leading-6 text-ink-900 sm:text-base">{record.message}</p>
          {record.email ? <p className="mt-2 text-xs text-ink-600">Submitted by {record.email}</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {classification.needsReview ? (
            <Badge color="yellow" variant="light" radius="xl" leftSection={<AlertTriangle className="h-3 w-3" aria-hidden="true" />}>
              Needs review
            </Badge>
          ) : (
            <Badge color="green" variant="light" radius="xl" leftSection={<CheckCircle2 className="h-3 w-3" aria-hidden="true" />}>
              {record.reviewedAt ? "Reviewed" : "Confident"}
            </Badge>
          )}
          <button
            type="button"
            onClick={onToggle}
            className="grid h-9 w-9 place-items-center rounded-[6px] border border-ink-200 text-ink-700 transition hover:border-slate-500 hover:text-ink-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500"
            aria-label={expanded ? "Collapse feedback classification" : "Review feedback classification"}
            aria-expanded={expanded}
          >
            {expanded ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-4 border-t border-ink-200 pt-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <ClassificationBadge label="Persona" value={classification.persona} />
        <ClassificationBadge label="Theme" value={classification.theme} />
        <ClassificationBadge label="Journey stage" value={classification.journeyStage} />
        <ClassificationBadge label="Sentiment" value={classification.sentiment} type="sentiment" />
        <ClassificationBadge label="Severity" value={classification.severity} type="severity" />
      </div>

      {classification.needsReview ? (
        <div className="mt-4 rounded-md border border-amber-400/30 bg-amber-500/10 p-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-sm font-semibold text-amber-700">Confidence {Math.round(classification.confidence * 100)}%</div>
              <p className="mt-1 text-xs leading-5 text-amber-700/75">{classification.reason}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {reviewGaps.includes("persona") ? (
                classification.suggestions.persona.length ? classification.suggestions.persona.slice(0, 2).map((suggestion) => (
                  <Button
                    key={`persona-${suggestion.value}`}
                    size="compact-xs"
                    variant="outline"
                    color="yellow"
                    onClick={() => applySuggestion("persona", PERSONAS, suggestion)}
                  >
                    Set persona: {suggestion.label}
                  </Button>
                )) : (
                  <Button size="compact-xs" variant="outline" color="yellow" onClick={onToggle}>
                    Choose persona
                  </Button>
                )
              ) : null}
              {reviewGaps.includes("theme") ? classification.suggestions.theme.slice(0, 1).map((suggestion) => (
                <Button
                  key={`theme-${suggestion.value}`}
                  size="compact-xs"
                  variant="outline"
                  color="yellow"
                  onClick={() => applySuggestion("theme", FEEDBACK_THEMES, suggestion)}
                >
                  Set theme: {suggestion.label}
                </Button>
              )) : null}
              {reviewGaps.includes("journey stage") ? (
                <Button size="compact-xs" variant="outline" color="yellow" onClick={onToggle}>
                  Choose journey stage
                </Button>
              ) : null}
              {!reviewGaps.length ? (
                <Button size="compact-xs" variant="outline" color="yellow" onClick={onToggle}>
                  Review suggestions
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {expanded ? (
        <div className="mt-5 border-t border-ink-200 pt-5">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-ink-900">Review classification</h3>
            <p className="mt-1 text-xs leading-5 text-ink-600">Correct any field, then mark the item reviewed. Your correction stays in this browser.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Select label="Persona" data={PERSONAS} value={classification.persona.value} onChange={(value) => updateDimension("persona", PERSONAS, value)} />
            <Select label="Theme" data={FEEDBACK_THEMES} value={classification.theme.value} onChange={(value) => updateDimension("theme", FEEDBACK_THEMES, value)} />
            <Select label="Journey stage" data={JOURNEY_STAGES} value={classification.journeyStage.value} onChange={(value) => updateDimension("journeyStage", JOURNEY_STAGES, value)} />
            <Select label="Sentiment" data={SENTIMENTS} value={classification.sentiment.value} onChange={(value) => updateDimension("sentiment", SENTIMENTS, value)} />
            <Select label="Severity" data={SEVERITIES} value={classification.severity.value} onChange={(value) => updateDimension("severity", SEVERITIES, value)} />
          </div>
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Button variant="subtle" color="red" leftSection={<Trash2 className="h-4 w-4" aria-hidden="true" />} onClick={() => onRemove(record.id)}>
              Remove feedback
            </Button>
            <Button color="emerald" leftSection={<CheckCircle2 className="h-4 w-4" aria-hidden="true" />} onClick={() => onMarkReviewed(record.id)}>
              Mark reviewed
            </Button>
          </div>
        </div>
      ) : null}
    </Paper>
  );
}

export default function FeedbackWorkspace() {
  const [records, setRecords] = useState([]);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState("all");
  const [persona, setPersona] = useState("all");
  const [theme, setTheme] = useState("all");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [showManualForm, setShowManualForm] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [notice, setNotice] = useState("");
  const [importErrors, setImportErrors] = useState([]);

  useEffect(() => {
    trackEvent("feedback_workspace_opened", { source: "direct" });
    const frame = window.requestAnimationFrame(() => {
      setRecords(loadFeedbackRecords());
      setReady(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  function commit(next) {
    const persisted = persistFeedbackRecords(typeof next === "function" ? next(records) : next);
    setRecords(persisted);
    return persisted;
  }

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    return records.filter((record) => {
      const classification = record.classification;
      if (view === "review" && !classification.needsReview) return false;
      if (view === "reviewed" && !record.reviewedAt) return false;
      if (persona !== "all" && classification.persona.value !== persona) return false;
      if (theme !== "all" && classification.theme.value !== theme) return false;
      if (query && !`${record.message} ${record.email} ${record.source}`.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [records, view, persona, theme, search]);

  const stats = useMemo(() => ({
    total: records.length,
    review: records.filter((item) => item.classification.needsReview).length,
    negative: records.filter((item) => item.classification.sentiment.value === "negative").length,
    reviewed: records.filter((item) => item.reviewedAt).length,
  }), [records]);

  function addManualFeedback(event) {
    event.preventDefault();
    if (!form.message.trim()) return;
    const record = buildFeedbackRecord({ ...form, source: form.source.trim() || "Manual entry" });
    commit((current) => mergeFeedbackRecords(current, [record]));
    setForm(DEFAULT_FORM);
    setShowManualForm(false);
    setNotice("Feedback added and classified.");
    setExpandedId(record.id);
    trackEvent("feedback_manual_added", { needs_review: record.classification.needsReview });
  }

  async function importCsv(file) {
    if (!file) return;
    const parsed = parseFeedbackCsv(await file.text());
    const imported = parsed.items.map((item) => buildFeedbackRecord(item));
    commit((current) => mergeFeedbackRecords(current, imported));
    setImportErrors(parsed.errors);
    setNotice(imported.length ? `${imported.length} feedback ${imported.length === 1 ? "item" : "items"} imported and classified.` : "No feedback was imported.");
    trackEvent("feedback_csv_imported", { count: imported.length, errors: parsed.errors.length });
  }

  function changeClassification(id, classification) {
    commit((current) => current.map((record) => record.id === id ? {
      ...record,
      reviewedAt: undefined,
      classificationEditedAt: new Date().toISOString(),
      classification: { ...classification, needsReview: true },
    } : record));
  }

  function markReviewed(id) {
    const record = records.find((item) => item.id === id);
    const gaps = feedbackReviewGaps(record?.classification);
    if (gaps.length) {
      setExpandedId(id);
      setNotice(`Complete ${gaps.join(", ")} before marking this feedback reviewed.`);
      return;
    }
    commit((current) => current.map((record) => record.id === id ? {
      ...record,
      reviewedAt: new Date().toISOString(),
      classification: { ...record.classification, confidence: 1, needsReview: false },
    } : record));
    setExpandedId(null);
    setNotice("Classification saved as reviewed.");
    trackEvent("feedback_classification_reviewed", {});
  }

  function removeRecord(id) {
    commit((current) => current.filter((record) => record.id !== id));
    setExpandedId(null);
    setNotice("Feedback removed from this browser.");
  }

  function requestPersona() {
    window.dispatchEvent(new CustomEvent(FEEDBACK_OPEN_EVENT, {
      detail: {
        category: "feature",
        message: "Persona request: Please add a persona for ",
        context: { mode: "feedback-intelligence" },
      },
    }));
  }

  return (
    <main>
      <PageHeading title="Make sense of what people say." description="Bring feedback together, find recurring needs, and review the signals before deciding what to change." />
      <div className="grid min-w-0 gap-5">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="default" leftSection={<Users className="h-4 w-4" aria-hidden="true" />} onClick={requestPersona}>
                Request a persona
              </Button>
              <FileButton onChange={importCsv} accept="text/csv,.csv">
                {(props) => <Button {...props} variant="outline" leftSection={<FileUp className="h-4 w-4" aria-hidden="true" />}>Import CSV</Button>}
              </FileButton>
              <Button color="emerald" leftSection={<MessageSquarePlus className="h-4 w-4" aria-hidden="true" />} onClick={() => setShowManualForm((current) => !current)}>
                Add feedback
              </Button>
            </div>
        <Paper className="rounded-md border border-sky-400/25 bg-sky-500/10 px-4 py-3 text-sm leading-6 text-sky-700">
          This MVP stores feedback only in this browser. It is suitable for testing the classification workflow, but it is not yet a shared team inbox.
        </Paper>

        <Paper component="details" className="group rounded-lg border border-ink-200 bg-white">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500 sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-white text-sky-700">
                <Users className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-ink-900">Example persona library</div>
                <p className="mt-0.5 text-xs leading-5 text-ink-600">Three behavior-led profiles based on buying experience, confidence, budget, guidance, and control.</p>
              </div>
            </div>
            <ChevronDown className="h-4 w-4 shrink-0 text-ink-600 transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="border-t border-ink-200 px-4 py-2 sm:px-5">
            {PERSONAS.filter((item) => item.value !== "unknown").map((item) => (
              <div key={item.value} className="flex flex-col gap-2 border-b border-ink-200 py-4 last:border-b-0 sm:flex-row sm:items-start sm:justify-between sm:gap-5">
                <div className="flex min-w-0 items-start gap-3">
                  {item.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.image} alt={item.imageAlt} width={48} height={48} className="h-12 w-12 shrink-0 rounded-full border border-ink-200 object-cover" />
                  ) : null}
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-ink-900">{item.label}</div>
                    <p className="mt-1 max-w-4xl text-xs leading-5 text-ink-600">{item.description}</p>
                  </div>
                </div>
                <Badge color="gray" variant="light" radius="xl" className="shrink-0 self-start">
                  Fictional example
                </Badge>
              </div>
            ))}
            <p className="pb-4 pt-2 text-xs leading-5 text-ink-600">
              Names are shorthand for behavior, not demographic assumptions. When the feedback lacks enough evidence, PageSignal leaves the persona in Needs review.
            </p>
          </div>
        </Paper>

        {showManualForm ? (
          <Paper component="form" onSubmit={addManualFeedback} className="rounded-lg border border-ink-200 bg-white p-5">
            <div>
              <h2 className="text-lg font-semibold text-ink-900">Add feedback</h2>
              <p className="mt-1 text-sm text-ink-600">Paste one feedback item. Classification happens when you add it.</p>
            </div>
            <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(14rem,.5fr)]">
              <Textarea
                label="Feedback"
                required
                minRows={4}
                placeholder="What did the user say?"
                value={form.message}
                onChange={(event) => {
                  const message = event.currentTarget.value;
                  setForm((current) => ({ ...current, message }));
                }}
              />
              <div className="grid content-start gap-4">
                <TextInput
                  label="Email (optional)"
                  type="email"
                  placeholder="person@example.com"
                  value={form.email}
                  onChange={(event) => {
                    const email = event.currentTarget.value;
                    setForm((current) => ({ ...current, email }));
                  }}
                />
                <TextInput
                  label="Source"
                  placeholder="Interview, survey, support..."
                  value={form.source}
                  onChange={(event) => {
                    const source = event.currentTarget.value;
                    setForm((current) => ({ ...current, source }));
                  }}
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="default" onClick={() => setShowManualForm(false)}>Cancel</Button>
              <Button type="submit" color="emerald">Add and classify</Button>
            </div>
          </Paper>
        ) : null}

        {notice ? <Paper className="rounded-md border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-700">{notice}</Paper> : null}
        {importErrors.length ? (
          <Paper className="rounded-md border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700">
            <div className="font-semibold">Some CSV rows need attention</div>
            <ul className="mt-2 grid gap-1 text-xs leading-5">{importErrors.slice(0, 5).map((error) => <li key={error}>{error}</li>)}</ul>
          </Paper>
        ) : null}

        <section aria-label="Feedback summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["All feedback", stats.total, Inbox, "border-ink-200"],
            ["Needs review", stats.review, AlertTriangle, "border-amber-400/40"],
            ["Negative signal", stats.negative, Filter, "border-rose-400/40"],
            ["Reviewed", stats.reviewed, CheckCircle2, "border-green-500/40"],
          ].map(([label, value, Icon, border]) => (
            <Paper key={label} className={`rounded-md border ${border} bg-white p-4`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-ink-600">{label}</div>
                  <div className="mt-2 text-2xl font-semibold text-ink-900">{value}</div>
                </div>
                <Icon className="h-5 w-5 text-ink-600" aria-hidden="true" />
              </div>
            </Paper>
          ))}
        </section>

        <Paper className="rounded-lg border border-ink-200 bg-white p-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_13rem_13rem_12rem]">
            <TextInput leftSection={<Search className="h-4 w-4" aria-hidden="true" />} aria-label="Search feedback" placeholder="Search feedback" value={search} onChange={(event) => setSearch(event.currentTarget.value)} />
            <Select aria-label="Filter by persona" data={[ALL_OPTION, ...PERSONAS.filter((item) => item.value !== "unknown")]} value={persona} onChange={(value) => setPersona(value || "all")} />
            <Select aria-label="Filter by theme" data={[ALL_OPTION, ...FEEDBACK_THEMES]} value={theme} onChange={(value) => setTheme(value || "all")} />
            <Select aria-label="Filter by review status" data={[{ value: "all", label: "All statuses" }, { value: "review", label: "Needs review" }, { value: "reviewed", label: "Reviewed" }]} value={view} onChange={(value) => setView(value || "all")} />
          </div>
        </Paper>

        <section aria-label="Feedback items" className="grid gap-4">
          {!ready ? <Paper className="rounded-lg border border-ink-200 bg-white p-8 text-center text-sm text-ink-600">Loading feedback…</Paper> : null}
          {ready && !filteredRecords.length ? (
            <Paper className="rounded-lg border border-dashed border-ink-200 bg-white p-8 text-center sm:p-12">
              <Inbox className="mx-auto h-8 w-8 text-ink-600" aria-hidden="true" />
              <h2 className="mt-4 text-lg font-semibold text-ink-900">{records.length ? "No feedback matches these filters" : "Your feedback library is empty"}</h2>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-ink-600">
                {records.length ? "Clear or change the filters to see more items." : "Add feedback manually, import a CSV, or submit feedback through PageSignal to start reviewing classifications."}
              </p>
            </Paper>
          ) : null}
          {filteredRecords.map((record) => (
            <FeedbackCard
              key={record.id}
              record={record}
              expanded={expandedId === record.id}
              onToggle={() => setExpandedId((current) => current === record.id ? null : record.id)}
              onChange={changeClassification}
              onMarkReviewed={markReviewed}
              onRemove={removeRecord}
            />
          ))}
        </section>
      </div>
    </main>
  );
}
