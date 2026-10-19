import type { Fighter } from './abilities';
import { pokemonCatalog } from './pokemonCatalog';
import { difficultyRules } from './gameBalance';

/** Small, intentionally mixed Kanto Safari with a rare electric find. */
export type WildSpecies='rattata'|'pidgey'|'caterpie'|'weedle'|
  'spearow'|'jigglypuff'|'pikachu';
export interface WildEncounter{
  species:WildSpecies;
  level:number;
  experience:number;
}
const TABLE:ReadonlyArray<{
  species:WildSpecies;weight:number;xp:number
}>=[
  {species:'rattata',weight:29,xp:42},
  {species:'pidgey',weight:25,xp:44},
  {species:'caterpie',weight:16,xp:36},
  {species:'weedle',weight:12,xp:39},
  {species:'spearow',weight:8,xp:52},
  {species:'jigglypuff',weight:7,xp:59},
  {species:'pikachu',weight:3,xp:76}
];
let pending:WildEncounter|null=null;

/**
 * Encounter level gently trails the party to allow growth without
 * trivializing Safari encounters. XP shrinks when farming weak monsters.
 * Probability values sum to 100 and can be tested with injected random.
 */
export function rollSafariEncounter(
  random=Math.random,trainerLevel=5
):WildEncounter{
  const randomValue=()=>Math.max(0,Math.min(0.999999,random()));
  const roll=randomValue()*100;
  let cursor=0;
  const found=TABLE.find(p=>(cursor+=p.weight)>roll)??TABLE[0];
  const modifier=difficultyRules();
  const level=Math.max(3,Math.min(18,
    Math.round(trainerLevel)-3+modifier.wildLevelBias+
    Math.floor(randomValue()*5)));
  const baseXp=found.xp+level*2;
  const difference=level-trainerLevel;
  const correction=Math.min(1.18,Math.max(0.45,1+difference*0.10));
  const experience=Math.max(12,
    Math.round(baseXp*correction*modifier.experience));
  return {species:found.species,level,experience};
}
export function setWildEncounter(encounter:WildEncounter):void{
  pending=encounter;
}
export function activeWildEncounter():WildEncounter{
  return pending??{species:'rattata',level:4,experience:38};
}
export function clearWildEncounter():void {pending=null;}
export function safariOdds():ReadonlyArray<{
  species:Fighter;chance:number;name:string
}>{
  return TABLE.map(entry=>({
    species:entry.species,chance:entry.weight,
    name:pokemonCatalog[entry.species].name
  }));
}
