function asList(value) {
  return Array.isArray(value) ? value : value ? [value] : [];
}

function sourceLabel(source) {
  if (source === "jina_reader") return "Jina Reader";
  if (source === "origin_html") return "Origin HTML crawler";
  return source || "Crawler";
}

function httpStatusText(status) {
  const value = Number(status || 0);
  return value ? String(value) : "unavailable";
}

function recoveredFetchWarning(item) {
  const blockedSource = asList(item.blockedSources)[0] || {};
  const successfulAttempt = asList(item.htmlAttempts).find((attempt) => attempt?.ok && Number(attempt.status) === 200);
  const failedLabel = sourceLabel(blockedSource.source);
  const successfulLabel = successfulAttempt?.profileLabel || successfulAttempt?.profile || "Another fetch path";
  const successStatus = httpStatusText(successfulAttempt?.status || 200);

  return {
    kind: "fetch_fallback",
    severity: "warning",
    title: `${failedLabel} returned ${httpStatusText(blockedSource.status)}; ${successfulAttempt ? "direct crawl" : "alternate fetch path"} succeeded`,
    detail: successfulAttempt
      ? `${successfulLabel} returned ${successStatus}, so PageSignal recovered readable evidence. This is a fetch-path restriction, not a failed crawled page.`
      : "Another fetch path returned usable evidence, so PageSignal recovered readable evidence. This is a fetch-path restriction, not a failed crawled page.",
    url: item.url || successfulAttempt?.url || "",
    source: "Fetch path fallback",
  };
}

function crawledPageWarning(page) {
  const status = Number(page.status || 0);
  return {
    kind: "page_failure",
    severity: status >= 400 || page.ok === false ? "critical" : "warning",
    title: `Crawled page returned ${httpStatusText(status)}`,
    detail:
      page.error ||
      page.statusText ||
      (status >= 300 && status < 400
        ? "The URL redirected instead of returning a clean 200 response."
        : "The URL did not return a clean 200 HTML response."),
    url: page.url || "",
    source: "Crawled page",
  };
}

function blockedAccessWarning(item) {
  const failedPaths = asList(item.blockedSources)
    .map((source) => {
      const statusText = source.statusText ? ` (${source.statusText})` : "";
      return `${sourceLabel(source.source)} returned ${httpStatusText(source.status)}${statusText}`;
    })
    .join("; ");
  const diagnosis = item.reason || "PageSignal could not read usable page evidence through the configured fetch paths.";

  return {
    kind: "access_block",
    severity: "critical",
    title: `Crawler access blocked for ${item.label || item.url || "target URL"}`,
    detail: `${failedPaths ? `${failedPaths}. ` : ""}${diagnosis}`,
    url: item.url || "",
    source: "Access diagnosis",
  };
}

function crawlerProfileFallbackWarnings(item) {
  const attempts = asList(item.htmlAttempts);
  const successfulAttempt = attempts.find((attempt) => attempt?.ok && Number(attempt.status) === 200);

  if (!successfulAttempt) return [];

  const successfulLabel = successfulAttempt.profileLabel || successfulAttempt.profile || "A later crawler profile";
  return attempts
    .filter((attempt) => attempt && (!attempt.ok || Number(attempt.status) !== 200))
    .map((attempt) => {
      const failedLabel = attempt.profileLabel || attempt.profile || "Crawler profile";
      return {
        kind: "fetch_fallback",
        severity: "warning",
        title: `${failedLabel} returned ${httpStatusText(attempt.status)}; ${successfulLabel} succeeded`,
        detail: `${successfulLabel} returned 200 after ${failedLabel} was blocked. PageSignal recovered readable evidence for this URL.`,
        url: item.url || successfulAttempt.url || attempt.url || "",
        source: "Crawler profile fallback",
      };
    });
}

export function buildCrawlDiagnostics(meta = {}) {
  const accessList = asList(meta.access);
  const sampledPages = asList(meta?.crawl?.siteCrawl?.pages);
  const fallbackWarnings = [
    ...accessList.filter((item) => item?.degraded).map(recoveredFetchWarning),
    ...accessList.flatMap(crawlerProfileFallbackWarnings),
  ];
  const accessBlockWarnings = accessList.filter((item) => item?.blocked).map(blockedAccessWarning);
  const pageWarnings = sampledPages
    .filter((page) => page && (page.ok === false || Number(page.status) !== 200))
    .map(crawledPageWarning);
  const warnings = [...pageWarnings, ...accessBlockWarnings, ...fallbackWarnings];
  const hasCritical = warnings.some((warning) => warning.severity === "critical");
  const blockedPathCount = accessList
    .filter((item) => item?.blocked)
    .reduce((count, item) => count + Math.max(1, asList(item.blockedSources).length), 0);

  return {
    warnings,
    failedPageCount: pageWarnings.length,
    sampledPageCount: sampledPages.length,
    cleanPageCount: sampledPages.filter((page) => page?.ok && Number(page.status) === 200).length,
    fetchFallbackCount: fallbackWarnings.length,
    blockedPathCount,
    level: hasCritical ? "critical" : fallbackWarnings.length ? "fallback" : warnings.length ? "warning" : "ok",
  };
}
