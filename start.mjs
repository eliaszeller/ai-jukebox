import {readFile} from 'node:fs/promises';
export async function loadClassFile(path) {
  const text=await readFile(path,'utf8');
  for(const [name,port,route] of [['QWEN',9001,'/v1/chat/completions'],['FLUX',9006,'/v1/images/generations'],['ACE',9007,'/release_task'],['CHATTERBOX',9008,'/v1/audio/speech']]){
    const blocks=text.split(/\r?\n\s*\r?\n/);
    const block=blocks.find(b=>new RegExp(`Base URL:.*:${port}(?:/|\\s|$)`).test(b));
    if(!block)throw new Error(`Missing ${name} endpoint in class file.`);
    const base=block.match(/Base URL:\s*(\S+)/)?.[1],key=block.match(/API Key:\s*(\S+)/)?.[1];
    if(!base||!key)throw new Error(`Missing ${name} connection details.`);
    process.env[`${name}_URL`]=new URL(route,base).href;
    process.env[`${name}_KEY`]=key;
  }
}
if(process.env.CLASS_ENDPOINTS_FILE)await loadClassFile(process.env.CLASS_ENDPOINTS_FILE);
if(process.argv[1]?.endsWith('start.mjs')){const {server}=await import('./server.mjs');const port=Number(process.env.PORT)||3000;server.listen(port,'127.0.0.1',()=>console.log(`AI Jukebox: http://localhost:${port}`));}
