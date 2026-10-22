// Generates the three bundled sample songs with the class endpoints and records exactly how they were made.
// Run from the app folder with credentials in .env:  npm run samples
// Only class services are used: Qwen (9001) writes the title, caption, lyrics and cover prompt;
// ACE-Step (9007) renders the audio; FLUX (9006) paints the cover. Nothing is downloaded from anywhere else.
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {configuration,services} from '../services.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dir=path.join(root,'samples'), manifestPath=path.join(dir,'manifest.json');
const manifest=JSON.parse(await readFile(manifestPath,'utf8'));
const config=configuration();
if(!config.key||config.key==='replace_with_class_key'){console.error('Set CLASS_API_KEY (or CLASS_ENDPOINTS_FILE) in .env before generating samples.');process.exit(1);}
const api=services(config);
const only=process.argv.slice(2); // optional: pass one or more sample IDs to regenerate just those
let failures=0;
for(const t of manifest.tracks){
  if(only.length&&!only.includes(t.id))continue;
  console.log(`\n▶ ${t.genre} / ${t.mood} (${t.id})`);
  try{
    const plan=await api.plan({prompt:t.prompt,genre:t.genre,mood:t.mood,artStyle:t.artStyle,lyrics:'',instrumental:t.instrumental,duration:t.duration,bpm:t.bpm,language:t.language});
    Object.assign(t,plan);
    console.log(`  Qwen titled it “${t.title}”${t.instrumental?' (instrumental)':' and wrote the lyrics'}.`);
    const [audio,cover]=await Promise.all([
      api.music({caption:t.caption,lyrics:t.lyrics,duration:t.duration,bpm:t.bpm,language:t.language},async id=>{if(id)console.log(`  ACE-Step task ${id} queued…`);}),
      api.image(t.coverPrompt+'. Visual style: '+t.artStyle)
    ]);
    await writeFile(path.join(dir,t.id+'.mp3'),audio);
    await writeFile(path.join(dir,t.id+'.png'),cover);
    t.audioFile=t.id+'.mp3';t.coverFile=t.id+'.png';t.generatedAt=new Date().toISOString();
    t.services={text:'cyankiwi/Qwen3.6-35B-A3B-AWQ-4bit @ dobolyi.com:9001',music:'ACE-Step 1.5 XL Turbo @ dobolyi.com:9007',image:'black-forest-labs/FLUX.2-klein-4B @ dobolyi.com:9006'};
    console.log(`  Saved ${t.audioFile} (${(audio.length/1024).toFixed(0)} KB) and ${t.coverFile} (${(cover.length/1024).toFixed(0)} KB).`);
  }catch(e){failures++;console.error(`  ✖ ${e.message}`);}
  manifest.generatedAt=new Date().toISOString();
  await writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n');
}
console.log(failures?`\nFinished with ${failures} failure(s). Re-run to retry the failed samples.`:'\nAll samples generated. Start the app to see them in the library.');
process.exit(failures?1:0);
