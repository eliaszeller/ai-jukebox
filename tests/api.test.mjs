import test from 'node:test';
import assert from 'node:assert/strict';
import worker, { decodeCoverArt, validateVoiceReference } from '../worker/index.js';
const env={CLASS_API_KEY:'test-secret-placeholder',MEDIA_SIGNING_KEY:'test-signing-secret-placeholder'};
const req=(path,body,headers={})=>new Request('https://jukebox.test'+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...headers},...(body===undefined?{}:{body:JSON.stringify(body)})});
const response=d=>new Response(JSON.stringify(d),{headers:{'Content-Type':'application/json'}});
const song={description:'Dreamy original electronic instrumental',duration:30,bpm:100,instrumental:true};

test('page includes the app and never exposes the service key',async()=>{const result=await worker.fetch(req('/'),env);assert.equal(result.status,200);const html=await result.text();assert.match(html,/Your personal frequency/);assert.match(html,/indexedDB/);assert.ok(!html.includes(env.CLASS_API_KEY));assert.ok(!html.includes('9000'));assert.ok(result.headers.get('Content-Security-Policy'));});
test('rejects cross-origin writes',async()=>{const result=await worker.fetch(req('/api/compose',song,{Origin:'https://other.test'}),env);assert.equal(result.status,403);});
test('validates descriptions, duration and tempo',async()=>{for(const input of [{...song,description:'x'},{...song,duration:601},{...song,bpm:'nope'}]){const result=await worker.fetch(req('/api/compose',input),env);assert.equal(result.status,400);}});
test('composes original song plans on port 9001 and preserves custom lyrics',async()=>{const original=globalThis.fetch;let called;globalThis.fetch=async(url,options)=>{called={url,body:JSON.parse(options.body),headers:options.headers};return response({choices:[{message:{content:JSON.stringify({title:'City Lanterns',caption:'Dreamy synth instrumental',lyrics:'generated lyrics',coverPrompt:'Violet skyline on film'})}}]});};try{const result=await worker.fetch(req('/api/compose',{...song,instrumental:false,lyrics:'[Verse]\nOriginal words'}),env);assert.equal(result.status,200);const data=await result.json();assert.equal(data.lyrics,'[Verse]\nOriginal words');assert.equal(new URL(called.url).port,'9001');assert.equal(called.headers.Authorization,'Bearer '+env.CLASS_API_KEY);assert.match(called.body.model,/Qwen/);}finally{globalThis.fetch=original;}});
test('FLUX uses documented image endpoint and b64 response',async()=>{const original=globalThis.fetch;globalThis.fetch=async(url,opts)=>{assert.equal(new URL(url).port,'9006');const body=JSON.parse(opts.body);assert.equal(body.response_format,'b64_json');return response({data:[{b64_json:'aW1hZ2U='}]});};try{const result=await worker.fetch(req('/api/art',{coverPrompt:'A cinematic original sleeve'}),env);assert.equal((await result.json()).image,'data:image/jpeg;base64,aW1hZ2U=');}finally{globalThis.fetch=original;}});
test('ACE-Step starts asynchronous jobs with a single output',async()=>{const original=globalThis.fetch;globalThis.fetch=async(url,opts)=>{assert.match(url,/:9007\/release_task$/);const body=JSON.parse(opts.body);assert.equal(body.batch_size,1);assert.equal(body.audio_duration,30);assert.equal(body.instrumental,true);return response({data:{task_id:'task-123',queue_position:1},code:200});};try{const result=await worker.fetch(req('/api/music',song),env);assert.equal((await result.json()).taskId,'task-123');}finally{globalThis.fetch=original;}});
test('ACE-Step polling returns a signed same-origin download, rejects tampering',async()=>{const original=globalThis.fetch;globalThis.fetch=async(url,opts)=>{if(String(url).endsWith('/query_result'))return response({data:[{status:1,result:JSON.stringify([{file:'/v1/audio?path=generated.mp3'}])}],code:200});assert.equal(new URL(url).pathname,'/v1/audio');return new Response(new Uint8Array([1,2,3]),{headers:{'Content-Type':'audio/mpeg'}});};try{const result=await worker.fetch(req('/api/music/status',{taskId:'task-123'}),env);const data=await result.json();assert.equal(data.status,'ready');assert.match(data.audioUrl,/^\/api\/audio\?ticket=/);assert.equal((await worker.fetch(req(data.audioUrl),env)).status,200);assert.equal((await worker.fetch(req(data.audioUrl+'tampered'),env)).status,403);}finally{globalThis.fetch=original;}});
test('does not proxy arbitrary upstream audio URLs',async()=>{const original=globalThis.fetch;globalThis.fetch=async()=>response({data:[{status:1,result:JSON.stringify([{file:'https://untrusted.test/audio.mp3'}])}]});try{const result=await worker.fetch(req('/api/music/status',{taskId:'task-123'}),env);assert.equal(result.status,502);}finally{globalThis.fetch=original;}});
test('reports failed music jobs without reflecting service internals',async()=>{const original=globalThis.fetch;globalThis.fetch=async()=>response({data:[{status:2,result:'private internal path'}]});try{const result=await worker.fetch(req('/api/music/status',{taskId:'task-123'}),env);const data=await result.json();assert.equal(data.status,'failed');assert.ok(!JSON.stringify(data).includes('private internal'));}finally{globalThis.fetch=original;}});
test('DJ uses Qwen then Chatterbox default voice with full audio',async()=>{const original=globalThis.fetch;const ports=[];globalThis.fetch=async(url,opts)=>{const port=new URL(url).port;ports.push(port);if(port==='9001')return response({choices:[{message:{content:'Let the city lights drift past. Here comes City Lanterns.'}}]});const body=JSON.parse(opts.body);assert.equal(body.model,'chatterbox-v3');assert.equal(body.voice,'default');assert.equal(body.language_id,'en');return new Response(new Uint8Array([1,2,3]),{headers:{'Content-Type':'audio/mpeg'}});};try{const result=await worker.fetch(req('/api/dj',{next:{title:'City Lanterns',mood:'Dreamy'}}),env);const data=await result.json();assert.match(data.script,/City Lanterns/);assert.match(data.audio,/^data:audio\/mpeg;base64,/);assert.deepEqual(ports,['9001','9008']);}finally{globalThis.fetch=original;}});
test('errors do not leak upstream bodies or authentication',async()=>{const original=globalThis.fetch;globalThis.fetch=async()=>new Response('Authorization: Bearer '+env.CLASS_API_KEY,{status:500});try{const result=await worker.fetch(req('/api/art',{coverPrompt:'Cinematic cover'}),env);assert.equal(result.status,502);assert.ok(!(await result.text()).includes(env.CLASS_API_KEY));}finally{globalThis.fetch=original;}});
test('missing configuration gives an actionable error',async()=>{const result=await worker.fetch(req('/api/compose',song),{});assert.equal(result.status,503);assert.match((await result.json()).error,/configured/);});

