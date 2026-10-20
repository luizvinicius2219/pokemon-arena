/** Persistent battle-wide stat stages, reset on a new fight or Pokémon switch. */
export type BattleStat = 'attack'|'defense'|'accuracy'|'speed';
export type StatStages = Record<BattleStat,number>;
export const makeStatStages = ():StatStages => ({
  attack:0,defense:0,accuracy:0,speed:0
});

/** Game-series stage limits: from -6 to +6. Returns the actual change. */
export function changeStatStage(stages:StatStages,stat:BattleStat,amount:number):number{
  const previous=stages[stat];
  stages[stat]=Math.max(-6,Math.min(6,previous+Math.trunc(amount)));
  return stages[stat]-previous;
}

/** Attack, Defense and movement multiplier (normal stage ratio). */
export function stageMultiplier(stage:number):number{
  const limited=Math.max(-6,Math.min(6,stage));
  return limited>=0?(2+limited)/2:2/(2-limited);
}

/** Accuracy has its own three-part stage ratio; never exceeds 100% hit chance. */
export function accuracyChance(stages:StatStages):number{
  const limited=Math.max(-6,Math.min(6,stages.accuracy));
  return Math.min(1,limited>=0?(3+limited)/3:3/(3-limited));
}

/** Physical damage is modified by the attacker's Attack and target's Defense. */
export function physicalDamageMultiplier(attacker:StatStages,defender:StatStages):number{
  return stageMultiplier(attacker.attack)/stageMultiplier(defender.defense);
}
