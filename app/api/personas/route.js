import { personaSession, personaConfig } from '../../../lib/persona/server';
import { PersonaError, PERSONA_COLUMNS, isPersonaId, validatePersonaInput, customPersonaFromRow } from '../../../lib/customPersonas.mjs';
import { personaJson, personaFailure, readPersonaJson } from '../../../lib/persona/http.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET() {
  try {
    const {config,client,user}=await personaSession();
    if(!user) return personaJson({configured:Boolean(config),signedIn:false,personas:[]});
    const {data,error}=await client.from('personas').select(PERSONA_COLUMNS).eq('owner_id',user.id).order('updated_at',{ascending:false}).order('id').limit(50);
    if(error) throw error;
    return personaJson({configured:true,signedIn:true,account:{email:user.email},personas:data.map((row)=>({...customPersonaFromRow(row),updatedAt:row.updated_at}))});
  } catch(error) { return personaFailure(error); }
}
async function mutate(request,method) {
  try {
    const config=personaConfig();
    if(!config) throw new PersonaError('Saved personas are not enabled on this deployment.',503);
    const body=await readPersonaJson(request,config.origin);
    const {client,user}=await personaSession(true);
    let query=client.from('personas');
    if(method==='POST') query=query.insert({...validatePersonaInput(body),owner_id:user.id});
    else {
      const {id,...fields}=body;
      if(!isPersonaId(id)) throw new PersonaError('Choose a saved persona.');
      if(method==='DELETE') {
        if(Object.keys(fields).length) throw new PersonaError('Only the persona ID is needed for deletion.');
        query=query.delete();
      } else query=query.update(validatePersonaInput(fields));
      query=query.eq('id',id).eq('owner_id',user.id);
    }
    const {data,error}=await query.select(PERSONA_COLUMNS).maybeSingle();
    if(error?.code==='23514') throw new PersonaError('Check the field limits and the maximum of 50 saved personas.',409);
    if(error) throw error;
    if(!data) throw new PersonaError('This saved persona is not available.',404);
    return personaJson(method==='DELETE'?{deleted:true}:{persona:customPersonaFromRow(data)},method==='POST'?201:200);
  } catch(error) { return personaFailure(error); }
}
export const POST=(request)=>mutate(request,'POST');
export const PATCH=(request)=>mutate(request,'PATCH');
export const DELETE=(request)=>mutate(request,'DELETE');
