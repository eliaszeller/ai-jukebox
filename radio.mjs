import {randomUUID} from 'node:crypto';

// One prepared pick per session. Stale requests may finish their current service
// call, but can never publish a pick or launch a later stage after cancellation.
export function createRadio({list,choose,create,voice,now=Date.now}) {
 const sessions=new Map();
 function get(id){const s=sessions.get(id);if(!s)throw Error('DJ session not found. Start a new session.');return s;}
 function live(s,rev){return s.active&&s.revision===rev&&now()-s.seen<120000;}
 function snapshot(s){return {id:s.id,active:s.active,status:s.status,request:s.request,source:s.source,generated:s.generated,limit:s.limit,next:s.next,error:s.error,history:s.history.slice(-8)};}
 function cleanRequest(value){if(typeof value!=='string'||value.trim().length<1||value.length>800)throw Error('Tell the DJ what you want to hear in 1–800 characters.');return value.trim();}
 const info=t=>({id:t.id,title:t.title,genre:t.genre,mood:t.mood,instrumental:t.instrumental,bpm:t.bpm});
 async function prepare(s){
  if(s.running||!s.active||s.next)return;
  const rev=s.revision;s.running=true;s.status='selecting';s.error=null;
  try{
   const all=list().filter(t=>t.audio),recent=s.history.slice(-5).map(x=>x.id),blocked=s.feedback.filter(x=>x.value==='skip').map(x=>x.id);
   let candidates=all.filter(t=>!recent.includes(t.id)&&!blocked.includes(t.id));
   const allowCreate=s.source!=='library'&&s.generated<s.limit;
   // Small libraries may repeat, but never replay a skipped song or immediately
   // repeat the current one when another usable song exists.
   if(!candidates.length&&!allowCreate){candidates=all.filter(t=>!blocked.includes(t.id)&&t.id!==s.history.at(-1)?.id);if(!candidates.length)candidates=all.filter(t=>!blocked.includes(t.id));}
   if(s.source==='new'&&!allowCreate)throw Error('Your new-song limit is reached. Start another session or switch to a library mix.');
   if(!candidates.length&&!allowCreate)throw Error('No playable songs match this session. Enable new originals or add songs to your library.');
   const d=await choose({request:s.request,source:s.source,allowCreate,candidates:s.source==='new'?[]:candidates.slice(-80).map(info),recent:s.history.slice(-8),feedback:s.feedback.slice(-20)});
   if(!live(s,rev))return;
   let t,origin;
   if(d.action==='library'&&s.source!=='new'){t=candidates.find(t=>t.id===d.trackId);if(!t)throw Error('DJ selected a song that is no longer available. Retry the next pick.');origin='From your library';}
   else if(d.action==='create'&&allowCreate){s.status='generating';s.generated++;t=await create({...d.song,duration:s.duration});origin='Created for you';}
   else throw Error('DJ could not make a selection within your session settings. Retry the next pick.');
   if(!live(s,rev))return;
   if(!t.audio)throw Error(t.error||'The new song did not finish. Retry it from your library.');
   s.status='voicing';let intro=null,warning=null;
   try{intro=await voice(s.history.at(-1),t,s.style,{request:s.request,reason:d.reason,origin});}catch{warning='DJ speech is unavailable. This pick will play without an introduction.';}
   if(!live(s,rev))return;
   s.next={trackId:t.id,title:t.title,reason:d.reason,origin,intro,warning};s.status='ready';
  }catch(e){if(live(s,rev)){s.status='error';s.error=e.message;}}
  finally{s.running=false;if(s.active&&s.revision!==rev&&now()-s.seen<120000)void prepare(s);else if(s.active&&now()-s.seen>=120000){s.active=false;s.status='stopped';}}
 }
 return {
  start(b){const request=cleanRequest(b.request),source=b.source||'mix';if(!['mix','library','new'].includes(source))throw Error('Invalid DJ source.');const duration=Number(b.duration??60),limit=Number(b.limit??10);if(![10,30,60,120].includes(duration)||!Number.isInteger(limit)||limit<1||limit>25)throw Error('Invalid session length or generation limit.');
   for(const [id,old] of sessions)if(now()-old.seen>120000){old.active=false;if(!old.running)sessions.delete(id);}
   if([...sessions.values()].filter(s=>s.active).length>=4)throw Error('Too many active DJ sessions. Stop one and try again.');
   const s={id:randomUUID(),request,source,duration,limit,generated:0,style:typeof b.style==='string'?b.style.slice(0,80):'Warm late-night host',active:true,revision:0,seen:now(),status:'selecting',next:null,error:null,history:[],feedback:[],running:false};sessions.set(s.id,s);void prepare(s);return snapshot(s);
  },
  status(id){const s=get(id);s.seen=now();return snapshot(s);},
  request(id,b){const s=get(id);if(!s.active)throw Error('This DJ session has ended. Start a new one.');s.request=cleanRequest(b.request);s.revision++;s.next=null;s.error=null;s.seen=now();s.status=s.running?'updating':'selecting';void prepare(s);return snapshot(s);},
  consume(id){const s=get(id);if(!s.active||!s.next)throw Error('The next DJ pick is not ready.');const pick=s.next,t=list().find(t=>t.id===pick.trackId&&t.audio);if(!t){s.next=null;s.status='error';s.error='That song was deleted. Retry the next pick.';throw Error(s.error);}s.history.push(info(t));s.history=s.history.slice(-40);s.next=null;s.seen=now();void prepare(s);return pick;},
  feedback(id,b){const s=get(id),t=list().find(t=>t.id===b.trackId);if(!t||!['like','skip'].includes(b.value))throw Error('Invalid track feedback.');s.feedback=s.feedback.filter(x=>x.id!==t.id);s.feedback.push({...info(t),value:b.value});s.feedback=s.feedback.slice(-40);if(s.active){s.revision++;s.next=null;s.seen=now();s.status='updating';void prepare(s);}return snapshot(s);},
  retry(id){const s=get(id);if(!s.active)throw Error('Start a new DJ session.');s.seen=now();void prepare(s);return snapshot(s);},
  stop(id){const s=get(id);s.active=false;s.revision++;s.next=null;s.status='stopped';return snapshot(s);}
 };
}
