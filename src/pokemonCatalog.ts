import { skills, type Fighter, type Skill } from './abilities';

/**
 * Reusable species catalogue for all contexts: battle opponents, future
 * playable selection, encounter teams, progression and elemental combat.
 * No sprite or move data is hard-coded to Pewter Gym here.
 */
export type PokemonType = 'fire'|'flying'|'electric'|'rock'|'ground';
export type PokemonAttackStyle = 'flame'|'electric'|'rock';

export interface PokemonProfile {
  id: Fighter;
  number: number;
  name: string;
  elements: readonly PokemonType[];
  maxHp: number;
  radius: number;
  moveSpeed: number;
  attackStyle: PokemonAttackStyle;
  portrait: string;
  skillSet: typeof skills[Fighter];
  playable: boolean;
}

const profile=(options:Omit<PokemonProfile,'skillSet'>):PokemonProfile=>({
  ...options, skillSet:skills[options.id]
});

export const pokemonCatalog: Record<Fighter,PokemonProfile> = {
  charizard:profile({
    id:'charizard',number:6,name:'Charizard',elements:['fire','flying'],
    maxHp:100,radius:19,moveSpeed:215,attackStyle:'flame',
    portrait:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/6.png',
    playable:true
  }),
  pikachu:profile({
    id:'pikachu',number:25,name:'Pikachu',elements:['electric'],
    maxHp:100,radius:19,moveSpeed:122,attackStyle:'electric',
    portrait:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png',
    playable:true
  }),
  geodude:profile({
    id:'geodude',number:74,name:'Geodude',elements:['rock','ground'],
    maxHp:99,radius:21,moveSpeed:108,attackStyle:'rock',
    portrait:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/74.png',
    playable:true
  }),
  onix:profile({
    id:'onix',number:95,name:'Onix',elements:['rock','ground'],
    maxHp:145,radius:38,moveSpeed:82,attackStyle:'rock',
    portrait:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/95.png',
    playable:true
  })
};

export interface PokemonEncounter {
  readonly species:Fighter;
  readonly displayName:string;
  readonly trainer:string;
  readonly level:number;
}

export const gymTeams:Record<string, readonly PokemonEncounter[]> = {
  'kanto-pewter':[
    {species:'geodude',displayName:'Geodude',trainer:'Brock',level:12},
    {species:'onix',displayName:'Onix',trainer:'Brock',level:14}
  ]
};

export const availablePokemon = ():readonly PokemonProfile[] =>
  Object.values(pokemonCatalog).filter(pokemon=>pokemon.playable);

export const pokemonAbility = (species:Fighter,skill:Skill) =>
  pokemonCatalog[species].skillSet[skill];

export const pokemonByNumber = (number:number):PokemonProfile|undefined =>
  Object.values(pokemonCatalog).find(pokemon=>pokemon.number===number);
