// Fictional demonstration personas, written for this public release.
export const UX_PERSONAS = [
  {
    "id": "alex",
    "value": "alex",
    "label": "Alex - cautious explorer",
    "shortLabel": "Alex",
    "image": "/personas/alex.svg",
    "imageAlt": "Abstract A avatar for the fictional Alex persona",
    "core": false,
    "description": "A visitor comparing unfamiliar tools while working within a small budget. They want to understand the basics before making a commitment.",
    "goals": [
      "Identify a useful starting option",
      "Understand the total cost before signing up"
    ],
    "blockers": [
      "Unexplained terms",
      "Unexpected charges",
      "No low-commitment way to explore"
    ],
    "auditFocus": "Check whether the page explains its purpose, costs, and a low-risk first step in everyday language.",
    "heuristicTask": "Explain the starting cost and offer a clear, low-commitment next step.",
    "heuristicImpact": "Helps a cautious visitor decide whether further exploration is worthwhile."
  },
  {
    "id": "lucy",
    "value": "lucy",
    "label": "Lucy - first-time evaluator",
    "shortLabel": "Lucy",
    "image": "/personas/lucy.svg",
    "imageAlt": "Abstract L avatar for the fictional Lucy persona",
    "core": true,
    "description": "A first-time evaluator who needs to connect product features to a practical task and understand how to get started.",
    "goals": [
      "See a realistic example of the workflow",
      "Complete a first useful task"
    ],
    "blockers": [
      "Unclear setup requirements",
      "Features without examples",
      "No explanation of what happens after signup"
    ],
    "auditFocus": "Look for a setup guide, concrete examples, transparent pricing, and an understandable path to the first result.",
    "heuristicTask": "Show a short setup guide and a concrete example beside the main call to action.",
    "heuristicImpact": "Helps a newcomer understand the effort required to reach a useful result."
  },
  {
    "id": "sarah",
    "value": "sarah",
    "label": "Sarah - experienced operator",
    "shortLabel": "Sarah",
    "image": "/personas/sarah.svg",
    "imageAlt": "Abstract S avatar for the fictional Sarah persona",
    "core": true,
    "description": "An experienced operator comparing a tool with an existing workflow. They need precise capabilities, control, and portable results.",
    "goals": [
      "Verify advanced settings and limits",
      "Move results into an existing workflow"
    ],
    "blockers": [
      "Hidden feature limits",
      "Few configuration options",
      "Unclear export formats"
    ],
    "auditFocus": "Verify that advanced settings, workflow limits, export formats, and detailed reporting are easy to inspect.",
    "heuristicTask": "Make advanced settings, limits, and export options discoverable before commitment.",
    "heuristicImpact": "Helps an experienced operator assess compatibility without a lengthy trial."
  }
];

export function requirePersona(value, library = UX_PERSONAS) {
  const persona = library.find((item) => item.id === String(value || "").trim().toLowerCase());
  if (!persona) {
    throw new Error("Choose Alex, Lucy, or Sarah, or one of your saved personas.");
  }
  return persona;
}

export function requireUxPersonaSelection(primaryValue, secondaryValues = [], library = UX_PERSONAS) {
  const primary = requirePersona(primaryValue, library);
  if (!Array.isArray(secondaryValues)) {
    throw new Error("Secondary UX personas must be provided as a list.");
  }
  if (secondaryValues.length > 2) {
    throw new Error("Choose up to two secondary personas for UX Audit.");
  }

  const normalizedIds = secondaryValues.map((value) => String(value || "").trim().toLowerCase());
  if (new Set(normalizedIds).size !== normalizedIds.length) {
    throw new Error("Remove duplicate secondary personas from the UX Audit.");
  }
  if (normalizedIds.includes(primary.id)) {
    throw new Error("The primary persona cannot also be a secondary persona.");
  }

  const secondary = normalizedIds.map((id) => requirePersona(id, library));
  return { primary, secondary, all: [primary, ...secondary] };
}

export function personaReportContext(persona) {
  return {
    id: persona.id,
    label: persona.label,
    shortLabel: persona.shortLabel,
    image: persona.image,
    imageAlt: persona.imageAlt,
    core: persona.core,
    description: persona.description,
    goals: persona.goals,
    blockers: persona.blockers,
    auditFocus: persona.auditFocus,
  };
}

export function personaSelectionReportContext(selection) {
  return {
    primary: personaReportContext(selection.primary),
    secondary: selection.secondary.map(personaReportContext),
  };
}
