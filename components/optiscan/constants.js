import { FindInPageOutlined as FileSearch } from "../design/icons";
import { CompareArrowsOutlined as GitCompareArrows } from "../design/icons";
import { LanguageOutlined as Globe2 } from "../design/icons";
import { TouchAppOutlined as MousePointerClick } from "../design/icons";

export const MODES = [
  {
    id: "site",
    label: "Site analysis",
    shortLabel: "Website Scan",
    description: "Find crawl, content, technical, AI readiness, and Core Web Vitals issues across a sampled site scan.",
    ctaLabel: "Scan website",
    loadingLabel: "Scanning website",
    Icon: Globe2,
  },
  {
    id: "page",
    label: "Page analysis",
    shortLabel: "Page Audit",
    description: "Audit one URL against up to 5 keywords and turn the findings into a focused page backlog.",
    ctaLabel: "Audit page",
    loadingLabel: "Auditing page",
    Icon: FileSearch,
  },
  {
    id: "compare",
    label: "Compare sites",
    shortLabel: "Competitor Analysis",
    description: "Benchmark your site against two competitors and see where they are stronger.",
    ctaLabel: "Compare sites",
    loadingLabel: "Comparing sites",
    Icon: GitCompareArrows,
  },
  {
    id: "ux",
    label: "Audit UX",
    shortLabel: "UX Audit",
    description: "Review one URL's rendered design, accessibility, mobile experience, and interaction quality with screenshot-backed AI analysis.",
    ctaLabel: "Audit UX",
    loadingLabel: "Auditing UX",
    Icon: MousePointerClick,
  },
];

export const SEO_MODES = MODES.filter((mode) => mode.id !== "ux");

export const REPORT_TABS = {
  page: [
    ["overview", "Overview"],
    ["keywords", "Keywords"],
    ["categories", "Categories"],
    ["vitals", "Vitals"],
    ["technical", "Technical SEO"],
    ["content", "Content Strategy"],
    ["actions", "Action Plan"],
    ["tickets", "Tickets"],
    ["tracking", "Metrics"],
  ],
  site: [
    ["overview", "Overview"],
    ["keywords", "Keywords"],
    ["categories", "Categories"],
    ["crawled", "Crawled pages"],
    ["vitals", "Vitals"],
    ["security", "Security"],
    ["tickets", "Tickets"],
    ["tracking", "Metrics"],
  ],
  compare: [
    ["overview", "Overview"],
    ["categories", "Categories"],
    ["vitals", "Vitals"],
    ["wins", "Wins"],
    ["gaps", "Gaps"],
    ["actions", "Action plan"],
    ["tickets", "Tickets"],
    ["tracking", "Metrics"],
  ],
  ux: [
    ["overview", "Overview"],
    ["personas", "Persona Analysis"],
    ["journey", "Journey"],
    ["experiments", "Experiments"],
    ["evidence", "Evidence"],
    ["tickets", "Tickets"],
  ],
};

export const CRAWL_LIMIT_OPTIONS = [
  {
    value: 5,
    label: "Sample crawl",
    detail: "Up to 5 pages",
  },
  {
    value: 25,
    label: "Deep crawl",
    detail: "Up to 25 pages",
  },
  {
    value: 100,
    label: "Sitemap crawl",
    detail: "Up to 100 pages",
  },
];

export const EMPTY_AUDIT = {
  page: "Audit a page to see a score with context, keyword gaps, AI readiness, Core Web Vitals evidence, and implementation tickets.",
  site: "Scan a website to see crawl evidence, grouped SEO categories, Core Web Vitals evidence, and a ready implementation backlog.",
  compare: "Compare with rivals to see scorecards, competitor advantages, gaps, and a prioritized action plan.",
  ux: "Audit a page's UX to see a rendered screenshot review, accessibility issues, mobile experience evidence, and developer-ready fixes.",
};

export const INITIAL_PROGRESS_EVENT = {
  id: "submit",
  label: "Submitting analysis request",
  status: "active",
  detail: "Opening a live backend progress stream.",
  progress: 2,
};

export const MODE_LABELS = {
  page: "Page Audit",
  site: "Website Scan",
  compare: "Competitor Analysis",
  ux: "UX Audit",
};
