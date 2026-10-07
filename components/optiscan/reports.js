"use client";

import { Tabs, Tab } from "../design/primitives";

import { useEffect, useState } from "react";
import { WarningAmberOutlined as AlertTriangle } from "../design/icons";
import { ArrowForwardOutlined as ArrowRight } from "../design/icons";
import { BarChartOutlined as BarChart3 } from "../design/icons";
import { AutoAwesomeOutlined as Bot } from "../design/icons";
import { CheckCircleOutlineOutlined as CheckCircle2 } from "../design/icons";
import { AssignmentTurnedInOutlined as ClipboardCheck } from "../design/icons";
import { ScheduleOutlined as Clock3 } from "../design/icons";
import { OpenInNewOutlined as ExternalLink } from "../design/icons";
import { FindInPageOutlined as FileSearch } from "../design/icons";
import { SpeedOutlined as Gauge } from "../design/icons";
import { LinkOutlined as Link2 } from "../design/icons";
import { LayersOutlined as Layers3 } from "../design/icons";
import { ShowChartOutlined as LineChart } from "../design/icons";
import { MoreHorizOutlined as MoreHorizontal } from "../design/icons";
import { RefreshOutlined as RotateCcw } from "../design/icons";
import { ManageSearchOutlined as SearchCheck } from "../design/icons";
import { GppGoodOutlined as ShieldCheck } from "../design/icons";
import { AutoAwesomeOutlined as Sparkles } from "../design/icons";
import { ShareOutlined as Share2 } from "../design/icons";
import { AdjustOutlined as Target } from "../design/icons";
import { BuildOutlined as Wrench } from "../design/icons";
import { HighlightOffOutlined as XCircle } from "../design/icons";
import { BoltOutlined as Zap } from "../design/icons";
import { buildSeoCategories, categoryEvidenceStatus, categoryStatusClasses } from "./categories";
import { MODE_LABELS, REPORT_TABS } from "./constants";
import { CoreWebVitalsCompare, CoreWebVitalsReport } from "./coreWebVitals";
import { buildPdfBlob } from "./pdfExport";
import ExportMenu from "./ExportMenu";
import { reportBaseName, reportTabRows } from "./reportRows";
import { SecurityPostureReport } from "./security";
import { buildTickets, siteCrawlSummary, TicketsReport } from "./tickets";
import UxAuditReport from "./UxAuditReport";
import { asArray, copyToClipboard, downloadBlob, rowsToCsv, rowsToTable, slugify, textValue, toneForScore } from "./utils";
import { AccessBanner, BulletList, Card, ExportButton, ScoreGauge, StatTile, TechnicalRows } from "./ui";
import { analyticsDomain, trackEvent } from "../../lib/analytics";

function categoryIcon(categoryId) {
  if (categoryId === "technical") return Wrench;
  if (categoryId === "off_page") return Link2;
  if (categoryId === "performance") return Zap;
  if (categoryId === "social") return Share2;
  return SearchCheck;
}

function categoryStatusIcon(status) {
  if (status === "ok") return CheckCircle2;
  if (status === "critical" || status === "missing") return XCircle;
  if (status === "not_measured") return Gauge;
  return AlertTriangle;
}

