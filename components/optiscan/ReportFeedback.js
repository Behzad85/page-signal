"use client";

import { Paper } from "../design/primitives";
import { ThumbDownOutlined as ThumbsDown } from "../design/icons";
import { ThumbUpOutlined as ThumbsUp } from "../design/icons";
import { FEEDBACK_OPEN_EVENT } from "./FeedbackButton";

function buildContext({ result, mode }) {
  if (!result) return undefined;
  const reportUrl = result.meta?.url || result.meta?.label || "";
  const keyword = result.meta?.keyword || result.audit?.targetKeyword || "";
  const persona = result.meta?.persona?.id || "";
  const secondaryPersonas = (result.meta?.personas?.secondary || []).map((item) => item.id).filter(Boolean).join(",");
  const overallScore = result.audit?.score;
  return {
    mode,
    reportUrl: reportUrl || undefined,
    keyword: keyword || undefined,
    persona: persona || undefined,
    secondaryPersonas: secondaryPersonas || undefined,
    overallScore: typeof overallScore === "number" ? overallScore : undefined,
  };
}

export default function ReportFeedback({ result, mode }) {
  if (!result?.audit) return null;

  function openFeedback(sentiment) {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent(FEEDBACK_OPEN_EVENT, {
        detail: {
          category: "report",
          sentiment,
          context: buildContext({ result, mode }),
        },
      })
    );
  }

  return (
    <Paper className="rounded-lg border border-ink-200 bg-white px-4 py-4 sm:px-5">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.16em] text-accent-700">Was this audit useful?</div>
          <p className="mt-1 text-sm leading-6 text-ink-600">
            Add a rating and review the report context before sending feedback.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => openFeedback("up")}
            className="inline-flex min-h-9 items-center gap-2 rounded-md border border-ink-200 bg-white px-3 text-sm font-semibold text-ink-800 transition hover:border-accent-400/50 hover:text-accent-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500"
            aria-label="Audit was useful"
          >
            <ThumbsUp className="h-4 w-4" aria-hidden="true" />
            Useful
          </button>
          <button
            type="button"
            onClick={() => openFeedback("down")}
            className="inline-flex min-h-9 items-center gap-2 rounded-md border border-ink-200 bg-white px-3 text-sm font-semibold text-ink-800 transition hover:border-rose-400/50 hover:text-rose-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500"
            aria-label="Audit was not useful"
          >
            <ThumbsDown className="h-4 w-4" aria-hidden="true" />
            Not useful
          </button>
        </div>
      </div>
    </Paper>
  );
}
