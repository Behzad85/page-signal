// Validates extracted JSON-LD entities against Google's rich-result
// eligibility requirements. This is a predictive, standalone check (no Google
// account needed) that emulates the Rich Results Test: it reports which
// detected structured-data types are eligible, invalid (missing a required
// property), or incomplete (missing a recommended property).
//
// Property paths support dotted nesting and "[]" to mean "for array items".
// Examples: "offers.price", "mainEntity[].acceptedAnswer.text".

const TYPE_ALIASES = {
  blogposting: "Article",
  newsarticle: "Article",
  article: "Article",
  techarticle: "Article",
  product: "Product",
  productgroup: "Product",
  breadcrumblist: "BreadcrumbList",
  faqpage: "FAQPage",
  howto: "HowTo",
  recipe: "Recipe",
  event: "Event",
  organization: "Organization",
  onlinebusiness: "Organization",
  localbusiness: "LocalBusiness",
  review: "Review",
  aggregaterating: "AggregateRating",
  videoobject: "VideoObject",
  jobposting: "JobPosting",
};

// rich = the Google rich-result feature name shown to users.
const RULES = {
  Article: {
    rich: "Article",
    required: ["headline"],
    recommended: ["image", "datePublished", "dateModified", "author"],
  },
  Product: {
    rich: "Product / merchant listing",
    // A Product is eligible with either offers, review, or aggregateRating;
    // name is always required. The either-of set is handled below.
    required: ["name"],
    anyOf: ["offers", "review", "aggregateRating"],
    recommended: ["image", "description", "brand", "sku", "aggregateRating", "offers.priceCurrency", "offers.price"],
  },
  BreadcrumbList: {
    rich: "Breadcrumb",
    required: ["itemListElement"],
    recommended: ["itemListElement[].position", "itemListElement[].name", "itemListElement[].item"],
  },
  FAQPage: {
    rich: "FAQ",
    required: ["mainEntity", "mainEntity[].name", "mainEntity[].acceptedAnswer"],
    recommended: ["mainEntity[].acceptedAnswer.text"],
  },
  HowTo: {
    rich: "How-to",
    required: ["name", "step"],
    recommended: ["step[].text", "step[].name", "image", "totalTime"],
  },
  Recipe: {
    rich: "Recipe",
    required: ["name", "image"],
    recommended: ["recipeIngredient", "recipeInstructions", "author", "aggregateRating", "nutrition", "prepTime", "cookTime"],
  },
  Event: {
    rich: "Event",
    required: ["name", "startDate", "location"],
    recommended: ["endDate", "location.address", "offers", "image", "performer"],
  },
  Organization: {
    rich: "Organization / logo",
    required: ["name"],
    recommended: ["url", "logo", "sameAs", "contactPoint"],
  },
  LocalBusiness: {
    rich: "Local business",
    required: ["name", "address"],
    recommended: ["telephone", "openingHours", "geo", "priceRange", "image"],
  },
  Review: {
    rich: "Review snippet",
    required: ["itemReviewed", "reviewRating", "author"],
    recommended: ["reviewRating.ratingValue", "datePublished"],
  },
  AggregateRating: {
    rich: "Review snippet",
    required: ["ratingValue", "ratingCount"],
    recommended: ["bestRating", "reviewCount", "itemReviewed"],
  },
  VideoObject: {
    rich: "Video",
    required: ["name", "description", "thumbnailUrl", "uploadDate"],
    recommended: ["duration", "contentUrl", "embedUrl"],
  },
  JobPosting: {
    rich: "Job posting",
    required: ["title", "description", "datePosted", "hiringOrganization", "jobLocation"],
    recommended: ["validThrough", "baseSalary", "employmentType"],
  },
};

function canonicalType(rawType) {
  if (Array.isArray(rawType)) {
    for (const candidate of rawType) {
      const mapped = canonicalType(candidate);
      if (mapped) {
        return mapped;
      }
    }
    return null;
  }
  if (!rawType || typeof rawType !== "string") {
    return null;
  }
  // Strip schema.org URL prefixes and take the final type token.
  const token = rawType.split(/[/#]/).pop().trim().toLowerCase();
  return TYPE_ALIASES[token] || null;
}

function hasValue(value) {
  if (value === null || value === undefined) {
    return false;
  }
  if (typeof value === "string") {
    return value.trim().length > 0;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  if (typeof value === "object") {
    return Object.keys(value).length > 0;
  }
  return true;
}

// Resolves a dotted/[] path against an entity. Returns true if at least one
// resolved leaf has a value. "[]" requires the array to be non-empty AND every
// remaining segment to resolve on its items.
function pathPresent(entity, path) {
  const segments = path.split(".");

  function walk(node, index) {
    if (index >= segments.length) {
      return hasValue(node);
    }
    if (node === null || node === undefined) {
      return false;
    }

    let segment = segments[index];
    const isArraySegment = segment.endsWith("[]");
    if (isArraySegment) {
      segment = segment.slice(0, -2);
    }

    const next = segment ? node[segment] : node;
    if (next === undefined || next === null) {
      return false;
    }

    if (isArraySegment) {
      const arr = Array.isArray(next) ? next : [next];
      if (!arr.length) {
        return false;
      }
      // Eligible if every item satisfies the remaining path.
      return arr.every((item) => walk(item, index + 1));
    }

    if (Array.isArray(next)) {
      return next.some((item) => walk(item, index + 1));
    }

    return walk(next, index + 1);
  }

  return walk(entity, 0);
}

function evaluateEntity(entity) {
  const type = canonicalType(entity["@type"]);
  if (!type || !RULES[type]) {
    return null;
  }

  const rule = RULES[type];
  const missingRequired = (rule.required || []).filter((path) => !pathPresent(entity, path));

  if (rule.anyOf && !rule.anyOf.some((path) => pathPresent(entity, path))) {
    missingRequired.push(`one of: ${rule.anyOf.join(", ")}`);
  }

  const missingRecommended = (rule.recommended || []).filter((path) => !pathPresent(entity, path));

  const status = missingRequired.length ? "invalid" : missingRecommended.length ? "incomplete" : "eligible";

  return {
    type,
    richResult: rule.rich,
    status,
    missingRequired,
    missingRecommended,
    name: typeof entity.name === "string" ? entity.name : typeof entity.headline === "string" ? entity.headline : typeof entity.title === "string" ? entity.title : "",
  };
}

export function validateRichResults(items = []) {
  const findings = [];
  for (const item of Array.isArray(items) ? items : []) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const finding = evaluateEntity(item);
    if (finding) {
      findings.push(finding);
    }
  }

  const eligible = findings.filter((f) => f.status === "eligible").length;
  const incomplete = findings.filter((f) => f.status === "incomplete").length;
  const invalid = findings.filter((f) => f.status === "invalid").length;

  return {
    findings,
    summary: { total: findings.length, eligible, incomplete, invalid },
    // Worst status across all detected rich-result types, for category rollup.
    status: invalid ? "invalid" : incomplete ? "incomplete" : findings.length ? "eligible" : "none",
  };
}

export function richResultStatusLabel(status) {
  if (status === "eligible") return "Eligible";
  if (status === "incomplete") return "Eligible, missing recommended";
  if (status === "invalid") return "Not eligible";
  return "No rich-result types detected";
}
