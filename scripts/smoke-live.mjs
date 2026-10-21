import {mkdir,writeFile} from 'node:fs/promises';
const base=process.argv[2]||'http://127.0.0.1:4173';
const output='/tmp/afterhours-live-test';
await mkdir(output,{recursive:true});
const report={};
async function api(path,body){const response=await fetch(base+path,{method:body===undefined?'GET':'POST',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});const data=await response.json();if(!response.ok)throw new Error(data.error||'HTTP '+response.status);return data;}
const time=Date.now();
const plan=await api('/api/compose',{description:'An original late-night electronic instrumental with warm analog synthesizers, a gentle bass groove and cinematic shimmering textures. Quietly hopeful.',genre:'Electronic',mood:'Dreamy',duration:15,bpm:100,instrumental:true,artStyle:'Minimal cinematic analog photography, violet city lights, no text'});
report.compose={ok:true,title:plan.title};console.log('Qwen: song plan generated.');
const parts=await Promise.allSettled([
  (async()=>{const art=await api('/api/art',{coverPrompt:plan.coverPrompt});const res=await fetch(art.image);const bytes=Buffer.from(await res.arrayBuffer());await writeFile(output+'/cover.jpg',bytes);report.art={ok:true,bytes:bytes.length};console.log('FLUX: cover generated ('+bytes.length+' bytes).');})(),
  (async()=>{const task=await api('/api/music',plan);report.musicTask={ok:true,taskId:task.taskId};await writeFile(output+'/task.json',JSON.stringify({taskId:task.taskId,plan}));console.log('ACE-Step: generation accepted.');for(let i=0;i<120;i++){const status=await api('/api/music/status',{taskId:task.taskId});if(status.status==='failed')throw new Error(status.error);if(status.status==='ready'){const res=await fetch(base+status.audioUrl);if(!res.ok)throw new Error('Audio download HTTP '+res.status);const bytes=Buffer.from(await res.arrayBuffer());await writeFile(output+'/song.mp3',bytes);report.music={ok:true,bytes:bytes.length};console.log('ACE-Step: audio downloaded ('+bytes.length+' bytes).');return;}await new Promise(r=>setTimeout(r,5000));}throw new Error('Music poll timed out.');})(),
  (async()=>{const dj=await api('/api/dj',{next:plan,personality:'Warm & conversational',language:'en'});const res=await fetch(dj.audio);const bytes=Buffer.from(await res.arrayBuffer());await writeFile(output+'/dj.mp3',bytes);report.dj={ok:true,script:dj.script,bytes:bytes.length};console.log('Qwen + Chatterbox: DJ introduction generated ('+bytes.length+' bytes).');})()
]);
parts.forEach((r,i)=>{if(r.status==='rejected'){report[['art','music','dj'][i]]={ok:false,error:r.reason.message};console.log(['FLUX','ACE-Step','DJ'][i]+': '+r.reason.message);}});
report.elapsedSeconds=Math.round((Date.now()-time)/1000);await writeFile(output+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
if(parts.some(r=>r.status==='rejected'))process.exitCode=1;