function SeoCategoryGrid({ categories }) {
  const list = asArray(categories);

  if (!list.length) {
    return null;
  }

  return (
    <div className="grid gap-3">
      <div className="grid gap-3">
        {list.map((category) => {
          const Icon = categoryIcon(category.id);
          const StatusIcon = categoryStatusIcon(category.status);
          const tone = categoryStatusClasses(category.status);
          return (
            <article key={category.id} className={`rounded-md border ${tone.border} bg-white p-4 ${tone.rail}`}>
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-ink-200 bg-white">
                    <Icon className="h-4 w-4 text-ink-700" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-semibold leading-5 text-ink-900">{category.label}</h4>
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-bold ${tone.border} ${tone.bg} ${tone.text}`}>
                        <StatusIcon className={`h-3.5 w-3.5 ${tone.icon}`} aria-hidden="true" />
                        {category.statusText}
                      </span>
                    </div>
                    <p className="mt-2 max-w-4xl text-xs leading-5 text-ink-600">{category.description}</p>
                  </div>
                </div>

                <dl className="grid grid-cols-3 gap-2 text-center sm:w-72">
                  <div className="rounded-md bg-white px-2 py-2">
                    <dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-600">OK</dt>
                    <dd className="text-sm font-semibold text-green-700">{category.ok}</dd>
                  </div>
                  <div className="rounded-md bg-white px-2 py-2">
                    <dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-600">Issues</dt>
                    <dd className="text-sm font-semibold text-amber-700">{category.issues}</dd>
                  </div>
                  <div className="rounded-md bg-white px-2 py-2">
                    <dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-600">Tickets</dt>
                    <dd className="text-sm font-semibold text-ink-800">{category.tickets}</dd>
                  </div>
                </dl>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,24rem)]">
                {category.evidence.length ? (
                  <ul className="grid gap-2">
                    {category.evidence.slice(0, 3).map((item, index) => {
                      const evidenceStatus = categoryEvidenceStatus(item, category.status);
                      const EvidenceStatusIcon = categoryStatusIcon(evidenceStatus);
                      const evidenceTone = categoryStatusClasses(evidenceStatus);
                      const evidenceText = typeof item === "object" && item !== null ? textValue(item.text) : textValue(item);

                      return (
                        <li key={`${category.id}-evidence-${index}`} className="flex gap-2 text-xs leading-5 text-ink-600">
                          <EvidenceStatusIcon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${evidenceTone.icon}`} aria-hidden="true" />
                          <span>{evidenceText}</span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-xs leading-5 text-ink-600">No category-specific evidence returned for this run.</p>
                )}
                {category.recommendation ? (
                  <p className="rounded-md border border-ink-200 bg-white p-3 text-xs leading-5 text-ink-700">{category.recommendation}</p>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function KeywordAnalysisReport({ analysis }) {
  const targetKeywords = asArray(analysis?.targetKeywords);
  const detectedTerms = asArray(analysis?.detectedTerms);
  const pages = asArray(analysis?.pages);
  const gaps = asArray(analysis?.gaps);
  const cannibalization = asArray(analysis?.cannibalization);

  if (!targetKeywords.length && !detectedTerms.length && !pages.length && !gaps.length) {
    return (
      <div className="rounded-md border border-ink-200 bg-white p-4 text-sm leading-6 text-ink-600">
        No keyword evidence was extracted for this run.
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="rounded-md border border-sky-400/20 bg-sky-400/5 p-4">
        <div className="text-xs font-bold uppercase tracking-[0.14em] text-sky-700">Keyword evidence</div>
        <p className="mt-2 text-sm leading-6 text-ink-700">
          On-page keyword and intent analysis from SEO-relevant page areas: title, meta description, headings, visible copy, internal anchors, image alt text,
          URL slug, and structured data. It does not include search volume, ranking, or keyword difficulty.
        </p>
      </div>

      {targetKeywords.length ? (
        <section className="rounded-md border border-ink-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-ink-900">Entered keyword coverage</h3>
          <div className="mt-3 grid gap-3">
            {targetKeywords.map((item) => (
              <article key={item.keyword} className="rounded-md border border-ink-200 bg-white p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-ink-900">{item.keyword}</div>
                  <span
                    className={`rounded-full border px-2.5 py-1 text-xs font-bold ${
                      item.status === "Strong"
                        ? "border-green-400/30 bg-green-500/10 text-green-700"
                        : item.status === "Partial"
                          ? "border-amber-400/30 bg-amber-500/10 text-amber-700"
                          : "border-rose-400/30 bg-rose-500/10 text-rose-700"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-ink-600">{item.evidence}</p>
                <p className="mt-2 text-xs leading-5 text-ink-700">{item.recommendation}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]">
        <section className="rounded-md border border-ink-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-ink-900">Prominent terms</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {detectedTerms.length ? (
              detectedTerms.map((item) => (
                <span key={item.term} className="rounded-full border border-ink-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink-800">
                  {item.term}
                  <span className="ml-1 text-ink-600">×{item.count}</span>
                </span>
              ))
            ) : (
              <p className="text-sm leading-6 text-ink-600">No prominent terms were detected.</p>
            )}
          </div>
        </section>

        <section className="rounded-md border border-ink-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-ink-900">Topic gaps</h3>
          {gaps.length ? (
            <ul className="mt-3 grid gap-2">
              {gaps.slice(0, 6).map((item, index) => (
                <li key={`${item.topic}-${index}`} className="text-xs leading-5 text-ink-700">
                  <span className="font-semibold text-amber-700">{item.topic}</span>
                  <span className="text-ink-600"> · {item.reason}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm leading-6 text-ink-600">No obvious topic gaps were extracted from the tracked SEO keyword areas.</p>
          )}
        </section>
      </div>

      <section className="rounded-md border border-ink-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-ink-900">Page topic map</h3>
          <span className="rounded-full border border-ink-200 bg-white px-2.5 py-1 text-xs font-bold text-ink-700">{pages.length} pages</span>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-[11px] uppercase tracking-[0.12em] text-ink-600">
              <tr>
                <th className="px-3 py-2">Topic</th>
                <th className="px-3 py-2">URL</th>
                <th className="px-3 py-2">Words</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-200">
              {pages.slice(0, 20).map((page) => (
                <tr key={page.url || page.topic}>
                  <td className="px-3 py-3 font-semibold text-ink-900">{page.topic}</td>
                  <td className="max-w-md truncate px-3 py-3 text-ink-600">{page.url}</td>
                  <td className="px-3 py-3 text-ink-700">{page.words}</td>
                  <td className="px-3 py-3 text-ink-700">{page.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {cannibalization.length ? (
        <section className="rounded-md border border-amber-400/25 bg-amber-400/5 p-4">
          <h3 className="text-sm font-semibold text-amber-700">Cannibalization clues</h3>
          <div className="mt-3 grid gap-3">
            {cannibalization.map((item) => (
              <article key={item.topic} className="rounded-md border border-amber-400/20 bg-white p-3">
                <div className="text-sm font-semibold text-ink-900">{item.topic}</div>
                <p className="mt-2 text-xs leading-5 text-ink-600">{item.urls.join(", ")}</p>
                <p className="mt-2 text-xs leading-5 text-amber-700">{item.recommendation}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function RichResultsPanel({ richResults }) {
  const findings = asArray(richResults?.findings);

  return (
    <div>
      <h3 className="mb-1 text-sm font-semibold text-ink-900">Rich result eligibility</h3>
      <p className="mb-3 text-xs leading-5 text-ink-600">
        Predicted Google rich-result eligibility from the page&apos;s structured data. Validate fixes with Google&apos;s Rich Results Test.
      </p>
      {findings.length ? (
        <ul className="grid gap-2">
          {findings.map((f, index) => {
            const tone = f.status === "eligible" ? "border-green-500/30 bg-green-500/10 text-green-700" : f.status === "incomplete" ? "border-amber-300/30 bg-amber-400/10 text-amber-700" : "border-rose-400/30 bg-rose-500/10 text-rose-700";
            const label = f.status === "eligible" ? "Eligible" : f.status === "incomplete" ? "Missing recommended" : "Not eligible";
            const missing = f.status === "invalid" ? f.missingRequired : f.missingRecommended;
            return (
              <li key={`${f.type}-${index}`} className="rounded-lg border border-ink-200 bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-sm font-semibold text-ink-900">
                    {f.type} <span className="font-normal text-ink-600">→ {f.richResult}</span>
                  </div>
                  <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-bold ${tone}`}>{label}</span>
                </div>
                {asArray(missing).length ? (
                  <p className="mt-1 text-xs leading-5 text-ink-600">
                    {f.status === "invalid" ? "Missing required: " : "Missing recommended: "}
                    {asArray(missing).join(", ")}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm leading-6 text-ink-600">No rich-result structured-data types were detected on this page.</p>
      )}
    </div>
  );
}

function PageReport({ audit, activeTab, coreWebVitals, keywordAnalysis, tickets, categories, richResults, onFetchDesktopVitals, desktopVitalsState }) {
  const infoGain = Math.max(0, Math.min(100, Math.round((audit.score || 0) * 0.72 + asArray(audit.content?.suggested_topics).length * 4)));

  if (activeTab === "vitals") {
    return <CoreWebVitalsReport coreWebVitals={coreWebVitals} onFetchDesktopVitals={onFetchDesktopVitals} desktopVitalsState={desktopVitalsState} />;
  }

  if (activeTab === "categories") {
    return <SeoCategoryGrid categories={categories} />;
  }

  if (activeTab === "keywords") {
    return <KeywordAnalysisReport analysis={keywordAnalysis} />;
  }

  if (activeTab === "technical") {
    return (
      <div className="grid gap-5">
        <TechnicalRows audit={audit} />
        <div>
          <h3 className="mb-3 text-sm font-semibold text-ink-900">Issues</h3>
          <BulletList items={audit.technical?.issues} icon={AlertTriangle} empty="No technical issues returned." />
        </div>
        <RichResultsPanel richResults={richResults} />
      </div>
    );
  }

  if (activeTab === "content") {
    return (
      <div className="grid gap-5 lg:grid-cols-[13rem_1fr]">
        <ScoreGauge score={infoGain} label="Information Gain" compact />
        <div className="grid gap-4">
          <div className="rounded-lg border border-ink-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-ink-900">Gap Analysis</h3>
            <p className="mt-2 text-sm leading-6 text-ink-700">{audit.content?.gap_analysis}</p>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold text-ink-900">Missing Topics</h3>
            <BulletList items={audit.content?.suggested_topics} icon={Target} />
          </div>
          <div className="rounded-lg border border-ink-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-ink-900">AI Readiness</h3>
            <p className="mt-2 text-sm leading-6 text-ink-700">{audit.content?.ai_readiness}</p>
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === "actions") {
    return <BulletList items={audit.checklist} icon={ClipboardCheck} />;
  }

  if (activeTab === "tickets") {
    return <TicketsReport tickets={tickets} />;
  }

  if (activeTab === "tracking") {
    return <BulletList items={[audit.tracking]} icon={LineChart} />;
  }

  return (
    <OverviewLayout
      score={audit.score}
      takeaway={audit.content?.gap_analysis}
      priorities={asArray(audit.checklist).length ? audit.checklist : audit.technical?.issues}
      ok={asArray(audit.technical?.issues).length ? 2 : 3}
      notOk={asArray(audit.technical?.issues).length + asArray(audit.content?.suggested_topics).length}
      rootCauses={asArray(audit.technical?.issues).length}
      pages={1}
      tickets={asArray(tickets).length}
    />
  );
}

function crawledPageStatus(page = {}) {
  const status = Number(page.status || 0);
  if (page.ok === false || status >= 400) {
    return {
      label: status ? `Blocked · ${status}` : "Blocked",
      className: "border-rose-400/30 bg-rose-400/10 text-rose-700",
    };
  }

  if (status >= 300) {
    return {
      label: `Redirect · ${status}`,
      className: "border-amber-400/30 bg-amber-400/10 text-amber-700",
    };
  }

  const counts = crawledPageCounts(page);
  if (counts.words > 0 && counts.words < 500) {
    return {
      label: `Thin · ${status || 200}`,
      className: "border-amber-400/30 bg-amber-400/10 text-amber-700",
    };
  }

  return {
    label: `OK · ${status || 200}`,
    className: "border-green-500/30 bg-green-500/10 text-green-700",
  };
}

function crawledPageSchemaTypes(page = {}) {
  const snakeCaseTypes = asArray(page.schema_types);
  return snakeCaseTypes.length ? snakeCaseTypes : asArray(page.schemaTypes);
}

function crawledPageCounts(page = {}) {
  return {
    words: page.word_count ?? page.wordCount ?? page.words ?? 0,
    h1: page.h1_count ?? page.h1Count ?? 0,
    h2: page.h2_count ?? page.h2Count ?? 0,
  };
}

function crawledPageScore(page = {}) {
  const status = Number(page.status || 0);
  const schemaTypes = crawledPageSchemaTypes(page);
  const counts = crawledPageCounts(page);
  let score = 86;

  if (page.ok === false || status >= 400) score -= 42;
  if (status >= 300 && status < 400) score -= 12;
  if (!schemaTypes.length) score -= 10;
  if (counts.words && counts.words < 500) score -= 12;
  if (counts.h1 !== 1) score -= 12;
  if (counts.h2 < 2) score -= 6;

  return Math.max(0, Math.min(100, score));
}

function crawledPageDetail(page = {}) {
  const status = Number(page.status || 0);
  const schemaTypes = crawledPageSchemaTypes(page);
  const counts = crawledPageCounts(page);

  if (page.ok === false || status >= 400) {
    return {
      issue: "Crawler access or server response blocks reliable page-level analysis.",
      clue: "Check the server response, CDN/WAF rule, robots.txt, and crawler user-agent handling for this URL.",
      ticket: "Create a page-level ticket if this URL should be crawlable and differs from the site-wide access pattern.",
    };
  }

  if (!schemaTypes.length) {
    return {
      issue: "No structured data was detected on this crawled page.",
      clue: "Inspect the page template metadata and JSON-LD builder for this route or CMS content type.",
      ticket: "Create one page-level ticket only when the missing schema is unique to this URL.",
    };
  }

  if (counts.words && counts.words < 500) {
    return {
      issue: "This page looks thin compared with the rest of the crawl sample.",
      clue: "Review the main content block, H2 sections, FAQ/definition blocks, and source links for this URL.",
      ticket: "Create a content ticket when this page needs a unique expansion rather than a template fix.",
    };
  }

  if (counts.h1 !== 1 || counts.h2 < 2) {
    return {
      issue: "Heading structure may make this page harder to scan and extract answers from.",
      clue: "Inspect main h1, section h2 components, and CMS block headings for this URL.",
      ticket: "Create a page-level ticket if this heading pattern is not shared by the template.",
    };
  }

  return {
    issue: "No unique page-level blocker stands out from the crawl sample.",
    clue: "Use the site-level tickets unless this URL has a business-critical page-specific requirement.",
    ticket: "Keep the page in monitoring; avoid creating duplicate work if the root cause is shared.",
  };
}

function CrawledPagesList({ pages, onAnalyzePage }) {
  const list = asArray(pages);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [openMenu, setOpenMenu] = useState(null);

  if (!list.length) {
    return null;
  }

  const selectedPage = list[Math.min(selectedIndex, list.length - 1)] || list[0];
  const selectedUrl = selectedPage?.url || `Page ${selectedIndex + 1}`;
  const selectedDetail = crawledPageDetail(selectedPage);

  function handleRowKeyDown(event, index) {
    if (event.target !== event.currentTarget) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setSelectedIndex(index);
    }
  }

  function openUrl(page) {
    if (!page?.url) return;
    const openedWindow = window.open(page.url, "_blank");
    if (openedWindow) {
      openedWindow.opener = null;
    }
  }

  async function copyPageUrl(page) {
    if (page?.url) {
      await copyToClipboard(page.url);
    }
    setOpenMenu(null);
  }

  function RowMenu({ page, index }) {
    const isOpen = openMenu === index;
    return (
      <div className="relative justify-self-end">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setOpenMenu(isOpen ? null : index);
          }}
          className="grid h-9 w-9 place-items-center rounded-md border border-ink-200 bg-white text-ink-700 transition hover:border-sky-300/60 hover:text-sky-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500"
          aria-label={`Open actions for ${page.url || `page ${index + 1}`}`}
          aria-expanded={isOpen}
        >
          <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
        </button>
        {isOpen ? (
          <div className="absolute right-0 top-10 z-10 w-52 overflow-hidden rounded-md border border-ink-200 bg-white">
            {[
              ["Open URL", () => openUrl(page)],
              ["Run focused page audit", () => onAnalyzePage?.(page)],
              ["Copy URL", () => copyPageUrl(page)],
            ].map(([label, action]) => (
              <button
                type="button"
                key={label}
                onClick={(event) => {
                  event.stopPropagation();
                  action();
                  setOpenMenu(null);
                }}
                className="block w-full px-3 py-2 text-left text-xs font-semibold text-ink-800 transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500"
              >
                {label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="rounded-md border border-ink-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-ink-900">Pages Crawled</h3>
          <p className="mt-1 text-xs text-ink-600">Select a row for page-specific clues, then run a focused Page Audit when the issue looks page-specific.</p>
        </div>
        <span className="rounded-full border border-ink-200 bg-white px-3 py-1 text-xs font-semibold text-ink-700">
          {list.length} {list.length === 1 ? "page" : "pages"}
        </span>
      </div>
      <div className="mt-4 hidden overflow-visible rounded-md border border-ink-200 md:block">
        <div className="grid min-h-9 grid-cols-[minmax(0,1.4fr)_8rem_5rem_4.5rem_6.5rem_3.5rem] items-center gap-3 bg-white px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-ink-600">
          <span>Page</span>
          <span>Status</span>
          <span>Words</span>
          <span>H1/H2</span>
          <span>Schema</span>
          <span className="text-right">Menu</span>
        </div>
        {list.map((page, index) => {
          const url = page.url || `Page ${index + 1}`;
          const status = crawledPageStatus(page);
          const schemaTypes = crawledPageSchemaTypes(page).filter(Boolean);
          const counts = crawledPageCounts(page);
          const selected = index === selectedIndex;

          return (
            <div
              role="button"
              tabIndex={0}
              key={`${url}-${index}`}
              onClick={() => setSelectedIndex(index)}
              onKeyDown={(event) => handleRowKeyDown(event, index)}
              className={`grid min-h-14 w-full grid-cols-[minmax(0,1.4fr)_8rem_5rem_4.5rem_6.5rem_3.5rem] items-center gap-3 border-t border-ink-200 px-3 text-left text-xs text-ink-700 transition hover:bg-white ${
                selected ? "bg-accent-500/10 shadow-[inset_3px_0_0_rgba(52,211,153,1)]" : "bg-white"
              }`}
            >
              <span className="flex min-w-0 items-center gap-2 font-semibold text-ink-900">
                <span className="truncate">{url}</span>
                {page.url ? (
                  <a
                    href={page.url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Open ${url} in a new window`}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      openUrl(page);
                    }}
                    className="inline-grid h-7 w-7 shrink-0 place-items-center rounded-md text-ink-600 transition hover:bg-ink-100 hover:text-sky-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500"
                  >
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  </a>
                ) : null}
              </span>
              <span className={`w-fit rounded-full border px-2 py-1 text-[11px] font-bold ${status.className}`}>{status.label}</span>
              <span>{counts.words || "-"}</span>
              <span>{counts.h1} / {counts.h2}</span>
              <span className="truncate">{schemaTypes.length ? schemaTypes.join(", ") : "None"}</span>
              <RowMenu page={page} index={index} />
            </div>
          );
        })}
      </div>
      <div className="mt-4 grid gap-3 md:hidden">
        {list.map((page, index) => {
          const url = page.url || `Page ${index + 1}`;
          const status = crawledPageStatus(page);
          const schemaTypes = crawledPageSchemaTypes(page).filter(Boolean);
          const counts = crawledPageCounts(page);
          const selected = index === selectedIndex;
          return (
            <article
              key={`${url}-mobile-${index}`}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedIndex(index)}
              onKeyDown={(event) => handleRowKeyDown(event, index)}
              className={`rounded-md border p-3 ${selected ? "border-accent-300/40 bg-accent-500/10" : "border-ink-200 bg-white"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="break-words text-sm font-semibold text-ink-900">{url}</h4>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-ink-600">
                    <span className={`rounded-full border px-2 py-1 font-bold ${status.className}`}>{status.label}</span>
                    <span>{counts.words || "-"} words</span>
                    <span>H1/H2 {counts.h1}/{counts.h2}</span>
                    <span>{schemaTypes.length ? schemaTypes.join(", ") : "No schema"}</span>
                  </div>
                </div>
                <RowMenu page={page} index={index} />
              </div>
            </article>
          );
        })}
      </div>
      <div className="mt-3 overflow-hidden rounded-md border border-accent-400/20 bg-white">
        <div className="grid gap-3 border-b border-ink-200 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div className="min-w-0">
            <h4 className="truncate text-sm font-semibold text-ink-900">Selected page detail: {selectedUrl.replace(/^https?:\/\/[^/]+/i, "") || "/"}</h4>
            <p className="mt-1 text-xs leading-5 text-ink-600">Page-specific clues stay here so the site overview stays compact.</p>
          </div>
          <button
            type="button"
            onClick={() => onAnalyzePage?.(selectedPage)}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-accent-500 px-4 text-sm font-bold text-white transition hover:bg-accent-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500"
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Run focused page audit
          </button>
        </div>
        <div className="grid gap-3 p-4 lg:grid-cols-3">
          {[
            ["Top Issue", selectedDetail.issue],
            ["Where to look", selectedDetail.clue],
            ["Next Ticket", selectedDetail.ticket],
          ].map(([label, body]) => (
            <div key={label} className="rounded-md border border-ink-200 bg-white p-3">
              <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-600">{label}</div>
              <p className="mt-2 text-xs leading-5 text-ink-700">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function reportItemTitle(item, fallback = "Recommended improvement") {
  if (typeof item === "string") return item;
  return item?.task || item?.area || item?.metric || item?.issue || item?.finding || item?.advantage || fallback;
}

function reportItemBody(item) {
  if (typeof item === "string") return item;
  return item?.impact || item?.method || item?.evidence || item?.based_on || item?.competitor_reference || "";
}

function takeawayParts(value, fallback) {
  const text = String(value || fallback || "")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) {
    return {
      headline: "Analysis complete.",
      details: ["Review the prioritized cards before drilling into the detailed tabs."],
    };
  }

  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  if (sentences.length <= 1) {
    const clauses = text
      .split(/\s+(?:and|but|while|then)\s+/i)
      .map((clause) => clause.trim())
      .filter(Boolean);

    return {
      headline: clauses[0] || text,
      details: clauses.slice(1, 4),
    };
  }

  return {
    headline: sentences[0],
    details: sentences.slice(1, 4),
  };
}

function KeyTakeawayCard({ takeaway, priorities }) {
  const fallback = "Analysis complete. Review the prioritized cards below before drilling into the detailed tabs.";
  const { headline, details } = takeawayParts(takeaway, fallback);
  const firstPriority = asArray(priorities)[0];
  const nextStep = firstPriority ? reportItemTitle(firstPriority, "") : "";

  return (
    <section className="overflow-hidden rounded-md border border-sky-400/20 bg-white">
      <div className="border-l-4 border-sky-400 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/25 bg-sky-400/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-sky-700">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Key takeaway
          </span>
          <span className="text-xs font-semibold text-ink-600">Executive summary</span>
        </div>

        <p className="mt-3 text-base font-semibold leading-7 text-ink-900">{headline}</p>

        {details.length || nextStep ? (
          <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(14rem,18rem)]">
            <div className="rounded-md border border-ink-200 bg-white p-3">
              <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-600">What this means</div>
              {details.length ? (
                <ul className="mt-2 grid gap-2">
                  {details.map((item, index) => (
                    <li key={`${item}-${index}`} className="flex gap-2 text-xs leading-5 text-ink-700">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-700" aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs leading-5 text-ink-700">Use the score and priority cards to decide what to tackle first.</p>
              )}
            </div>

            {nextStep ? (
              <div className="rounded-md border border-amber-400/20 bg-amber-400/5 p-3">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-700">
                  <Target className="h-3.5 w-3.5" aria-hidden="true" />
                  Start here
                </div>
                <p className="mt-2 text-xs font-semibold leading-5 text-ink-900">{nextStep}</p>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function PriorityCards({ items }) {
  const list = asArray(items).slice(0, 3);

  if (!list.length) {
    return null;
  }

  return (
    <div className="grid gap-3 md:grid-cols-3">
      {list.map((item, index) => {
        const priority = item?.priority || item?.severity || (index === 0 ? "High" : "Medium");
        return (
          <div key={`${reportItemTitle(item)}-${index}`} className="rounded-lg border border-ink-200 bg-white p-3">
            <span
              className={`inline-flex rounded-full px-2 py-1 text-[11px] font-bold ${
                priority === "High" || priority === "Critical"
                  ? "bg-rose-400/15 text-rose-700"
                  : "bg-amber-400/15 text-amber-700"
              }`}
            >
              {priority}
            </span>
            <p className="mt-3 text-sm leading-6 text-ink-800">{reportItemTitle(item)}</p>
            {reportItemBody(item) ? <p className="mt-2 text-xs leading-5 text-ink-600">{reportItemBody(item)}</p> : null}
          </div>
        );
      })}
    </div>
  );
}

function BenchmarkBar({ score = 0, average = 62 }) {
  const safeScore = Math.max(0, Math.min(100, Math.round(Number(score) || 0)));
  const avg = Math.max(0, Math.min(100, Math.round(Number(average) || 62)));
  return (
    <div className="mt-5 rounded-md border border-ink-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between gap-3 text-[11px] font-bold uppercase tracking-[0.12em]">
        <span className="inline-flex items-center gap-1.5 text-sky-700">
          <span className="h-2 w-2 rounded-full bg-sky-300" aria-hidden="true" />
          You
        </span>
        <span className="inline-flex items-center gap-1.5 text-ink-700">
          <span className="h-2 w-2 rounded-full bg-slate-400" aria-hidden="true" />
          Avg
        </span>
        <span className="inline-flex items-center gap-1.5 text-green-700">
          <span className="h-2 w-2 rounded-full bg-green-400" aria-hidden="true" />
          Good &gt;= 80
        </span>
      </div>
      <div className="relative h-2 rounded-full bg-ink-100">
        <span className="absolute top-1/2 h-4 w-1 -translate-y-1/2 rounded-full bg-sky-300" style={{ left: `${safeScore}%` }} title={`You: ${safeScore}`} />
        <span className="absolute top-1/2 h-4 w-1 -translate-y-1/2 rounded-full bg-slate-400" style={{ left: `${avg}%` }} title={`Average: ${avg}`} />
        <span className="absolute top-1/2 h-4 w-1 -translate-y-1/2 rounded-full bg-green-400" style={{ left: "80%" }} title="Good: 80+" />
      </div>
    </div>
  );
}

function StatStrip({ ok = 0, notOk = 0, rootCauses = 0, pages = 1, tickets = 0 }) {
  const stats = [
    {
      label: "Passed checks",
      value: ok,
      context: "Signals currently OK",
      className: "border-green-500/25 bg-green-500/5",
    },
    {
      label: "Issues found",
      value: notOk,
      context: "Findings needing review",
      className: "border-amber-500/25 bg-amber-500/5",
    },
    {
      label: "Repeated signals",
      value: rootCauses,
      context: "Patterns across crawled pages",
      className: "border-rose-500/25 bg-rose-500/5",
    },
    {
      label: "Pages scanned",
      value: pages,
      context: "Successful / attempted",
      className: "border-sky-500/25 bg-sky-500/5",
    },
    {
      label: "Work tickets",
      value: tickets,
      context: "Backlog items generated",
      className: "border-ink-200 bg-white",
    },
  ];

  return (
    <div className="grid gap-3 md:grid-cols-5">
      {stats.map(({ label, value, context, className }) => (
        <div key={label} className={`rounded-md border p-4 ${className}`}>
          <div className="mt-2 text-sm font-semibold text-ink-900">{label}</div>
          <div className="mt-1 text-2xl font-semibold text-ink-900">{value}</div>
          <div className="mt-1 text-xs leading-5 text-ink-600">{context}</div>
        </div>
      ))}
    </div>
  );
}

function OverviewLayout({ score, scoreLabel = "Health Score", takeaway, priorities, ok, notOk, rootCauses, pages, tickets }) {
  const tone = toneForScore(score);
  return (
    <div className="grid gap-5">
      <div className="grid gap-4 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <div className="rounded-md border border-ink-200 bg-white p-5">
          <ScoreGauge score={score} label={scoreLabel} />
          <div className={`mt-3 text-center text-sm font-bold ${tone.className}`}>{tone.text}</div>
          <BenchmarkBar score={score} />
        </div>
        <div className="grid gap-4">
          <KeyTakeawayCard takeaway={takeaway} priorities={priorities} />
          <PriorityCards items={priorities} />
        </div>
      </div>
      <StatStrip ok={ok} notOk={notOk} rootCauses={rootCauses} pages={pages} tickets={tickets} />
    </div>
  );
}

function SiteReport({ audit, activeTab, coreWebVitals, keywordAnalysis, tickets, meta, categories, onAnalyzePage, onFetchDesktopVitals, desktopVitalsState }) {
  const crawl = siteCrawlSummary(meta);

  if (activeTab === "vitals") {
    return <CoreWebVitalsReport coreWebVitals={coreWebVitals} onFetchDesktopVitals={onFetchDesktopVitals} desktopVitalsState={desktopVitalsState} />;
  }

  if (activeTab === "security") {
    return <SecurityPostureReport posture={meta?.security} />;
  }

  if (activeTab === "categories") {
    return <SeoCategoryGrid categories={categories} />;
  }

  if (activeTab === "keywords") {
    return <KeywordAnalysisReport analysis={keywordAnalysis} />;
  }

  if (activeTab === "crawled") {
    return <CrawledPagesList pages={crawl.pages} onAnalyzePage={onAnalyzePage} />;
  }

  if (activeTab === "ok") {
    return <BulletList items={audit.ok} icon={CheckCircle2} empty="No healthy signals returned." />;
  }

  if (activeTab === "not_ok") {
    return <BulletList items={audit.not_ok} icon={XCircle} empty="No issues returned." />;
  }

  if (activeTab === "next") {
    return <BulletList items={audit.do_next} icon={ArrowRight} />;
  }

  if (activeTab === "tickets") {
    return <TicketsReport tickets={tickets} />;
  }

  if (activeTab === "tracking") {
    return <BulletList items={audit.tracking} icon={LineChart} />;
  }

  return (
    <OverviewLayout
      score={audit.score}
      takeaway={audit.summary || "Website scan complete. Prioritize shared root causes first, then inspect page-specific clues."}
      priorities={asArray(audit.do_next).length ? audit.do_next : audit.not_ok}
      ok={asArray(audit.ok).length}
      notOk={asArray(audit.not_ok).length}
      rootCauses={crawl.repeatedIssues}
      pages={crawl.enabled ? `${crawl.pagesSuccessful}/${crawl.pagesFetched}` : "1"}
      tickets={asArray(tickets).length}
    />
  );
}

function Scoreboard({ scores }) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {asArray(scores).map((site) => (
        <div key={site.url || site.label} className="rounded-lg border border-ink-200 bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-ink-900">{site.label}</h3>
              <p className="mt-1 truncate text-xs text-ink-600">{site.url}</p>
            </div>
            <span className={`text-lg font-semibold ${toneForScore(site.score).className}`}>{site.score}</span>
          </div>
          <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-md bg-white p-2">
              <dt className="text-[10px] uppercase tracking-[0.12em] text-ink-600">OK</dt>
              <dd className="text-sm font-semibold text-accent-700">{site.ok}</dd>
            </div>
            <div className="rounded-md bg-white p-2">
              <dt className="text-[10px] uppercase tracking-[0.12em] text-ink-600">Not OK</dt>
              <dd className="text-sm font-semibold text-amber-700">{site.not_ok}</dd>
            </div>
            <div className="rounded-md bg-white p-2">
              <dt className="text-[10px] uppercase tracking-[0.12em] text-ink-600">Words</dt>
              <dd className="text-sm font-semibold text-ink-800">{site.words}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs leading-5 text-ink-600">
            Schema: {asArray(site.schema_types).length ? site.schema_types.join(", ") : "none detected"}
          </p>
        </div>
      ))}
    </div>
  );
}

function CompareReport({ audit, activeTab, coreWebVitals, tickets, categories }) {
  const userScore = audit.scores?.[0]?.score || 0;

  if (activeTab === "vitals") {
    return <CoreWebVitalsCompare items={coreWebVitals} />;
  }

  if (activeTab === "categories") {
    return <SeoCategoryGrid categories={categories} />;
  }

  if (activeTab === "wins") {
    return <BulletList items={audit.user_strengths} icon={CheckCircle2} empty="No user wins returned." />;
  }

  if (activeTab === "competitors") {
    return <BulletList items={audit.competitor_advantages} icon={BarChart3} empty="No competitor wins returned." />;
  }

  if (activeTab === "gaps") {
    return <BulletList items={audit.gaps} icon={AlertTriangle} empty="No gaps returned." />;
  }

  if (activeTab === "actions") {
    return <BulletList items={audit.action_plan} icon={ArrowRight} />;
  }

  if (activeTab === "tickets") {
    return <TicketsReport tickets={tickets} />;
  }

  if (activeTab === "tracking") {
    return <BulletList items={audit.tracking} icon={LineChart} />;
  }

  return (
    <div className="grid gap-5">
      <OverviewLayout
        score={userScore}
        scoreLabel="Your Score"
        takeaway={audit.summary}
        priorities={asArray(audit.action_plan).length ? audit.action_plan : audit.gaps}
        ok={asArray(audit.user_strengths).length}
        notOk={asArray(audit.gaps).length}
        rootCauses={asArray(audit.competitor_advantages).length}
        pages={asArray(audit.scores).length}
        tickets={asArray(tickets).length}
      />
      <Scoreboard scores={audit.scores} />
    </div>
  );
}

function railLabel(label) {
  if (label === "Core Web Vitals") return "Vitals";
  if (label === "What's Not OK") return "Issues";
  if (label === "Action Plan") return "Actions";
  if (label === "Content Strategy") return "Content";
  return label;
}

function railCount(mode, result, tabId, tickets) {
  if (tabId === "overview") return 5;
  if (tabId === "tickets") return asArray(tickets).length;
  return reportTabRows(mode, result, tabId).filter((row) => !row.Note).length || 0;
}

const TAB_DESCRIPTIONS = {
  page: {
    overview: "A quick read on page health, score drivers, and the highest-priority work.",
    keywords: "Keyword coverage, prominent terms, topic gaps, and intent alignment from SEO-relevant page areas.",
    categories: "SEO findings grouped by buyer-readable audit areas so patterns are easier to scan.",
    vitals: "Real-user and Lighthouse performance evidence with plain-language Core Web Vitals guidance.",
    technical: "Title, meta, H1, crawl, and markup signals that affect search visibility.",
    content: "Content gaps, missing topics, information gain, and AI answer-readiness clues.",
    actions: "Recommended page improvements ordered by priority and expected SEO impact.",
    tickets: "Developer-ready backlog items with user stories, where-to-look clues, and acceptance criteria.",
    tracking: "Metrics to monitor after fixes ship, including tools and measurement methods.",
  },
  site: {
    overview: "The site-level summary: score, key takeaway, root causes, pages scanned, and ticket count.",
    keywords: "Keyword and topic patterns from SEO-relevant page areas across crawled pages, including gaps and cannibalization clues.",
    categories: "Findings grouped into On-Page, Technical, Off-Page, Performance, and Social Media areas.",
    crawled: "Sampled URLs from the site crawl with status, word count, heading, and schema clues.",
    security: "Passive public security checks for HTTPS, headers, cookies, information exposure, third-party markup, CORS, and domain controls.",
    vitals: "Mobile and desktop Core Web Vitals plus Lighthouse diagnostics from Google APIs.",
    tickets: "Prioritized implementation work generated from repeated issues and next best actions.",
    tracking: "Follow-up metrics for validating whether fixes improved visibility and crawl health.",
  },
  compare: {
    overview: "A competitive summary showing your score, rival benchmarks, and the biggest gaps.",
    categories: "Comparison findings grouped by SEO area so strengths and weaknesses are easier to explain.",
    vitals: "Performance evidence across your site and competitors where Core Web Vitals data exists.",
    wins: "Areas where your site already beats or matches the competitor evidence.",
    competitors: "Competitor advantages that explain why rival pages may be stronger.",
    gaps: "The most important weaknesses to close against the compared sites.",
    actions: "Recommended work based on competitor evidence and expected impact.",
    tickets: "Developer-ready competitor-gap tickets with implementation detail and acceptance criteria.",
    tracking: "Metrics to monitor after closing competitive gaps.",
  },
  ux: {
    overview: "UX score, evidence quality, persona readiness, conflicts, and the highest-priority actions.",
    personas: "Persona needs, decision readiness, CTA suitability, content fit, and conflict resolution.",
    journey: "Evidence-backed hypotheses about what each persona needs before, on, and after this page.",
    experiments: "Testable changes with target personas, metrics, confidence, and priority.",
    evidence: "Consent-verified visual evidence plus accessibility, interaction, mobile, and performance diagnostics.",
    tickets: "Developer-ready UX fixes with persona-tagged acceptance criteria.",
  },
};

function tabDescription(mode, tabId, fallbackLabel) {
  return TAB_DESCRIPTIONS[mode]?.[tabId] || `Export and copy the structured rows for ${fallbackLabel}.`;
}

function ReportRail({ tabs, active, onChange, mode, result, tickets }) {
  return (
    <aside className="rounded-xl border border-ink-200 bg-white p-3 lg:sticky lg:top-5">
      <div className="px-2 pb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-600">Report Map</div>
      <div className="grid gap-1">
        {tabs.map(([id, label]) => {
          const count = railCount(mode, result, id, tickets);
          return (
            <button
              type="button"
              key={id}
              onClick={() => onChange(id)}
              className={`grid min-h-10 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-lg px-3 text-left text-sm font-semibold transition ${
                active === id
                  ? "bg-accent-500/10 text-accent-700 shadow-[inset_3px_0_0_rgba(52,211,153,1)]"
                  : "text-ink-600 hover:bg-white hover:text-ink-900"
              }`}
            >
              <span className="truncate">{railLabel(label)}</span>
              <span className="grid min-w-6 place-items-center rounded-full bg-white px-2 py-1 text-[11px] text-ink-700">
                {count}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-4 border-t border-ink-200 px-2 pt-4 text-xs leading-5 text-ink-600">
        Exports stay inside the active section. The full report export stays in the report header.
      </p>
    </aside>
  );
}

function resultUrl(mode, result = {}) {
  if (mode === "compare") return result.meta?.url || result.audit?.scores?.[0]?.url || "";
  return result.meta?.url || result.meta?.label || "";
}

function displayUrlPill(url) {
  const value = String(url || "");
  return value.replace(/^https?:\/\//i, "");
}

function timeAgo(iso) {
  const ms = Date.now() - Date.parse(iso || "");
  if (!Number.isFinite(ms)) return "Ran just now";
  const minutes = Math.max(0, Math.round(ms / 60000));
  if (minutes < 1) return "Ran just now";
  if (minutes === 1) return "Ran 1 min ago";
  return `Ran ${minutes} min ago`;
}

function formatDuration(ms) {
  const value = Number(ms || 0);
  if (!value) return "Duration unavailable";
  if (value < 1000) return `${value}ms`;
  return `${Math.round(value / 1000)}s`;
}

function ReportHeader({ mode, result, activeTabLabel, onRerun, onExportPdf, onExportCsv, onCopyTable, exportFeedback, isLoading }) {
  const [shareState, setShareState] = useState("");
  const meta = result?.meta || {};
  const url = resultUrl(mode, result);
  const crawl = siteCrawlSummary(meta);

  async function handleShare() {
    const runId = encodeURIComponent(meta.fetchedAt || "latest");
    const shareUrl = `${window.location.origin}${window.location.pathname}?run=${runId}`;
    await copyToClipboard(shareUrl);
    setShareState("Copied");
    window.setTimeout(() => setShareState(""), 1600);
    trackEvent("report_shared", {
      mode,
      domain: analyticsDomain(url),
    });
  }

  return (
    <Card className="p-4 sm:p-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="min-w-0">
          <div className="text-xs font-bold uppercase tracking-[0.14em] text-ink-600">
            {MODE_LABELS[mode]} / {activeTabLabel}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="max-w-full truncate rounded-full border border-ink-200 bg-white px-3 py-1.5 text-sm font-semibold text-ink-900">
              <span className="text-ink-600">https://</span>
              {displayUrlPill(url) || "report"}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-ink-200 bg-white px-2.5 py-1 text-xs font-semibold text-ink-700">
              <Clock3 className="h-3.5 w-3.5 text-sky-700" aria-hidden="true" />
              {timeAgo(meta.fetchedAt)}
            </span>
            <span className="rounded-full border border-ink-200 bg-white px-2.5 py-1 text-xs font-semibold text-ink-700">{formatDuration(meta.durationMs)}</span>
            {mode === "site" ? (
              <span className="rounded-full border border-ink-200 bg-white px-2.5 py-1 text-xs font-semibold text-ink-700">
                {crawl.pagesFetched || 1} pages crawled
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          <ExportButton
            icon={RotateCcw}
            onClick={() => {
              trackEvent("report_rerun_clicked", { mode, domain: analyticsDomain(url) });
              onRerun?.();
            }}
            variant="secondary"
            disabled={isLoading}
          >
            Re-run
          </ExportButton>
          <ExportButton icon={Share2} onClick={handleShare}>
            {shareState || "Share"}
          </ExportButton>
          <ExportMenu onExportPdf={onExportPdf} onExportCsv={onExportCsv} onCopy={onCopyTable} feedback={exportFeedback} />
        </div>
      </div>
    </Card>
  );
}

function tabCount(mode, result, tabId, tickets, categories) {
  if (tabId === "overview") return 1;
  if (tabId === "tickets") return asArray(tickets).length;
  if (mode === "ux") {
    const analysis = result?.audit?.persona_analysis || {};
    if (tabId === "personas") return asArray(analysis.needs_coverage).length || asArray(analysis.decision_readiness).length;
    if (tabId === "journey") return asArray(analysis.journey_implications).length;
    if (tabId === "experiments") return asArray(analysis.experiments).length;
    if (tabId === "evidence") {
      return [
        result?.meta?.screenshot?.usableForAnalysis,
        result?.meta?.coreWebVitals,
        result?.audit?.visual_hierarchy?.finding,
        result?.audit?.accessibility?.assessment,
      ].filter(Boolean).length;
    }
  }
  if (tabId === "categories") return asArray(categories).length;
  if (tabId === "crawled") return siteCrawlSummary(result?.meta).pages.length;
  if (tabId === "vitals") {
    const vitals = result?.meta?.coreWebVitals;
    if (Array.isArray(vitals)) return vitals.length;
    return vitals ? 1 : 0;
  }
  return reportTabRows(mode, result, tabId).filter((row) => !row.Note).length || 0;
}

function TabStrip({ tabs, active, onChange, mode, result, tickets, categories }) {
  return (
    <Tabs value={active} onChange={(_, id) => onChange(id)} aria-label="Report sections">
      {tabs.map(([id, label]) => <Tab key={id} value={id} label={<span className="inline-flex items-center gap-2">{railLabel(label)}<span className="rounded bg-ink-100 px-1.5 py-0.5 text-[11px] text-ink-700">{tabCount(mode, result, id, tickets, categories)}</span></span>} />)}
    </Tabs>
  );
}

export function Report({ mode, result, onAnalyzePage, onFetchDesktopVitals, desktopVitalsState, onRerun, isLoading = false }) {
  const tabs = REPORT_TABS[mode];
  const [activeTab, setActiveTab] = useState(tabs[0][0]);
  const [copiedTab, setCopiedTab] = useState("");

  useEffect(() => {
    if (!result?.audit) return;
    trackEvent("report_tab_viewed", {
      mode,
      tab: activeTab,
      domain: analyticsDomain(resultUrl(mode, result)),
    });
  }, [mode, result, activeTab]);

  if (!result?.audit) {
    return isLoading ? null : (
      <section className="empty-workflow" aria-label="How analysis works">
        <h2>A clearer path from evidence to action.</h2>
        <div className="workflow-steps">
          {[
            ["01", "Collect evidence", "Start with a public URL. Inspect the page, sample the site, or compare it with two alternatives."],
            ["02", "Review findings", "See what was observed, what is missing, and which recommendations need your judgement."],
            ["03", "Make a change", "Take prioritized tickets and acceptance criteria into your workflow. Export the details when you need them."],
          ].map(([number, title, copy]) => <div key={number} className="workflow-step"><span>{number}</span><h3>{title}</h3><p>{copy}</p></div>)}
        </div>
      </section>
    );
  }

  const activeTabLabel = tabs.find(([id]) => id === activeTab)?.[1] || "Report";
  const baseName = reportBaseName(mode, result);
  const tickets = buildTickets(mode, result);
  const categories = buildSeoCategories(mode, result, tickets);
  const visibleTabs = tabs.filter(([id]) => {
    const count = tabCount(mode, result, id, tickets, categories);
    return id === "overview" || id === "tracking" || count > 0;
  });
  const safeActiveTab = visibleTabs.some(([id]) => id === activeTab) ? activeTab : "overview";
  const safeActiveTabLabel = visibleTabs.find(([id]) => id === safeActiveTab)?.[1] || activeTabLabel;

  function handleExportCsv() {
    const rows = reportTabRows(mode, result, safeActiveTab);
    downloadBlob(`${baseName}-${slugify(safeActiveTabLabel)}.csv`, rowsToCsv(rows), "text/csv;charset=utf-8");
    trackEvent("export_csv_clicked", {
      mode,
      tab: safeActiveTab,
      row_count: rows.length,
      domain: analyticsDomain(resultUrl(mode, result)),
    });
  }

  async function handleCopyTable() {
    try {
      const rows = reportTabRows(mode, result, safeActiveTab);
      await copyToClipboard(rowsToTable(rows));
      setCopiedTab(safeActiveTab);
      window.setTimeout(() => setCopiedTab(""), 1600);
      trackEvent("copy_table_clicked", {
        mode,
        tab: safeActiveTab,
        row_count: rows.length,
        domain: analyticsDomain(resultUrl(mode, result)),
      });
    } catch {
      setCopiedTab("error");
      window.setTimeout(() => setCopiedTab(""), 1600);
    }
  }

  function handleExportPdf() {
    downloadBlob(`${baseName}-full-report.pdf`, buildPdfBlob(mode, result), "application/pdf");
    trackEvent("export_pdf_clicked", {
      mode,
      domain: analyticsDomain(resultUrl(mode, result)),
    });
  }

  return (
    <div className="grid gap-4">
      <ReportHeader
        mode={mode}
        result={result}
        activeTabLabel={safeActiveTabLabel}
        onRerun={onRerun}
        onExportPdf={handleExportPdf}
        onExportCsv={handleExportCsv}
        onCopyTable={handleCopyTable}
        exportFeedback={copiedTab === safeActiveTab ? "Copied" : copiedTab === "error" ? "Copy failed" : ""}
        isLoading={isLoading}
      />
      <TabStrip tabs={visibleTabs} active={safeActiveTab} onChange={setActiveTab} mode={mode} result={result} tickets={tickets} categories={categories} />
      <Card className="overflow-hidden rounded-lg">
        <div className="p-4 sm:p-5">
          <AccessBanner meta={result.meta} />
          <p className="mb-4 text-xs leading-5 text-ink-600">{tabDescription(mode, safeActiveTab, safeActiveTabLabel)}</p>
          {mode === "page" ? <PageReport audit={result.audit} activeTab={safeActiveTab} coreWebVitals={result.meta?.coreWebVitals} keywordAnalysis={result.meta?.keywordAnalysis} tickets={tickets} categories={categories} richResults={result.meta?.richResults} onFetchDesktopVitals={onFetchDesktopVitals} desktopVitalsState={desktopVitalsState} /> : null}
          {mode === "site" ? <SiteReport audit={result.audit} activeTab={safeActiveTab} coreWebVitals={result.meta?.coreWebVitals} keywordAnalysis={result.meta?.keywordAnalysis} tickets={tickets} meta={result.meta} categories={categories} onAnalyzePage={onAnalyzePage} onFetchDesktopVitals={onFetchDesktopVitals} desktopVitalsState={desktopVitalsState} /> : null}
          {mode === "compare" ? <CompareReport audit={result.audit} activeTab={safeActiveTab} coreWebVitals={result.meta?.coreWebVitals} tickets={tickets} categories={categories} /> : null}
          {mode === "ux" ? <UxAuditReport audit={result.audit} activeTab={safeActiveTab} coreWebVitals={result.meta?.coreWebVitals} tickets={tickets} meta={result.meta} onFetchDesktopVitals={onFetchDesktopVitals} desktopVitalsState={desktopVitalsState} /> : null}
          {result.meta ? (
            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-ink-200 pt-4 text-xs text-ink-600">
              <span>Source: {result.meta.source}</span>
              <span className="text-ink-400">/</span>
              <span>Duration: {result.meta.durationMs}ms</span>
              {result.meta.model ? (
                <>
                  <span className="text-ink-400">/</span>
                  <span>Model: {result.meta.model}</span>
                </>
              ) : null}
              {result.meta.scoreMethod ? (
                <>
                  <span className="text-ink-400">/</span>
                  <span>Score: evidence formula v1</span>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
