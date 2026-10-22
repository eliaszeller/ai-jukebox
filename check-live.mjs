// Run against an already started app. No credentials or reference recordings are written.
const base=process.env.TEST_BASE || 'http://localhost:3000';
let cookie='';
async function request(path,body){const r=await fetch(base+path,{headers:{...(cookie?{Cookie:cookie}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{method:'POST',body:JSON.stringify(body)}:{})});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return r;}
const before=await(await request('/api/library')).json();
let r=await request('/api/generate',{title:'Sunset Test',style:'Jazz',mood:'Dreamy',duration:30,vocals:false});
if(r.status!==202)throw new Error('Generation submission failed');
const {id}=await r.json();
for(let i=0;i<400;i++){const j=await(await request('/api/jobs/'+id)).json();if(j.status==='error')throw new Error(j.message);if(j.status==='done'){console.log('PASS custom generation: Jazz / Dreamy / instrumental / 30 seconds');break;}if(i===399)throw new Error('Test timeout');await new Promise(r=>setTimeout(r,2000));}
const after=await(await request('/api/library')).json();
if(after.length!==before.length+1)throw new Error('New track missing from session library');
const song=after.at(-1);
for(const [kind,path]of [['music',song.audio],['cover',song.cover]]){const r=await request(path);if(!r.ok||(await r.arrayBuffer()).byteLength<1000)throw new Error('Missing '+kind);console.log('PASS generated '+kind+' download');}
r=await request('/api/dj',{songId:song.id});
if(!r.ok)throw new Error((await r.json()).error);
const voice=Buffer.from(await r.arrayBuffer());
console.log('PASS Qwen commentary and Chatterbox default voice:',voice.length,'bytes');
r=await request('/api/dj',{songId:song.id,previousId:before[0].id,reference:'data:audio/mpeg;base64,'+voice.toString('base64')});
if(!r.ok)throw new Error((await r.json()).error);
console.log('PASS Chatterbox synthetic MP3 reference:',(await r.arrayBuffer()).byteLength,'bytes');
r=await request('/api/generate',{title:'',style:'Jazz',mood:'Dreamy',duration:30});
if(r.status!==400)throw new Error('Validation failure not handled');
console.log('PASS invalid generation rejected with recoverable error');
