import http from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {service} from './services.mjs';
const root = new URL('./',import.meta.url);
const sessions = new Map();
const jobs = new Map();
const json = (res,status,value) => {res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
async function body(req) {
  let size=0, chunks=[];
  for await (const chunk of req) {size+=chunk.length;if(size>15*1024*1024)throw new Error('Request too large. Voice references must be under 10 MB.');chunks.push(chunk);}
  try{return JSON.parse(Buffer.concat(chunks).toString());}catch{throw new Error('Invalid JSON request.');}
}
export function validateSong(input) {
  const clean = {};
  for (const key of ['title','style','mood']) {
    if(typeof input[key] !== 'string' || !input[key].trim() || input[key].length>120) throw new Error(`${key}: enter 1–120 characters.`);
    clean[key]=input[key].trim();
  }
  clean.duration=Number(input.duration);
  if(!Number.isInteger(clean.duration)||clean.duration<10||clean.duration>120)throw new Error('Duration must be 10–120 seconds.');
  clean.vocals=input.vocals===true;
  return clean;
}
export async function generate(input,update=()=>{}) {
  const song=validateSong(input), id=randomUUID();
  update('Writing the song…');
  song.lyrics = song.vocals ? await service('qwen',{prompt:`Write original English lyrics for a ${song.duration} second ${song.style}, ${song.mood} song titled ${JSON.stringify(song.title)}. Short verse and chorus with section labels. Output lyrics only. No explanation or thinking.`}) : '[Instrumental]';
  update('Generating music with ACE-Step…');
  const audio=await service('ace',{prompt:`${song.style}, ${song.mood}. ${song.title}. ${song.vocals?'English vocals':'Instrumental only, no vocals'}.`,lyrics:song.lyrics,duration:song.duration});
  update('Creating matching cover art…');
  const cover=await service('flux',{prompt:`Square album cover, no text or lettering. Theme: ${song.title}. Music style: ${song.style}. Mood: ${song.mood}. Artistic, evocative composition.`});
  await mkdir(new URL('data/',root),{recursive:true});
  await writeFile(new URL(`data/${id}.mp3`,root),audio.buffer);
  await writeFile(new URL(`data/${id}.png`,root),cover.buffer);
  return {...song,id,audio:`/media/${id}.mp3`,cover:`/media/${id}.png`};
}
async function handle(req,res) {
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob:; media-src 'self' blob:; connect-src 'self'; frame-ancestors 'none'");
  const host=req.headers.host || '';
  if(!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host))return json(res,403,{error:'Local access only.'});
  if(req.method==='POST' && req.headers.origin && req.headers.origin!==`http://${host}`)return json(res,403,{error:'Invalid origin.'});
  let sid=req.headers.cookie?.match(/(?:^|;\s*)session=([a-f0-9-]+)/)?.[1];
  if(!sessions.has(sid)){sid=randomUUID();sessions.set(sid,[]);res.setHeader('Set-Cookie',`session=${sid}; HttpOnly; SameSite=Strict; Path=/`);}
  const url=new URL(req.url,`http://${host}`), path=url.pathname;
  if(req.method==='GET' && path==='/api/library')return json(res,200,[...JSON.parse(await readFile(new URL('samples/manifest.json',root),'utf8')),...sessions.get(sid)]);
  if(req.method==='GET' && path==='/api/config')return json(res,200,{configured:['QWEN','FLUX','ACE','CHATTERBOX'].every(n=>process.env[`${n}_URL`]&&process.env[`${n}_KEY`])});
  if(req.method==='POST' && path==='/api/generate') {
    const input=validateSong(await body(req));
    if([...jobs.values()].some(j=>j.sid===sid && j.status==='running'))return json(res,409,{error:'A song is already being generated. Please wait.'});
    const id=randomUUID(),job={sid,status:'running',message:'Starting…'};jobs.set(id,job);
    generate(input,message=>job.message=message).then(song=>{sessions.get(sid).push(song);Object.assign(job,{status:'done',song,message:'Added to your library.'});}).catch(e=>Object.assign(job,{status:'error',message:e.message}));
    return json(res,202,{id});
  }
  if(req.method==='GET' && path.startsWith('/api/jobs/')) {
    const job=jobs.get(path.split('/').pop());if(!job||job.sid!==sid)return json(res,404,{error:'Job not found.'});
    const {sid:_,...safe}=job;return json(res,200,safe);
  }
  if(req.method==='POST' && path==='/api/dj') {
    const {songId,previousId,reference}=await body(req);
    const all=[...JSON.parse(await readFile(new URL('samples/manifest.json',root),'utf8')),...sessions.get(sid)];
    const next=all.find(s=>s.id===songId),previous=all.find(s=>s.id===previousId);
    if(!next)throw new Error('Track not found. Refresh the library.');
    if(reference && (typeof reference!=='string'||reference.length>14*1024*1024||!/^data:audio\/(?:mpeg|mp3|wav|x-wav|wave);base64,[A-Za-z0-9+/=]+$/.test(reference)))throw new Error('Choose a valid MP3 or WAV reference under 10 MB.');
    const text=await service('qwen',{prompt:`Write one short spoken radio DJ introduction, at most 35 words, no stage directions. ${previous?`Previous track: ${previous.title}.`:''} Introduce ${JSON.stringify(next.title)}, a ${next.mood} ${next.style} track. Output only the introduction, no thinking.`});
    const audio=await service('chatterbox',{prompt:text,reference});
    res.writeHead(200,{'Content-Type':audio.mime,'Cache-Control':'no-store','X-DJ-Text':encodeURIComponent(text)});return res.end(audio.buffer);
  }
  if(req.method==='GET') {
    let target;
    if(/^\/samples\/[a-zA-Z0-9-]+\.(mp3|png)$/.test(path))target=new URL('.'+path,root);
    else if(/^\/media\/[a-f0-9-]+\.(mp3|png)$/.test(path)) {
      if(!sessions.get(sid).some(s=>s.audio===path||s.cover===path))return json(res,404,{error:'Media not found.'});
      target=new URL('data/'+path.split('/').pop(),root);
    } else if(['/','/app.js','/style.css'].includes(path))target=new URL('public/'+(path==='/'?'index.html':path.slice(1)),root);
    if(target){try{const data=await readFile(target);const ext=fileURLToPath(target).split('.').pop();res.writeHead(200,{'Content-Type':({html:'text/html; charset=utf-8',js:'text/javascript',css:'text/css',mp3:'audio/mpeg',png:'image/png'})[ext],'Cache-Control':'no-store'});return res.end(data);}catch{return json(res,404,{error:'File not found.'});}}
  }
  json(res,404,{error:'Not found.'});
}
export const server=http.createServer((req,res)=>handle(req,res).catch(e=>json(res,400,{error:e.message.startsWith('fetch')?'Class service unavailable. Try again.':e.message})));
if(process.argv[1]===fileURLToPath(import.meta.url))server.listen(Number(process.env.PORT)||3000,'127.0.0.1',()=>console.log(`AI Jukebox: http://localhost:${Number(process.env.PORT)||3000}`));
