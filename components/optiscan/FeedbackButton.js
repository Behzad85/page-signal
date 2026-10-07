"use client";

import { useCallback, useEffect, useState } from "react";
import { DialogTitle, Button, Modal, Textarea, TextInput, Select } from "../design/primitives";
import { CheckCircleOutlineOutlined as CheckCircle2 } from "../design/icons";
import { ChatBubbleOutlineOutlined as MessageSquare } from "../design/icons";
import { CloseOutlined as X } from "../design/icons";
import { saveFeedbackRecord } from "../../lib/feedbackClassification.mjs";

const CATEGORY_OPTIONS = [
  { value: "bug", label: "Bug" },
  { value: "feature", label: "Feature request" },
  { value: "suggestion", label: "Suggestion" },
  { value: "report", label: "Report feedback" },
  { value: "general", label: "General" },
];

const DEFAULT_FORM = {
  email: "",
  category: "general",
  message: "",
  honeypot: "",
};

export const FEEDBACK_OPEN_EVENT = "optiscan:openFeedback";

export default function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [sentiment, setSentiment] = useState(undefined);
  const [context, setContext] = useState(undefined);
  const [status, setStatus] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const closeModal = useCallback(() => {
    setOpen(false);
    setTimeout(() => {
      setForm(DEFAULT_FORM);
      setSentiment(undefined);
      setContext(undefined);
      setStatus("idle");
      setErrorMessage("");
    }, 200);
  }, []);

  useEffect(() => {
    function handleOpen(event) {
      const detail = event?.detail || {};
      setForm((current) => ({
        ...current,
        category: detail.category || current.category || "general",
        message: detail.message || current.message,
      }));
      if (detail.sentiment) setSentiment(detail.sentiment);
      if (detail.context) setContext(detail.context);
      setOpen(true);
    }

    window.addEventListener(FEEDBACK_OPEN_EVENT, handleOpen);
    return () => window.removeEventListener(FEEDBACK_OPEN_EVENT, handleOpen);
  }, []);

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (status === "sending") return;

    setStatus("sending");
    setErrorMessage("");

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email.trim(),
          category: form.category,
          message: form.message,
          honeypot: form.honeypot,
          sentiment,
          context: {
            ...(context || {}),
            pageUrl: typeof window !== "undefined" ? window.location.href : undefined,
            userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
          },
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setStatus("error");
        setErrorMessage(data?.error || "Could not send feedback. Try again.");
        return;
      }

      saveFeedbackRecord({
        message: form.message,
        email: form.email.trim(),
        source: "optiscan",
        context: {
          category: form.category,
          sentiment,
          ...(context || {}),
        },
      });

      setStatus("success");
      setTimeout(() => closeModal(), 1600);
    } catch {
      setStatus("error");
      setErrorMessage("Network error. Try again.");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-40 inline-flex h-11 w-11 items-center justify-center rounded-full border border-accent-300/40 bg-accent-500 text-sm font-semibold text-white transition hover:bg-accent-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500 sm:bottom-5 sm:right-5 sm:h-auto sm:w-auto sm:gap-2 sm:px-4 sm:py-3"
        aria-label="Send feedback"
      >
        <MessageSquare className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">Feedback</span>
      </button>

      <Modal
        opened={open}
        onClose={closeModal}
        withCloseButton={false}
        centered
        size="lg"
        radius="md"
        overlayProps={{ backgroundOpacity: 0.55, blur: 2 }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent-700">PageSignal</p>
            <DialogTitle className="mt-1 text-xl font-semibold text-ink-900">Send feedback</DialogTitle>
            <p className="mt-1 text-sm leading-6 text-ink-600">
              Share an idea or report a problem. Delivery is available only when the project owner has configured it.
            </p>
          </div>
          <button
            type="button"
            onClick={closeModal}
            className="rounded-full p-1 text-ink-600 transition hover:bg-white hover:text-ink-900"
            aria-label="Close feedback form"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {status === "success" ? (
          <div className="mt-6 flex items-center gap-3 rounded-md border border-accent-400/40 bg-accent-500/10 px-4 py-4 text-sm text-accent-700">
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            <span>Thanks — your feedback is on its way.</span>
          </div>
        ) : (
          <form className="mt-5 grid gap-4" onSubmit={handleSubmit}>
            <input
              type="text"
              name="company"
              tabIndex={-1}
              autoComplete="off"
              value={form.honeypot}
              onChange={(event) => updateField("honeypot", event.target.value)}
              className="hidden"
              aria-hidden="true"
            />

            <TextInput
              type="email"
              label="Your email"
              placeholder="you@example.com"
              required
              value={form.email}
              onChange={(event) => updateField("email", event.currentTarget.value)}
              disabled={status === "sending"}
            />

            <Select
              label="Category"
              data={CATEGORY_OPTIONS}
              value={form.category}
              onChange={(value) => updateField("category", value || "general")}
              disabled={status === "sending"}
            />

            <Textarea
              label="Message"
              placeholder="What did you notice, want, or wish was different?"
              required
              minRows={5}
              maxLength={2000}
              value={form.message}
              onChange={(event) => updateField("message", event.currentTarget.value)}
              disabled={status === "sending"}
            />

            {sentiment ? (
              <div className="text-xs text-ink-600">
                Attached reaction: <span className="font-semibold text-ink-800">{sentiment === "up" ? "Positive" : "Negative"}</span>
              </div>
            ) : null}

            {context && (context.reportUrl || context.keyword || context.overallScore !== undefined) ? (
              <div className="rounded-md border border-ink-200 bg-white px-3 py-2 text-xs text-ink-600">
                <div className="font-semibold uppercase tracking-[0.14em] text-ink-600">Attached context</div>
                {context.reportUrl ? <div className="mt-1 truncate">URL: {context.reportUrl}</div> : null}
                {context.keyword ? <div>Keyword: {context.keyword}</div> : null}
                {context.overallScore !== undefined ? <div>Overall score: {context.overallScore}</div> : null}
              </div>
            ) : null}

            {errorMessage ? (
              <div className="rounded-md border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-700">
                {errorMessage}
              </div>
            ) : null}

            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="default"
                onClick={closeModal}
                disabled={status === "sending"}
                className="border-ink-200 bg-white text-ink-800 hover:border-ink-200"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                loading={status === "sending"}
                disabled={status === "sending"}
                className="border-accent-300/50 bg-accent-500 text-white hover:bg-accent-600"
              >
                {status === "sending" ? "Sending…" : "Send feedback"}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
