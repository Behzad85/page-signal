import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createJiti } from "jiti";

import { UX_PERSONAS, requirePersona, requireUxPersonaSelection } from "../lib/personas.mjs";
import { buildUxAuditPrompt } from "../lib/uxAuditPrompt.mjs";

const uxAuditSchemaUrl = new URL("../lib/uxAuditSchema.js", import.meta.url);
const reportRowsUrl = new URL("../components/optiscan/reportRows.js", import.meta.url);
const ticketsUrl = new URL("../components/optiscan/tickets.js", import.meta.url);

async function loadUxAuditSchema() {
  const jiti = createJiti(import.meta.url, { interopDefault: true });
  return jiti.import(fileURLToPath(uxAuditSchemaUrl));
}

async function loadReportRows() {
  const jiti = createJiti(import.meta.url, { interopDefault: true, jsx: true });
  return jiti.import(fileURLToPath(reportRowsUrl));
}

async function loadTickets() {
  const jiti = createJiti(import.meta.url, { interopDefault: true, jsx: true });
  return jiti.import(fileURLToPath(ticketsUrl));
}

test("resolves the three supported generic UX personas and rejects unknown IDs", () => {
  assert.deepEqual(UX_PERSONAS.map((persona) => persona.id), ["alex", "lucy", "sarah"]);
  assert.equal(requirePersona("lucy").label, "Lucy - first-time evaluator");
  assert.ok(UX_PERSONAS.every((persona) => persona.image.startsWith("/personas/") && persona.imageAlt));
  assert.throws(() => requirePersona("seo-specialist"), /Choose Alex, Lucy, or Sarah/);
});

test("validates one primary persona and at most two distinct secondary personas", () => {
  const selection = requireUxPersonaSelection("lucy", ["alex", "sarah"]);

  assert.equal(selection.primary.id, "lucy");
  assert.deepEqual(selection.secondary.map((persona) => persona.id), ["alex", "sarah"]);
  assert.deepEqual(selection.all.map((persona) => persona.id), ["lucy", "alex", "sarah"]);
  assert.throws(() => requireUxPersonaSelection("lucy", ["lucy"]), /primary persona/i);
  assert.throws(() => requireUxPersonaSelection("lucy", ["alex", "alex"]), /duplicate/i);
  assert.throws(() => requireUxPersonaSelection("lucy", ["alex", "sarah", "unknown"]), /up to two/i);
});

test("includes selected persona needs in the AI UX audit prompt", () => {
  const primaryPersona = requirePersona("sarah");
  const secondaryPersonas = [requirePersona("alex")];
  const prompt = buildUxAuditPrompt({
    url: "https://example.com",
    signals: { raw: {} },
    screenshot: null,
    primaryPersona,
    secondaryPersonas,
  });
  const payload = JSON.parse(prompt.user);

  assert.equal(payload.primary_persona.id, "sarah");
  assert.match(payload.primary_persona.audit_focus, /advanced settings/i);
  assert.deepEqual(payload.secondary_personas.map((persona) => persona.id), ["alex"]);
  assert.ok(payload.requirements.some((item) => /separate assessment/i.test(item)));
  assert.ok(payload.requirements.some((item) => /conflict/i.test(item)));
  assert.ok(payload.requirements.some((item) => /do not invent/i.test(item)));
  assert.ok(payload.requirements.some((item) => /conversion uplift/i.test(item)));
  assert.ok(payload.requirements.some((item) => /not enough evidence/i.test(item)));
});

