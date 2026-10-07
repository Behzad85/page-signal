import { DESKTOP_BROWSER_UA, fetchPageMarkdown, isAccessBlockedStatus, normalizeUrl, truncateText } from "./fetchPageMarkdown";
import { fetchCoreWebVitals } from "./fetchCoreWebVitals";
import { fetchSecurityNetworkSignals, responseSecurityEvidence } from "./fetchSecuritySignals.mjs";
import { buildSecurityPosture } from "./securitySchema.mjs";
import { guardedFetch } from "./urlGuard";

const FETCH_TIMEOUT = 22000;
const DEFAULT_SITE_CRAWL_LIMIT = 1;
const MAX_SITE_CRAWL_LIMIT = 100;
const EXTRA_PAGE_TIMEOUT = 14000;
const EXTRA_PAGE_CONCURRENCY = 8;
const MOBILE_BROWSER_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const BOT_UA = "PageSignal/0.1 SEO audit bot";

const FETCH_PROFILES = [
  {
    id: "browser_desktop",
    label: "Browser desktop",
    headers: {
      "user-agent": DESKTOP_BROWSER_UA,
      "accept-language": "en-US,en;q=0.9",
      "cache-control": "no-cache",
      pragma: "no-cache",
      "upgrade-insecure-requests": "1",
    },
  },
  {
    id: "browser_mobile",
    label: "Browser mobile",
    headers: {
      "user-agent": MOBILE_BROWSER_UA,
      "accept-language": "en-US,en;q=0.9",
      "cache-control": "no-cache",
      pragma: "no-cache",
    },
  },
  {
    id: "optiscan_bot",
    label: "PageSignal bot",
    headers: {
      "user-agent": BOT_UA,
      "accept-language": "en-US,en;q=0.9",
    },
  },
];

function timeoutSignal(ms = FETCH_TIMEOUT) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { controller, timer };
}

function decodeHtml(value = "") {
  return String(value)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#x27;/g, "'");
}

function stripTags(value = "") {
  return decodeHtml(String(value).replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]*>/g, " "));
}

