const DEFAULT_TIMEOUT = 25000;

export const ACCESS_BLOCKED_STATUSES = new Set([401, 403, 407, 429, 451]);
export const DESKTOP_BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

function withTimeout(ms = DEFAULT_TIMEOUT) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { controller, timer };
}

export function normalizeUrl(input) {
  const trimmed = String(input || "").trim();
  if (!trimmed) {
    throw new Error("Enter a URL.");
  }

  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url;

  try {
    url = new URL(candidate);
  } catch {
    throw new Error("Enter a valid website URL.");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only http and https URLs are supported.");
  }

  url.hash = "";
  return url.toString();
}

export function domainLabel(input) {
  try {
    const url = new URL(normalizeUrl(input));
    return url.hostname.replace(/^www\./i, "");
  } catch {
    return String(input || "website").replace(/^https?:\/\//i, "").replace(/^www\./i, "");
  }
}

export function truncateText(text, maxLength = 60000) {
  const value = String(text || "");
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength)}\n\n[Content truncated after ${maxLength} characters.]`;
}

export function isAccessBlockedStatus(status) {
  return ACCESS_BLOCKED_STATUSES.has(Number(status));
}

export async function fetchPageMarkdown(inputUrl, options = {}) {
  const url = normalizeUrl(inputUrl);
  const readerUrl = `https://r.jina.ai/${url}`;
  const { controller, timer } = withTimeout(options.timeoutMs);

  try {
    const response = await fetch(readerUrl, {
      signal: controller.signal,
      headers: {
        accept: "text/plain, text/markdown;q=0.9, */*;q=0.5",
        "accept-language": "en-US,en;q=0.9",
        "user-agent": DESKTOP_BROWSER_UA,
      },
      next: { revalidate: 0 },
    });

    const markdown = await response.text();

    if (!response.ok) {
      const error = new Error(`Jina Reader returned ${response.status} for ${url}.`);
      error.status = response.status;
      error.statusText = response.statusText;
      error.readerUrl = readerUrl;
      error.bodyPreview = truncateText(markdown, 1200);
      throw error;
    }

    return {
      url,
      readerUrl,
      markdown: markdown.trim(),
      ok: true,
      status: response.status,
      fetchedAt: new Date().toISOString(),
    };
  } finally {
    clearTimeout(timer);
  }
}
