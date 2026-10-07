import { UX_PERSONAS, requireUxPersonaSelection } from './personas.mjs';

export class PersonaError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
export const PERSONA_COLUMNS = 'id,name,description,goals,blockers,audit_focus,created_at,updated_at';
export const isPersonaId = (id) => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

export function validatePersonaInput(input) {
  const fields = ['name', 'description', 'goals', 'blockers', 'audit_focus'];
  if (!input || Array.isArray(input) || typeof input !== 'object' || Object.keys(input).some((key) => !fields.includes(key))) throw new PersonaError('Use only the supported persona fields.');
  function text(value, label, max) {
    if (typeof value !== 'string' || !value.trim() || value.trim().length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) throw new PersonaError(`${label} must contain 1–${max} characters.`);
    return value.trim();
  }
  function list(value, label) {
    if (!Array.isArray(value) || value.length < 1 || value.length > 8) throw new PersonaError(`${label} must contain 1–8 items.`);
    return value.map((item) => text(item, label, 240));
  }
  return { name: text(input.name, 'Name', 80), description: text(input.description, 'Description', 1000), goals: list(input.goals, 'Goals'), blockers: list(input.blockers, 'Blockers'), audit_focus: text(input.audit_focus, 'Audit focus', 1000) };
}

export function customPersonaFromRow(row) {
  if (!isPersonaId(row?.id)) throw new PersonaError('This saved persona is not available.');
  const fields = validatePersonaInput(Object.fromEntries(['name','description','goals','blockers','audit_focus'].map((key) => [key,row[key]])));
  return { id:row.id, value:row.id, label:fields.name, shortLabel:fields.name, core:false, image:null, imageAlt:'', description:fields.description, goals:fields.goals, blockers:fields.blockers, auditFocus:fields.audit_focus,
    heuristicTask:`Review the page against ${fields.name}'s priority: ${fields.goals[0]}`,
    heuristicImpact:'Tests whether the observed page supports the stated persona needs; this is a hypothesis to validate.' };
}

export async function resolvePersonaSelection(primaryValue, secondaryValues = [], loadOwned) {
  if (!Array.isArray(secondaryValues) || secondaryValues.length > 2) throw new PersonaError('Choose up to two secondary personas.');
  const ids = [primaryValue, ...secondaryValues].map((id) => typeof id === 'string' ? id.trim().toLowerCase() : '');
  if (new Set(ids).size !== ids.length) throw new PersonaError('Remove duplicate personas; the primary cannot also be a comparison.');
  const customIds = ids.filter((id) => !UX_PERSONAS.some((persona) => persona.id === id));
  if (customIds.some((id) => !isPersonaId(id))) throw new PersonaError('A selected persona is not available.');
  const rows = customIds.length ? await loadOwned(customIds) : [];
  const library = [...UX_PERSONAS, ...rows.filter((row) => customIds.includes(row.id)).map(customPersonaFromRow)];
  if (ids.some((id) => !library.some((persona) => persona.id === id))) throw new PersonaError('A selected persona is not available.');
  return requireUxPersonaSelection(ids[0], ids.slice(1), library);
}