function visibleTextFromHtml(html = "") {
  const body = /<body\b[^>]*>([\s\S]*?)<\/body>/i.exec(html)?.[1] || html;
  return stripTags(
    body
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<template[\s\S]*?<\/template>/gi, " ")
      .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
      .replace(/<canvas[\s\S]*?<\/canvas>/gi, " ")
      .replace(/<[^>]+\b(?:hidden|aria-hidden=["']?true["']?)[^>]*>[\s\S]*?<\/[^>]+>/gi, " ")
      .replace(/<[^>]+\bstyle=["'][^"']*(?:display\s*:\s*none|visibility\s*:\s*hidden)[^"']*["'][^>]*>[\s\S]*?<\/[^>]+>/gi, " ")
  )
    .replace(/\s+/g, " ")
    .trim();
}

function attrValue(tag, attr) {
  const quoted = new RegExp(`${attr}\\s*=\\s*["']([^"']*)["']`, "i").exec(tag);
  if (quoted) {
    return decodeHtml(quoted[1].trim());
  }

  const bare = new RegExp(`${attr}\\s*=\\s*([^\\s>]+)`, "i").exec(tag);
  return bare ? decodeHtml(bare[1].trim()) : "";
}

function findMeta(html, name) {
  const match = findMetaTag(html, name);
  return match ? attrValue(match, "content") : "";
}

function findMetaTag(html, name) {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  const wanted = name.toLowerCase();
  return tags.find((tag) => {
    const metaName = attrValue(tag, "name").toLowerCase();
    const property = attrValue(tag, "property").toLowerCase();
    return metaName === wanted || property === wanted;
  });
}

function extractJsonLdTypes(html) {
  const scripts = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const types = new Set();

  function collect(value) {
    if (!value || typeof value !== "object") {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach(collect);
      return;
    }

    const type = value["@type"];
    if (Array.isArray(type)) {
      type.forEach((item) => item && types.add(String(item)));
    } else if (type) {
      types.add(String(type));
    }

    if (Array.isArray(value["@graph"])) {
      value["@graph"].forEach(collect);
    }
  }

  for (const script of scripts) {
    try {
      collect(JSON.parse(decodeHtml(script[1].trim())));
    } catch {
      const typeMatches = [...script[1].matchAll(/"@type"\s*:\s*"([^"]+)"/gi)];
      typeMatches.forEach((match) => types.add(match[1]));
    }
  }

  const microdataTypes = [...html.matchAll(/itemtype=["'][^"']*\/([^/"']+)["']/gi)].map((match) => match[1]);
  microdataTypes.forEach((type) => types.add(type));

  return [...types].slice(0, 20);
}

function extractStructuredDataText(html) {
  const scripts = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const values = [];
  const allowedKeys = new Set([
    "name",
    "alternateName",
    "headline",
    "description",
    "text",
    "articleBody",
    "question",
    "answer",
    "acceptedAnswer",
    "about",
    "keywords",
    "breadcrumb",
  ]);

  function collect(value, key = "") {
    if (!value) {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => collect(item, key));
      return;
    }

    if (typeof value === "object") {
      Object.entries(value).forEach(([childKey, childValue]) => collect(childValue, childKey));
      return;
    }

    if (typeof value === "string" && allowedKeys.has(key)) {
      values.push(value);
    }
  }

  for (const script of scripts) {
    try {
      collect(JSON.parse(decodeHtml(script[1].trim())));
    } catch {
      const matches = [...script[1].matchAll(/"(?:name|alternateName|headline|description|text|articleBody|question|answer|keywords)"\s*:\s*"([^"]+)"/gi)];
      matches.forEach((match) => values.push(match[1]));
    }
  }

  return collectUnique(values.map((value) => stripTags(value)), 24).join(" ");
}

// Parsed JSON-LD entities (with @graph flattened) for rich-result validation.
// Values are truncated and the structure is bounded so the signal stays small.
function extractJsonLdItems(html) {
  const MAX_ITEMS = 25;
  const MAX_DEPTH = 6;
  const MAX_ARRAY = 30;
  const MAX_STRING = 200;
  const scripts = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const items = [];

  function sanitize(value, depth) {
    if (value === null || value === undefined) {
      return value;
    }
    if (typeof value === "string") {
      return value.length > MAX_STRING ? `${value.slice(0, MAX_STRING)}…` : value;
    }
    if (typeof value === "number" || typeof value === "boolean") {
      return value;
    }
    if (depth >= MAX_DEPTH) {
      return Array.isArray(value) ? [] : {};
    }
    if (Array.isArray(value)) {
      return value.slice(0, MAX_ARRAY).map((item) => sanitize(item, depth + 1));
    }
    if (typeof value === "object") {
      const out = {};
      for (const [key, childValue] of Object.entries(value)) {
        out[key] = sanitize(childValue, depth + 1);
      }
      return out;
    }
    return undefined;
  }

  function collect(value) {
    if (!value || typeof value !== "object" || items.length >= MAX_ITEMS) {
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(collect);
      return;
    }
    if (Array.isArray(value["@graph"])) {
      value["@graph"].forEach(collect);
      return;
    }
    if (value["@type"]) {
      items.push(sanitize(value, 0));
    }
  }

  for (const script of scripts) {
    try {
      collect(JSON.parse(decodeHtml(script[1].trim())));
    } catch {
      // Unparseable JSON-LD is reported separately via schema presence; skip here.
    }
  }

  return items.slice(0, MAX_ITEMS);
}

function urlKeywordText(url) {
  try {
    const parsed = new URL(url);
    return decodeURIComponent(parsed.pathname)
      .replace(/\.[a-z0-9]+$/i, "")
      .split(/[/-_]+/)
      .join(" ");
  } catch {
    return "";
  }
}

function countMatches(html, pattern) {
  return (html.match(pattern) || []).length;
}

function wordCountFrom(markdown, html) {
  const source = markdown || stripTags(html);
  const words = String(source).match(/\b[\p{L}\p{N}][\p{L}\p{N}'-]*\b/gu);
  return words ? words.length : 0;
}

function shortValue(value = "", max = 80) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
}

function quoteAttr(value = "") {
  return String(value || "").replace(/"/g, '\\"');
}

function tagName(tag = "") {
  return (/^<\s*([a-z0-9-]+)/i.exec(tag)?.[1] || "element").toLowerCase();
}

function classSelector(value = "") {
  return String(value || "")
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 2)
    .map((item) => `.${item.replace(/[^a-zA-Z0-9_-]/g, "\\$&")}`)
    .join("");
}

function tagSelector(tag = "", fallback = "") {
  const name = tagName(tag);
  const id = attrValue(tag, "id");
  const testId = attrValue(tag, "data-testid") || attrValue(tag, "data-test") || attrValue(tag, "data-cy");
  const component = attrValue(tag, "data-component") || attrValue(tag, "data-module");
  const className = attrValue(tag, "class");

  if (id) {
    return `${name}#${id.replace(/[^a-zA-Z0-9_-]/g, "\\$&")}`;
  }

  if (testId) {
    return `${name}[data-testid="${quoteAttr(testId)}"]`;
  }

  if (component) {
    return `${name}[data-component="${quoteAttr(component)}"]`;
  }

  if (className) {
    return `${name}${classSelector(className)}`;
  }

  return fallback || name;
}

function tagTextReference(tag = "", fallbackSelector = "", text = "") {
  const selector = tagSelector(tag, fallbackSelector);
  const snippet = shortValue(text || stripTags(tag), 70);
  return snippet ? `${selector} ("${snippet}")` : selector;
}

function collectUnique(items, limit = 8) {
  const seen = new Set();
  return items
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .filter((item) => {
      const key = item.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}

const SOCIAL_PROFILE_HOSTS = [
  { network: "Facebook", pattern: /(^|\.)facebook\.com$/i },
  { network: "YouTube", pattern: /(^|\.)youtube\.com$|(^|\.)youtu\.be$/i },
  { network: "Instagram", pattern: /(^|\.)instagram\.com$/i },
  { network: "X", pattern: /(^|\.)x\.com$|(^|\.)twitter\.com$/i },
  { network: "LinkedIn", pattern: /(^|\.)linkedin\.com$/i },
];

function socialNetworkForUrl(value = "") {
  try {
    const parsed = new URL(value);
    const host = parsed.hostname.replace(/^www\./i, "");
    const match = SOCIAL_PROFILE_HOSTS.find((item) => item.pattern.test(host));
    return match?.network || "";
  } catch {
    return "";
  }
}

function extractMarkupReferences(url, html, raw) {
  if (!html) {
    return {
      title: ["head > title (not captured)"],
      metaDescription: ['head > meta[name="description"] (not captured)'],
      h1: ["main h1 (not captured)"],
      h2: ["main h2 (not captured)"],
      canonical: ['head > link[rel="canonical"] (not captured)'],
      schema: ['script[type="application/ld+json"] (not captured)'],
      images: ["img[alt] (not captured)"],
      internalLinks: ["main a[href] (not captured)"],
      externalLinks: ["main a[href^=\"http\"] (not captured)"],
      socialLinks: ["footer/social profile links (not captured)"],
      content: ["main, article, or body content (not captured)"],
      scripts: ["script[src] (not captured)"],
      viewport: ['head > meta[name="viewport"] (not captured)'],
      forms: ["form input/select/textarea label coverage (not captured)"],
      robots: ["/robots.txt"],
      sitemap: ["/sitemap.xml"],
      llms: ["/llms.txt"],
      crawl: [`HTTP response for ${url}`],
    };
  }

  const titleTag = /<title[^>]*>[\s\S]*?<\/title>/i.exec(html)?.[0] || "";
  const metaDescriptionTag = findMetaTag(html, "description") || "";
  const canonicalTag = (html.match(/<link\b[^>]*rel=["'][^"']*canonical[^"']*["'][^>]*>/i) || [])[0] || "";
  const h1Tags = html.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/gi) || [];
  const h2Tags = html.match(/<h2\b[^>]*>[\s\S]*?<\/h2>/gi) || [];
  const imageTags = html.match(/<img\b[^>]*>/gi) || [];
  const linkTags = html.match(/<a\b[^>]*href=["'][^"']+["'][^>]*>[\s\S]*?<\/a>/gi) || [];
  const scriptTags = html.match(/<script\b[^>]*>/gi) || [];
  const schemaTags = [
    ...(html.match(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>/gi) || []),
    ...(html.match(/<[^>]+\bitemtype=["'][^"']+["'][^>]*>/gi) || []),
  ];
  const origin = new URL(url).origin;

  const internalLinks = [];
  const externalLinks = [];
  const socialLinks = [];

  linkTags.forEach((tag) => {
    const href = attrValue(tag, "href");
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
      return;
    }

    const selector = `${tagSelector(tag, "a")}[href="${quoteAttr(shortValue(href, 90))}"]`;
    try {
      const hrefUrl = new URL(href, origin);
      if (hrefUrl.origin === origin) {
        internalLinks.push(selector);
      } else {
        externalLinks.push(selector);
        const socialNetwork = socialNetworkForUrl(hrefUrl.href);
        if (socialNetwork) {
          socialLinks.push(`${selector} (${socialNetwork})`);
        }
      }
    } catch {
      internalLinks.push(selector);
    }
  });

  const missingAltImages = imageTags
    .filter((tag) => !attrValue(tag, "alt"))
    .map((tag) => {
      const src = attrValue(tag, "src");
      const selector = tagSelector(tag, src ? `img[src="${quoteAttr(shortValue(src, 80))}"]` : "img");
      return src ? `${selector} (missing alt, src="${shortValue(src, 60)}")` : `${selector} (missing alt)`;
    });

  return {
    title: [titleTag ? tagTextReference(titleTag, "head > title", raw.title) : "head > title (missing)"],
    metaDescription: [
      metaDescriptionTag
        ? `${tagSelector(metaDescriptionTag, 'head > meta[name="description"]')} (content="${shortValue(raw.meta_description, 90)}")`
        : 'head > meta[name="description"] (missing)',
    ],
    h1: h1Tags.length ? h1Tags.slice(0, 5).map((tag) => tagTextReference(tag, "main h1")) : ["main h1 (missing)"],
    h2: h2Tags.length ? h2Tags.slice(0, 6).map((tag) => tagTextReference(tag, "main h2")) : ["main h2 (none found)"],
    canonical: [canonicalTag ? `${tagSelector(canonicalTag, 'head > link[rel="canonical"]')} (href="${shortValue(raw.canonical, 90)}")` : 'head > link[rel="canonical"] (missing)'],
    schema: schemaTags.length ? schemaTags.slice(0, 6).map((tag) => tagSelector(tag, 'script[type="application/ld+json"]')) : ['script[type="application/ld+json"] (missing)'],
    images: missingAltImages.length
      ? collectUnique(missingAltImages, 6)
      : imageTags.length
        ? imageTags.slice(0, 6).map((tag) => tagSelector(tag, "img[alt]"))
        : ["img[alt] (no images found)"],
    internalLinks: internalLinks.length ? collectUnique(internalLinks, 6) : ["main a[href] (no internal links found)"],
    externalLinks: externalLinks.length ? collectUnique(externalLinks, 6) : ["main a[href^=\"http\"] (no external links found)"],
    socialLinks: socialLinks.length ? collectUnique(socialLinks, 8) : ["footer/social profile links (none found)"],
    content: collectUnique(
      [
        raw.h1 ? `main h1 ("${shortValue(raw.h1, 70)}")` : "",
        ...(h2Tags.length ? h2Tags.slice(0, 3).map((tag) => tagTextReference(tag, "main h2")) : []),
        "main, article, or body content block",
      ],
      6
    ),
    scripts: scriptTags.length
      ? collectUnique(
          scriptTags.slice(0, 6).map((tag) => {
            const src = attrValue(tag, "src");
            return src ? `${tagSelector(tag, "script[src]")} (src="${shortValue(src, 70)}")` : tagSelector(tag, "inline script");
          }),
          6
        )
      : ["script[src] (none found)"],
    robots: ["/robots.txt", 'head > meta[name="robots"]', "X-Robots-Tag response header"],
    sitemap: ["/sitemap.xml", "robots.txt Sitemap directive"],
    llms: ["/llms.txt"],
    crawl: [`HTTP response for ${url}`, "/robots.txt", "server/CDN/WAF request logs"],
    viewport: [
      raw.viewport_meta
        ? `head > meta[name="viewport"] (content="${shortValue(raw.viewport_meta, 90)}")`
        : 'head > meta[name="viewport"] (missing)',
    ],
    forms: raw.form_count
      ? [
          `form elements (${raw.form_count} found)`,
          raw.form_inputs_without_labels
            ? `input/select/textarea without label, aria-label, or aria-labelledby (${raw.form_inputs_without_labels} found)`
            : "form fields with label coverage (all labeled)",
        ]
      : ["form (none found)"],
  };
}

function emptyRawSignals() {
  return {
    title: "",
    title_length: 0,
    meta_description: "",
    h1: "",
    headings: [],
    heading_text: "",
    h1_count: 0,
    h2_count: 0,
    h3_count: 0,
    word_count: 0,
    canonical: "",
    schema_types: [],
    structured_data_text: "",
    structured_data_items: [],
    image_count: 0,
    images_missing_alt: 0,
    image_alt_text: "",
    internal_links: 0,
    internal_anchor_text: "",
    external_links: 0,
    social_profiles: [],
    visible_text: "",
    url_slug_text: "",
    viewport_meta: "",
    form_count: 0,
    form_inputs_without_labels: 0,
    button_count: 0,
    generic_link_text_count: 0,
    font_family_hints: [],
  };
}

const GENERIC_LINK_TEXT = /^(?:click here|read more|learn more|see more|more|here|link)$/i;
const UNLABELED_INPUT_EXEMPT_TYPES = new Set(["hidden", "submit", "button", "image", "reset", "checkbox", "radio"]);

function extractUxSignals(html) {
  const formTags = html.match(/<form\b[^>]*>/gi) || [];
  const fieldTags = html.match(/<(?:input|select|textarea)\b[^>]*>/gi) || [];
  const labelForIds = new Set([...html.matchAll(/<label\b[^>]*\bfor=["']([^"']+)["']/gi)].map((match) => match[1].toLowerCase()));

  const unlabeledFields = fieldTags.filter((tag) => {
    const type = (attrValue(tag, "type") || "").toLowerCase();
    if (UNLABELED_INPUT_EXEMPT_TYPES.has(type)) {
      return false;
    }
    if (attrValue(tag, "aria-label") || attrValue(tag, "aria-labelledby")) {
      return false;
    }
    const id = (attrValue(tag, "id") || "").toLowerCase();
    return !(id && labelForIds.has(id));
  });

  const buttonCount =
    (html.match(/<button\b[^>]*>/gi) || []).length +
    fieldTags.filter((tag) => ["submit", "button"].includes((attrValue(tag, "type") || "").toLowerCase())).length;

  const genericLinkTextCount = [...html.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gi)]
    .map((match) => stripTags(match[1]).trim())
    .filter((text) => GENERIC_LINK_TEXT.test(text)).length;

  const fontFamilies = [];
  const seenFonts = new Set();
  for (const styleBlock of html.match(/<style\b[^>]*>[\s\S]*?<\/style>/gi) || []) {
    for (const match of styleBlock.matchAll(/font-family\s*:\s*([^;}{]+)/gi)) {
      const family = match[1].trim().slice(0, 80);
      const key = family.toLowerCase();
      if (family && !seenFonts.has(key)) {
        seenFonts.add(key);
        fontFamilies.push(family);
      }
      if (fontFamilies.length >= 5) {
        break;
      }
    }
    if (fontFamilies.length >= 5) {
      break;
    }
  }

  return {
    viewport_meta: findMeta(html, "viewport"),
    form_count: formTags.length,
    form_inputs_without_labels: unlabeledFields.length,
    button_count: buttonCount,
    generic_link_text_count: genericLinkTextCount,
    font_family_hints: fontFamilies,
  };
}

function extractRawSignals(url, html, markdown = "") {
  const title = decodeHtml((/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] || "").trim());
  const h1Matches = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((match) => stripTags(match[1]).trim()).filter(Boolean);
  const h2Matches = [...html.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi)].map((match) => stripTags(match[1]).trim()).filter(Boolean);
  const h3Matches = [...html.matchAll(/<h3\b[^>]*>([\s\S]*?)<\/h3>/gi)].map((match) => stripTags(match[1]).trim()).filter(Boolean);
  const canonicalTag = (html.match(/<link\b[^>]*rel=["'][^"']*canonical[^"']*["'][^>]*>/i) || [])[0] || "";
  const imageTags = html.match(/<img\b[^>]*>/gi) || [];
  const linkTags = html.match(/<a\b[^>]*href=["'][^"']+["'][^>]*>[\s\S]*?<\/a>/gi) || [];
  const origin = new URL(url).origin;

  let internalLinks = 0;
  let externalLinks = 0;
  const internalAnchorText = [];
  const socialProfiles = [];
  const seenSocialProfiles = new Set();

  linkTags.forEach((tag) => {
    const href = attrValue(tag, "href");
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
      return;
    }

    try {
      const hrefUrl = new URL(href, origin);
      if (hrefUrl.origin === origin) {
        internalLinks += 1;
        internalAnchorText.push(stripTags(tag));
      } else {
        externalLinks += 1;
        const socialNetwork = socialNetworkForUrl(hrefUrl.href);
        if (socialNetwork) {
          const profileKey = `${socialNetwork}:${hrefUrl.href}`.toLowerCase();
          if (!seenSocialProfiles.has(profileKey)) {
            seenSocialProfiles.add(profileKey);
            socialProfiles.push({
              network: socialNetwork,
              url: hrefUrl.href,
              selector: `${tagSelector(tag, "a")}[href="${quoteAttr(shortValue(href, 90))}"]`,
            });
          }
        }
      }
    } catch {
      internalLinks += 1;
      internalAnchorText.push(stripTags(tag));
    }
  });

  const imageAltText = imageTags.map((tag) => attrValue(tag, "alt")).filter(Boolean);
  const headings = [...h1Matches, ...h2Matches, ...h3Matches];

  return {
    title,
    title_length: title.length,
    meta_description: findMeta(html, "description"),
    h1: h1Matches[0] || "",
    headings,
    heading_text: headings.join(" "),
    h1_count: h1Matches.length,
    h2_count: h2Matches.length,
    h3_count: h3Matches.length,
    word_count: wordCountFrom(markdown, html),
    canonical: canonicalTag ? attrValue(canonicalTag, "href") : "",
    schema_types: extractJsonLdTypes(html),
    structured_data_text: truncateText(extractStructuredDataText(html), 10000),
    structured_data_items: extractJsonLdItems(html),
    image_count: imageTags.length,
    images_missing_alt: imageTags.filter((tag) => !attrValue(tag, "alt")).length,
    image_alt_text: truncateText(imageAltText.join(" "), 10000),
    internal_links: internalLinks,
    internal_anchor_text: truncateText(internalAnchorText.join(" "), 10000),
    external_links: externalLinks,
    social_profiles: socialProfiles.slice(0, 12),
    visible_text: truncateText(visibleTextFromHtml(html), 30000),
    url_slug_text: urlKeywordText(url),
    ...extractUxSignals(html),
  };
}

function pageLikeUrl(url) {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return false;
    }

    const pathname = parsed.pathname.toLowerCase();
    return !/\.(?:jpg|jpeg|png|gif|webp|svg|avif|pdf|zip|rar|7z|mp4|mp3|mov|avi|css|js|json|xml|txt|ico|woff2?|ttf|eot)(?:$|\?)/i.test(pathname);
  } catch {
    return false;
  }
}

function cleanCrawlUrl(value, baseUrl) {
  try {
    const parsed = new URL(decodeHtml(value), baseUrl);
    parsed.hash = "";

    if (!pageLikeUrl(parsed.href)) {
      return "";
    }

    return parsed.href;
  } catch {
    return "";
  }
}

function extractInternalPageUrls(url, html) {
  const origin = new URL(url).origin;
  const tags = html.match(/<a\b[^>]*href=["'][^"']+["'][^>]*>/gi) || [];

  return collectUnique(
    tags
      .map((tag) => attrValue(tag, "href"))
      .filter((href) => href && !href.startsWith("#") && !href.startsWith("mailto:") && !href.startsWith("tel:"))
      .map((href) => cleanCrawlUrl(href, url))
      .filter((href) => href && new URL(href).origin === origin),
    300
  );
}

function extractSitemapUrls(origin, sitemapText = "") {
  const urls = [
    ...[...String(sitemapText).matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((match) => match[1]),
    ...[...String(sitemapText).matchAll(/https?:\/\/[^\s<>"']+/gi)].map((match) => match[0]),
  ];

  return collectUnique(
    urls
      .map((item) => cleanCrawlUrl(item, origin))
      .filter((href) => href && new URL(href).origin === origin),
    500
  );
}

function selectCrawlUrls(seedUrl, html, sitemapText, limit) {
  const seed = cleanCrawlUrl(seedUrl, seedUrl);
  const origin = new URL(seedUrl).origin;
  const candidates = collectUnique(
    [
      ...extractSitemapUrls(origin, sitemapText),
      ...extractInternalPageUrls(seedUrl, html),
    ].filter((href) => href && href !== seed),
    1000
  );

  return {
    candidates,
    selected: candidates.slice(0, Math.max(0, limit - 1)),
  };
}

function duplicateValues(items, key) {
  const counts = new Map();
  items.forEach((item) => {
    const value = String(item.raw?.[key] || "").trim().toLowerCase();
    if (!value) {
      return;
    }
    counts.set(value, (counts.get(value) || 0) + 1);
  });

  return [...counts.values()].filter((count) => count > 1).reduce((sum, count) => sum + count, 0);
}

function summarizeSiteCrawl({ seedUrl, seedRaw, seedHtmlResult, pages, discoveredUrls, requestedLimit }) {
  const seedPage = {
    url: seedUrl,
    status: seedHtmlResult.status || 0,
    statusText: seedHtmlResult.statusText || "",
    ok: Boolean(seedHtmlResult.ok),
    source: seedHtmlResult.ok ? `origin_html:${seedHtmlResult.profile || "unknown"}` : "initial_page",
    profile: seedHtmlResult.profile || "",
    raw: seedRaw || emptyRawSignals(),
    error: seedHtmlResult.error || "",
  };
  const allPages = [seedPage, ...pages];
  const successful = allPages.filter((page) => page.ok);
  const rawPages = successful.map((page) => page.raw || emptyRawSignals());
  const totalWords = rawPages.reduce((sum, raw) => sum + (raw.word_count || 0), 0);
  const successfulCount = Math.max(successful.length, 1);
  const missingTitles = rawPages.filter((raw) => !raw.title).length;
  const missingMeta = rawPages.filter((raw) => !raw.meta_description).length;
  const missingH1 = rawPages.filter((raw) => raw.h1_count !== 1).length;
  const thinPages = rawPages.filter((raw) => (raw.word_count || 0) < 450).length;
  const pagesWithSchema = rawPages.filter((raw) => raw.schema_types?.length).length;
  const imagesMissingAlt = rawPages.reduce((sum, raw) => sum + (raw.images_missing_alt || 0), 0);
  const imageCount = rawPages.reduce((sum, raw) => sum + (raw.image_count || 0), 0);
  const internalLinks = rawPages.reduce((sum, raw) => sum + (raw.internal_links || 0), 0);
  const h2Count = rawPages.reduce((sum, raw) => sum + (raw.h2_count || 0), 0);
  const blockedPages = allPages.filter((page) => isAccessBlockedStatus(page.status)).length;

  return {
    enabled: requestedLimit > 1,
    requestedLimit,
    discoveredUrls,
    pages: allPages.map((page) => ({
      url: page.url,
      status: page.status,
      statusText: page.statusText || "",
      ok: page.ok,
      source: page.source,
      profile: page.profile || "",
      error: page.error || "",
      title: page.raw?.title || "",
      meta_description: page.raw?.meta_description || "",
      h1: page.raw?.h1 || "",
      headings: page.raw?.headings || [],
      heading_text: page.raw?.heading_text || "",
      h1_count: page.raw?.h1_count || 0,
      h2_count: page.raw?.h2_count || 0,
      h3_count: page.raw?.h3_count || 0,
      word_count: page.raw?.word_count || 0,
      schema_types: page.raw?.schema_types || [],
      structured_data_text: page.raw?.structured_data_text || "",
      image_count: page.raw?.image_count || 0,
      images_missing_alt: page.raw?.images_missing_alt || 0,
      image_alt_text: page.raw?.image_alt_text || "",
      internal_links: page.raw?.internal_links || 0,
      internal_anchor_text: page.raw?.internal_anchor_text || "",
      social_profiles: page.raw?.social_profiles || [],
      canonical: page.raw?.canonical || "",
      visible_text: page.raw?.visible_text || "",
      url_slug_text: page.raw?.url_slug_text || "",
    })),
    totals: {
      pagesFetched: allPages.length,
      pagesSuccessful: successful.length,
      pagesBlocked: blockedPages,
      totalWords,
      averageWords: Math.round(totalWords / successfulCount),
      averageH2: Number((h2Count / successfulCount).toFixed(1)),
      missingTitles,
      missingMeta,
      missingH1,
      thinPages,
      pagesWithSchema,
      pagesWithoutSchema: Math.max(0, successful.length - pagesWithSchema),
      duplicateTitles: duplicateValues(successful, "title"),
      duplicateMetaDescriptions: duplicateValues(successful, "meta_description"),
      imageCount,
      imagesMissingAlt,
      internalLinks,
    },
  };
}

async function mapWithConcurrency(items, limit, task) {
  const results = new Array(items.length);
  let nextIndex = 0;
  const workerCount = Math.max(1, Math.min(limit, items.length));

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await task(items[currentIndex], currentIndex);
    }
  }

  await Promise.all(Array.from({ length: workerCount }, worker));
  return results;
}

async function crawlAdditionalPages(seedUrl, html, sitemap, seedRaw, seedHtmlResult, requestedLimit) {
  const crawlLimit = Math.max(DEFAULT_SITE_CRAWL_LIMIT, Math.min(MAX_SITE_CRAWL_LIMIT, Number(requestedLimit) || DEFAULT_SITE_CRAWL_LIMIT));
  const { candidates, selected } = selectCrawlUrls(seedUrl, html, sitemap?.text || sitemap?.preview || "", crawlLimit);

  if (crawlLimit <= 1 || !selected.length) {
    return summarizeSiteCrawl({
      seedUrl,
      seedRaw,
      seedHtmlResult,
      pages: [],
      discoveredUrls: candidates.length,
      requestedLimit: crawlLimit,
    });
  }

  const pages = await mapWithConcurrency(
    selected,
    EXTRA_PAGE_CONCURRENCY,
    async (pageUrl) => {
      const result = await fetchText(pageUrl, {
        timeoutMs: EXTRA_PAGE_TIMEOUT,
      });
      const raw = result.ok && result.text ? extractRawSignals(pageUrl, result.text, "") : emptyRawSignals();

      return {
        url: pageUrl,
        status: result.status,
        statusText: result.statusText || "",
        ok: Boolean(result.ok && result.text),
        source: result.ok ? `origin_html:${result.profile || "unknown"}` : "origin_html",
        profile: result.profile || "",
        raw,
        error: result.error || "",
      };
    }
  );

  return summarizeSiteCrawl({
    seedUrl,
    seedRaw,
    seedHtmlResult,
    pages,
    discoveredUrls: candidates.length,
    requestedLimit: crawlLimit,
  });
}

async function fetchTextOnce(url, options = {}, profile = FETCH_PROFILES[0]) {
  const { controller, timer } = timeoutSignal(options.timeoutMs);
  const accept = options.accept || "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.5";

  try {
    // SSRF guard: guardedFetch follows redirects manually and re-validates the
    // host on every hop, so a public URL that redirects to a private/link-local
    // target (e.g. 169.254.169.254) is refused before that request is made.
    const { response, finalUrl, redirects } = await guardedFetch(url, {
      signal: controller.signal,
      headers: {
        accept,
        ...profile.headers,
      },
      next: { revalidate: 0 },
    });

    const text = await response.text();
    const securityEvidence = responseSecurityEvidence(response, { finalUrl, redirects });
    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      url: finalUrl,
      text,
      profile: profile.id,
      profileLabel: profile.label,
      ...securityEvidence,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      url,
      text: "",
      error: error.name === "AbortError" ? "Request timed out." : error.message,
      tlsError: error.message || "",
      profile: profile.id,
      profileLabel: profile.label,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchText(url, options = {}) {
  const profiles = options.profiles || FETCH_PROFILES;
  const attempts = [];
  let lastResult = null;

  for (const profile of profiles) {
    const result = await fetchTextOnce(url, options, profile);
    lastResult = result;
    attempts.push({
      profile: result.profile,
      profileLabel: result.profileLabel,
      ok: result.ok,
      status: result.status,
      statusText: result.statusText || "",
      url: result.url,
      error: result.error || "",
    });

    if (result.ok || !isAccessBlockedStatus(result.status)) {
      return {
        ...result,
        attempts,
      };
    }
  }

  return {
    ...lastResult,
    ok: false,
    attempts,
  };
}

function blockedSource(name, result = {}) {
  if (!isAccessBlockedStatus(result.status)) {
    return null;
  }

  return {
    source: name,
    status: result.status,
    statusText: result.statusText || "",
    url: result.readerUrl || result.url || "",
    profile: result.profile || "",
    attempts: result.attempts || [],
    preview: truncateText(result.bodyPreview || result.text || "", 1000),
  };
}

function buildAccessDiagnostics(markdownResult, htmlResult) {
  const blockedSources = [blockedSource("jina_reader", markdownResult), blockedSource("origin_html", htmlResult)].filter(Boolean);
  const markdownAvailable = Boolean(markdownResult.ok && markdownResult.markdown);
  const htmlAvailable = Boolean(htmlResult.ok && htmlResult.text);
  const contentAvailable = markdownAvailable || htmlAvailable;
  const sourceFallbackUsed = Boolean(blockedSources.length && contentAvailable);

  if (!blockedSources.length || sourceFallbackUsed) {
    return {
      blocked: false,
      level: "none",
      degraded: sourceFallbackUsed,
      reason: sourceFallbackUsed ? "One fetch path was blocked, but PageSignal recovered readable page evidence through another fetch path." : "",
      blockedSources,
      markdownAvailable,
      htmlAvailable,
      contentAvailable,
      successfulHtmlProfile: htmlResult.ok ? htmlResult.profile || "" : "",
      htmlAttempts: htmlResult.attempts || [],
    };
  }

  return {
    blocked: true,
    degraded: false,
    level: contentAvailable ? "partial" : "full",
    reason: contentAvailable
      ? "At least one crawler fetch path was blocked, but partial page evidence was still available."
      : "The target page blocked crawler access, so PageSignal could not read the content evidence.",
    blockedSources,
    markdownAvailable,
    htmlAvailable,
    contentAvailable,
    successfulHtmlProfile: htmlResult.ok ? htmlResult.profile || "" : "",
    htmlAttempts: htmlResult.attempts || [],
  };
}

function htmlToReadableMarkdown(url, html, raw) {
  const title = raw.title || raw.h1 || url;
  const sections = [
    `# ${title}`,
    raw.meta_description ? `Meta description: ${raw.meta_description}` : "",
    raw.h1 ? `## H1\n${raw.h1}` : "",
  ].filter(Boolean);
  const text = stripTags(html).replace(/\s+/g, " ").trim();

  if (text) {
    sections.push(`## Page Text\n${truncateText(text, 50000)}`);
  }

  return sections.join("\n\n");
}

function emitSignalProgress(options, event) {
  if (!options.onProgress) {
    return;
  }

  const prefix = options.progressPrefix || "site";
  const labelPrefix = options.progressLabel ? `${options.progressLabel}: ` : "";
  options.onProgress({
    ...event,
    id: `${prefix}:${event.id}`,
    label: `${labelPrefix}${event.label}`,
    timestamp: new Date().toISOString(),
  });
}

async function trackSignal(options, id, label, task, summarize) {
  emitSignalProgress(options, {
    id,
    label,
    status: "active",
  });

  try {
    const result = await task();
    emitSignalProgress(options, {
      id,
      label,
      status: "done",
      detail: summarize ? summarize(result) : "Complete.",
    });
    return result;
  } catch (error) {
    emitSignalProgress(options, {
      id,
      label,
      status: "error",
      detail: error.message || "This step failed.",
    });
    throw error;
  }
}

function statusDetail(result, resourceName) {
  if (result.exists) {
    return `${resourceName} found.`;
  }

  if (result.status === 404) {
    return `${resourceName} not found.`;
  }

  if (result.error) {
    return result.error;
  }

  return `${resourceName} returned status ${result.status || "unavailable"}.`;
}

function markdownDetail(result) {
  if (result.ok && result.markdown) {
    return `Jina Reader returned ${result.markdown.length.toLocaleString()} characters.`;
  }

  if (isAccessBlockedStatus(result.status)) {
    return `Jina Reader was blocked with status ${result.status}; origin HTML fallback will be used if available.`;
  }

  return result.error || `Jina Reader returned status ${result.status || "unavailable"}.`;
}

function htmlDetail(result) {
  if (result.ok && result.text) {
    return `Origin HTML fetched with ${result.profileLabel || result.profile || "browser profile"}.`;
  }

  if (isAccessBlockedStatus(result.status)) {
    return `Origin HTML was blocked with status ${result.status} after ${result.attempts?.length || 1} crawler profile attempts.`;
  }

  return result.error || `Origin HTML returned status ${result.status || "unavailable"}.`;
}

function vitalsDetail(result) {
  if (result?.field?.available) {
    return `CrUX field data found for ${result.field.scope || "requested scope"}.`;
  }

  if (result?.lab?.available) {
    return `PageSpeed lab data found with performance score ${result.lab.performanceScore}/100.`;
  }

  return result?.summary || result?.field?.reason || result?.lab?.reason || "Core Web Vitals data unavailable.";
}

async function fetchWellKnown(origin, path) {
  const result = await fetchText(`${origin}${path}`, {
    accept: "text/plain,application/xml,text/xml,*/*;q=0.5",
    timeoutMs: 12000,
  });
  const text = result.text.trim();

  return {
    exists: result.ok && text.length > 0,
    status: result.status,
    url: `${origin}${path}`,
    text: truncateText(text, 120000),
    preview: truncateText(text, 2000),
    error: result.error || "",
  };
}

export async function fetchSiteSignals(inputUrl, options = {}) {
  const url = normalizeUrl(inputUrl);
  const parsed = new URL(url);
  const origin = parsed.origin;

  const markdownPromise = trackSignal(
    options,
    "jina_reader",
    "Fetching readable Markdown with Jina Reader",
    () =>
      fetchPageMarkdown(url).catch((error) => ({
        url,
        readerUrl: `https://r.jina.ai/${url}`,
        markdown: "",
        ok: false,
        status: error.status || 0,
        statusText: error.statusText || "",
        bodyPreview: error.bodyPreview || "",
        error: error.message,
        fetchedAt: new Date().toISOString(),
      })),
    markdownDetail
  );

  const htmlPromise = trackSignal(
    options,
    "origin_html",
    "Fetching origin HTML with browser-like crawler profiles",
    () => fetchText(url),
    htmlDetail
  );
  const robotsPromise = trackSignal(options, "robots", "Checking robots.txt", () => fetchWellKnown(origin, "/robots.txt"), (result) =>
    statusDetail(result, "robots.txt")
  );
  const sitemapPromise = trackSignal(options, "sitemap", "Checking sitemap.xml", () => fetchWellKnown(origin, "/sitemap.xml"), (result) =>
    statusDetail(result, "sitemap.xml")
  );
  const llmsPromise = trackSignal(options, "llms", "Checking llms.txt", () => fetchWellKnown(origin, "/llms.txt"), (result) =>
    statusDetail(result, "llms.txt")
  );
  const coreWebVitalsPromise = trackSignal(
    options,
    "core_web_vitals",
    "Fetching mobile Core Web Vitals evidence",
    () => fetchCoreWebVitals(url, { devices: options.coreWebVitalsDevices || ["mobile"] }),
    vitalsDetail
  );
  const securityNetworkPromise = trackSignal(
    options,
    "security_posture",
    "Checking public security posture",
    () => fetchSecurityNetworkSignals(url, { guardedFetch }),
    (result) =>
      result.httpProbe?.tested
        ? `HTTP redirect and CAA evidence collected for ${parsed.hostname}.`
        : `CAA evidence collected; HTTP redirect probe was unavailable.`
  );

  const [markdownResult, htmlResult, robots, sitemap, llms, coreWebVitals, securityNetwork] = await Promise.all([
    markdownPromise,
    htmlPromise,
    robotsPromise,
    sitemapPromise,
    llmsPromise,
    coreWebVitalsPromise,
    securityNetworkPromise,
  ]);

  const access = buildAccessDiagnostics(markdownResult, htmlResult);
  const shouldIgnoreBlockedHtml = isAccessBlockedStatus(htmlResult.status) && !markdownResult.markdown;
  const html = shouldIgnoreBlockedHtml ? "" : htmlResult.text || "";
  const raw = access.level === "full" ? emptyRawSignals() : extractRawSignals(url, html, markdownResult.markdown);
  const markupReferences = extractMarkupReferences(url, html, raw);
  const fallbackMarkdown = !markdownResult.markdown && html ? htmlToReadableMarkdown(url, html, raw) : "";
  const markdown = markdownResult.markdown || fallbackMarkdown;
  const security = buildSecurityPosture({
    url,
    finalUrl: htmlResult.url || url,
    status: htmlResult.status || 0,
    headers: htmlResult.headers || {},
    setCookies: htmlResult.setCookies || [],
    tls: htmlResult.tls || null,
    tlsError: htmlResult.tlsError || htmlResult.error || "",
    redirects: htmlResult.redirects || [],
    httpProbe: securityNetwork.httpProbe,
    dns: securityNetwork.dns,
    html,
    responseAvailable: Boolean(htmlResult.status),
  });
  const requestedCrawlLimit = Math.max(DEFAULT_SITE_CRAWL_LIMIT, Math.min(MAX_SITE_CRAWL_LIMIT, Number(options.crawlLimit) || DEFAULT_SITE_CRAWL_LIMIT));
  const siteCrawl =
    requestedCrawlLimit > 1
      ? await trackSignal(
          options,
          "site_crawl",
          "Crawling additional same-origin pages",
          () => crawlAdditionalPages(url, html, sitemap, raw, htmlResult, requestedCrawlLimit),
          (result) => `${result.totals.pagesSuccessful} of ${result.totals.pagesFetched} sampled pages fetched from ${result.discoveredUrls} discovered URLs.`
        )
      : await crawlAdditionalPages(url, html, sitemap, raw, htmlResult, requestedCrawlLimit);

  emitSignalProgress(options, {
    id: "extract_signals",
    label: "Extracting SEO signals from collected evidence",
    status: "done",
    detail: `${raw.word_count.toLocaleString()} words, ${raw.h1_count} H1, ${raw.h2_count} H2, ${raw.schema_types.length} schema types.`,
  });

  return {
    url,
    origin,
    markdown,
    markdown_source: markdownResult.markdown ? "jina_reader" : fallbackMarkdown ? `origin_html:${htmlResult.profile || "unknown"}` : "none",
    markdown_status: markdownResult.status,
    markdown_error: markdownResult.error || "",
    html_status: htmlResult.status,
    html_ok: htmlResult.ok,
    html_profile: htmlResult.profile || "",
    html_attempts: htmlResult.attempts || [],
    html_error: htmlResult.error || "",
    access,
    raw,
    markupReferences,
    siteCrawl,
    robots,
    sitemap,
    llms,
    coreWebVitals,
    security,
    fetchedAt: new Date().toISOString(),
  };
}
