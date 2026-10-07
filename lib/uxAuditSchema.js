export const UX_AUDIT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["score", "summary", "persona_analysis", "visual_hierarchy", "accessibility", "mobile_experience", "interaction_feedback", "readability", "checklist", "tracking"],
  properties: {
    score: { type: "number", minimum: 0, maximum: 100 },
    summary: { type: "string" },
    persona_analysis: {
      type: "object",
      additionalProperties: false,
      required: ["primary", "secondary", "needs_coverage", "decision_readiness", "cta_suitability", "content_fit", "journey_implications", "experiments", "conflicts"],
      properties: {
        primary: {
          type: "object",
          additionalProperties: false,
          required: ["persona_id", "label", "assessment", "priorities"],
          properties: {
            persona_id: { type: "string" },
            label: { type: "string" },
            assessment: { type: "string" },
            priorities: { type: "array", items: { type: "string" } },
          },
        },
        secondary: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["persona_id", "label", "assessment", "priorities"],
            properties: {
              persona_id: { type: "string" },
              label: { type: "string" },
              assessment: { type: "string" },
              priorities: { type: "array", items: { type: "string" } },
            },
          },
        },
        needs_coverage: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["need_id", "persona_id", "need_type", "need", "status", "evidence", "confidence"],
            properties: {
              need_id: { type: "string" },
              persona_id: { type: "string" },
              need_type: { type: "string", enum: ["goal", "blocker"] },
              need: { type: "string" },
              status: { type: "string", enum: ["Supported", "Friction", "Missing", "Not enough evidence"] },
              evidence: { type: "string" },
              confidence: { type: "string", enum: ["High", "Medium", "Low"] },
            },
          },
        },
        decision_readiness: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["persona_id", "label", "status", "assessment", "evidence", "missing_information"],
            properties: {
              persona_id: { type: "string" },
              label: { type: "string" },
              status: { type: "string", enum: ["Ready", "Partially ready", "Not ready", "Not enough evidence"] },
              assessment: { type: "string" },
              evidence: { type: "string" },
              missing_information: { type: "array", items: { type: "string" } },
            },
          },
        },
        cta_suitability: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["persona_id", "label", "cta", "status", "assessment", "evidence", "recommendation"],
            properties: {
              persona_id: { type: "string" },
              label: { type: "string" },
              cta: { type: "string" },
              status: { type: "string", enum: ["Supported", "Friction", "Missing", "Not enough evidence"] },
              assessment: { type: "string" },
              evidence: { type: "string" },
              recommendation: { type: "string" },
            },
          },
        },
        content_fit: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["persona_id", "label", "status", "assessment", "evidence", "gaps"],
            properties: {
              persona_id: { type: "string" },
              label: { type: "string" },
              status: { type: "string", enum: ["Supported", "Friction", "Missing", "Not enough evidence"] },
              assessment: { type: "string" },
              evidence: { type: "string" },
              gaps: { type: "array", items: { type: "string" } },
            },
          },
        },
        journey_implications: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["persona_id", "label", "page_role", "before", "on_page", "next_step", "risks", "evidence", "confidence"],
            properties: {
              persona_id: { type: "string" },
              label: { type: "string" },
              page_role: { type: "string" },
              before: { type: "string" },
              on_page: { type: "string" },
              next_step: { type: "string" },
              risks: { type: "array", items: { type: "string" } },
              evidence: { type: "string" },
              confidence: { type: "string", enum: ["High", "Medium", "Low"] },
            },
          },
        },
        experiments: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["title", "personas", "hypothesis", "proposed_change", "expected_outcome", "primary_metric", "guardrail_metric", "confidence", "priority"],
            properties: {
              title: { type: "string" },
              personas: { type: "array", items: { type: "string" } },
              hypothesis: { type: "string" },
              proposed_change: { type: "string" },
              expected_outcome: { type: "string" },
              primary_metric: { type: "string" },
              guardrail_metric: { type: "string" },
              confidence: { type: "string", enum: ["High", "Medium", "Low"] },
              priority: { type: "string", enum: ["High", "Medium", "Low"] },
            },
          },
        },
        conflicts: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["personas", "tension", "resolution_pattern", "recommendation", "acceptance_criteria"],
            properties: {
              personas: { type: "array", items: { type: "string" } },
              tension: { type: "string" },
              resolution_pattern: { type: "string" },
              recommendation: { type: "string" },
              acceptance_criteria: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["persona_id", "criterion"],
                  properties: {
                    persona_id: { type: "string" },
                    criterion: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },
    visual_hierarchy: {
      type: "object",
      additionalProperties: false,
      required: ["finding", "issues"],
      properties: {
        finding: { type: "string" },
        issues: { type: "array", items: { type: "string" } },
      },
    },
    accessibility: {
      type: "object",
      additionalProperties: false,
      required: ["assessment", "issues"],
      properties: {
        assessment: { type: "string" },
        issues: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["issue", "severity", "evidence"],
            properties: {
              issue: { type: "string" },
              severity: { type: "string", enum: ["Critical", "Warning", "Info"] },
              evidence: { type: "string" },
            },
          },
        },
      },
    },
    mobile_experience: {
      type: "object",
      additionalProperties: false,
      required: ["viewport", "tap_targets", "issues"],
      properties: {
        viewport: { type: "string" },
        tap_targets: { type: "string" },
        issues: { type: "array", items: { type: "string" } },
      },
    },
    interaction_feedback: {
      type: "object",
      additionalProperties: false,
      required: ["forms", "navigation", "issues"],
      properties: {
        forms: { type: "string" },
        navigation: { type: "string" },
        issues: { type: "array", items: { type: "string" } },
      },
    },
    readability: {
      type: "object",
      additionalProperties: false,
      required: ["finding", "issues"],
      properties: {
        finding: { type: "string" },
        issues: { type: "array", items: { type: "string" } },
      },
    },
    checklist: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["task", "priority", "impact", "personas", "acceptance_criteria"],
        properties: {
          task: { type: "string" },
          priority: { type: "string", enum: ["High", "Medium"] },
          impact: { type: "string" },
          personas: { type: "array", items: { type: "string" } },
          acceptance_criteria: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["persona_id", "criterion"],
              properties: {
                persona_id: { type: "string" },
                criterion: { type: "string" },
              },
            },
          },
        },
      },
    },
    tracking: {
      type: "object",
      additionalProperties: false,
      required: ["metric", "tool", "method"],
      properties: {
        metric: { type: "string" },
        tool: { type: "string" },
        method: { type: "string" },
      },
    },
  },
};

