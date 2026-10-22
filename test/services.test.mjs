import {test} from 'node:test';
import assert from 'node:assert/strict';
import {services,validateVoiceReference} from '../services.mjs';
const config={key:'test-secret',text:'http://class:9001',image:'http://class:9006',music:'http://class:9007',speech:'http://class:9008'};
const json=d=>new Response(JSON.stringify(d),{headers:{'Content-Type':'application/json'}});
test('music submits once, polls pending to completion, then downloads with server authentication',async()=>{
 let poll=0,task;const paths=[];
 const s=services(config,async(url,o)=>{paths.push(url.pathname);assert.equal(o.headers.Authorization,'Bearer test-secret');assert.notEqual(url.port,'9000');const b=o.body&&JSON.parse(o.body);
  if(url.pathname==='/release_task'){assert.equal(b.batch_size,1);assert.equal(b.audio_duration,10);return json({data:{task_id:'abc'}});}
  if(url.pathname==='/query_result'){assert.deepEqual(b.task_id_list,['abc']);return json({data:[{task_id:'abc',status:++poll===1?0:1,result:JSON.stringify([{file:'/v1/audio?path=test.mp3'}])}]});}
  return new Response('audio');
 },async()=>{});
 const audio=await s.music({caption:'ambient',lyrics:'[Instrumental]',duration:10,bpm:90,language:'en'},async id=>task=id);
 assert.equal(task,'abc');assert.equal(audio.toString(),'audio');assert.deepEqual(paths,['/release_task','/query_result','/query_result','/v1/audio']);
});
test('resume uses existing task, and failed task clears ID for retry',async()=>{let cleared=false;const s=services(config,async(url)=>{assert.equal(url.pathname,'/query_result');return json({data:[{task_id:'saved',status:2}]});},async()=>{});await assert.rejects(s.music({taskId:'saved'},async id=>{cleared=id===null;}),/failed/);assert.equal(cleared,true);});
test('rejects an off-origin music download without forwarding a credential',async()=>{let n=0;const s=services(config,async()=>{n++;return json({data:[{status:1,result:JSON.stringify([{file:'http://attacker.invalid/audio'}])}]});});await assert.rejects(s.music({taskId:'saved'},async()=>{}),/origin/);assert.equal(n,1);});
test('upstream failures never expose error bodies or credentials',async()=>{const s=services(config,async()=>new Response('sensitive upstream details test-secret',{status:401}));await assert.rejects(s.image('cover'),e=>e.message.includes('HTTP 401')&&!e.message.includes('test-secret')&&!e.message.includes('sensitive'));});
test('DJ uses Qwen followed by documented Chatterbox speech format',async()=>{const s=services(config,async(url,o)=>{const b=JSON.parse(o.body);if(url.port==='9001')return json({choices:[{message:{content:'Next up, a peaceful original.'}}]});assert.equal(url.port,'9008');assert.equal(url.pathname,'/v1/audio/speech');assert.equal(b.model,'chatterbox-v3');assert.equal(b.voice,'default');assert.equal(b.language_id,'en');return new Response('speech');});const d=await s.dj(null,{title:'Orbit'},'Warm');assert.equal(d.audio.toString(),'speech');assert.equal(d.script,'Next up, a peaceful original.');});
test('instrumental overrides generated lyrics and custom vocal lyrics are retained',async()=>{const s=services(config,async()=>json({choices:[{message:{content:JSON.stringify({title:'Original',caption:'ambient',lyrics:'generated',coverPrompt:'abstract'})}}]}));assert.equal((await s.plan({instrumental:true,lyrics:'custom'})).lyrics,'[Instrumental]');assert.equal((await s.plan({instrumental:false,lyrics:'custom'})).lyrics,'custom');});
test('DJ forwards an uploaded voice reference as ref_audio and omits it for the default voice',async()=>{const sent=[];const s=services(config,async(url,o)=>{const b=JSON.parse(o.body);if(url.port==='9001')return json({choices:[{message:{content:'Here comes something new.'}}]});sent.push(b);return new Response('speech');});await s.dj(null,{title:'Orbit'},'Warm',undefined,'data:audio/wav;base64,UklGRg==');await s.dj(null,{title:'Orbit'},'Warm');assert.equal(sent[0].ref_audio,'data:audio/wav;base64,UklGRg==');assert.equal(sent[0].voice,'default');assert.equal('ref_audio' in sent[1],false);});
test('voice reference validation accepts real MP3/WAV signatures and rejects everything else',async()=>{
 const wav=Buffer.concat([Buffer.from('RIFF'),Buffer.alloc(4),Buffer.from('WAVE'),Buffer.alloc(80)]),mp3=Buffer.concat([Buffer.from('ID3'),Buffer.alloc(100)]),frame=Buffer.concat([Buffer.from([0xff,0xfb]),Buffer.alloc(100)]);
 const uri=(m,b)=>`data:${m};base64,${b.toString('base64')}`;
 assert.equal(validateVoiceReference(uri('audio/wav',wav)).mime,'audio/wav');assert.equal(validateVoiceReference(uri('audio/mpeg',mp3)).mime,'audio/mpeg');assert.equal(validateVoiceReference(uri('audio/mp3',frame)).mime,'audio/mpeg');
 assert.throws(()=>validateVoiceReference(uri('audio/wav',mp3)),/not a valid/);assert.throws(()=>validateVoiceReference(uri('audio/mpeg',wav)),/not a valid/);
 assert.throws(()=>validateVoiceReference(uri('text/plain',Buffer.from('hello world, this is not audio at all, really'))),/MP3 or WAV/);assert.throws(()=>validateVoiceReference(uri('audio/wav',Buffer.from('RIFF'))),/too short/);
 assert.throws(()=>validateVoiceReference(uri('audio/wav',wav),50),/8 MB|smaller/);assert.throws(()=>validateVoiceReference(42),/MP3 or WAV/);
});
