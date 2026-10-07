"use client";

import { useCallback, useEffect, useState } from 'react';
import { Alert, Avatar, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextInput as TextField } from '../design/primitives';
import { AddOutlined as AddOutlined } from "../design/icons";
import { LockOutlined as LockOutlined } from "../design/icons";
import { validatePersonaInput } from '../../lib/customPersonas.mjs';

const emptyForm={name:'',description:'',goals:'',blockers:'',audit_focus:''};
async function requestJson(url, options={}) {
  const response=await fetch(url,{cache:'no-store',...options});
  const data=await response.json();
  if(!response.ok) throw new Error(data.error || 'The request could not be completed.');
  return data;
}
const jsonOptions=(method,body)=>({method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
const lines=(text)=>text.split('\n').map((line)=>line.trim()).filter(Boolean);

export default function SavedPersonaLibrary({disabled,onPersonasChange,onUsePersona,onSignedOut}) {
  const [state,setState]=useState({loading:true,configured:false,signedIn:false,personas:[]});
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [dialog,setDialog]=useState(null);
  const [form,setForm]=useState(emptyForm);
  const [email,setEmail]=useState('');
  const [busy,setBusy]=useState(false);
  const [dialogError,setDialogError]=useState('');
  const refresh=useCallback(async()=>{
    try {
      const data=await requestJson('/api/personas');
      setState({...data,loading:false}); onPersonasChange(data.personas); setError('');
    } catch(err) { setState((current)=>({...current,loading:false})); setError(err.message); }
  },[onPersonasChange]);
  useEffect(()=>{
    const frame=window.requestAnimationFrame(()=>{
      void refresh();
      if(new URLSearchParams(window.location.search).get('signin')==='failed') setNotice('That sign-in link could not be used. Request a new link and open it in the same browser.');
    });
    return ()=>window.cancelAnimationFrame(frame);
  },[refresh]);
  function openEditor(persona) {
    setDialogError('');
    setForm(persona?{name:persona.shortLabel,description:persona.description,goals:persona.goals.join('\n'),blockers:persona.blockers.join('\n'),audit_focus:persona.auditFocus}:emptyForm);
    setDialog({type:'edit',persona});
  }
  function close() { if(!busy) {setDialog(null);setDialogError('');} }
  async function save(event) {
    event.preventDefault(); setDialogError('');
    let input;
    try {input=validatePersonaInput({...form,goals:lines(form.goals),blockers:lines(form.blockers)});} catch(err) {setDialogError(err.message);return;}
    setBusy(true);
    try {
      const editing=dialog.persona;
      const data=await requestJson('/api/personas',jsonOptions(editing?'PATCH':'POST',editing?{id:editing.id,...input}:input));
      // Update immediately from the acknowledged database result; refresh failure
      // cannot leave a deleted or freshly changed persona selectable as stale data.
      const personas=[data.persona,...state.personas.filter((item)=>item.id!==data.persona.id)];
      setState((current)=>({...current,personas})); onPersonasChange(personas);
      setNotice(editing?'Persona updated. Existing reports keep their original persona snapshot.':'Persona saved. You can now select it for a UX audit.');
      setDialog(null);
    } catch(err) {setDialogError(err.message);} finally {setBusy(false);}
  }
  async function remove() {
    setBusy(true);setDialogError('');
    try {
      await requestJson('/api/personas',jsonOptions('DELETE',{id:dialog.persona.id}));
      const personas=state.personas.filter((item)=>item.id!==dialog.persona.id);
      setState((current)=>({...current,personas}));onPersonasChange(personas);setNotice('Persona deleted. Existing reports retain their original snapshot.');setDialog(null);
    } catch(err) {setDialogError(err.message);} finally {setBusy(false);}
  }
  async function signIn(event) {
    event.preventDefault();setBusy(true);setDialogError('');
    try {const data=await requestJson('/api/auth/sign-in',jsonOptions('POST',{email}));setNotice(data.message);setDialog(null);} catch(err) {setDialogError(err.message);} finally {setBusy(false);}
  }
  async function signOut() {
    setBusy(true);setError('');
    try {
      await requestJson('/api/auth/sign-out',jsonOptions('POST',{}));
      setState({loading:false,configured:true,signedIn:false,personas:[]});onPersonasChange([]);onSignedOut();setNotice('Signed out. Your personas remain saved to your account.');
    } catch(err) {setError(err.message);} finally {setBusy(false);}
  }
  const locked=disabled||busy;
  return <section aria-labelledby="saved-personas-heading" className="rounded-lg border border-ink-200 bg-white p-4 sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 id="saved-personas-heading" className="text-base font-semibold text-ink-900">Your personas</h2><p className="mt-1 text-sm text-ink-600">Save the needs you want to evaluate. Your personas are private to your account.</p></div>
      {state.signedIn?<Button startIcon={<AddOutlined />} variant="contained" disabled={locked||state.personas.length>=50} onClick={()=>openEditor(null)}>Create persona</Button>:state.configured?<Button startIcon={<LockOutlined />} variant="outlined" disabled={locked} onClick={()=>{setDialogError('');setDialog({type:'sign-in'});}}>Sign in to create</Button>:null}
    </div>
    {state.loading?<p role="status" className="mt-4 text-sm text-ink-600">Loading saved personas…</p>:!state.configured&&!error?<p className="mt-4 text-sm text-ink-600">Saved personas are not enabled on this deployment. You can still use the three example personas below.</p>:null}
    {state.configured&&!state.signedIn?<p className="mt-4 text-xs text-ink-600">Sign in with an email link to create personas and access them across devices.</p>:null}
    {error?<Alert severity="error" className="mt-4" action={<Button color="inherit" onClick={refresh} disabled={locked}>Retry</Button>}>{error}</Alert>:null}
    {notice?<Alert severity="info" className="mt-4" onClose={()=>setNotice('')}>{notice}</Alert>:null}
    {state.signedIn?<>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-600"><span className="break-all">{state.account?.email} · {state.personas.length}/50 saved</span><Button variant="text" size="small" onClick={signOut} disabled={locked}>Sign out</Button></div>
      {!state.personas.length?<p className="border-t border-ink-200 pt-3 text-sm text-ink-600">Start with a name, goals and blockers. Use a fictional profile or research you have permission to use.</p>:<ul className="mt-2 divide-y divide-ink-200 border-t border-ink-200">{state.personas.map((persona)=><li key={persona.id} className="flex flex-wrap items-center gap-3 py-3">
        <Avatar size={32}>{persona.shortLabel.slice(0,1)}</Avatar><span className="min-w-0 flex-1 break-words text-sm font-semibold text-ink-900">{persona.shortLabel}</span>
        <div className="flex flex-wrap gap-1"><Button variant="text" size="small" disabled={locked} onClick={()=>onUsePersona(persona.id)} aria-label={`Use ${persona.shortLabel} as primary`}>Use as primary</Button><Button variant="text" size="small" disabled={locked} onClick={()=>openEditor(persona)} aria-label={`Edit ${persona.shortLabel}`}>Edit</Button><Button variant="text" size="small" color="error" disabled={locked} onClick={()=>{setDialogError('');setDialog({type:'delete',persona});}} aria-label={`Delete ${persona.shortLabel}`}>Delete</Button></div>
      </li>)}</ul>}
    </>:null}
    <Dialog open={dialog?.type==='edit'} onClose={close} fullWidth maxWidth="sm">
      <form onSubmit={save}>
        <DialogTitle>{dialog?.persona?'Edit persona':'Create persona'}</DialogTitle>
        <DialogContent className="grid gap-5 !pt-3">
          <p className="text-sm text-ink-600">Describe needs and behaviour. Avoid personal contact details or confidential research. When used in an AI-enabled audit, these fields are included in the analysis.</p>
          <TextField label="Persona name" required value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} maxLength={80} disabled={busy} />
          <TextField label="Description" required multiline minRows={2} value={form.description} onChange={(e)=>setForm({...form,description:e.target.value})} maxLength={1000} disabled={busy} />
          <TextField label="Goals" required multiline minRows={3} helperText="One goal per line, up to 8. Maximum 240 characters per goal." value={form.goals} onChange={(e)=>setForm({...form,goals:e.target.value})} maxLength={2000} disabled={busy} />
          <TextField label="Blockers" required multiline minRows={3} helperText="One blocker per line, up to 8. Maximum 240 characters per blocker." value={form.blockers} onChange={(e)=>setForm({...form,blockers:e.target.value})} maxLength={2000} disabled={busy} />
          <TextField label="Audit focus" required multiline minRows={2} helperText="What should the review pay attention to for this persona?" value={form.audit_focus} onChange={(e)=>setForm({...form,audit_focus:e.target.value})} maxLength={1000} disabled={busy} />
          {dialogError?<Alert severity="error">{dialogError}</Alert>:null}
        </DialogContent>
        <DialogActions><Button variant="text" onClick={close} disabled={busy}>Cancel</Button><Button type="submit" variant="contained" disabled={busy}>{busy?'Saving…':'Save persona'}</Button></DialogActions>
      </form>
    </Dialog>
    <Dialog open={dialog?.type==='delete'} onClose={close} fullWidth maxWidth="xs">
      <DialogTitle>Delete persona?</DialogTitle><DialogContent><p className="text-sm text-ink-700">Delete “{dialog?.persona?.shortLabel}” from your account? This cannot be undone. Existing report snapshots are kept.</p>{dialogError?<Alert severity="error" className="mt-3">{dialogError}</Alert>:null}</DialogContent><DialogActions><Button variant="text" onClick={close} disabled={busy}>Cancel</Button><Button color="error" variant="contained" onClick={remove} disabled={busy}>{busy?'Deleting…':'Delete persona'}</Button></DialogActions>
    </Dialog>
    <Dialog open={dialog?.type==='sign-in'} onClose={close} fullWidth maxWidth="xs">
      <form onSubmit={signIn}><DialogTitle>Sign in to save personas</DialogTitle><DialogContent className="grid gap-4 !pt-2"><p className="text-sm text-ink-600">We’ll email a sign-in link. Your first sign-in creates an account.</p><TextField label="Email address" type="email" autoComplete="email" required value={email} onChange={(e)=>setEmail(e.target.value)} disabled={busy} maxLength={254} />{dialogError?<Alert severity="error">{dialogError}</Alert>:null}</DialogContent><DialogActions><Button variant="text" onClick={close} disabled={busy}>Cancel</Button><Button type="submit" variant="contained" disabled={busy}>{busy?'Sending…':'Email sign-in link'}</Button></DialogActions></form>
    </Dialog>
  </section>;
}
