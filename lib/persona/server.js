import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { PersonaError, PERSONA_COLUMNS } from '../customPersonas.mjs';

export function personaConfig() {
  const url=process.env.SUPABASE_URL?.trim();
  const key=process.env.SUPABASE_PUBLISHABLE_KEY?.trim();
  const appUrl=process.env.APP_URL?.trim();
  if(!url && !key && !appUrl) return null;
  try {
    const provider=new URL(url); const app=new URL(appUrl);
    const allowed=(value)=>value.protocol==='https:' || (value.protocol==='http:' && ['localhost','127.0.0.1','[::1]'].includes(value.hostname));
    if(!allowed(provider) || !allowed(app) || provider.username || provider.password || app.username || app.password || app.pathname!=='/' || app.search || app.hash) throw new Error();
    let publicKey=key?.startsWith('sb_publishable_');
    if(!publicKey && key?.split('.').length===3) publicKey=JSON.parse(Buffer.from(key.split('.')[1],'base64url').toString()).role==='anon';
    if(!publicKey) throw new Error();
    return {url:provider.href.replace(/\/$/,''),key,origin:app.origin};
  } catch { throw new PersonaError('Saved personas are not configured correctly on this deployment.',503); }
}

// Only route handlers use this client, so refreshed cookies can always be written.
export async function personaClient(config=personaConfig()) {
  if(!config) throw new PersonaError('Saved personas are not enabled on this deployment.',503);
  const store=await cookies();
  return createServerClient(config.url,config.key,{cookieOptions:{httpOnly:true,sameSite:"lax",secure:config.origin.startsWith("https:")},cookies:{
    getAll:()=>store.getAll(),
    setAll:(values)=>values.forEach(({name,value,options})=>store.set(name,value,options)),
  }});
}
export async function personaSession(required=false) {
  const config=personaConfig();
  if(!config) {
    if(required) throw new PersonaError('Saved personas are not enabled on this deployment.',503);
    return {config:null,user:null,client:null};
  }
  const client=await personaClient(config);
  const {data,error}=await client.auth.getUser();
  if(error && error.name!=='AuthSessionMissingError' && (!error.status || error.status>=500)) throw new PersonaError('Sign-in is temporarily unavailable. Please try again.',503);
  const user=error ? null : data.user;
  if(required && !user) throw new PersonaError('Sign in to use your saved personas.',401);
  return {config,client,user};
}
export async function loadOwnedPersonas(ids) {
  const {client,user}=await personaSession(true);
  const {data,error}=await client.from('personas').select(PERSONA_COLUMNS).eq('owner_id',user.id).in('id',ids);
  if(error) throw new PersonaError('Saved personas could not be loaded. Please try again.',503);
  return data;
}
