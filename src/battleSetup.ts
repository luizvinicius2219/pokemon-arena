import type { Fighter } from './abilities';
import { pokemonCatalog } from './pokemonCatalog';

export type ArenaId='classic'|'pewter'|'safari';
export type MatchKind='quick'|'story';
export interface Challenge {id:string;name:string;city:string;team:readonly Fighter[];arena:ArenaId;status:'available'|'planned'}
export const challenges:readonly Challenge[]=[
  {id:'brock',name:'Brock',city:'Pewter',team:['geodude','onix'],arena:'pewter',status:'available'},
  {id:'misty',name:'Misty',city:'Cerulean',team:['squirtle','wartortle'],arena:'classic',status:'available'},
  {id:'surge',name:'Lt. Surge',city:'Vermilion',team:['pikachu'],arena:'classic',status:'planned'},
  {id:'erika',name:'Erika',city:'Celadon',team:['bulbasaur','ivysaur'],arena:'safari',status:'available'},
  {id:'koga',name:'Koga',city:'Fuchsia',team:['weedle','kakuna'],arena:'classic',status:'planned'},
  {id:'sabrina',name:'Sabrina',city:'Saffron',team:['jigglypuff'],arena:'classic',status:'planned'},
  {id:'blaine',name:'Blaine',city:'Cinnabar',team:['charmeleon','charizard'],arena:'classic',status:'available'},
  {id:'giovanni',name:'Giovanni',city:'Viridian',team:['raticate','geodude','onix'],arena:'pewter',status:'available'}
];
export const arenaNames:Record<ArenaId,string>={classic:'Arena clássica',pewter:'Ginásio do Brock',safari:'Campo Safari'};
export const selectablePokemon:readonly Fighter[]=['charmander','charmeleon','charizard','bulbasaur','ivysaur','squirtle','wartortle'];
export interface MatchSetup {
  kind:MatchKind;arena:ArenaId;player:readonly Fighter[];enemy:readonly Fighter[];
  playerIndex:number;enemyIndex:number;challengeId?:string;
}
let current:MatchSetup|null=null;
export function currentMatch():MatchSetup|null{return current;}
export function activeMatchPokemon():{player:Fighter;enemy:Fighter}{
  if(!current)return {player:'charizard',enemy:'pikachu'};
  return {player:current.player[current.playerIndex],enemy:current.enemy[current.enemyIndex]};
}
export function beginMatch(player:readonly Fighter[],arena:ArenaId|'random',kind:MatchKind='quick',challengeId?:string):MatchSetup{
  const unique=[...new Set(player)].filter(p=>selectablePokemon.includes(p));
  if(unique.length!== (kind==='quick'?3:6))throw new Error('Selecione a quantidade correta de Pokémon.');
  const challenge=challenges.find(c=>c.id===challengeId);
  const opponents:readonly Fighter[]=kind==='story'&&challenge?challenge.team:
    (Object.keys(pokemonCatalog) as Fighter[]).sort(()=>Math.random()-0.5).slice(0,3);
  const chosenArena=arena==='random'?(['classic','pewter','safari'] as ArenaId[])[Math.floor(Math.random()*3)]:arena;
  current={kind,arena:kind==='story'&&challenge?challenge.arena:chosenArena,
    player:unique,enemy:opponents,playerIndex:0,enemyIndex:0,challengeId};
  return current;
}
export function advanceMatch(loser:'player'|'enemy'):'next'|'victory'|'defeat'{
  if(!current)return loser==='enemy'?'victory':'defeat';
  const next={...current,playerIndex:current.playerIndex+(loser==='player'?1:0),
    enemyIndex:current.enemyIndex+(loser==='enemy'?1:0)};
  current=next;
  if(next.playerIndex>=next.player.length)return 'defeat';
  if(next.enemyIndex>=next.enemy.length){
    if(next.kind==='story'&&next.challengeId){
      try{const old=JSON.parse(localStorage.getItem('monster-arena-challenges')||'[]') as string[];
        localStorage.setItem('monster-arena-challenges',JSON.stringify([...new Set([...old,next.challengeId])]));}catch{}
    }
    return 'victory';
  }
  return 'next';
}
export function matchProgress():string{
 if(!current)return '';
 return 'SUA EQUIPE '+(current.playerIndex+1)+'/'+current.player.length+
    '   •   CPU '+(current.enemyIndex+1)+'/'+current.enemy.length;
}
