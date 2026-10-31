// Fast, dependency-free validation for the canonical PMD Venusaur files.
// The game must fail its build if a source sheet has incorrect frame slicing.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root=join('public','assets','pokemon','venusaur');
const xml=readFileSync(join(root,'AnimData.xml'),'utf8');
const failures=[];
let sprites=0;
const anims=[...xml.matchAll(/<Anim>([\s\S]*?)<\/Anim>/g)];
for(const [,block] of anims){
  const field=(name)=>block.match(new RegExp('<'+name+'>([^<]+)</'+name+'>'))?.[1];
  const name=field('Name');
  const w=Number(field('FrameWidth')),h=Number(field('FrameHeight'));
  const durations=[...block.matchAll(/<Duration>(\d+)<\/Duration>/g)];
  if(!w||!h)continue; // CopyOf entries share the referenced sheet.
  const path=join(root,name+'-Anim.png');
  let raw;
  try{raw=readFileSync(path);}catch{failures.push(name+': PNG ausente');continue;}
  if(raw.length<26||raw.subarray(1,4).toString()!=='PNG'){
    failures.push(name+': PNG inválido');continue;
  }
  const width=raw.readUInt32BE(16),height=raw.readUInt32BE(20);
  const expectedWidth=w*durations.length;
  const expectedRows=name==='Sleep'?1:8;
  if(width!==expectedWidth||height!==h*expectedRows){
    failures.push(name+': esperado '+expectedWidth+'x'+h*expectedRows+
      ', encontrado '+width+'x'+height);
  }
  if(name!=='Sleep'&&height/h!==8)failures.push(name+': sem 8 direções');
  sprites++;
}
if(sprites!==12)failures.push('Esperadas 12 animações, encontradas '+sprites);
try{readFileSync(join(root,'credits.txt'),'utf8');}
catch{failures.push('credits.txt ausente');}
const arena=readFileSync(join('src','arena.ts'),'utf8');
const fx=readFileSync(join('src','venusaurFx.ts'),'utf8');
const abilities=readFileSync(join('src','abilities.ts'),'utf8');
const overworld=readFileSync(join('src','overworld.ts'),'utf8');
for(const [name,condition] of [
  ['Venusaur PMD local',overworld.includes("const venusaurLocal='/assets/pokemon/venusaur/'")],
  ['Venusaur ativo nas batalhas',arena.includes("preloadOverworld(this,roster.filter(id=>id!=='raichu'))")],
  ['Raio Solar canalizado',arena.includes("SOLAR_CHARGE_MS=1850")],
  ['Dano comum não interrompe Raio Solar',
    !arena.includes("this.lastHitAt[side]>state.startAt")&&
    !arena.includes('CANALIZAÇÃO INTERROMPIDA!')],
  ['Canalização cancelada apenas com nocaute/troca/fim',
    arena.includes("species!=='venusaur'||this.knockedOut[side]||hp<=0")&&
    arena.includes('this.solarChannels={player:null,enemy:null}')],
  ['Raio Solar segue posição após recuo',
    arena.includes("state.origin=origin;")&&
    arena.includes("state.reach=this.venusaurRange(origin")],
  ['Pose de canalização preservada sob dano',
    overworld.includes('const uninterruptibleSolar=')&&
    overworld.includes("this.actionDuration>=700")],
  ['Raio Solar mira no cursor durante a canalização',
    arena.includes("nextDir=aimAtPoint(flowerCenter(caster)")&&
    arena.includes("this.faceDirection(side,vector(nextDir.x,nextDir.y))")],
  ['Raio Solar com guia pixelado e alvo projetado',
    fx.includes('private drawSolarGuide(')&&fx.includes('const projection=')],
  ['Chicote de Vinha conectado ao corpo do Venusaur',
    arena.includes("this.venusaurFx.whip(caster,dir,time")&&
    arena.includes('rayHitsBody(root,dir')&&fx.includes('const root=vineRoot(cue.body)')],
  ['Folha Navalha em bumerangue giratório',
    fx.includes('this.boomerang(x,y,dx,dy,spin,1.0)')&&
    fx.includes('boomerangWingOffset(')],
  ['Efeitos exclusivos de Bomba de Sementes',
    fx.includes('primeSeed(')&&fx.includes('drawSeedPrime(')&&
    fx.includes('drawSeedImpact(')&&fx.includes('seedBurst(')&&
    arena.includes('this.venusaurFx.seedBurst(')],
  ['Bomba de Sementes sem drenagem de HP',
    abilities.includes('sem drenar HP.')&&
    arena.includes("this.damage(target,damage,victim.x,victim.y")],
  ['Folha Navalha',abilities.includes("q:{name:'Folha Navalha'")],
  ['Chicote de Vinha',abilities.includes("w:{name:'Chicote de Vinha'")],
  ['Bomba de Sementes',abilities.includes("e:{name:'Bomba de Sementes'")],
  ['Raio Solar',abilities.includes("r:{name:'Raio Solar'")],
  ['Renderizador pixel art',fx.includes("const GRID=4")],
  ['Sem mira automática do jogador',arena.includes('All player attacks aim at the player\'s pointer')]
]){
  if(!condition)failures.push(name+' não configurado');
}
if(failures.length){
  for(const line of failures)console.error('VENUSAUR ERRO: '+line);
  process.exitCode=1;
}else console.log('VENUSAUR OK: '+sprites+' animações PMD, 8 direções (exceto Sleep), 4 golpes e VFX pixel art.');