test("normalizes the complete persona decision contract conservatively", async () => {
  const { normalizeUxAudit } = await loadUxAuditSchema();
  const audit = normalizeUxAudit({
    score: 81,
    summary: "The proposition is clear but budget reassurance is incomplete.",
    persona_analysis: {
      primary: { persona_id: "lucy", label: "Lucy", assessment: "Some pricing context is visible.", priorities: ["Pricing"] },
      secondary: [{ persona_id: "sarah", label: "Sarah", assessment: "Controls need inspection.", priorities: ["Inventory"] }],
      needs_coverage: [
        { need_id: "lucy-goal-1", persona_id: "lucy", need_type: "goal", need: "Understand likely impact", status: "Supported", evidence: "A results section is visible.", confidence: "High" },
        { need_id: "sarah-blocker-1", persona_id: "sarah", need_type: "blocker", need: "Advanced configuration", status: "Unexpected", evidence: "", confidence: "Certain" },
      ],
      decision_readiness: [{ persona_id: "lucy", label: "Lucy", status: "Partially ready", assessment: "The next step is clear.", evidence: "A primary CTA is visible.", missing_information: ["Price range"] }],
      cta_suitability: [{ persona_id: "lucy", label: "Lucy", cta: "Build your plan", status: "Supported", assessment: "Action-led.", evidence: "Visible in the hero.", recommendation: "Keep it." }],
      content_fit: [{ persona_id: "lucy", label: "Lucy", status: "Friction", assessment: "The copy assumes category knowledge.", evidence: "Acronyms are unexplained.", gaps: ["Plain-language explanation"] }],
      journey_implications: [{ persona_id: "lucy", label: "Lucy", page_role: "Evaluation", before: "Arrives from paid search.", on_page: "Checks fit.", next_step: "Builds a plan.", risks: ["Pricing uncertainty"], evidence: "Hero and CTA evidence.", confidence: "Medium" }],
      experiments: [{ title: "Explain the starting budget", personas: ["lucy"], hypothesis: "Clearer guidance may reduce uncertainty.", proposed_change: "Add a budget explainer.", expected_outcome: "More visitors reach planning.", primary_metric: "Planner starts", guardrail_metric: "Qualified lead rate", confidence: "Medium", priority: "High" }],
      conflicts: [{ personas: ["lucy", "sarah"], tension: "Guidance versus control.", resolution_pattern: "Progressive disclosure", recommendation: "Show defaults with editable controls.", acceptance_criteria: [{ persona_id: "lucy", criterion: "Explains the recommendation." }, { persona_id: "sarah", criterion: "Allows every input to be edited." }] }],
    },
    checklist: [{ task: "Clarify pricing.", priority: "High", impact: "Supports evaluation.", personas: ["lucy"], acceptance_criteria: [{ persona_id: "lucy", criterion: "A starting range is visible before the CTA." }] }],
  });

  assert.equal(audit.persona_analysis.needs_coverage[0].status, "Supported");
  assert.equal(audit.persona_analysis.needs_coverage[1].status, "Not enough evidence");
  assert.equal(audit.persona_analysis.needs_coverage[1].confidence, "Low");
  assert.equal(audit.persona_analysis.decision_readiness[0].status, "Partially ready");
  assert.equal(audit.persona_analysis.cta_suitability[0].cta, "Build your plan");
  assert.equal(audit.persona_analysis.content_fit[0].status, "Friction");
  assert.equal(audit.persona_analysis.journey_implications[0].confidence, "Medium");
  assert.equal(audit.persona_analysis.experiments[0].primary_metric, "Planner starts");
  assert.equal(audit.persona_analysis.conflicts[0].resolution_pattern, "Progressive disclosure");
  assert.deepEqual(audit.persona_analysis.conflicts[0].acceptance_criteria.map((item) => item.persona_id), ["lucy", "sarah"]);
  assert.equal(audit.checklist[0].acceptance_criteria[0].persona_id, "lucy");
});