test('uses Worker-compatible manual redirects without forwarding credentials',async()=>{const original=globalThis.fetch;globalThis.fetch=async(url,opts)=>{assert.equal(opts.redirect,'manual');return new Response(null,{status:302,headers:{Location:'https://other.test'}});};try{const result=await worker.fetch(req('/api/art',{coverPrompt:'Original cover'}),env);assert.equal(result.status,502);}finally{globalThis.fetch=original;}});


test('saves generated cover bytes without a CSP-blocked data URL fetch',async()=>{
  const original=globalThis.fetch;let requests=0;
  globalThis.fetch=async()=>{requests++;throw new TypeError('Failed to fetch: blocked by connect-src');};
  try{
    const bytes=new Uint8Array([255,216,255,224,0,16,74,70,73,70]);
    const dataUrl='data:image/jpeg;base64,'+Buffer.from(bytes).toString('base64');
    const cover=decodeCoverArt(dataUrl);
    assert.equal(cover.type,'image/jpeg');
    assert.deepEqual(new Uint8Array(await cover.arrayBuffer()),bytes);
    const stored=structuredClone({coverBlob:cover,audioBlob:new Blob([new Uint8Array([1,2,3])],{type:'audio/mpeg'})});
    assert.equal(stored.coverBlob.size,bytes.length);
    assert.equal(stored.audioBlob.size,3);
    assert.equal(requests,0);
  }finally{globalThis.fetch=original;}
});
test('cover decoding rejects malformed output with an actionable error',()=>{
  for(const input of [null,'','https://other.test/image.jpg','data:image/jpeg;base64,','data:image/jpeg;base64,a','data:image/svg+xml;base64,PHN2Zz4='])
    assert.throws(()=>decodeCoverArt(input),/generated cover could not be read/);
});
test('studio embeds the local decoder and keeps network connections same-origin',async()=>{
  const result=await worker.fetch(req('/'),env);const html=await result.text();
  assert.match(result.headers.get('Content-Security-Policy'),/connect-src 'self';/);
  const browserCode=html.match(/<script>([\s\S]*)<\/script>/)[1];
  new Function(browserCode);
  assert.match(browserCode,/function decodeCoverArt/);
  assert.match(browserCode,/const artBlob=decodeCoverArt\(job.artData\)/);
  assert.ok(!browserCode.includes('fetch(job.artData)'));
});

