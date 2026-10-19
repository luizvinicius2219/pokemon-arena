// Charmander evolution plan includes Charmeleon before it is playable.

/**
 * Our learnset follows the level-up moves in Pokemon Scarlet/Violet.
 * Moves start small; the fourth battle slot is unlocked later.
 * Progression data is reusable in battle, starter selection and the
 * future Pokemon party menu.
 */
export interface LearnableMove{
  readonly level:number;
  readonly name:string;
  readonly original:string;
  readonly category:'physical'|'special'|'status';
  readonly note?:string;
}
export const charmanderLearnset:readonly LearnableMove[]=[
  {level:1,name:'Arranhão',original:'Scratch',category:'physical'},
  {level:1,name:'Rosnar',original:'Growl',category:'status'},
  {level:4,name:'Brasas',original:'Ember',category:'special'},
  {level:8,name:'Cortina de Fumaça',original:'Smokescreen',category:'status'},
  {level:12,name:'Sopro do Dragão',original:'Dragon Breath',category:'special'},
  {level:17,name:'Presa de Fogo',original:'Fire Fang',category:'physical'},
  {level:20,name:'Talho',original:'Slash',category:'physical'},
  {level:24,name:'Lança-Chamas',original:'Flamethrower',category:'special'},
  {level:28,name:'Cara Assustadora',original:'Scary Face',category:'status'},
  {level:32,name:'Chama Giratória',original:'Fire Spin',category:'special'}
];
export const charmeleonLearnset:readonly LearnableMove[]=[
  {level:1,name:'Arranhão',original:'Scratch',category:'physical'},
  {level:1,name:'Rosnar',original:'Growl',category:'status'},
  {level:1,name:'Brasas',original:'Ember',category:'special'},
  {level:1,name:'Cortina de Fumaça',original:'Smokescreen',category:'status'},
  {level:12,name:'Sopro do Dragão',original:'Dragon Breath',category:'special'},
  {level:19,name:'Presa de Fogo',original:'Fire Fang',category:'physical'},
  {level:24,name:'Talho',original:'Slash',category:'physical'},
  {level:30,name:'Lança-Chamas',original:'Flamethrower',category:'special'},
  {level:37,name:'Cara Assustadora',original:'Scary Face',category:'status'},
  {level:48,name:'Inferno',original:'Inferno',category:'special'}
];
export const starterEvolution:ReadonlyArray<{
  from:'charmander'|'charmeleon';to:'charmeleon'|'charizard';level:number
}>=[
  {from:'charmander',to:'charmeleon',level:16},
  {from:'charmeleon',to:'charizard',level:36}
];
export const unlockedMoves=(level:number,form:'charmander'|'charmeleon')=>
  (form==='charmander'?charmanderLearnset:charmeleonLearnset)
    .filter(move=>move.level<=level);
export const levelFromExperience=(xp:number,minimum=5)=>
  Math.min(100,Math.max(minimum,minimum+Math.floor(
    Math.sqrt(Math.max(0,xp)/26)
  )));

export const bulbasaurLearnset:readonly LearnableMove[]=[
  {level:1,name:'Investida',original:'Tackle',category:'physical'},
  {level:1,name:'Rosnar',original:'Growl',category:'status'},
  {level:3,name:'Chicote de Vinha',original:'Vine Whip',category:'physical'},
  {level:7,name:'Semente Sanguessuga',original:'Leech Seed',category:'status'},
  {level:13,name:'Pó Venenoso',original:'Poison Powder',category:'status'},
  {level:16,name:'Folhas Navalha',original:'Razor Leaf',category:'physical'}
];
export const squirtleLearnset:readonly LearnableMove[]=[
  {level:1,name:'Investida',original:'Tackle',category:'physical'},
  {level:1,name:'Abanar de Cauda',original:'Tail Whip',category:'status'},
  {level:3,name:'Jato d’Água',original:'Water Gun',category:'special'},
  {level:9,name:'Retirada',original:'Withdraw',category:'status'},
  {level:12,name:'Giro Rápido',original:'Rapid Spin',category:'physical'},
  {level:15,name:'Pulsação de Água',original:'Water Pulse',category:'special'}
];
export const learnsetForStarter=(species:
  'charmander'|'bulbasaur'|'squirtle'
):readonly LearnableMove[]=>species==='charmander'?charmanderLearnset:
  species==='bulbasaur'?bulbasaurLearnset:squirtleLearnset;

/** Tells the player how much more they must battle, no invisible XP jumps. */
export const experienceForLevel=(level:number,minimum=5)=>
  26*Math.max(0,level-minimum)**2;
export const experienceToNext=(xp:number,level:number)=>
  Math.max(0,experienceForLevel(level+1)-xp);
export interface SpeciesEvolution{
  from:import('./abilities').Fighter;
  to:import('./abilities').Fighter;
  atLevel:number;
  method:'level'|'stone';
}
/** Wild species also have real evolution metadata for upcoming capture/team. */
export const speciesEvolutions:readonly SpeciesEvolution[]=[
  {from:'charmander',to:'charmeleon',atLevel:16,method:'level'},
  {from:'charmeleon',to:'charizard',atLevel:36,method:'level'},
  {from:'squirtle',to:'wartortle',atLevel:16,method:'level'},
  {from:'bulbasaur',to:'ivysaur',atLevel:16,method:'level'},
  {from:'rattata',to:'raticate',atLevel:20,method:'level'},
  {from:'pidgey',to:'pidgeotto',atLevel:18,method:'level'},
  {from:'spearow',to:'fearow',atLevel:20,method:'level'},
  {from:'caterpie',to:'metapod',atLevel:7,method:'level'},
  {from:'weedle',to:'kakuna',atLevel:7,method:'level'},
];
export const evolutionFor=(species:import('./abilities').Fighter,level:number)=>
  speciesEvolutions.find(e=>e.from===species&&
    e.method==='level'&&level>=e.atLevel)?.to??null;