const VISION_PLACEHOLDER = "Visual hierarchy review requires AI vision analysis. Configure an OpenAI API key to review the rendered screenshot.";

function clampScore(value) {
  const score = Number(value);
  if (!Number.isFinite(score)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

function asString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function asArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => String(item || "").trim()).filter(Boolean);
}

function normalizeSeverity(value) {
  return ["Critical", "Warning", "Info"].includes(value) ? value : "Info";
}

function normalizeEnum(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

function normalizeConfidence(value) {
  return normalizeEnum(value, ["High", "Medium", "Low"], "Low");
}

function normalizePersonaFit(value) {
  return normalizeEnum(value, ["Supported", "Friction", "Missing", "Not enough evidence"], "Not enough evidence");
}

function normalizeAcceptanceCriteria(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (typeof item === "string") {
        return { persona_id: "shared", criterion: asString(item) };
      }
      return {
        persona_id: asString(item?.persona_id, "shared"),
        criterion: asString(item?.criterion),
      };
    })
    .filter((item) => item.criterion)
    .slice(0, 12);
}

function normalizePersonaLens(input = {}) {
  return {
    persona_id: asString(input.persona_id),
    label: asString(input.label, "Selected persona"),
    assessment: asString(input.assessment, "No persona-specific assessment was produced."),
    priorities: asArray(input.priorities).slice(0, 6),
  };
}

