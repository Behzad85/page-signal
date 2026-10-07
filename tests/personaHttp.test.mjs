import assert from 'node:assert/strict';
import test from 'node:test';
import { readPersonaJson, personaFailure } from '../lib/persona/http.mjs';
const origin='https://example.com';
const req=(body,headers={})=>new Request(origin+'/api/personas',{method:'POST',headers:{'origin':origin,'content-type':'application/json',...headers},body});
test('persona requests enforce origin, JSON object and streamed byte limits',async()=>{
  assert.deepEqual(await readPersonaJson(req('{"name":"Test"}'),origin),{name:'Test'});
  await assert.rejects(readPersonaJson(req('{}',{'origin':'https://other.example'}),origin),{status:403});
  await assert.rejects(readPersonaJson(req('{}',{'content-type':'text/plain'}),origin),{status:415});
  await assert.rejects(readPersonaJson(req('[]'),origin),{status:400});
  await assert.rejects(readPersonaJson(req('{"x":"'+'x'.repeat(100)+'"}'),origin,30),{status:413});
});
test('provider errors are private and responses cannot be cached',async()=>{
  const response=personaFailure(new Error('private provider detail'));
  assert.equal(response.status,503);
  assert.equal(response.headers.get('cache-control'),'private, no-store');
  assert.equal((await response.text()).includes('private provider detail'),false);
});
