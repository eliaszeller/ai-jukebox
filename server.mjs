import http from 'node:http';
import {readFile,writeFile,mkdir,rename,readdir,unlink,copyFile} from 'node:fs/promises';
import {randomUUID,timingSafeEqual} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {configuration,services,validateVoiceReference} from './services.mjs';
import {createRadio} from './radio.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const data=path.resolve(process.env.DATA_DIR||path.join(root,'data'));
await mkdir(data,{recursive:true});
const api=services(configuration()), tracks=new Map(), busy=new Set(), djBusy=new Map();
for(const file of await readdir(data))if(file.endsWith('.json')){try{const t=JSON.parse(await readFile(path.join(data,file),'utf8'));if(t.id&&t.status){if(t.status==='generating'){t.status='error';t.error='Server restarted. Retry to resume generation.';}tracks.set(t.id,t);}}catch{}}
// Bundled sample songs (samples/manifest.json, generated with `npm run samples`) are copied into the data
// directory the first time the server sees them, so they behave like any other library track. A deleted
// sample leaves a .deleted marker so it stays gone across restarts.
const samplesDir=path.join(root,'samples');
try{
 const manifest=JSON.parse(await readFile(path.join(samplesDir,'manifest.json'),'utf8')), existing=new Set(await readdir(data));
 for(const s of manifest.tracks||[]){
  if(!s.audioFile||!s.coverFile||!s.title||!/^[\da-f-]+$/.test(s.id)||tracks.has(s.id)||existing.has(s.id+'.deleted'))continue;
  try{
   await Promise.all([copyFile(path.join(samplesDir,s.audioFile),path.join(data,s.id+'.mp3')),copyFile(path.join(samplesDir,s.coverFile),path.join(data,s.id+'.png'))]);
   const {audioFile,coverFile,services:_s,...fields}=s;
   const t={...fields,sample:true,createdAt:s.generatedAt||new Date().toISOString(),status:'ready',stage:'Ready to play',error:null,audio:'/media/'+s.id+'.mp3',cover:'/media/'+s.id+'.png'};
   tracks.set(t.id,t);await writeFile(path.join(data,t.id+'.json'),JSON.stringify(t));
  }catch(e){console.log(`Sample ${s.id} skipped: ${e.code==='ENOENT'?'media file missing. Run npm run samples.':e.message}`);}
 }
}catch(e){if(e.code!=='ENOENT')console.log('Sample manifest could not be read: '+e.message);}
const writes=new Map();
async function save(t){const snapshot=JSON.stringify(t);const pending=(writes.get(t.id)||Promise.resolve()).catch(()=>{}).then(async()=>{const tmp=path.join(data,t.id+'.tmp');await writeFile(tmp,snapshot);await rename(tmp,path.join(data,t.id+'.json'));});writes.set(t.id,pending);await pending;if(writes.get(t.id)===pending)writes.delete(t.id);}
function publicTrack(t){const {taskId,...rest}=t;return rest;}
async function generate(t){busy.add(t.id);t.status='generating';t.error=null;await save(t);
 try{
  if(!t.caption){t.stage='Writing song concept';await save(t);Object.assign(t,await api.plan(t));await save(t);}
  t.stage='Generating music and cover art';await save(t);
  // Persist after both branches settle, so a failed service never discards a successful result.
  const results=await Promise.allSettled([
   t.audio?null:api.music(t,async id=>{t.taskId=id;await save(t);}).then(async bytes=>{await writeFile(path.join(data,t.id+'.mp3'),bytes);t.audio='/media/'+t.id+'.mp3';}),
   t.cover?null:api.image(t.coverPrompt+(t.artStyle?'. Visual style: '+t.artStyle:'')).then(async bytes=>{await writeFile(path.join(data,t.id+'.png'),bytes);t.cover='/media/'+t.id+'.png';})
  ]);
  const failures=results.filter(x=>x.status==='rejected');if(failures.length)throw Error(failures.map(x=>x.reason.message).join(' '));
  t.status='ready';t.stage='Ready to play';
 }catch(e){t.status='error';t.error=e.message;}finally{busy.delete(t.id);await save(t);}
}
function validate(b){
 const s=(k,max,def='')=>{const v=b[k]??def;if(typeof v!=='string'||v.length>max)throw Error(`Invalid ${k}.`);return v.trim();};
 const duration=Number(b.duration??30),bpm=Number(b.bpm??110);if(!Number.isInteger(duration)||duration<10||duration>180||!Number.isInteger(bpm)||bpm<30||bpm>300)throw Error('Duration must be 10–180 seconds and tempo 30–300 BPM.');
 const prompt=s('prompt',1200);if(!prompt)throw Error('Describe the song you want to create.');
 const language=s('language',5,'en');if(!['en','es','fr','de','ja','zh','ko','pt','it','hi'].includes(language))throw Error('Unsupported language.');
 return {prompt,genre:s('genre',80,'Electronic'),mood:s('mood',80,'Dreamy'),artStyle:s('artStyle',200,'Abstract cinematic photography'),lyrics:s('lyrics',6000),instrumental:b.instrumental===true,duration,bpm,language};
}
async function body(req,max=20000){let text='';for await(const c of req){text+=c;if(Buffer.byteLength(text)>max)throw Error('Request too large.');}return JSON.parse(text||'{}');}
// Optional DJ voice reference. Held in server memory only for the running session: it is never written to
// disk, logged, or returned to the browser, and it is sent only to the Chatterbox speech service.
const voice={reference:null,name:'',version:0};
const voicePublic=()=>({custom:!!voice.reference,name:voice.name});
const radio=createRadio({list:()=>[...tracks.values()],choose:context=>api.choose(context),create:async input=>{
 if(busy.size>=2)throw Error('Music generation is busy. Retry the DJ pick when another track finishes.');
 // The DJ model sometimes returns a fractional tempo or a language name instead of a code; normalise before validating.
 const bpm=Math.min(300,Math.max(30,Math.round(Number(input.bpm))||110)),language=typeof input.language==='string'&&/^[a-z]{2}$/.test(input.language)?input.language:'en';
 const str=(v,d)=>typeof v==='string'&&v.trim()?v.slice(0,80):d;
 const fields=validate({...input,prompt:typeof input.prompt==='string'?input.prompt.slice(0,1200):'',genre:str(input.genre,'Electronic'),mood:str(input.mood,'Dreamy'),instrumental:input.instrumental===true,bpm,language:['en','es','fr','de','ja','zh','ko','pt','it','hi'].includes(language)?language:'en',artStyle:'Expressive album cover matching the music, no text',lyrics:''});
 const t={...fields,id:randomUUID(),title:'DJ original',createdAt:new Date().toISOString(),status:'generating'};tracks.set(t.id,t);await generate(t);return t;
},voice:async(previous,next,style,context)=>{const d=await api.dj(previous,next,style,context,voice.reference),id=randomUUID();await writeFile(path.join(data,id+'-dj.mp3'),d.audio);return {script:d.script,audio:'/media/'+id+'-dj.mp3'};}});
const host=process.env.HOST||'127.0.0.1', password=process.env.APP_PASSWORD;
if(!['127.0.0.1','localhost','::1'].includes(host)&&!password)throw Error('Set APP_PASSWORD before binding a public interface.');
function authorized(req){if(!password)return true;let supplied='';try{supplied=Buffer.from((req.headers.authorization||'').split(' ')[1]||'','base64').toString().split(':').slice(1).join(':');}catch{}const a=Buffer.from(supplied),b=Buffer.from(password);return a.length===b.length&&timingSafeEqual(a,b);}
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.png':'image/png','.mp3':'audio/mpeg'};
const server=http.createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Content-Security-Policy',"default-src 'self'; img-src 'self'; media-src 'self'; script-src 'self'; style-src 'self'; frame-ancestors 'none'; base-uri 'none'");
 const json=(code,obj)=>{res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(obj));};
 try{
  if(!authorized(req)){res.writeHead(401,{'WWW-Authenticate':'Basic realm="Midnight Radio"'});return res.end('Sign in with your app password.');}
  const u=new URL(req.url,'http://localhost');
  if(req.method==='POST'||req.method==='DELETE'){
   if(req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host)return json(403,{error:'Cross-origin request blocked.'});
   if(req.headers['sec-fetch-site']==='cross-site')return json(403,{error:'Cross-site request blocked.'});
  }
  if(req.method==='GET'&&u.pathname==='/api/tracks')return json(200,[...tracks.values()].map(publicTrack));
  if(req.method==='GET'&&u.pathname==='/api/status')return json(200,{configured:!!configuration().key&&configuration().key!=='replace_with_class_key',busy:busy.size,voice:voicePublic()});
  if(u.pathname==='/api/voice'){
   if(req.method==='GET')return json(200,voicePublic());
   if(req.method==='POST'){const b=await body(req,12*1024*1024);const ref=validateVoiceReference(b.data);voice.reference=ref.dataUri;voice.name=String(b.name||'reference').replace(/[^\w .()-]/g,'').slice(0,60)||'reference';voice.version++;return json(200,voicePublic());}
   if(req.method==='DELETE'){voice.reference=null;voice.name='';voice.version++;return json(200,voicePublic());}
  }
  if(req.method==='POST'&&u.pathname==='/api/radio')return json(202,radio.start(await body(req)));
  const radioMatch=u.pathname.match(/^\/api\/radio\/([\da-f-]+)(?:\/(request|consume|feedback|retry|stop))?$/);
  if(radioMatch){if(req.method==='GET'&&!radioMatch[2])return json(200,radio.status(radioMatch[1]));if(req.method==='POST'&&radioMatch[2])return json(200,radio[radioMatch[2]](radioMatch[1],await body(req)));}
  if(req.method==='POST'&&u.pathname==='/api/tracks'){
   if(busy.size>=2)return json(429,{error:'Two tracks are already generating. Wait for one to finish.'});
   const input=validate(await body(req));const t={...input,id:randomUUID(),title:'Untitled session',createdAt:new Date().toISOString(),status:'generating'};tracks.set(t.id,t);generate(t).catch(()=>{});return json(202,publicTrack(t));
  }
  const match=u.pathname.match(/^\/api\/tracks\/([\da-f-]+)(?:\/(retry|dj))?$/);
  if(match){const t=tracks.get(match[1]);if(!t)return json(404,{error:'Track not found.'});
   if(req.method==='POST'&&match[2]==='retry'){if(busy.has(t.id)||busy.size>=2)return json(409,{error:'Generation is busy.'});generate(t).catch(()=>{});return json(202,{ok:true});}
   if(req.method==='POST'&&match[2]==='dj'){
    if(!t.audio)return json(409,{error:'Wait for music to finish.'});
    const b=await body(req), previous=tracks.get(b.previousId),style=['Warm late-night host','Energetic festival host','Relaxed storyteller'].includes(b.style)?b.style:'Warm late-night host';
    const cacheKey=`${previous?.id||'start'}|${style}|voice${voice.version}`;
    if(t.dj?.key===cacheKey)return json(200,t.dj);
    if(djBusy.has(t.id))return json(409,{error:'DJ is already preparing this track. Try again shortly.'});
    djBusy.set(t.id,true);try{const d=await api.dj(previous,t,style,undefined,voice.reference);await writeFile(path.join(data,t.id+'-dj.mp3'),d.audio);t.dj={key:cacheKey,script:d.script,audio:'/media/'+t.id+'-dj.mp3?v='+Date.now()};await save(t);return json(200,t.dj);}finally{djBusy.delete(t.id);}
   }
   if(req.method==='DELETE'&&!match[2]){if(busy.has(t.id)||djBusy.has(t.id))return json(409,{error:'Wait for generation to finish.'});for(const suffix of ['.json','.mp3','.png','-dj.mp3'])await unlink(path.join(data,t.id+suffix)).catch(()=>{});if(t.sample)await writeFile(path.join(data,t.id+'.deleted'),'');tracks.delete(t.id);return json(200,{ok:true});}
  }
  if(req.method!=='GET'&&req.method!=='HEAD')return json(404,{error:'Not found.'});
  let file;
  if(/^\/media\/[\da-f-]+(?:-dj)?\.(mp3|png)$/.test(u.pathname))file=path.join(data,path.basename(u.pathname));
  else if(['/','/app.js','/moods.js','/style.css'].includes(u.pathname))file=path.join(root,'public',u.pathname==='/'?'index.html':u.pathname.slice(1));
  else return json(404,{error:'Not found.'});
  const bytes=await readFile(file),type=mime[path.extname(file)];
  const range=req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
  if(range){const start=Number(range[1]),end=Math.min(range[2]?Number(range[2]):bytes.length-1,bytes.length-1);if(start>end||start>=bytes.length){res.writeHead(416,{'Content-Range':`bytes */${bytes.length}`});return res.end();}res.writeHead(206,{'Content-Type':type,'Content-Range':`bytes ${start}-${end}/${bytes.length}`,'Content-Length':end-start+1,'Accept-Ranges':'bytes'});return res.end(req.method==='HEAD'?undefined:bytes.subarray(start,end+1));}
  res.writeHead(200,{'Content-Type':type,'Content-Length':bytes.length,'Accept-Ranges':'bytes','Cache-Control':'no-cache'});res.end(req.method==='HEAD'?undefined:bytes);
 }catch(e){if(e.code==='ENOENT')return json(404,{error:'File not found.'});json(400,{error:e instanceof SyntaxError?'Invalid request JSON.':e.message||'Request failed.'});}
});
server.listen(Number(process.env.PORT)||3000,host,()=>console.log(`Midnight Radio is running at http://${host}:${Number(process.env.PORT)||3000}`));