export function normalizeUxAudit(input = {}) {
  const visualHierarchy = input.visual_hierarchy || {};
  const accessibility = input.accessibility || {};
  const mobileExperience = input.mobile_experience || {};
  const interactionFeedback = input.interaction_feedback || {};
  const readability = input.readability || {};
  const personaAnalysis = input.persona_analysis || {};

  return {
    score: clampScore(input.score),
    summary: asString(input.summary, "UX evidence was collected, but no summary was produced."),
    persona_analysis: {
      primary: normalizePersonaLens(personaAnalysis.primary),
      secondary: Array.isArray(personaAnalysis.secondary) ? personaAnalysis.secondary.map(normalizePersonaLens).slice(0, 2) : [],
      needs_coverage: Array.isArray(personaAnalysis.needs_coverage)
        ? personaAnalysis.needs_coverage
            .map((item, index) => ({
              need_id: asString(item?.need_id, `need-${index + 1}`),
              persona_id: asString(item?.persona_id),
              need_type: normalizeEnum(item?.need_type, ["goal", "blocker"], "goal"),
              need: asString(item?.need, "Persona need requires review."),
              status: normalizePersonaFit(item?.status),
              evidence: asString(item?.evidence, "The available page evidence does not support a confident conclusion."),
              confidence: normalizeConfidence(item?.confidence),
            }))
            .slice(0, 30)
        : [],
      decision_readiness: Array.isArray(personaAnalysis.decision_readiness)
        ? personaAnalysis.decision_readiness
            .map((item) => ({
              persona_id: asString(item?.persona_id),
              label: asString(item?.label, "Selected persona"),
              status: normalizeEnum(item?.status, ["Ready", "Partially ready", "Not ready", "Not enough evidence"], "Not enough evidence"),
              assessment: asString(item?.assessment, "Decision readiness could not be confirmed from the available evidence."),
              evidence: asString(item?.evidence, "Not enough evidence."),
              missing_information: asArray(item?.missing_information).slice(0, 8),
            }))
            .slice(0, 3)
        : [],
      cta_suitability: Array.isArray(personaAnalysis.cta_suitability)
        ? personaAnalysis.cta_suitability
            .map((item) => ({
              persona_id: asString(item?.persona_id),
              label: asString(item?.label, "Selected persona"),
              cta: asString(item?.cta, "Not detected"),
              status: normalizePersonaFit(item?.status),
              assessment: asString(item?.assessment, "CTA suitability could not be confirmed from the available evidence."),
              evidence: asString(item?.evidence, "Not enough evidence."),
              recommendation: asString(item?.recommendation, "Verify the primary CTA in a rendered, consent-cleared view."),
            }))
            .slice(0, 3)
        : [],
      content_fit: Array.isArray(personaAnalysis.content_fit)
        ? personaAnalysis.content_fit
            .map((item) => ({
              persona_id: asString(item?.persona_id),
              label: asString(item?.label, "Selected persona"),
              status: normalizePersonaFit(item?.status),
              assessment: asString(item?.assessment, "Content fit could not be confirmed from the available evidence."),
              evidence: asString(item?.evidence, "Not enough evidence."),
              gaps: asArray(item?.gaps).slice(0, 8),
            }))
            .slice(0, 3)
        : [],
      journey_implications: Array.isArray(personaAnalysis.journey_implications)
        ? personaAnalysis.journey_implications
            .map((item) => ({
              persona_id: asString(item?.persona_id),
              label: asString(item?.label, "Selected persona"),
              page_role: asString(item?.page_role, "Journey role not established"),
              before: asString(item?.before, "Not enough evidence to infer the preceding journey step."),
              on_page: asString(item?.on_page, "Not enough evidence to infer the on-page task."),
              next_step: asString(item?.next_step, "Not enough evidence to infer the next journey step."),
              risks: asArray(item?.risks).slice(0, 8),
              evidence: asString(item?.evidence, "This is a hypothesis based on limited page evidence."),
              confidence: normalizeConfidence(item?.confidence),
            }))
            .slice(0, 3)
        : [],
      experiments: Array.isArray(personaAnalysis.experiments)
        ? personaAnalysis.experiments
            .map((item) => ({
              title: asString(item?.title, "Test a clearer decision path"),
              personas: asArray(item?.personas).slice(0, 3),
              hypothesis: asString(item?.hypothesis, "A clearer decision path may reduce uncertainty."),
              proposed_change: asString(item?.proposed_change, "Clarify the next action and the information needed to take it."),
              expected_outcome: asString(item?.expected_outcome, "More users can make an informed next-step decision."),
              primary_metric: asString(item?.primary_metric, "Primary CTA completion rate"),
              guardrail_metric: asString(item?.guardrail_metric),
              confidence: normalizeConfidence(item?.confidence),
              priority: normalizeEnum(item?.priority, ["High", "Medium", "Low"], "Medium"),
            }))
            .slice(0, 10)
        : [],
      conflicts: Array.isArray(personaAnalysis.conflicts)
        ? personaAnalysis.conflicts
            .map((item) => ({
              personas: asArray(item?.personas).slice(0, 3),
              tension: asString(item?.tension, "Competing persona needs require review."),
              resolution_pattern: asString(item?.resolution_pattern, "Progressive disclosure"),
              recommendation: asString(item?.recommendation, "Test a design that supports both persona needs without hiding essential controls."),
              acceptance_criteria: normalizeAcceptanceCriteria(item?.acceptance_criteria),
            }))
            .slice(0, 3)
        : [],
    },
    visual_hierarchy: {
      finding: asString(visualHierarchy.finding, VISION_PLACEHOLDER),
      issues: asArray(visualHierarchy.issues).slice(0, 10),
    },
    accessibility: {
      assessment: asString(accessibility.assessment, "Accessibility evidence was not available."),
      issues: Array.isArray(accessibility.issues)
        ? accessibility.issues
            .map((item) => ({
              issue: asString(item?.issue, "Accessibility issue detected."),
              severity: normalizeSeverity(item?.severity),
              evidence: asString(item?.evidence, "Reported by Lighthouse accessibility audits."),
            }))
            .slice(0, 12)
        : [],
    },
    mobile_experience: {
      viewport: asString(mobileExperience.viewport, "Viewport configuration evidence was not available."),
      tap_targets: asString(mobileExperience.tap_targets, "Tap target evidence was not available."),
      issues: asArray(mobileExperience.issues).slice(0, 10),
    },
    interaction_feedback: {
      forms: asString(interactionFeedback.forms, "No form evidence was found on this page."),
      navigation: asString(interactionFeedback.navigation, "Navigation evidence was not available."),
      issues: asArray(interactionFeedback.issues).slice(0, 10),
    },
    readability: {
      finding: asString(readability.finding, "Readability evidence was not available."),
      issues: asArray(readability.issues).slice(0, 10),
    },
    checklist: Array.isArray(input.checklist)
      ? input.checklist
          .map((item) => ({
            task: asString(item?.task, "Improve the page user experience."),
            priority: item?.priority === "High" ? "High" : "Medium",
            impact: asString(item?.impact, "Improves usability, accessibility, and task completion."),
            personas: asArray(item?.personas).slice(0, 3),
            acceptance_criteria: normalizeAcceptanceCriteria(item?.acceptance_criteria),
          }))
          .slice(0, 10)
      : [],
    tracking: {
      metric: asString(input.tracking?.metric, "INP, CLS, and Lighthouse accessibility score"),
      tool: asString(input.tracking?.tool, "PageSpeed Insights and Chrome UX Report"),
      method: asString(input.tracking?.method, "Re-run the UX audit after changes and compare Core Web Vitals field data over 28 days."),
    },
  };
}

