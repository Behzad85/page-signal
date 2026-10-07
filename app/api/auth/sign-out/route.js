import { personaClient,personaConfig } from '../../../../lib/persona/server';
import { PersonaError } from '../../../../lib/customPersonas.mjs';
import { personaJson,personaFailure,readPersonaJson } from '../../../../lib/persona/http.mjs';
export async function POST(request) {
  try {
    const config=personaConfig();
    if(!config) throw new PersonaError('Saved personas are not enabled on this deployment.',503);
    await readPersonaJson(request,config.origin,128);
    const client=await personaClient(config);
    const {error}=await client.auth.signOut({scope:'local'});
    if(error) throw error;
    return personaJson({signedOut:true});
  } catch(error) {return personaFailure(error);}
}
