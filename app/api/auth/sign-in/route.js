import { personaClient, personaConfig } from '../../../../lib/persona/server';
import { PersonaError } from '../../../../lib/customPersonas.mjs';
import { personaJson,personaFailure,readPersonaJson } from '../../../../lib/persona/http.mjs';
export async function POST(request) {
  try {
    const config=personaConfig();
    if(!config) throw new PersonaError('Saved personas are not enabled on this deployment.',503);
    const body=await readPersonaJson(request,config.origin,2048);
    if(Object.keys(body).some((key)=>key!=='email') || typeof body.email!=='string' || body.email.length>254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())) throw new PersonaError('Enter a valid email address.');
    const client=await personaClient(config);
    const {error}=await client.auth.signInWithOtp({email:body.email.trim(),options:{emailRedirectTo:`${config.origin}/auth/callback`}});
    if(error) throw new PersonaError('The sign-in email could not be sent. Please wait a moment and try again.',error.status===429?429:503);
    return personaJson({message:'Check your email for a sign-in link. Open it in this browser.'});
  } catch(error) { return personaFailure(error); }
}
