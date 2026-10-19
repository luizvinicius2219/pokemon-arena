import { levelFromExperience,evolutionFor } from './starterProgression';
import { pokemonCatalog } from './pokemonCatalog';
import type { Fighter } from './abilities';

/**
 * Player ownership and party/reserve persistence. Independent of the gym,
 * battle scene and any future overworld or select screen.
 */
export interface OwnedPokemon {
  readonly id:string;
  readonly species:Fighter;
  readonly nickname:string;
  readonly level:number;
  readonly experience:number;
  readonly capturedAt:number;
  readonly origin:'starter'|'wild'|'reward';
}
export interface PlayerCollection {
  readonly version:1;
  readonly activePokemonId:string;
  readonly party:readonly OwnedPokemon[];
  readonly storage:readonly OwnedPokemon[];
  readonly badges:readonly string[];
}
export const PARTY_LIMIT=3;
const STORAGE_KEY='pokemon-arena-team-v1';
const starter:OwnedPokemon={
  id:'starter-charmander',species:'charmander',nickname:'Charmander',level:5,
  experience:0,capturedAt:0,origin:'starter'
};
const initial=():PlayerCollection=>({
  version:1,activePokemonId:starter.id,party:[starter],storage:[],badges:[]
});
const isSpecies=(value:unknown):value is Fighter=>
  typeof value==='string'&&value in pokemonCatalog;

function validated(raw:unknown):PlayerCollection|null{
  if(typeof raw!=='object'||!raw)return null;
  const payload=raw as Record<string,unknown>;
  if(payload.version!==1||!Array.isArray(payload.party)
    ||!Array.isArray(payload.storage))return null;
  const parse=(values:unknown[]):OwnedPokemon[]=>values.flatMap(item=>{
    if(typeof item!=='object'||!item)return [];
    const p=item as Record<string,unknown>;
    if(typeof p.id!=='string'||!isSpecies(p.species)
      ||typeof p.level!=='number'||!Number.isFinite(p.level))return [];
    const origin=p.origin==='wild'||p.origin==='reward'
      ?p.origin:'starter';
    return [{
      id:p.id.slice(0,90),species:p.species,
      nickname:typeof p.nickname==='string'
        ?p.nickname.slice(0,36):pokemonCatalog[p.species].name,
      level:Math.max(1,Math.min(100,Math.round(p.level))),
      experience:typeof p.experience==='number'&&Number.isFinite(p.experience)
        ?Math.max(0,Math.round(p.experience)):0,
      capturedAt:typeof p.capturedAt==='number'&&Number.isFinite(p.capturedAt)
        ?p.capturedAt:0,
      origin
    }];
  });
  const party=parse(payload.party).slice(0,PARTY_LIMIT);
  const storage=[
    ...parse(payload.party).slice(PARTY_LIMIT),
    ...parse(payload.storage)
  ];
  if(party.length===0)return null;
  const activePokemonId=typeof payload.activePokemonId==='string'
    &&party.some(p=>p.id===payload.activePokemonId)
    ?payload.activePokemonId:party[0].id;
  return {
    version:1,activePokemonId,party,storage,
    badges:Array.isArray(payload.badges)
      ?payload.badges.filter((x):x is string=>typeof x==='string').slice(0,30):[]
  };
}

export function loadCollection():PlayerCollection{
  try{
    const stored=window.localStorage.getItem(STORAGE_KEY);
    return stored?validated(JSON.parse(stored))??initial():initial();
  }catch{return initial();}
}
export function saveCollection(save:PlayerCollection):void{
  try{window.localStorage.setItem(STORAGE_KEY,JSON.stringify(save));}
  catch{/* Private browsing or disabled storage: keep game playable. */}
}
export function addToCollection(
  collection:PlayerCollection,species:Fighter,level:number
):PlayerCollection{
  const stamp=Date.now();
  const instance:OwnedPokemon={
    id:species+'-'+stamp.toString(36)+'-'+Math.random().toString(36).slice(2,8),
    species,nickname:pokemonCatalog[species].name,
    level:Math.max(1,Math.min(100,Math.round(level))),
    experience:0,capturedAt:stamp,origin:'wild'
  };
  const next:PlayerCollection=collection.party.length<PARTY_LIMIT
    ?{...collection,party:[...collection.party,instance]}
    :{...collection,storage:[...collection.storage,instance]};
  saveCollection(next);
  return next;
}
export function selectPokemon(
  collection:PlayerCollection,pokemonId:string
):PlayerCollection{
  if(!collection.party.some(p=>p.id===pokemonId))return collection;
  const next={...collection,activePokemonId:pokemonId};
  saveCollection(next);
  return next;
}
export function moveBetweenPartyAndStorage(
  collection:PlayerCollection,pokemonId:string
):PlayerCollection{
  const reserve=collection.storage.find(p=>p.id===pokemonId);
  const partyMember=collection.party.find(p=>p.id===pokemonId);
  if(reserve && collection.party.length<PARTY_LIMIT){
    const next={
      ...collection,party:[...collection.party,reserve],
      storage:collection.storage.filter(p=>p.id!==pokemonId)
    };
    saveCollection(next);
    return next;
  }
  if(partyMember && collection.party.length>1){
    const party=collection.party.filter(p=>p.id!==pokemonId);
    const next={
      ...collection,party,storage:[...collection.storage,partyMember],
      activePokemonId:collection.activePokemonId===pokemonId
        ?party[0].id:collection.activePokemonId
    };
    saveCollection(next);
    return next;
  }
  return collection;
}
export function getActivePokemon(collection:PlayerCollection):OwnedPokemon{
  return collection.party.find(p=>p.id===collection.activePokemonId)
    ??collection.party[0];
}

/** Gain real progression by winning training/wild encounters. */
export interface ExperienceAward {
  collection:PlayerCollection;
  previousLevel:number;
  currentLevel:number;
  earned:number;
}
export function awardActiveExperience(
  collection:PlayerCollection,points:number
):ExperienceAward{
  const amount=Math.max(0,Math.round(points));
  const active=getActivePokemon(collection);
  const gainedXp=active.experience+amount;
  const updatedLevel=Math.max(active.level,levelFromExperience(gainedXp));
  const gained={...active,experience:gainedXp,level:updatedLevel};
  const evolution=evolutionFor(gained.species,gained.level);
  const party=collection.party.map(member=>member.id===active.id?{
    ...gained,species:evolution??gained.species,
    nickname:evolution?pokemonCatalog[evolution].name:gained.nickname
  }:member);
  const next:PlayerCollection={...collection,party};
  saveCollection(next);
  return {
    collection:next,previousLevel:active.level,
    currentLevel:updatedLevel,earned:amount
  };
}

/** The story starts only once a starter has been deliberately selected. */
export function chosenStarter():import('./abilities').Starter|null{
  try{
    const name=window.localStorage.getItem('monster-arena-starter-v1');
    return name==='charmander'||name==='bulbasaur'||name==='squirtle'
      ?name:null;
  }catch{return null;}
}
export function chooseStarter(species:import('./abilities').Starter):PlayerCollection{
  const entry:OwnedPokemon={
    id:'starter-'+species,species,nickname:pokemonCatalog[species].name,
    level:5,experience:0,capturedAt:Date.now(),origin:'starter'
  };
  const state:PlayerCollection={
    version:1,activePokemonId:entry.id,party:[entry],storage:[],badges:[]
  };
  saveCollection(state);
  try{window.localStorage.setItem('monster-arena-starter-v1',species);}catch{}
  return state;
}

