import type { PokemonType } from './pokemonCatalog';

/**
 * Type mechanics are from the main-series Pokémon effectiveness chart.
 * The small table lists non-neutral relationships among the types currently
 * playable in the arena. Adding a new type only expands this table.
 */
export const typeChart: Record<PokemonType, Partial<Record<PokemonType, number>>> = {
  normal:   {rock:0.5},
  fire:     {fire:0.5, rock:0.5},
  flying:   {electric:0.5, rock:0.5},
  electric: {electric:0.5, ground:0, flying:2},
  rock:     {fire:2, flying:2, ground:0.5},
  ground:   {fire:2, electric:2, rock:2, flying:0}
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
