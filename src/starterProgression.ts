import type { Fighter } from './abilities';

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
  from:Fighter;to:Fighter;level:number
}>=[
  {from:'charmander',to:'charmeleon',level:16},
  {from:'charmeleon',to:'charizard',level:36}
];
export const unlockedMoves=(level:number,form:'charmander'|'charmeleon')=>
  (form==='charmander'?charmanderLearnset:charmeleonLearnset)
    .filter(move=>move.level<=level);
export const levelFromExperience=(xp:number,minimum=5)=>
  Math.min(100,Math.max(minimum,minimum+Math.floor(
    Math.sqrt(Math.max(0,xp)/42)
  )));
