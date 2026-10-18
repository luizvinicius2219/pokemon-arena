import type { Fighter } from './abilities';
import { pokemonCatalog } from './pokemonCatalog';

/** A compact Safari-inspired route; probabilities are explicit and testable. */
export interface WildEncounter{
  species:'rattata'|'jigglypuff'|'pikachu';
  level:number;
  experience:number;
}
const TABLE:ReadonlyArray<{species:WildEncounter['species'];weight:number;xp:number}>= [
  {species:'rattata',weight:58,xp:140},
  {species:'jigglypuff',weight:34,xp:175},
  {species:'pikachu',weight:8,xp:230}
];
let pending:WildEncounter|null=null;
export function rollSafariEncounter(random=Math.random):WildEncounter{
  const d=Math.max(0,Math.min(0.999999,random()))*100;
  let sum=0;
  const picked=TABLE.find(e=>(sum+=e.weight)>d)??TABLE[0];
  const level=3+Math.floor(Math.max(0,Math.min(0.999999,random()))*6);
  return {species:picked.species,level,experience:picked.xp+level*9};
}
export function setWildEncounter(encounter:WildEncounter):void {
  pending=encounter;
}
export function activeWildEncounter():WildEncounter{
  return pending??{species:'rattata',level:4,experience:155};
}
export function clearWildEncounter():void {pending=null;}
export function safariOdds():readonly {species:Fighter;chance:number;name:string}[]{
  return TABLE.map(e=>({
    species:e.species,chance:e.weight,name:pokemonCatalog[e.species].name
  }));
}
