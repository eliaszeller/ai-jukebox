// Dependency-free, allowlisted ZIP writer. Runtime data is never enumerated.
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {configuration} from './services.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const files=['package.json','server.mjs','services.mjs','radio.mjs','package.mjs','README.md','.env.example','.gitignore','.dockerignore','Dockerfile','public/index.html','public/style.css','public/app.js','test/services.test.mjs','test/radio.test.mjs'];
const key=configuration().key;
const table=Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function crc32(buf){let c=0xffffffff;for(const b of buf)c=table[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
const locals=[],central=[];let offset=0;
for(const f of files){const bytes=await readFile(path.join(root,f));if(key&&key!=='replace_with_class_key'&&bytes.includes(Buffer.from(key)))throw Error('A configured credential was found in a source file. Packaging stopped.');const name=Buffer.from('ai-jukebox/'+f),crc=crc32(bytes),l=Buffer.alloc(30),c=Buffer.alloc(46);l.writeUInt32LE(0x04034b50);l.writeUInt16LE(20,4);l.writeUInt32LE(crc,14);l.writeUInt32LE(bytes.length,18);l.writeUInt32LE(bytes.length,22);l.writeUInt16LE(name.length,26);c.writeUInt32LE(0x02014b50);c.writeUInt16LE(20,4);c.writeUInt16LE(20,6);c.writeUInt32LE(crc,16);c.writeUInt32LE(bytes.length,20);c.writeUInt32LE(bytes.length,24);c.writeUInt16LE(name.length,28);c.writeUInt32LE(offset,42);locals.push(l,name,bytes);central.push(c,name);offset+=l.length+name.length+bytes.length;}
const directory=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(files.length,8);end.writeUInt16LE(files.length,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16);const target=path.resolve(root,'..','midnight-radio-submission.zip');await writeFile(target,Buffer.concat([...locals,directory,end]));console.log(`Packaged ${files.length} source files into ${target}`);