function metricRating(metric) {
  return metric?.rating || metric?.assessment || "";
}

function uxCategoryAudits(lab, category) {
  return (lab?.categoryAudits || []).filter((audit) => String(audit.category || "").toLowerCase().startsWith(category));
}

function personaConflict(left, right) {
  const key = [left.id, right.id].sort().join(":");
  const conflicts = {
    "alex:lucy": {
      tension: "Reassurance for a cautious limited-budget buyer versus concise planning detail for an experienced marketer.",
      recommendation: "Lead with a simple low-risk path, then progressively reveal transparent budget allocation and outcome detail.",
    },
    "alex:sarah": {
      tension: "Guided reassurance and simplicity versus immediate access to granular inventory and campaign controls.",
      recommendation: "Use guided defaults for newcomers while keeping clearly labelled advanced controls available without extra navigation.",
    },
    "lucy:sarah": {
      tension: "Recommended guidance for a first-time evaluator versus direct expert control over settings and reporting.",
      recommendation: "Show recommended defaults with transparent reasoning, while allowing every important setting to be inspected and edited.",
    },
  };
  const conflict = conflicts[key];
  return conflict ? { personas: [left.id, right.id], ...conflict } : null;
}

function heuristicPersonaLens(persona) {
  return {
    persona_id: persona.id,
    label: persona.label,
    assessment: `Validate the observed page evidence against this priority: ${persona.auditFocus}`,
    priorities: [...persona.goals, ...persona.blockers].slice(0, 5),
  };
}

