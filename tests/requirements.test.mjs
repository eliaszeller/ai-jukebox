import test from 'node:test';
import assert from 'node:assert/strict';
import {appHarness,tick,asJson,wavReference,track} from './helpers/app.mjs';

const services={configured:true,services:[]};
const intro=(script='Song-specific intro')=>asJson({script,audio:'data:audio/mpeg;base64,b3JpZ2luYWw='});

test('a two-song queue advances automatically: speech, music, speech, music without overlap',async()=>{
  const requests=[];
  const app=await appHarness(async(path,opts)=>{if(path==='/api/status')return asJson(services);requests.push(JSON.parse(opts.body));return intro();});
  app.state.tracks=[track('first'),track('second')];app.state.dj=true;app.setQueue(['first','second']);
  const playing=app.playTrack('first',true);await tick();
  assert.equal(app.nodes.get('#audio').paused,true);assert.equal(app.nodes.get('#speech').paused,false);
  app.nodes.get('#speech').end();await playing;
  assert.equal(app.nodes.get('#audio').paused,false);
  app.nodes.get('#audio').end();await tick();
  assert.equal(app.state.current.id,'second');assert.equal(requests[1].previous.title,'Original first');assert.equal(requests[1].next.title,'Original second');
  app.nodes.get('#speech').end();await tick();
  assert.deepEqual(app.events,['#speech play','#audio play','#speech play','#audio play']);
  app.nodes.get('#audio').end();await tick();assert.equal(requests.length,2);
});
test('pause and resume work while the DJ is speaking and while music is playing',async()=>{
  const app=await appHarness(async(path)=>path==='/api/status'?asJson(services):intro());app.state.tracks=[track()];app.state.dj=true;
  const playing=app.playTrack('first',true);await tick();await app.togglePlay();assert.equal(app.nodes.get('#speech').paused,true);assert.equal(app.nodes.get('#audio').paused,true);
  await app.togglePlay();assert.equal(app.nodes.get('#speech').paused,false);app.nodes.get('#speech').end();await playing;
  await app.togglePlay();assert.equal(app.nodes.get('#audio').paused,true);await app.togglePlay();assert.equal(app.nodes.get('#audio').paused,false);
});
test('pausing a pending DJ request keeps both players paused after it completes',async()=>{
  let resolve;const app=await appHarness(async(path)=>path==='/api/status'?asJson(services):new Promise(r=>resolve=r));app.state.tracks=[track()];app.state.dj=true;
  const playing=app.playTrack('first',true);await app.togglePlay();resolve(intro());await tick();
  assert.equal(app.nodes.get('#audio').paused,true);assert.equal(app.nodes.get('#speech').paused,true);
  await app.togglePlay();app.nodes.get('#speech').end();await playing;
});
test('skip during a pending introduction ignores the stale response and plays only the next song',async()=>{
  const pending=[];const app=await appHarness(async(path)=>path==='/api/status'?asJson(services):new Promise(r=>pending.push(r)));
  app.state.tracks=[track('first'),track('second')];app.state.dj=true;app.setQueue(['first','second']);
  const first=app.playTrack('first',true);app.advance();pending[0](intro('Stale intro'));await first;assert.equal(app.state.djScript,'');
  pending[1](intro('Second song intro'));await tick();assert.equal(app.state.current.id,'second');assert.equal(app.state.djScript,'Second song intro');app.nodes.get('#speech').end();await tick();assert.equal(app.nodes.get('#audio').paused,false);
});
test('failed DJ requests show a recoverable error and still play music',async()=>{
  let fail=true;const app=await appHarness(async(path)=>path==='/api/status'?asJson(services):fail?asJsonError():intro('Recovered intro'));app.state.tracks=[track()];app.state.dj=true;
  await app.playTrack('first',true);assert.match(app.state.djError,/retry/);assert.equal(app.nodes.get('#audio').paused,false);
  fail=false;const retry=app.playTrack('first',true);await tick();assert.equal(app.state.djError,'');assert.equal(app.nodes.get('#audio').paused,true);app.nodes.get('#speech').end();await retry;
});
function asJsonError(){return new Response(JSON.stringify({error:'Class voice service is busy.'}),{status:502,headers:{'Content-Type':'application/json'}});}

