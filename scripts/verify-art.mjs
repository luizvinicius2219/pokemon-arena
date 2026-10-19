/**
 * Prevent silent sprite slicing regressions in the Kanto overworld.
 * All bundled HGSS art is a vertical strip with six 32x32 frames.
 * No image libraries are required: dimensions are in PNG's IHDR bytes.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const art=['red','bulbasaur','charmander','squirtle'];
const failures=[];
for(const name of art){
  const path=join('public','assets','world','hgss',name+'.png');
  let file;
  try{file=readFileSync(path);}
  catch{failures.push('Arquivo ausente: '+path);continue;}
  if(file.length<24||file.subarray(1,4).toString()!=='PNG'){
    failures.push('PNG inválido: '+path);
    continue;
  }
  const width=file.readUInt32BE(16),height=file.readUInt32BE(20);
  if(width!==32||height!==192)
    failures.push(name+': esperado 32×192 (6×32px), veio '+
      width+'×'+height);
}

const world=readFileSync(join('src','world.ts'),'utf8');
if(!/world-red-hgss'[\s\S]{0,140}frameWidth:32,frameHeight:32/.test(world))
  failures.push('Sprite Red deve usar quadros INTEIROS 32×32');
if(!/world-hgss-'\+this\.species[\s\S]{0,210}frameWidth:32,frameHeight:32/.test(world))
  failures.push('Pokémon HGSS devem usar quadros INTEIROS 32×32');
if(failures.length){
  for(const item of failures)console.error('ERRO SPRITE: '+item);
  process.exitCode=1;
}else console.log('HGSS OK: 4 sprites verticais completos (32×192).');