function personaNeeds(persona) {
  return [
    ...persona.goals.map((need, index) => ({
      need_id: `${persona.id}-goal-${index + 1}`,
      persona_id: persona.id,
      need_type: "goal",
      need,
      status: "Not enough evidence",
      evidence: "The structural evidence does not confirm whether this goal is supported in the rendered experience.",
      confidence: "Low",
    })),
    ...persona.blockers.map((need, index) => ({
      need_id: `${persona.id}-blocker-${index + 1}`,
      persona_id: persona.id,
      need_type: "blocker",
      need,
      status: "Not enough evidence",
      evidence: "The structural evidence does not confirm whether this blocker is resolved in the rendered experience.",
      confidence: "Low",
    })),
  ];
}

function heuristicDecisionReadiness(persona) {
  return {
    persona_id: persona.id,
    label: persona.label,
    status: "Not enough evidence",
    assessment: "A rendered, consent-cleared view is needed to judge whether this persona can make an informed decision.",
    evidence: "The fallback audit has structural evidence only.",
    missing_information: persona.blockers.slice(0, 3),
  };
}

function heuristicPersonaFit(persona, kind) {
  return {
    persona_id: persona.id,
    label: persona.label,
    status: "Not enough evidence",
    assessment: `${kind} could not be assessed confidently without verified rendered evidence.`,
    evidence: "The fallback audit has structural evidence only.",
  };
}