test('voice references are sent for speech only and never persisted with preferences',async()=>{
  let body;const app=await appHarness(async(path,opts)=>path==='/api/status'?asJson(services):(body=JSON.parse(opts.body),intro()));
  const reference=wavReference();app.applyVoiceReference(reference,'my-recording.wav');app.changeRadioSetting('personality','Minimal & laid-back');
  app.state.tracks=[track()];app.state.dj=true;const playing=app.playTrack('first',true);await tick();assert.equal(body.voiceReference,reference);app.nodes.get('#speech').end();await playing;
  assert.ok(!JSON.stringify([...app.store.values()]).includes(reference));assert.equal(app.records.jobs.size,0);assert.equal(app.records.tracks.size,0);
  app.applyVoiceReference(null);const defaultPlaying=app.playTrack('first',true);await tick();assert.equal(body.voiceReference,undefined);app.nodes.get('#speech').end();await defaultPlaying;
});

test('studio saves instrumental and vocal songs with their own cover and retries only failed work',async()=>{
  let mode='instrumental',coverAttempts=0,composeCalls=0,musicCalls=0,failCover=false;
  const coverData=suffix=>'data:image/jpeg;base64,'+Buffer.from('original jpeg '+suffix).toString('base64');
  const app=await appHarness(async(path,opts)=>{
    if(path==='/api/status')return asJson(services);
    const body=opts?.body?JSON.parse(opts.body):{};
    if(path==='/api/compose'){composeCalls++;return asJson({...body,title:mode+' original',caption:body.genre+' '+body.mood,lyrics:body.instrumental?'':'[Verse]\nOur entirely original sunrise',coverPrompt:mode+' artwork with '+body.mood});}
    if(path==='/api/art'){coverAttempts++;if(failCover)return asJsonError();return asJson({image:coverData(mode)});}
    if(path==='/api/music'){musicCalls++;return asJson({taskId:'music-'+mode});}
    if(path==='/api/music/status')return asJson({status:'ready',audioUrl:'/api/audio?ticket='+mode});
    if(path.startsWith('/api/audio'))return new Response(new Blob(['playable '+mode],{type:'audio/mpeg'}));
    throw new Error('Unexpected fetch '+path);
  });
  const settings={description:'A peaceful original song about the sunrise',genre:'Folk',mood:'Peaceful',duration:60,bpm:90,instrumental:true};
  await app.generate(settings);
  const instrumental=app.state.tracks[0];assert.equal(instrumental.duration,60);assert.equal(instrumental.genre,'Folk');assert.equal(instrumental.lyrics,'');assert.equal(await instrumental.coverBlob.text(),'original jpeg instrumental');
  mode='vocal';failCover=true;await app.generate({...settings,instrumental:false});assert.equal(app.state.job.failed,true);assert.ok(app.state.job.audioBlob);assert.equal(app.state.tracks.length,1);
  failCover=false;await app.generate({...settings,instrumental:false},true);
  const vocal=app.state.tracks[0];assert.match(vocal.lyrics,/Our entirely original sunrise/);assert.equal(await vocal.coverBlob.text(),'original jpeg vocal');assert.equal(await instrumental.coverBlob.text(),'original jpeg instrumental');
  assert.equal(composeCalls,2);assert.equal(musicCalls,2);assert.equal(coverAttempts,3);assert.equal(app.records.tracks.size,2);assert.equal(app.records.jobs.size,0);assert.equal(app.state.job,null);
  for(const song of app.records.tracks.values())assert.ok(song.audioBlob.size>0);
});


test('MP3/WAV file selection validates a reference and invalid selection preserves the current voice',async()=>{
  const app=await appHarness(async()=>asJson(services));
  const data=Buffer.from(wavReference().split(',')[1],'base64');
  await app.uploadVoiceReference(new File([data],'my-voice.wav',{type:'audio/wav'}));
  assert.equal(app.state.voiceReference,wavReference());assert.equal(app.state.voiceLoading,false);
  await app.uploadVoiceReference(new File(['not audio'],'wrong.mp3',{type:'audio/mpeg'}));
  assert.equal(app.state.voiceReference,wavReference());assert.match(app.nodes.get('#toast').textContent,/valid MP3 or WAV/);
});
