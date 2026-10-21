import type { Fighter } from './abilities';

export type TrainingFighter=Fighter;
export type TrainingRival=Fighter;
export interface TrainingSetup{
  readonly player:TrainingFighter;
  readonly rival:TrainingRival;
  readonly level:number;
}
const ALLOWED_PLAYERS:readonly Fighter[]=['charizard','venusaur','blastoise','raichu','fearow','raticate'];
const ALLOWED_RIVALS:readonly Fighter[]=['raichu','raticate','fearow','charizard','venusaur','blastoise'];
let current:TrainingSetup={
  player:'charizard',rival:'raichu',level:36
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
    rival:(ALLOWED_RIVALS.includes(rival)?rival:'raichu') as TrainingRival,
    level:Math.max(5,Math.min(36,Math.round(level)))
  };
  return getTrainingSetup();
}
