import { pokemonCatalog } from './pokemonCatalog';
import type { Fighter } from './abilities';
import { addToCollection, type PlayerCollection } from './playerCollection';

export type CaptureTool='basic'|'reinforced'|'precision';
export type EncounterOwnership='wild'|'trainer'|'boss';
export interface CaptureCandidate{
  species:Fighter;
  level:number;
  hp:number;
  maxHp:number;
  ownership:EncounterOwnership;
  /** Future fighting system will give an opportunity to stagger a target. */
  staggered?:boolean;
}
export interface CapturePreview{
  allowed:boolean;
  chance:number;
  reason?:string;
}
export interface CaptureResult{
  success:boolean;
  preview:CapturePreview;
  collection:PlayerCollection;
}
/**
 * Distinctive real-time capture model, not a copy of classic turn-based
 * ball odds. Lower health, a timing/stagger window and device choice matter.
 * Trainer-owned and boss Pokémon cannot be captured.
 */
export function capturePreview(
  pokemon:CaptureCandidate,tool:CaptureTool
):CapturePreview{
  if(pokemon.ownership!=='wild')return {
    allowed:false,chance:0,
    reason:'Só encontros selvagens podem ser capturados.'
  };
  const hp=Math.max(0,Math.min(pokemon.maxHp,pokemon.hp));
  if(!Number.isFinite(pokemon.maxHp)||pokemon.maxHp<=0||hp===0)return{
    allowed:false,chance:0,reason:'O encontro precisa estar ativo.'
  };
  const remaining=hp/pokemon.maxHp;
  const base=0.07+(1-remaining)*0.56;
  const toolFactor={basic:1,reinforced:1.34,precision:1.65}[tool];
  const speciesDifficulty=pokemon.species==='onix'?0.70:
    pokemon.species==='geodude'?0.92:0.85;
  const levelPressure=Math.max(0.70,1-(Math.max(1,pokemon.level)-10)*0.007);
  const staggerBonus=pokemon.staggered?0.17:0;
  const chance=Math.min(0.90,Math.max(0.04,
    (base+staggerBonus)*toolFactor*speciesDifficulty*levelPressure));
  return{allowed:true,chance};
}
/** A completed capture attempt adds the instance to party or storage. */
export function attemptCapture(
  pokemon:CaptureCandidate,tool:CaptureTool,
  collection:PlayerCollection,roll=Math.random()
):CaptureResult{
  const preview=capturePreview(pokemon,tool);
  const success=preview.allowed&&roll<preview.chance;
  return {
    preview,success,
    collection:success
      ?addToCollection(collection,pokemon.species,pokemon.level):collection
  };
}
export function captureName(species:Fighter):string{
  return pokemonCatalog[species].name;
}
