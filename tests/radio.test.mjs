import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import worker from '../worker/index.js';

async function radioHarness(saved={},fetcher=async()=>{throw new Error('Unexpected request');}) {
  const html=await (await worker.fetch(new Request('https://radio.test/'),{})).text();
  const source=html.match(/<script>([\s\S]*)<\/script>/)[1];
  const storage=new Map(Object.entries(saved)),elements=new Map();
  function element(){const listeners=new Map();return {paused:true,currentTime:0,volume:1,textContent:'',innerHTML:'',classList:{toggle(){},add(){}},setAttribute(){},pause(){this.paused=true;for(const fn of listeners.get('pause')||[])fn();},play(){this.paused=false;return Promise.resolve();},addEventListener(name,fn){if(!listeners.has(name))listeners.set(name,new Set());listeners.get(name).add(fn);},removeEventListener(name,fn){listeners.get(name)?.delete(fn);},end(){for(const fn of listeners.get('ended')||[])fn();}};}
  const document={querySelector(selector){if(!elements.has(selector))elements.set(selector,element());return elements.get(selector);}};
  const boot=source.replace('  void init();','  return {state,changeRadioSetting,playTrack};');
  assert.notEqual(boot,source,'test bootstrap must replace only application initialization');
  const app=vm.runInNewContext(boot,{document,localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},URL,Blob,crypto,fetch:fetcher,setTimeout:()=>1,clearTimeout(){}});
  return {...app,storage,elements};
}
test('personality selection persists across refresh and keeps music playing',async()=>{
  let requests=0;const app=await radioHarness({},async()=>{requests++;throw new Error('Unexpected request');});
  app.state.dj=true;app.state.current={id:'playing'};
  const audio=app.elements.get('#audio');audio.paused=false;audio.currentTime=41;
  app.changeRadioSetting('personality','Playful & energetic');
  assert.equal(app.state.personality,'Playful & energetic');
  assert.equal(audio.paused,false);assert.equal(audio.currentTime,41);assert.equal(requests,0);
  const restored=await radioHarness(Object.fromEntries(app.storage));
  assert.equal(restored.state.personality,'Playful & energetic');
  assert.match(app.elements.get('#personality-hint').textContent,/faster delivery/);
});
test('switching personality during an introduction discards the stale DJ response',async()=>{
  const pending=[];
  const app=await radioHarness({},(url,options)=>new Promise(resolve=>pending.push({body:JSON.parse(options.body),resolve})));
  const track={id:'original',title:'City Lanterns',genre:'Electronic',mood:'Dreamy',audioBlob:new Blob(['music'])};
  app.state.tracks=[track];app.state.dj=true;
  const first=app.playTrack(track.id,true);
  assert.equal(pending[0].body.personality,'Warm & conversational');
  app.changeRadioSetting('personality','Minimal & laid-back');
  assert.equal(pending.length,2);assert.equal(pending[1].body.personality,'Minimal & laid-back');
  const reply=(script,audio)=>new Response(JSON.stringify({script,audio}),{headers:{'Content-Type':'application/json'}});
  pending[1].resolve(reply('New understated intro.','data:audio/mpeg;base64,bmV3'));
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(app.state.djScript,'New understated intro.');
  pending[0].resolve(reply('Old warm intro.','data:audio/mpeg;base64,b2xk'));
  await first;
  assert.equal(app.state.djScript,'New understated intro.');
  assert.equal(app.elements.get('#speech').src,'data:audio/mpeg;base64,bmV3');
  app.elements.get('#speech').end();
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(app.elements.get('#audio').paused,false);
});