export function heuristicUxAudit({ url, signals = {}, coreWebVitals = null, primaryPersona = null, secondaryPersonas = [] }) {
  const raw = signals.raw || {};
  const field = coreWebVitals?.field || {};
  const lab = coreWebVitals?.lab || {};
  const accessibilityScore = lab?.categoryScores?.accessibility;
  const bestPracticesScore = lab?.categoryScores?.bestPractices;
  const accessibilityAudits = uxCategoryAudits(lab, "accessibility");
  const bestPracticeAudits = uxCategoryAudits(lab, "best");
  const inp = field?.metrics?.inp;
  const cls = field?.metrics?.cls || lab?.metrics?.cls;
  const selectedPersonas = [primaryPersona, ...secondaryPersonas].filter(Boolean);

  let score = 50;
  const mobileIssues = [];
  const interactionIssues = [];
  const readabilityIssues = [];

  if (raw.viewport_meta) {
    score += 8;
  } else {
    score -= 8;
    mobileIssues.push("No viewport meta tag was detected, so the page may not scale correctly on mobile devices.");
  }

  if (typeof accessibilityScore === "number" && accessibilityScore > 0) {
    score += Math.round((accessibilityScore - 50) / 5);
  }

  if (typeof bestPracticesScore === "number" && bestPracticesScore >= 90) {
    score += 4;
  }

  const inpRating = metricRating(inp);
  if (inpRating === "good") {
    score += 6;
  } else if (inpRating === "poor") {
    score -= 8;
    interactionIssues.push(`Real-user interaction latency is poor (INP ${inp?.display || ""}). Users experience sluggish responses to taps and clicks.`.trim());
  }

  const clsRating = metricRating(cls);
  if (clsRating === "good") {
    score += 5;
  } else if (clsRating === "poor") {
    score -= 8;
    mobileIssues.push(`Layout shifts are poor (CLS ${cls?.display || ""}). Content moves while loading, causing mis-taps.`.trim());
  }

  if (raw.form_inputs_without_labels > 0) {
    score -= 5;
    interactionIssues.push(`${raw.form_inputs_without_labels} form field${raw.form_inputs_without_labels === 1 ? "" : "s"} appear to have no label, aria-label, or aria-labelledby.`);
  }

  if (raw.generic_link_text_count > 2) {
    score -= 3;
    interactionIssues.push(`${raw.generic_link_text_count} links use generic text like "click here" or "read more", which weakens scannability and screen reader navigation.`);
  }

  if (raw.images_missing_alt > 0) {
    score -= 4;
  }

  if (raw.h1_count === 1 && raw.h2_count >= 2) {
    score += 4;
  } else {
    readabilityIssues.push("Heading hierarchy is weak; a single H1 with descriptive H2 sections improves scannability and assistive navigation.");
  }

  if (raw.word_count > 0 && raw.word_count < 150) {
    readabilityIssues.push("Very little visible text content was found; verify the page renders meaningful content without JavaScript.");
  }

  const accessibilityIssues = [
    ...(raw.images_missing_alt > 0
      ? [
          {
            issue: `${raw.images_missing_alt} image${raw.images_missing_alt === 1 ? "" : "s"} missing alt text.`,
            severity: "Warning",
            evidence: "Detected from raw HTML img tags without an alt attribute.",
          },
        ]
      : []),
    ...accessibilityAudits.slice(0, 8).map((audit) => ({
      issue: audit.title,
      severity: typeof audit.score === "number" && audit.score < 0.5 ? "Critical" : "Warning",
      evidence: audit.displayValue || `Lighthouse accessibility audit "${audit.id}" failed.`,
    })),
  ];

  accessibilityIssues.slice(0, 4).forEach((issue) => {
    score -= issue.severity === "Critical" ? 4 : 2;
  });

  const checklist = [
    ...selectedPersonas.map((persona) => ({
      task: persona.heuristicTask,
      priority: "High",
      impact: persona.heuristicImpact,
      personas: [persona.id],
    })),
    ...(raw.viewport_meta
      ? []
      : [
          {
            task: "Add a responsive viewport meta tag so the page scales correctly on mobile devices.",
            priority: "High",
            impact: "Restores baseline mobile usability and prevents zoomed-out desktop rendering on phones.",
            personas: selectedPersonas.map((persona) => persona.id),
          },
        ]),
    ...(accessibilityIssues.length
      ? [
          {
            task: "Fix the detected accessibility issues, starting with missing alt text and failed Lighthouse accessibility audits.",
            priority: "High",
            impact: "Improves usability for assistive technology users and reduces legal and brand risk.",
            personas: selectedPersonas.map((persona) => persona.id),
          },
        ]
      : []),
    ...(interactionIssues.length
      ? [
          {
            task: "Label all form fields and replace generic link text with descriptive actions.",
            priority: "Medium",
            impact: "Makes forms and navigation understandable for all users, including screen reader users.",
            personas: selectedPersonas.map((persona) => persona.id),
          },
        ]
      : []),
    ...(inpRating === "poor" || clsRating === "poor"
      ? [
          {
            task: "Stabilize the layout and reduce interaction latency (reserve media space, split long tasks, defer non-critical scripts).",
            priority: "High",
            impact: "Directly improves real-user INP and CLS, reducing rage clicks and mis-taps.",
            personas: selectedPersonas.map((persona) => persona.id),
          },
        ]
      : []),
    {
      task: "Re-run the UX audit after changes to confirm accessibility and Core Web Vitals improvements.",
      priority: "Medium",
      impact: "Verifies fixes with fresh Lighthouse and field evidence.",
      personas: selectedPersonas.map((persona) => persona.id),
    },
  ];

  return normalizeUxAudit({
    score,
    summary: [
      `Heuristic UX review for ${url}.`,
      primaryPersona ? `Findings and recommendations prioritize ${primaryPersona.label}${secondaryPersonas.length ? ` and compare ${secondaryPersonas.map((persona) => persona.label).join(" and ")}` : ""}.` : "",
      typeof accessibilityScore === "number" && accessibilityScore > 0 ? `Lighthouse accessibility score is ${accessibilityScore}/100.` : "Lighthouse accessibility data was unavailable.",
      raw.viewport_meta ? "A viewport meta tag is present." : "No viewport meta tag was found.",
    ].filter(Boolean).join(" "),
    persona_analysis: {
      primary: primaryPersona ? heuristicPersonaLens(primaryPersona) : {},
      secondary: secondaryPersonas.map(heuristicPersonaLens),
      needs_coverage: selectedPersonas.flatMap(personaNeeds),
      decision_readiness: selectedPersonas.map(heuristicDecisionReadiness),
      cta_suitability: selectedPersonas.map((persona) => ({
        ...heuristicPersonaFit(persona, "CTA suitability"),
        cta: "Not detected",
        recommendation: "Review the rendered primary CTA and confirm that its label, destination, and commitment match this persona's needs.",
      })),
      content_fit: selectedPersonas.map((persona) => ({
        ...heuristicPersonaFit(persona, "Content fit"),
        gaps: persona.blockers.slice(0, 3),
      })),
      journey_implications: selectedPersonas.map((persona) => ({
        persona_id: persona.id,
        label: persona.label,
        page_role: "Hypothesis: evaluation page",
        before: "Hypothesis: the visitor arrives while researching whether the product fits their needs.",
        on_page: `Hypothesis: the visitor looks for evidence related to ${persona.goals[0]?.toLowerCase() || "their goal"}.`,
        next_step: "Hypothesis: the visitor needs a clear, low-friction next action.",
        risks: persona.blockers.slice(0, 3),
        evidence: "This journey is a conservative hypothesis derived from the selected persona, not observed user behaviour.",
        confidence: "Low",
      })),
      experiments: selectedPersonas.map((persona) => ({
        title: `Clarify the decision path for ${persona.shortLabel}`,
        personas: [persona.id],
        hypothesis: `Making ${persona.goals[0]?.toLowerCase() || "the persona goal"} easier to evaluate may reduce decision uncertainty.`,
        proposed_change: persona.heuristicTask,
        expected_outcome: "More visitors can make an informed decision about the next step.",
        primary_metric: "Primary CTA completion rate",
        guardrail_metric: "Qualified lead rate",
        confidence: "Low",
        priority: "Medium",
      })),
      conflicts: selectedPersonas.flatMap((persona, index) => selectedPersonas.slice(index + 1).map((other) => {
        const conflict = personaConflict(persona, other);
        return conflict
          ? {
              ...conflict,
              resolution_pattern: "Progressive disclosure",
              acceptance_criteria: [
                { persona_id: persona.id, criterion: `The experience visibly supports ${persona.goals[0]?.toLowerCase() || "this persona's primary goal"}.` },
                { persona_id: other.id, criterion: `The experience visibly supports ${other.goals[0]?.toLowerCase() || "this persona's primary goal"}.` },
              ],
            }
          : null;
      }).filter(Boolean)),
    },
    visual_hierarchy: {
      finding: VISION_PLACEHOLDER,
      issues: [],
    },
    accessibility: {
      assessment:
        typeof accessibilityScore === "number" && accessibilityScore > 0
          ? `Lighthouse accessibility score: ${accessibilityScore}/100 with ${accessibilityAudits.length} failed audit${accessibilityAudits.length === 1 ? "" : "s"}.`
          : "Lighthouse accessibility data was unavailable; assessment is based on raw HTML evidence only.",
      issues: accessibilityIssues,
    },
    mobile_experience: {
      viewport: raw.viewport_meta ? `Viewport meta tag found: ${raw.viewport_meta}` : "No viewport meta tag was detected.",
      tap_targets: bestPracticeAudits.length || accessibilityAudits.some((audit) => audit.id === "target-size") ? "Lighthouse flagged tap target or best-practice issues; review the accessibility issue list." : "No tap target failures were reported by available Lighthouse audits.",
      issues: mobileIssues,
    },
    interaction_feedback: {
      forms: raw.form_count
        ? `${raw.form_count} form${raw.form_count === 1 ? "" : "s"} found; ${raw.form_inputs_without_labels} field${raw.form_inputs_without_labels === 1 ? "" : "s"} without an accessible label.`
        : "No forms were found on this page.",
      navigation: `${raw.internal_links || 0} internal links detected${raw.generic_link_text_count ? `, ${raw.generic_link_text_count} with generic link text` : ""}.`,
      issues: interactionIssues,
    },
    readability: {
      finding: `The page has approximately ${raw.word_count || 0} words, ${raw.h2_count || 0} H2 sections${raw.font_family_hints?.length ? `, and uses font stacks such as ${raw.font_family_hints.slice(0, 2).join("; ")}` : ""}.`,
      issues: readabilityIssues,
    },
    checklist,
    tracking: {
      metric: "INP, CLS, and Lighthouse accessibility score",
      tool: "PageSpeed Insights and Chrome UX Report",
      method: `Re-run the UX audit for ${url} after changes and compare INP, CLS, and the accessibility score over a 28-day field window.`,
    },
  });
}
