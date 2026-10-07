function feedbackConfiguration() {
  const url = (process.env.FEEDBACK_GAS_URL || "").trim();
  const token = (process.env.FEEDBACK_GAS_TOKEN || "").trim();
  const recipient = (process.env.FEEDBACK_RECIPIENT_EMAIL || "").trim();
  if (!url || !token || !recipient) {
    throw new Error("Feedback email is not configured.");
  }
  const endpoint = new URL(url);
  if (endpoint.protocol !== "https:" || endpoint.username || endpoint.password) {
    throw new Error("Feedback service must use HTTPS without URL credentials.");
  }
  return { url, token, recipient };
}

export function feedbackEmailConfigured() {
  try {
    feedbackConfiguration();
    return true;
  } catch {
    return false;
  }
}

const CATEGORY_LABELS = {
  bug: "Bug",
  feature: "Feature request",
  suggestion: "Suggestion",
  report: "Report feedback",
  general: "General",
};

function categoryLabel(category) {
  return CATEGORY_LABELS[category] || "General";
}

function formatContextBlock(context) {
  if (!context || typeof context !== "object") {
    return "";
  }

  const lines = [];
  if (context.pageUrl) lines.push(`Page URL: ${context.pageUrl}`);
  if (context.reportUrl) lines.push(`Report URL: ${context.reportUrl}`);
  if (context.mode) lines.push(`Mode: ${context.mode}`);
  if (context.keyword) lines.push(`Target keyword: ${context.keyword}`);
  if (context.overallScore !== undefined && context.overallScore !== null) {
    lines.push(`Overall score: ${context.overallScore}`);
  }
  if (context.userAgent) lines.push(`User-Agent: ${context.userAgent}`);

  return lines.length ? `\n\n--- Context ---\n${lines.join("\n")}` : "";
}

function buildSubject({ category, sentiment }) {
  const base = `[PageSignal Feedback] ${categoryLabel(category)}`;
  if (sentiment === "up") return `${base} (positive)`;
  if (sentiment === "down") return `${base} (negative)`;
  return base;
}

function buildMessage({ message, fromEmail, sentiment, context }) {
  const header = `From: ${fromEmail}`;
  const sentimentLine = sentiment ? `\nSentiment: ${sentiment === "up" ? "Positive" : "Negative"}` : "";
  const body = `\n\n${message.trim()}`;
  const contextBlock = formatContextBlock(context);
  const timestamp = `\n\nSubmitted at: ${new Date().toISOString()}`;
  return `${header}${sentimentLine}${body}${contextBlock}${timestamp}`;
}

export async function sendFeedbackEmail({ category, message, fromEmail, sentiment, context }) {
  const config = feedbackConfiguration();
  const payload = {
    token: config.token,
    email: config.recipient,
    subject: buildSubject({ category, sentiment }),
    message: buildMessage({ message, fromEmail, sentiment, context }),
  };

  const response = await fetch(config.url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    redirect: "follow",
    signal: AbortSignal.timeout(10_000),
  });

  const bodyText = await response.text().catch(() => "");

  if (!response.ok) {
    throw new Error(`Feedback transport returned ${response.status}.`);
  }

  try {
    const parsed = JSON.parse(bodyText);
    if (!parsed || parsed.status !== "success") {
      throw new Error("Feedback service did not confirm delivery.");
    }
  } catch (parseError) {
    if (parseError instanceof SyntaxError) {
      throw new Error("Feedback service returned an invalid response.");
    }
    throw parseError;
  }

  return { ok: true };
}
