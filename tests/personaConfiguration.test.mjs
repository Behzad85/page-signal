import assert from 'node:assert/strict';
import test from 'node:test';
import { createJiti } from 'jiti';
const jiti=createJiti(import.meta.url,{interopDefault:true});
const {personaConfig}=await jiti.import('../lib/persona/server.js');
const keys=['SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY','APP_URL'];
function withConfig(values,callback) {
  const original=Object.fromEntries(keys.map((key)=>[key,process.env[key]]));
  for(const key of keys) process.env[key]=values[key]||'';
  try{return callback();} finally {for(const key of keys) original[key]===undefined?delete process.env[key]:process.env[key]=original[key];}
}
test('persona configuration is optional and rejects server-role keys and unsafe origins',()=>{
  withConfig({},()=>assert.equal(personaConfig(),null));
  const config={SUPABASE_URL:'https://example.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_example',APP_URL:'https://example.com'};
  withConfig(config,()=>assert.equal(personaConfig().origin,'https://example.com'));
  for(const changes of [{SUPABASE_PUBLISHABLE_KEY:'sb_secret_example'},{APP_URL:'http://example.com'},{APP_URL:'https://example.com/redirect'},{SUPABASE_URL:'https://user:password@example.com'}]) withConfig({...config,...changes},()=>assert.throws(()=>personaConfig()));
});