test("tailors heuristic UX recommendations without changing the evidence score", async () => {
  const { heuristicUxAudit } = await loadUxAuditSchema();
  const baseInput = {
    url: "https://example.com",
    signals: { raw: { viewport_meta: "width=device-width", h1_count: 1, h2_count: 2 } },
    coreWebVitals: null,
  };
  const withoutPersona = heuristicUxAudit(baseInput);
  const primaryPersona = requirePersona("alex");
  const secondaryPersonas = [requirePersona("sarah")];
  const withPersona = heuristicUxAudit({ ...baseInput, primaryPersona, secondaryPersonas });

  assert.equal(withPersona.score, withoutPersona.score);
  assert.match(withPersona.summary, /Alex - cautious explorer/);
  assert.match(withPersona.checklist[0].task, /starting cost/i);
  assert.match(withPersona.checklist[0].impact, /cautious visitor/i);
  assert.deepEqual(withPersona.checklist[0].personas, ["alex"]);
  assert.deepEqual(withPersona.checklist[1].personas, ["sarah"]);
  assert.equal(withPersona.persona_analysis.primary.persona_id, "alex");
  assert.deepEqual(withPersona.persona_analysis.secondary.map((lens) => lens.persona_id), ["sarah"]);
  assert.ok(withPersona.persona_analysis.needs_coverage.length >= primaryPersona.goals.length + primaryPersona.blockers.length);
  assert.ok(withPersona.persona_analysis.decision_readiness.every((item) => item.status === "Not enough evidence"));
  assert.ok(withPersona.persona_analysis.experiments.length > 0);
  assert.ok(withPersona.persona_analysis.conflicts.some((conflict) => conflict.personas.includes("alex") && conflict.personas.includes("sarah")));
  assert.ok(withPersona.checklist.every((item) => Array.isArray(item.acceptance_criteria)));
});

test("includes the selected persona in UX report export rows", async () => {
  const { uxTabRows } = await loadReportRows();
  const persona = requirePersona("sarah");
  const rows = uxTabRows({
    audit: {
      score: 75,
      persona_analysis: {
        primary: { persona_id: "sarah", label: persona.label, assessment: "Control is easy to verify.", priorities: ["Inventory"] },
        secondary: [{ persona_id: "lucy", label: "Lucy", assessment: "Budget guidance needs review.", priorities: ["Pricing"] }],
        conflicts: [{ personas: ["sarah", "lucy"], tension: "Control versus guidance", recommendation: "Use progressive disclosure." }],
      },
    },
    meta: {
      url: "https://example.com",
      persona: { label: persona.label, auditFocus: persona.auditFocus },
      personas: {
        primary: { id: "sarah", label: persona.label, auditFocus: persona.auditFocus },
        secondary: [{ id: "lucy", label: "Lucy - first-time evaluator", auditFocus: "Make guidance clear." }],
      },
    },
  }, "overview");

  assert.ok(rows.some((row) => row.Metric === "Primary persona" && row.Value === persona.label));
  assert.ok(rows.some((row) => row.Metric === "Compared personas" && /Lucy/.test(row.Value)));
  assert.ok(rows.some((row) => row.Section === "Persona conflicts" && /progressive disclosure/i.test(row.Value)));
});

test("tags UX tickets and exports persona-specific acceptance criteria", async () => {
  const { buildTickets, formatTicketForJira, ticketExportRows } = await loadTickets();
  const tickets = buildTickets("ux", {
    audit: {
      checklist: [{
        task: "Expose advanced inventory controls.",
        priority: "High",
        impact: "Supports expert buyers.",
        personas: ["sarah"],
        acceptance_criteria: [{ persona_id: "sarah", criterion: "Advanced settings can be reviewed before commitment." }],
      }],
    },
    meta: {
      url: "https://example.com",
      personas: {
        primary: { id: "lucy" },
        secondary: [{ id: "sarah" }],
      },
    },
  });

  const ticket = tickets.find((item) => item.title === "Expose advanced inventory controls");
  assert.ok(ticket?.personas.includes("sarah"));
  assert.equal(ticket.personaAcceptanceCriteria[0].persona_id, "sarah");
  assert.match(formatTicketForJira(ticket), /\[sarah\] Advanced settings/);
  assert.match(ticketExportRows([ticket])[0]["Persona Acceptance Criteria"], /sarah:/);
});
