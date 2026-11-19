import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { readGameTree, htmlFacts, sourceImports, resolveGamePath, buildDossier } from '../vendor/makefun-game.ts';

const output=resolve(process.argv[2] ?? 'out');
const caps={text_max_bytes:163840,screenshots:{max:4,max_bytes:262144},game_max_files:993,game_max_bytes:50331648,game_path_max_bytes:1000};
const tree=readGameTree(join(output,'game'),caps);
assert(tree.files.some(f=>f.path==='index.html'));
console.log('PASS game_files / '+tree.count+' entries / '+tree.totalBytes+' bytes');

const facts=htmlFacts(readFileSync(join(output,'game/index.html'),'utf8')),paths=new Set(tree.files.map(f=>f.path)),visited=new Set();
function checkRef(ref,from){if(ref.startsWith('data:'))return null;const target=resolveGamePath(ref,from);assert(target&&paths.has(target),'Missing or external reference '+from+' -> '+ref);return target;}
function visit(path){if(visited.has(path)||!/\.(m?js)$/.test(path))return;visited.add(path);const source=readFileSync(join(output,'game',path),'utf8');for(const ref of sourceImports(source)){const next=checkRef(ref,path);if(next)visit(next);}}
for(const s of facts.scripts)if(s.src){const next=checkRef(s.src,'index.html');if(next)visit(next);}
for(const link of facts.links)checkRef(link.href,'index.html');for(const item of facts.resources)checkRef(item.src,'index.html');
console.log('PASS references / '+visited.size+' reachable offline modules');

function jpegDimensions(bytes){let i=2;while(i<bytes.length){assert.equal(bytes[i],255);const marker=bytes[i+1],length=bytes.readUInt16BE(i+2);if([192,193,194].includes(marker))return {width:bytes.readUInt16BE(i+7),height:bytes.readUInt16BE(i+5)};i+=2+length;}throw new Error('No JPEG frame');}
const names=readdirSync(join(output,'screenshots')).filter(n=>!n.startsWith('.')).sort();assert.equal(names.length,4);assert.equal(names[0],'1-summer-hero.jpg');
const manifest=JSON.parse(readFileSync('shots.json','utf8'));assert.deepEqual(manifest.shots.map(s=>s.file),names);assert.deepEqual(manifest.shots.map(s=>s.season),['SUMMER','SPRING','AUTUMN','WINTER']);
const images=names.map(name=>{const path=join(output,'screenshots',name);assert(statSync(path).isFile());const bytes=readFileSync(path),dimensions=jpegDimensions(bytes);assert.equal(dimensions.width,960);assert.equal(dimensions.height,600);assert(bytes.length<=81920);return {name,...dimensions,bytes:bytes.length};});
console.log('PASS screenshots / '+JSON.stringify(images));

const expected=Buffer.from(buildDossier(output,caps)),actual=readFileSync(join(output,'dossier.json'));assert(actual.equals(expected));assert(actual.length<=1572864);
console.log('PASS dossier_matches / '+actual.length+' canonical bytes');
for(const file of tree.files.filter(f=>f.cls==='source'&&/\.m?js$/.test(f.path)))execFileSync(process.execPath,['--check',join(output,'game',file.path)]);
assert.equal(JSON.parse(readFileSync('.makefun/owner.json','utf8')).wallet,'9XAmKVSK2jKwExuis5E2WyrgsKx5F99gfuUrvbqXv52p');
console.log('JS syntax OK / owner present / artifact checks 4 of 4');
