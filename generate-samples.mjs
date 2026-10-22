import {readFile,writeFile,copyFile} from 'node:fs/promises';
import {loadClassFile} from './start.mjs';
import {generate} from './server.mjs';
if(process.argv[2])await loadClassFile(process.argv[2]);
const root=new URL('./',import.meta.url);
const specs=[{title:'Mountain Morning',style:'Acoustic folk',mood:'Hopeful',duration:30,vocals:true},{title:'After Hours',style:'Lo-fi',mood:'Relaxed',duration:30,vocals:false},{title:'Neon Weekend',style:'Electronic',mood:'Energetic',duration:30,vocals:false}];
let songs=JSON.parse(await readFile(new URL('samples/manifest.json',root),'utf8'));
for(const spec of specs){if(songs.some(s=>s.title===spec.title))continue;console.log('Generating:',spec.title);const s=await generate(spec,console.log);for(const ext of ['mp3','png'])await copyFile(new URL(`data/${s.id}.${ext}`,root),new URL(`samples/${s.id}.${ext}`,root));s.audio=`/samples/${s.id}.mp3`;s.cover=`/samples/${s.id}.png`;songs.push(s);await writeFile(new URL('samples/manifest.json',root),JSON.stringify(songs,null,2));console.log('Saved:',s.title);}
