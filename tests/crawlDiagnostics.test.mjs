import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const diagnosticsUrl = new URL("../lib/crawlDiagnostics.mjs", import.meta.url);

test("reports a blocked Jina request as a recovered fetch-path fallback, not a failed page", async () => {
  assert.equal(existsSync(fileURLToPath(diagnosticsUrl)), true, "crawl diagnostics module should exist");

  const { buildCrawlDiagnostics } = await import(diagnosticsUrl.href);
  const result = buildCrawlDiagnostics({
    access: {
      label: "example.com",
      url: "https://example.com/channels",
      blocked: false,
      degraded: true,
      reason: "One fetch path was blocked, but PageSignal recovered readable page evidence through another fetch path.",
      blockedSources: [
        {
          source: "jina_reader",
          status: 403,
          statusText: "Forbidden",
          url: "https://r.jina.ai/https://example.com/channels",
        },
      ],
      htmlAttempts: [
        {
          profile: "browser_desktop",
          profileLabel: "Browser desktop",
          ok: true,
          status: 200,
          url: "https://example.com/channels",
        },
      ],
    },
    crawl: {
      siteCrawl: {
        pages: [
          { url: "https://example.com/", status: 200, ok: true },
          { url: "https://example.com/channels", status: 200, ok: true },
        ],
      },
    },
  });

  assert.equal(result.failedPageCount, 0);
  assert.equal(result.sampledPageCount, 2);
  assert.equal(result.cleanPageCount, 2);
  assert.equal(result.fetchFallbackCount, 1);
  assert.equal(result.level, "fallback");
  assert.deepEqual(result.warnings[0], {
    kind: "fetch_fallback",
    severity: "warning",
    title: "Jina Reader returned 403; direct crawl succeeded",
    detail: "Browser desktop returned 200, so PageSignal recovered readable evidence. This is a fetch-path restriction, not a failed crawled page.",
    url: "https://example.com/channels",
    source: "Fetch path fallback",
  });
});

test("identifies the exact crawled page and response when a sampled page fails", async () => {
  const { buildCrawlDiagnostics } = await import(diagnosticsUrl.href);
  const result = buildCrawlDiagnostics({
    access: {
      label: "example.com",
      url: "https://example.com/",
      blocked: false,
      degraded: false,
    },
    crawl: {
      siteCrawl: {
        pages: [
          { url: "https://example.com/", status: 200, ok: true },
          { url: "https://example.com/missing", status: 404, statusText: "Not Found", ok: false },
        ],
      },
    },
  });

  assert.equal(result.failedPageCount, 1);
  assert.equal(result.fetchFallbackCount, 0);
  assert.equal(result.level, "critical");
  assert.deepEqual(result.warnings[0], {
    kind: "page_failure",
    severity: "critical",
    title: "Crawled page returned 404",
    detail: "Not Found",
    url: "https://example.com/missing",
    source: "Crawled page",
  });
});

test("summarizes the exact failed fetch paths when the target is fully blocked", async () => {
  const { buildCrawlDiagnostics } = await import(diagnosticsUrl.href);
  const result = buildCrawlDiagnostics({
    access: {
      label: "example.com",
      url: "https://example.com/private",
      blocked: true,
      degraded: false,
      reason: "The target page blocked crawler access, so PageSignal could not read the content evidence.",
      blockedSources: [
        { source: "jina_reader", status: 403, statusText: "Forbidden" },
        { source: "origin_html", status: 403, statusText: "Forbidden" },
      ],
    },
  });

  assert.equal(result.failedPageCount, 0);
  assert.equal(result.blockedPathCount, 2);
  assert.equal(result.level, "critical");
  assert.deepEqual(result.warnings[0], {
    kind: "access_block",
    severity: "critical",
    title: "Crawler access blocked for example.com",
    detail: "Jina Reader returned 403 (Forbidden); Origin HTML crawler returned 403 (Forbidden). The target page blocked crawler access, so PageSignal could not read the content evidence.",
    url: "https://example.com/private",
    source: "Access diagnosis",
  });
});

test("reports a crawler-profile fallback when a later origin profile succeeds", async () => {
  const { buildCrawlDiagnostics } = await import(diagnosticsUrl.href);
  const result = buildCrawlDiagnostics({
    access: {
      label: "example.com",
      url: "https://example.com/",
      blocked: false,
      degraded: false,
      blockedSources: [],
      htmlAttempts: [
        { profile: "browser_desktop", profileLabel: "Browser desktop", status: 403, statusText: "Forbidden", ok: false },
        { profile: "browser_mobile", profileLabel: "Browser mobile", status: 200, ok: true },
      ],
    },
  });

  assert.equal(result.fetchFallbackCount, 1);
  assert.equal(result.level, "fallback");
  assert.deepEqual(result.warnings[0], {
    kind: "fetch_fallback",
    severity: "warning",
    title: "Browser desktop returned 403; Browser mobile succeeded",
    detail: "Browser mobile returned 200 after Browser desktop was blocked. PageSignal recovered readable evidence for this URL.",
    url: "https://example.com/",
    source: "Crawler profile fallback",
  });
});

test("does not claim the direct crawl succeeded when only another provider recovered evidence", async () => {
  const { buildCrawlDiagnostics } = await import(diagnosticsUrl.href);
  const result = buildCrawlDiagnostics({
    access: {
      label: "example.com",
      url: "https://example.com/",
      blocked: false,
      degraded: true,
      blockedSources: [{ source: "origin_html", status: 403, statusText: "Forbidden" }],
      htmlAttempts: [{ profileLabel: "Browser desktop", status: 403, ok: false }],
      markdownAvailable: true,
    },
  });

  assert.equal(result.warnings[0].title, "Origin HTML crawler returned 403; alternate fetch path succeeded");
  assert.equal(
    result.warnings[0].detail,
    "Another fetch path returned usable evidence, so PageSignal recovered readable evidence. This is a fetch-path restriction, not a failed crawled page."
  );
});
