import type { PokemonType } from './pokemonCatalog';

/**
 * Type mechanics are from the main-series Pokémon effectiveness chart.
 * The small table lists non-neutral relationships among the types currently
 * playable in the arena. Adding a new type only expands this table.
 */
export const typeChart: Record<PokemonType, Partial<Record<PokemonType, number>>> = {
  normal:   {rock:0.5},
  bug:      {grass:2,poison:0.5,fire:0.5,flying:0.5,fairy:0.5},
  fire:     {fire:0.5,water:0.5,grass:2,bug:2,rock:0.5},
  water:    {fire:2,water:0.5,grass:0.5,rock:2,ground:2},
  grass:    {fire:0.5,water:2,grass:0.5,poison:0.5,flying:0.5,rock:2,ground:2},
  poison:   {grass:2,poison:0.5,bug:1,rock:0.5,ground:0.5,fairy:2},
  fairy:    {fire:0.5,poison:0.5},
  flying:   {electric:0.5,rock:0.5,grass:2,bug:2},
  electric: {electric:0.5,ground:0,flying:2,water:2,grass:0.5},
  rock:     {fire:2,flying:2,ground:0.5},
  ground:   {fire:2,electric:2,rock:2,flying:0,grass:0.5}
};

export interface ElementalHit {
  readonly multiplier:number;
  readonly category:'immune'|'resisted'|'neutral'|'effective';
}
export function effectiveness(
  attackType:PokemonType,defendingTypes:readonly PokemonType[]
):ElementalHit{
  const multiplier=defendingTypes.reduce(
    (value,element)=>value*(typeChart[attackType][element]??1),1
  );
  return {
    multiplier,
    category:multiplier===0?'immune':multiplier<1?'resisted':
      multiplier>1?'effective':'neutral'
  };
}

export function scaledDamage(
  baseDamage:number,attackType:PokemonType,defendingTypes:readonly PokemonType[]
):number{
  const multi=effectiveness(attackType,defendingTypes).multiplier;
  return multi===0?0:Math.max(1,Math.round(baseDamage*multi));
}
