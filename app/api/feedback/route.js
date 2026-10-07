import { NextResponse } from "next/server";
import { feedbackEmailConfigured, sendFeedbackEmail } from "@/lib/sendFeedbackEmail";

export const runtime = "nodejs";

const ALLOWED_CATEGORIES = new Set(["bug", "feature", "suggestion", "report", "general"]);
const ALLOWED_SENTIMENTS = new Set(["up", "down"]);
const MAX_MESSAGE_LENGTH = 2000;
const MAX_EMAIL_LENGTH = 200;
const RATE_LIMIT_PER_MINUTE = 5;

const rateBuckets = new Map();

function json(data, status = 200) {
  return NextResponse.json(data, { status });
}

function clientIp(request) {
  const forwarded = request.headers.get("x-forwarded-for") || "";
  const first = forwarded.split(",")[0].trim();
  return first || request.headers.get("x-real-ip") || "unknown";
}

function rateLimited(ip) {
  const now = Date.now();
  const windowStart = now - 60_000;
  const hits = (rateBuckets.get(ip) || []).filter((t) => t > windowStart);
  if (hits.length >= RATE_LIMIT_PER_MINUTE) {
    rateBuckets.set(ip, hits);
    return true;
  }
  hits.push(now);
  rateBuckets.set(ip, hits);
  return false;
}

function validEmail(value) {
  return typeof value === "string" && value.length <= MAX_EMAIL_LENGTH && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function clampMessage(value) {
  return String(value || "").trim().slice(0, MAX_MESSAGE_LENGTH);
}

function sanitizeContext(raw) {
  if (!raw || typeof raw !== "object") return undefined;
  const keep = (value) => (typeof value === "string" ? value.slice(0, 500) : value);
  const context = {};
  if (raw.pageUrl) context.pageUrl = keep(raw.pageUrl);
  if (raw.reportUrl) context.reportUrl = keep(raw.reportUrl);
  if (raw.mode) context.mode = keep(raw.mode);
  if (raw.keyword) context.keyword = keep(raw.keyword);
  if (raw.overallScore !== undefined && raw.overallScore !== null) {
    const score = Number(raw.overallScore);
    if (Number.isFinite(score)) context.overallScore = Math.round(score);
  }
  if (raw.userAgent) context.userAgent = keep(raw.userAgent);
  return Object.keys(context).length ? context : undefined;
}

export async function POST(request) {
  if (!feedbackEmailConfigured()) {
    return json({ error: "Feedback delivery is not configured for this installation." }, 503);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  if (body && typeof body.honeypot === "string" && body.honeypot.trim().length > 0) {
    return json({ ok: true });
  }

  const email = String(body?.email || "").trim();
  if (!validEmail(email)) {
    return json({ error: "Enter a valid email address." }, 400);
  }

  const category = String(body?.category || "general").trim();
  if (!ALLOWED_CATEGORIES.has(category)) {
    return json({ error: "Choose a valid feedback category." }, 400);
  }

  const message = clampMessage(body?.message);
  if (!message) {
    return json({ error: "Add a feedback message." }, 400);
  }

  const sentimentRaw = body?.sentiment ? String(body.sentiment) : "";
  const sentiment = ALLOWED_SENTIMENTS.has(sentimentRaw) ? sentimentRaw : undefined;

  const context = sanitizeContext(body?.context);
  if (context && !context.userAgent) {
    context.userAgent = (request.headers.get("user-agent") || "").slice(0, 500) || undefined;
  }

  if (rateLimited(clientIp(request))) {
    return json({ error: "Too many feedback submissions. Try again in a minute." }, 429);
  }

  try {
    await sendFeedbackEmail({ category, message, fromEmail: email, sentiment, context });
  } catch (error) {
    console.error("[feedback] transport failed", error);
    return json({ error: "Could not send feedback right now. Please try again." }, 502);
  }

  return json({ ok: true });
}
