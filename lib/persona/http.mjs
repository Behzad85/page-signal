import { PersonaError } from '../customPersonas.mjs';
export const privateHeaders = { 'Cache-Control': 'private, no-store', 'Vary': 'Cookie', 'X-Content-Type-Options': 'nosniff' };
export function personaJson(value, status = 200) { return Response.json(value, {status, headers:privateHeaders}); }
export function personaFailure(error) {
  return personaJson({error: error instanceof PersonaError ? error.message : 'Saved personas are temporarily unavailable. Please try again.'}, error instanceof PersonaError ? error.status : 503);
}
export async function readPersonaJson(request, origin, maxBytes = 16384) {
  if (request.headers.get('origin') !== origin) throw new PersonaError('This request must come from this application.',403);
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') throw new PersonaError('Use a JSON request.',415);
  if (Number(request.headers.get('content-length') || 0) > maxBytes) throw new PersonaError('The request is too large.',413);
  const reader=request.body?.getReader();
  if (!reader) throw new PersonaError('Provide a request body.');
  let total=0; const chunks=[];
  try {
    for (;;) {
      const {done,value}=await reader.read(); if(done) break;
      total+=value.byteLength;
      if(total>maxBytes) { await reader.cancel(); throw new PersonaError('The request is too large.',413); }
      chunks.push(value);
    }
    const body=JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if(!body || typeof body!=='object' || Array.isArray(body)) throw new Error('Invalid object');
    return body;
  } catch(error) {
    if(error instanceof PersonaError) throw error;
    throw new PersonaError('Provide a valid JSON object.');
  } finally { reader.releaseLock(); }
}
