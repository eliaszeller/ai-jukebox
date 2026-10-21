import vm from 'node:vm';
import assert from 'node:assert/strict';
import worker from '../../worker/index.js';

// Execute the shipped application code with deterministic media/storage adapters.
// Only automatic startup is replaced; production state transitions are unchanged.
export async function appHarness(fetcher, saved={}) {
  const html=await (await worker.fetch(new Request('https://app.test/'),{})).text();
  const source=html.match(/<script>([\s\S]*)<\/script>/)[1];
  const store=new Map(Object.entries(saved)),nodes=new Map(),records={tracks:new Map(),jobs:new Map()},events=[];
  function node(selector=''){
    const listeners=new Map(),classes=new Set();
    return {paused:true,currentTime:0,duration:30,volume:1,value:'',textContent:'',innerHTML:'',listeners,
      classList:{toggle(name,force){const enabled=force===undefined?!classes.has(name):force;if(enabled)classes.add(name);else classes.delete(name);},add(name){classes.add(name);},contains(name){return classes.has(name);}},
      querySelectorAll:()=>[],setAttribute(){},removeAttribute(){},load(){},close(){},
      addEventListener(name,fn){if(!listeners.has(name))listeners.set(name,new Set());listeners.get(name).add(fn);},
      removeEventListener(name,fn){listeners.get(name)?.delete(fn);},
      emit(name,data={}){for(const fn of listeners.get(name)||[])fn(data);},
      pause(){this.paused=true;this.emit('pause');},
      play(){if(selector==='#audio'||selector==='#speech'){const other=nodes.get(selector==='#audio'?'#speech':'#audio');assert.equal(other.paused,true,'speech and music must never overlap');events.push(selector+' play');}this.paused=false;this.emit('play');return Promise.resolve();},
      end(){this.paused=true;this.emit('ended');}
    };
  }
  const document=node();document.querySelector=selector=>{if(!nodes.has(selector))nodes.set(selector,node(selector));return nodes.get(selector);};document.activeElement={tagName:'BODY'};
  const indexedDB={open(){const req={};queueMicrotask(()=>{req.result={transaction(name){const tx={};tx.objectStore=()=>({
    getAll(){const req={result:structuredClone([...records[name].values()])};queueMicrotask(()=>tx.oncomplete?.());return req;},
    get(key){const req={result:structuredClone(records[name].get(key))};queueMicrotask(()=>tx.oncomplete?.());return req;},
    put(value){const req={};records[name].set(value.id,structuredClone(value));queueMicrotask(()=>tx.oncomplete?.());return req;},
    delete(key){const req={};records[name].delete(key);queueMicrotask(()=>tx.oncomplete?.());return req;}
  });return tx;}};req.onsuccess?.();});return req;}};
  const boot=source.replace('  void init();','  return {state,init,bind,generate,playTrack,advance,setQueue,togglePlay,skipIntro,applyVoiceReference,changeRadioSetting,uploadVoiceReference};');
  assert.notEqual(boot,source);
  const app=vm.runInNewContext(boot,{document,indexedDB,URL,Blob,crypto,Uint8Array,atob,btoa,TextEncoder,structuredClone,
    localStorage:{getItem:key=>store.get(key)||null,setItem:(key,value)=>store.set(key,value)},
    fetch:fetcher,setTimeout:(fn,delay)=>{if(delay===4500||delay===7000)queueMicrotask(fn);return 1;},clearTimeout(){},window:{scrollTo(){}},
    Audio:class {constructor(){this.duration=5;}set src(value){queueMicrotask(()=>this.onloadedmetadata?.());}removeAttribute(){}load(){}}
  });
  await app.init();
  return {...app,nodes,records,store,events};
}
export const tick=()=>new Promise(resolve=>setImmediate(resolve));
export const asJson=data=>new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}});
export function wavReference(){const data=Buffer.alloc(64);data.write('RIFF');data.write('WAVE',8);return 'data:audio/wav;base64,'+data.toString('base64');}
export const track=(id='first')=>({id,title:'Original '+id,genre:'Electronic',mood:'Dreamy',duration:30,audioBlob:new Blob(['original music'])});