test('each DJ personality changes authoritative writing instructions and speech delivery',async()=>{
  const original=globalThis.fetch;const seen=[];
  globalThis.fetch=async(url,opts)=>{
    const body=JSON.parse(opts.body);
    if(new URL(url).port==='9001'){seen.push({system:body.messages[0].content});return response({choices:[{message:{content:'A new frequency. Here comes City Lanterns.'}}]});}
    Object.assign(seen.at(-1),{speed:body.speed,exaggeration:body.exaggeration,cfg:body.cfg_weight});
    return new Response(new Uint8Array([1,2,3]),{headers:{'Content-Type':'audio/mpeg'}});
  };
  try{
    const names=['Warm & conversational','Late-night storyteller','Playful & energetic','Minimal & laid-back'];
    for(const personality of names){const result=await worker.fetch(req('/api/dj',{personality,next:{title:'City Lanterns'}}),env);assert.equal(result.status,200);assert.equal((await result.json()).personality,personality);}
    assert.equal(new Set(seen.map(s=>s.system)).size,4);
    assert.equal(new Set(seen.map(s=>s.speed)).size,4);
    assert.equal(new Set(seen.map(s=>s.exaggeration)).size,4);
    assert.match(seen[1].system,/vivid sensory image/);
    assert.match(seen[2].system,/lively, upbeat/);
    assert.match(seen[3].system,/at most 18 words/);
    assert.ok(seen[2].speed>seen[1].speed);
  }finally{globalThis.fetch=original;}
});
test('unknown DJ styles fall back to a supported personality',async()=>{
  const original=globalThis.fetch;globalThis.fetch=async(url,opts)=>new URL(url).port==='9001'?response({choices:[{message:{content:'Here comes the next song.'}}]}):new Response(new Uint8Array([1,2,3]));
  try{for(const personality of ['unsupported','__proto__',null]){const result=await worker.fetch(req('/api/dj',{personality,next:{title:'Original'}}),env);assert.equal((await result.json()).personality,'Warm & conversational');}}finally{globalThis.fetch=original;}
});


test('vocal songs require lyrics and send generated words to ACE-Step',async()=>{
  const original=globalThis.fetch;let sent;
  globalThis.fetch=async(url,opts)=>{sent=JSON.parse(opts.body);return response({data:{task_id:'vocal-task'},code:200});};
  try{
    assert.equal((await worker.fetch(req('/api/music',{...song,instrumental:false}),env)).status,400);
    const result=await worker.fetch(req('/api/music',{...song,instrumental:false,lyrics:'[Verse] Original morning light'}),env);
    assert.equal(result.status,200);assert.equal(sent.instrumental,false);assert.match(sent.lyrics,/Original morning light/);
  }finally{globalThis.fetch=original;}
});
test('Chatterbox gets an in-memory MP3 or WAV reference while preserving the default voice API contract',async()=>{
  const original=globalThis.fetch;let speechBody;
  globalThis.fetch=async(url,opts)=>{if(new URL(url).port==='9001')return response({choices:[{message:{content:'Your next original is here.'}}]});speechBody=JSON.parse(opts.body);return new Response(new Uint8Array([1,2,3]));};
  try{
    for(const format of ['wav','mpeg']){
      const bytes=Buffer.alloc(40064);if(format==='wav'){bytes.write('RIFF');bytes.write('WAVE',8);}else bytes.write('ID3');
      const reference='data:audio/'+format+';base64,'+bytes.toString('base64');
      const result=await worker.fetch(req('/api/dj',{next:{title:'Original'},voiceReference:reference}),env);
      assert.equal(result.status,200);assert.equal(speechBody.voice,'default');assert.equal(speechBody.ref_audio,reference);
      assert.ok(!(await result.text()).includes(reference));
    }
  }finally{globalThis.fetch=original;}
});
test('invalid or oversized voice uploads are rejected before model requests',async()=>{
  const original=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;throw new Error('Unexpected model request');};
  try{
    const bad='data:audio/wav;base64,'+Buffer.alloc(64).toString('base64');
    assert.equal((await worker.fetch(req('/api/dj',{next:{title:'Original'},voiceReference:bad}),env)).status,400);
    assert.throws(()=>validateVoiceReference('data:audio/mpeg;base64,'+'A'.repeat(Math.ceil(8*1024*1024/3)*4+4)),/8 MB/);
    assert.equal(calls,0);
  }finally{globalThis.fetch=original;}
});
