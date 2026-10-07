import assert from 'node:assert/strict';
import test from 'node:test';
import { validatePersonaInput, customPersonaFromRow, resolvePersonaSelection } from '../lib/customPersonas.mjs';
import { personaReportContext } from '../lib/personas.mjs';
const id = '11111111-1111-4111-8111-111111111111';
const valid = { name: 'Busy researcher', description: 'Needs to compare evidence quickly.', goals: ['Find sources'], blockers: ['Unexplained claims'], audit_focus: 'Look for clear evidence and next steps.' };
test('validates and trims bounded persona fields without accepting owner or instruction fields', () => {
  assert.equal(validatePersonaInput({ ...valid, name: '  Busy researcher  ' }).name, valid.name);
  for (const input of [{...valid, owner_id:id}, {...valid, name:' '}, {...valid, goals:[]}, {...valid, goals:Array(9).fill('Goal')}, {...valid, blockers:['x'.repeat(241)]}, {...valid, audit_focus:'x'.repeat(1001)}, {...valid, description:4}, {...valid, extra:'field'}]) {
    assert.throws(() => validatePersonaInput(input));
  }
});
test('database rows become usable persona snapshots without ownership metadata', () => {
  const persona=customPersonaFromRow({...valid,id,owner_id:'private-user'});
  const snapshot=personaReportContext(persona);
  assert.equal(persona.core,false);
  assert.equal(snapshot.id,id);
  assert.deepEqual(snapshot.goals,valid.goals);
  assert.ok(persona.heuristicTask && persona.heuristicImpact);
  assert.equal(JSON.stringify(snapshot).includes('private-user'),false);
});
test('public example selections do not access a database', async () => {
  const selection=await resolvePersonaSelection('lucy',['alex'],()=>assert.fail('Database should not be called'));
  assert.equal(selection.primary.id,'lucy');
});
test('custom IDs resolve only through the owned-row loader and reject missing IDs', async () => {
  const selection=await resolvePersonaSelection(id,['sarah'],async(ids)=>{
    assert.deepEqual(ids,[id]); return [{...valid,id}];
  });
  assert.equal(selection.primary.label,valid.name);
  await assert.rejects(resolvePersonaSelection(id,[],async()=>[]),/not available/i);
  await assert.rejects(resolvePersonaSelection(id,[id],async()=>[]),/primary|duplicate/i);
  await assert.rejects(resolvePersonaSelection('unknown',[],()=>assert.fail()),/not available/i);
  await assert.rejects(resolvePersonaSelection(id,['alex','lucy','sarah'],()=>assert.fail()),/two/i);
});

test('a saved persona reaches heuristic reports, prompts and exports with its UUID intact',async()=>{
  const {createJiti}=await import('jiti');
  const jiti=createJiti(import.meta.url,{interopDefault:true,jsx:true});
  const {heuristicUxAudit}=await jiti.import('../lib/uxAuditSchema.js');
  const {uxTabRows}=await jiti.import('../components/optiscan/reportRows.js');
  const {buildUxAuditPrompt}=await import('../lib/uxAuditPrompt.mjs');
  const persona=customPersonaFromRow({...valid,id});
  const audit=heuristicUxAudit({url:'https://example.com',signals:{raw:{}},primaryPersona:persona});
  const snapshot=personaReportContext(persona);
  const prompt=buildUxAuditPrompt({url:'https://example.com',primaryPersona:persona});
  assert.equal(JSON.parse(prompt.user).primary_persona.id,id);
  assert.match(prompt.system,/untrusted data/);
  assert.equal(audit.persona_analysis.primary.persona_id,id);
  assert.ok(audit.checklist.some((ticket)=>ticket.personas.includes(id) && ticket.task.includes(valid.name)));
  const rows=uxTabRows({audit,meta:{persona:snapshot,personas:{primary:snapshot,secondary:[]}}},'overview');
  assert.ok(rows.some((row)=>row.Metric==='Primary persona' && row.Value===valid.name));
});
