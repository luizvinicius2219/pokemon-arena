import type { Fighter } from './abilities';

export type TrainingFighter=
  'charmander'|'charmeleon'|'charizard'|
  'bulbasaur'|'ivysaur'|'squirtle'|'wartortle';
export type TrainingRival='pikachu'|'rattata'|'pidgey'|
  'spearow'|'caterpie'|'weedle'|'jigglypuff';
export interface TrainingSetup{
  readonly player:TrainingFighter;
  readonly rival:TrainingRival;
  readonly level:number;
}
const ALLOWED_PLAYERS:readonly Fighter[]=[
  'charmander','charmeleon','charizard',
  'bulbasaur','ivysaur','squirtle','wartortle'
];
const ALLOWED_RIVALS:readonly Fighter[]=[
  'pikachu','rattata','pidgey','spearow',
  'caterpie','weedle','jigglypuff'
];
let current:TrainingSetup={
  player:'charizard',rival:'pikachu',level:36
};
export function getTrainingSetup():TrainingSetup{
  return {...current};
}
/** A sandbox for comparing skills; it cannot mutate story XP or badges. */
export function setTrainingSetup(
  player:Fighter,rival:Fighter,level:number
):TrainingSetup{
  current={
    player:(ALLOWED_PLAYERS.includes(player)?player:'charizard') as TrainingFighter,
    rival:(ALLOWED_RIVALS.includes(rival)?rival:'pikachu') as TrainingRival,
    level:Math.max(5,Math.min(36,Math.round(level)))
  };
  return getTrainingSetup();
}
