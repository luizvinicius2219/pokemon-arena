import { skills, type Fighter, type Skill } from './abilities';

/**
 * Reusable species catalogue for all contexts: battle opponents, future
 * playable selection, encounter teams, progression and elemental combat.
 * No sprite or move data is hard-coded to Pewter Gym here.
 */
export type PokemonType = 'normal'|'fire'|'water'|'grass'|'bug'|'poison'|'fairy'|
  'flying'|'electric'|'rock'|'ground';
export type PokemonAttackStyle = 'flame'|'water'|'grass'|'normal'|'bird'|'bug'|'fairy'|'electric'|'rock';

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
  charmander:profile({
    id:'charmander',number:4,name:'Charmander',elements:['fire'],
    maxHp:84,radius:17,moveSpeed:200,attackStyle:'flame',
    portrait:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/4.png',
    playable:true
  }),
  charmeleon:profile({
    id:'charmeleon',number:5,name:'Charmeleon',elements:['fire'],
    maxHp:106,radius:19,moveSpeed:210,attackStyle:'flame',
    portrait:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/5.png',
    playable:true
  }),
  bulbasaur:profile({
    id:'bulbasaur',number:1,name:'Bulbasaur',elements:['grass','poison'],
    maxHp:91,radius:18,moveSpeed:189,attackStyle:'grass',
    portrait:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png',
    playable:true
  }),
  ivysaur:profile({
    id:'ivysaur',number:2,name:'Ivysaur',elements:['grass','poison'],
    maxHp:112,radius:20,moveSpeed:194,attackStyle:'grass',
    portrait:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/2.png',
    playable:true
  }),
  squirtle:profile({
    id:'squirtle',number:7,name:'Squirtle',elements:['water'],
    maxHp:96,radius:17,moveSpeed:188,attackStyle:'water',
    portrait:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/7.png',
    playable:true
  }),
  wartortle:profile({
    id:'wartortle',number:8,name:'Wartortle',elements:['water'],
    maxHp:119,radius:20,moveSpeed:193,attackStyle:'water',
    portrait:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/8.png',
    playable:true
  }),
  rattata:profile({
    id:'rattata',number:19,name:'Rattata',elements:['normal'],
    maxHp:64,radius:17,moveSpeed:166,attackStyle:'normal',
    portrait:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/19.png',
    playable:false
  }),
  jigglypuff:profile({
    id:'jigglypuff',number:39,name:'Jigglypuff',elements:['normal','fairy'],
    maxHp:83,radius:20,moveSpeed:102,attackStyle:'fairy',
    portrait:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/39.png',
    playable:false
  }),
  pidgey:profile({
    id:'pidgey',number:16,name:'Pidgey',elements:['normal','flying'],
    maxHp:70,radius:17,moveSpeed:150,attackStyle:'bird',
    portrait:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/16.png',
    playable:false
  }),
  pidgeotto:profile({
    id:'pidgeotto',number:17,name:'Pidgeotto',elements:['normal','flying'],
    maxHp:97,radius:20,moveSpeed:174,attackStyle:'bird',
    portrait:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/17.png',
    playable:false
  }),
  spearow:profile({
    id:'spearow',number:21,name:'Spearow',elements:['normal','flying'],
    maxHp:74,radius:18,moveSpeed:170,attackStyle:'bird',
    portrait:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/21.png',
    playable:false
  }),
  fearow:profile({
    id:'fearow',number:22,name:'Fearow',elements:['normal','flying'],
    maxHp:108,radius:22,moveSpeed:187,attackStyle:'bird',
    portrait:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/22.png',
    playable:false
  }),
  caterpie:profile({
    id:'caterpie',number:10,name:'Caterpie',elements:['bug'],
    maxHp:59,radius:17,moveSpeed:105,attackStyle:'bug',
    portrait:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10.png',
    playable:false
  }),
  metapod:profile({
    id:'metapod',number:11,name:'Metapod',elements:['bug'],
    maxHp:81,radius:20,moveSpeed:75,attackStyle:'bug',
    portrait:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/11.png',
    playable:false
  }),
  weedle:profile({
    id:'weedle',number:13,name:'Weedle',elements:['bug','poison'],
    maxHp:57,radius:16,moveSpeed:117,attackStyle:'bug',
    portrait:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/13.png',
    playable:false
  }),
  kakuna:profile({
    id:'kakuna',number:14,name:'Kakuna',elements:['bug','poison'],
    maxHp:85,radius:19,moveSpeed:76,attackStyle:'bug',
    portrait:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/14.png',
    playable:false
  }),
  raticate:profile({
    id:'raticate',number:20,name:'Raticate',elements:['normal'],
    maxHp:100,radius:19,moveSpeed:189,attackStyle:'normal',
    portrait:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/20.png',
    playable:false
  }),
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
