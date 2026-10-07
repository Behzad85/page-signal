const STOP_WORDS = new Set([
  "about",
  "after",
  "again",
  "also",
  "because",
  "before",
  "being",
  "between",
  "could",
  "every",
  "from",
  "have",
  "into",
  "more",
  "most",
  "only",
  "other",
  "over",
  "same",
  "should",
  "some",
  "such",
  "than",
  "that",
  "their",
  "them",
  "then",
  "there",
  "these",
  "this",
  "through",
  "with",
  "your",
  "you",
  "and",
  "are",
  "can",
  "for",
  "has",
  "not",
  "the",
  "was",
  "will",
]);

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function text(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function visibleMarkdownText(value = "") {
  return text(value)
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/[#>*_`~|-]+/g, " ");
}

function words(value) {
  return text(value)
    .toLowerCase()
    .match(/[a-z0-9][a-z0-9'-]{2,}/g)
    ?.map((word) => word.replace(/^'+|'+$/g, ""))
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word)) || [];
}

function countTerms(values, limit = 12) {
  const counts = new Map();
  words(values.join(" ")).forEach((word) => {
    counts.set(word, (counts.get(word) || 0) + 1);
  });

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([term, count]) => ({
      term,
      count,
      source: "SEO-relevant page areas: title, meta description, headings, visible copy, internal anchors, image alt text, URL slug, and structured data",
    }));
}

function contains(source, term) {
  const haystack = text(source).toLowerCase();
  const needle = text(term).toLowerCase();
  return Boolean(needle && haystack.includes(needle));
}

function pageVisibleText(page = {}, fallback = "") {
  return text(page.visible_text || page.visibleText || fallback);
}

function supportingHeadings(page = {}) {
  const h1 = text(page.h1).toLowerCase();
  const headings = asArray(page.headings).map(text).filter(Boolean);
  const supporting = headings.filter((heading) => heading.toLowerCase() !== h1);

  if (supporting.length) {
    return supporting.join(" ");
  }

  return text(page.heading_text || page.headingText);
}

function keywordAreas(page = {}, fallbackVisible = "") {
  return [
    ["Title", page.title],
    ["Meta description", page.meta_description || page.metaDescription],
    ["H1", page.h1],
    ["H2/H3 headings", supportingHeadings(page)],
    ["Visible body copy", pageVisibleText(page, fallbackVisible)],
    ["Internal anchor text", page.internal_anchor_text || page.internalAnchorText],
    ["Image alt text", page.image_alt_text || page.imageAltText],
    ["URL slug", page.url_slug_text || page.urlSlugText],
    ["Structured data", page.structured_data_text || page.structuredDataText],
  ].map(([label, value]) => [label, text(value)]).filter(([, value]) => value);
}

function coverageForKeyword(keyword, raw = {}, fallbackVisible = "") {
  const locations = keywordAreas(raw, fallbackVisible).filter(([, value]) => contains(value, keyword));
  const locationNames = locations.map(([name]) => name);
  const primaryMatches = locationNames.filter((name) => ["Title", "H1", "Visible body copy"].includes(name)).length;
  const status = locationNames.includes("Visible body copy") && primaryMatches >= 2 ? "Strong" : locationNames.length >= 3 ? "Strong" : locationNames.length ? "Partial" : "Missing";

  return {
    keyword,
    status,
    locations: locationNames,
    evidence: locationNames.length ? `Found in ${locationNames.join(", ")}.` : "Not found in the tracked SEO keyword areas.",
    recommendation:
      status === "Strong"
        ? "Keep this keyword mapped to the current page and avoid duplicating the same target across similar pages."
        : "Clarify the target phrase in visible copy and important SEO elements where it naturally fits.",
  };
}

function pageTopic(page = {}) {
  const source = text(page.h1 || page.title || pageVisibleText(page));
  const topicWords = words(source).slice(0, 5);
  return topicWords.length ? topicWords.join(" ") : "untitled page";
}

function pagesFromSignals(signals = {}) {
  const crawlPages = asArray(signals.siteCrawl?.pages);
  if (crawlPages.length) {
    return crawlPages;
  }

  const raw = signals.raw || {};
  return [
    {
      url: signals.url || "",
      title: raw.title || "",
      meta_description: raw.meta_description || "",
      h1: raw.h1 || "",
      headings: raw.headings || [],
      heading_text: raw.heading_text || "",
      word_count: raw.word_count || 0,
      status: signals.html_status || 0,
      ok: signals.html_ok,
      visible_text: raw.visible_text || visibleMarkdownText(signals.markdown || ""),
      internal_anchor_text: raw.internal_anchor_text || "",
      image_alt_text: raw.image_alt_text || "",
      url_slug_text: raw.url_slug_text || "",
      structured_data_text: raw.structured_data_text || "",
    },
  ];
}

function cannibalizationRisks(pages) {
  const groups = new Map();
  pages.forEach((page) => {
    const topic = pageTopic(page);
    if (!topic || topic === "untitled page") return;
    const list = groups.get(topic) || [];
    list.push(page.url);
    groups.set(topic, list);
  });

  return [...groups.entries()]
    .filter(([, urls]) => urls.length > 1)
    .slice(0, 8)
    .map(([topic, urls]) => ({
      topic,
      urls,
      recommendation: "Review whether these URLs target the same search intent. Consolidate, differentiate, or add clearer internal-link hierarchy.",
    }));
}

function topicGaps({ audit = {}, detectedTerms = [], targetKeywords = [] }) {
  const detected = new Set(detectedTerms.map((item) => item.term.toLowerCase()));
  const gaps = [];

  asArray(audit.content?.suggested_topics).forEach((topic) => {
    gaps.push({
      topic,
      reason: "Returned as a missing or underdeveloped topic in the content strategy analysis.",
    });
  });

  asArray(audit.do_next).forEach((item) => {
    const task = text(item?.task);
    if (/keyword|topic|content|section|intent/i.test(task)) {
      gaps.push({
        topic: task,
        reason: text(item?.impact) || "Recommended as a next content action.",
      });
    }
  });

  targetKeywords.forEach((keyword) => {
    const keyWords = words(keyword);
    const covered = keyWords.some((word) => detected.has(word));
    if (!covered) {
      gaps.push({
        topic: keyword,
        reason: "The entered target keyword is not prominent in the tracked SEO keyword areas.",
      });
    }
  });

  const seen = new Set();
  return gaps
    .filter((item) => {
      const key = item.topic.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 10);
}

export function buildKeywordAnalysis({ mode, signals = {}, audit = {}, targetKeywords = [] }) {
  const raw = signals.raw || {};
  const pages = pagesFromSignals(signals);
  const fallbackVisibleText = visibleMarkdownText(signals.markdown || "");
  const pageTexts = pages.flatMap((page) => keywordAreas(page).map(([, value]) => value));
  const detectedTerms = countTerms([...keywordAreas(raw, fallbackVisibleText).map(([, value]) => value), ...pageTexts], 14);
  const targets = targetKeywords.map((keyword) => coverageForKeyword(keyword, raw, fallbackVisibleText));

  return {
    mode,
    targetKeywords: targets,
    detectedTerms,
    pages: pages.slice(0, 100).map((page) => ({
      url: page.url || "",
      topic: pageTopic(page),
      title: page.title || "",
      h1: page.h1 || "",
      words: page.word_count || 0,
      status: page.ok === false ? "Needs review" : "Analyzed",
    })),
    gaps: topicGaps({ audit, detectedTerms, targetKeywords }),
    cannibalization: cannibalizationRisks(pages),
    notes: [
      "This is on-page keyword and intent evidence from SEO-relevant page areas, not search-volume or ranking data.",
      "Connect Google Search Console later to add real queries, clicks, impressions, CTR, and average position.",
    ],
  };
}
