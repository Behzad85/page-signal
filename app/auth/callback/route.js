import { personaClient,personaConfig } from '../../../lib/persona/server';
import { privateHeaders,personaFailure } from '../../../lib/persona/http.mjs';
import { PersonaError } from '../../../lib/customPersonas.mjs';
export async function GET(request) {
  try {
    const config=personaConfig();
    if(!config) throw new PersonaError('Sign-in is not enabled on this deployment.',503);
    const code=new URL(request.url).searchParams.get('code');
    let success=false;
    if(code && code.length<=4096) {
      const client=await personaClient(config);
      const {error}=await client.auth.exchangeCodeForSession(code);
      success=!error;
    }
    return new Response(null,{status:303,headers:{...privateHeaders,'Referrer-Policy':'no-referrer',Location:`${config.origin}/ux-audit${success?'':'?signin=failed'}`}});
  } catch(error) {return personaFailure(error);}
}
