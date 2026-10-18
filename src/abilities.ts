import type { Action } from './controls';

export type Skill = Exclude<Action, 'dodge'>;
export type Fighter = 'charmander' | 'charmeleon' | 'charizard' |
  'bulbasaur' | 'ivysaur' | 'squirtle' | 'wartortle' |
  'pikachu' | 'rattata' | 'jigglypuff' | 'geodude' | 'onix';
export type Starter = 'charmander' | 'bulbasaur' | 'squirtle';
export const skillKeys: Skill[] = ['q', 'w', 'e', 'r'];
export const allActions: Action[] = ['q', 'w', 'e', 'r', 'dodge'];

export interface Ability {
  name: string;
  description: string;
  icon: string;
  cooldown: number; // milliseconds
  damage: number;
  /** Actual elemental type of the move, shared by battle AI and team select. */
  element: import('./pokemonCatalog').PokemonType;
}

export const skills: Record<Fighter, Record<Skill, Ability>> = {
  charmander: {
    q: { name: 'Arranhão', description: 'Scratch: golpe físico de garras na frente do Pokémon.', icon: '🐾', cooldown: 780, damage: 10, element: 'normal' },
    w: { name: 'Rosnar', description: 'Growl: ondas sonoras reduzem temporariamente o dano do rival.', icon: '🔊', cooldown: 4200, damage: 0, element: 'normal' },
    e: { name: 'Brasas', description: 'Ember: chamas nítidas em um projétil com rastro luminoso.', icon: '🔥', cooldown: 1180, damage: 11, element: 'fire' },
    r: { name: 'Cortina de Fumaça', description: 'Smokescreen: nuvem densa reduz a mobilidade e o ritmo do rival.', icon: '💨', cooldown: 6700, damage: 0, element: 'normal' }
  },
  charmeleon: {
    q:{name:'Arranhão',description:'Ataque rápido com garras.',icon:'🐾',cooldown:670,damage:15,element:'normal'},
    w:{name:'Rosnar',description:'Reduz o dano inimigo.',icon:'🔊',cooldown:4000,damage:0,element:'normal'},
    e:{name:'Brasas',description:'Chamas concentradas.',icon:'🔥',cooldown:1050,damage:19,element:'fire'},
    r:{name:'Cortina de Fumaça',description:'Nuvem que atrapalha o rival.',icon:'💨',cooldown:6300,damage:0,element:'normal'}
  },
  bulbasaur: {
    q:{name:'Investida',description:'Golpe físico curto.',icon:'🐾',cooldown:800,damage:10,element:'normal'},
    w:{name:'Rosnar',description:'Reduz o ataque inimigo.',icon:'🔊',cooldown:3900,damage:0,element:'normal'},
    e:{name:'Chicote de Vinha',description:'Vinhas verdes alcançam o rival.',icon:'🌿',cooldown:1270,damage:13,element:'grass'},
    r:{name:'Semente Sanguessuga',description:'Drena HP durante alguns segundos.',icon:'🌱',cooldown:7000,damage:5,element:'grass'}
  },
  ivysaur: {
    q:{name:'Investida',description:'Golpe físico.',icon:'🐾',cooldown:720,damage:15,element:'normal'},
    w:{name:'Rosnar',description:'Enfraquece o rival.',icon:'🔊',cooldown:3600,damage:0,element:'normal'},
    e:{name:'Chicote de Vinha',description:'Vinhas longas atingem o rival.',icon:'🌿',cooldown:1030,damage:21,element:'grass'},
    r:{name:'Semente Sanguessuga',description:'Drena energia do inimigo.',icon:'🌱',cooldown:6400,damage:8,element:'grass'}
  },
  squirtle: {
    q:{name:'Investida',description:'Golpe rápido com o casco.',icon:'🐢',cooldown:790,damage:10,element:'normal'},
    w:{name:'Abanar de Cauda',description:'Reduz a defesa inimiga.',icon:'💫',cooldown:3900,damage:0,element:'normal'},
    e:{name:'Jato d’Água',description:'Jato de água direcionado.',icon:'💦',cooldown:1150,damage:13,element:'water'},
    r:{name:'Retirada',description:'Proteção no casco por alguns segundos.',icon:'🛡️',cooldown:6500,damage:0,element:'water'}
  },
  wartortle: {
    q:{name:'Investida',description:'Golpe com o casco.',icon:'🐢',cooldown:740,damage:15,element:'normal'},
    w:{name:'Abanar de Cauda',description:'Reduz a defesa.',icon:'💫',cooldown:3600,damage:0,element:'normal'},
    e:{name:'Jato d’Água',description:'Jato de água potente.',icon:'💦',cooldown:1020,damage:21,element:'water'},
    r:{name:'Retirada',description:'Resistência temporária.',icon:'🛡️',cooldown:6100,damage:0,element:'water'}
  },
  rattata: {
    q:{name:'Investida',description:'Investida curta.',icon:'🐭',cooldown:1200,damage:7,element:'normal'},
    w:{name:'Ataque Rápido',description:'Ataque veloz.',icon:'💨',cooldown:3500,damage:9,element:'normal'},
    e:{name:'Rosnar',description:'Intimida o rival.',icon:'🔊',cooldown:5900,damage:0,element:'normal'},
    r:{name:'Mordida',description:'Golpe físico forte.',icon:'🦷',cooldown:7400,damage:14,element:'normal'}
  },
  jigglypuff: {
    q:{name:'Pancada',description:'Golpe físico.',icon:'🎵',cooldown:1350,damage:8,element:'normal'},
    w:{name:'Cantar',description:'Notas musicais lentificam o rival.',icon:'🎶',cooldown:4300,damage:0,element:'normal'},
    e:{name:'Voz Encantadora',description:'Onda sonora de fada.',icon:'✨',cooldown:4600,damage:13,element:'fairy'},
    r:{name:'Rolagem',description:'Ataque circular.',icon:'🌀',cooldown:8000,damage:15,element:'normal'}
  },
  charizard: {
    q: { name: 'Brasas', description: 'Projétil veloz de fogo.', icon: '🔥', cooldown: 450, damage: 8, element: 'fire' },
    w: { name: 'Lança-Chamas', description: 'Feixe contínuo e direcionável de fogo.', icon: '🌋', cooldown: 2300, damage: 5, element: 'fire' },
    e: { name: 'Explosão de Fogo', description: 'Bola de fogo que explode em área.', icon: '💥', cooldown: 3800, damage: 20, element: 'fire' },
    r: { name: 'Rajada de Fogo', description: 'Explosão poderosa com fragmentos flamejantes.', icon: '☄️', cooldown: 7600, damage: 29, element: 'fire' }
  },
  pikachu: {
    q: { name: 'Choque do Trovão', description: 'Projétil elétrico rápido.', icon: '⚡', cooldown: 850, damage: 7, element: 'electric' },
    w: { name: 'Onda de Choque', description: 'Pulso elétrico circular ao redor de Pikachu.', icon: '🌀', cooldown: 3400, damage: 11, element: 'electric' },
    e: { name: 'Raio', description: 'Descarga telegrafada na posição do alvo.', icon: '🌩️', cooldown: 4500, damage: 17, element: 'electric' },
    r: { name: 'Trovão', description: 'Três descargas sequenciais com aviso no solo.', icon: '⛈️', cooldown: 9000, damage: 13, element: 'electric' }
  },
  geodude: {
    q: { name: 'Pedrada', description: 'Rock Throw: arremessa uma pedra física.', icon: '🪨', cooldown: 1250, damage: 5, element: 'rock' },
    w: { name: 'Rolagem', description: 'Rollout: três investidas que ficam mais fortes.', icon: '🌀', cooldown: 5200, damage: 3, element: 'rock' },
    e: { name: 'Tumba de Rochas', description: 'Rock Tomb: queda de rochas que reduz a velocidade.', icon: '⛰️', cooldown: 4900, damage: 7, element: 'rock' },
    r: { name: 'Magnitude', description: 'Magnitude: terremoto com potência variável de 4 a 10.', icon: '🌋', cooldown: 9100, damage: 9, element: 'ground' }
  },
  onix: {
    q: { name: 'Deslizamento de Rochas', description: 'Rock Slide: três projéteis em leque.', icon: '🪨', cooldown: 1700, damage: 4, element: 'rock' },
    w: { name: 'Escavar', description: 'Dig: desaparece no solo, segue o alvo e emerge com impacto.', icon: '⛏️', cooldown: 6800, damage: 22, element: 'ground' },
    e: { name: 'Tumba de Rochas', description: 'Rock Tomb: pedra pesada que reduz a velocidade.', icon: '⛰️', cooldown: 5600, damage: 7, element: 'rock' },
    r: { name: 'Terremoto', description: 'Earthquake: duas ondas sísmicas concêntricas.', icon: '🌋', cooldown: 9600, damage: 13, element: 'ground' }
  }
};
export const dodge = { name: 'Esquiva', description: 'Avanço rápido em direção ao cursor.', icon: '💨', cooldown: 1900, damage: 0 };

export const cooldownFor = (action: Action): number =>
  action === 'dodge' ? dodge.cooldown : skills.charizard[action].cooldown;
