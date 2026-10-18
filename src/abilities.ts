import type { Action } from './controls';

export type Skill = Exclude<Action, 'dodge'>;
export type Fighter = 'charizard' | 'pikachu' | 'geodude' | 'onix';
export const skillKeys: Skill[] = ['q', 'w', 'e', 'r'];
export const allActions: Action[] = ['q', 'w', 'e', 'r', 'dodge'];

export interface Ability {
  name: string;
  description: string;
  icon: string;
  cooldown: number; // milliseconds
  damage: number;
}

export const skills: Record<Fighter, Record<Skill, Ability>> = {
  charizard: {
    q: { name: 'Brasas', description: 'Projétil veloz de fogo.', icon: '🔥', cooldown: 450, damage: 8 },
    w: { name: 'Lança-Chamas', description: 'Feixe contínuo e direcionável de fogo.', icon: '🌋', cooldown: 2300, damage: 5 },
    e: { name: 'Explosão de Fogo', description: 'Bola de fogo que explode em área.', icon: '💥', cooldown: 3800, damage: 20 },
    r: { name: 'Rajada de Fogo', description: 'Explosão poderosa com fragmentos flamejantes.', icon: '☄️', cooldown: 7600, damage: 29 }
  },
  pikachu: {
    q: { name: 'Choque do Trovão', description: 'Projétil elétrico rápido.', icon: '⚡', cooldown: 850, damage: 7 },
    w: { name: 'Onda de Choque', description: 'Pulso elétrico circular ao redor de Pikachu.', icon: '🌀', cooldown: 3400, damage: 11 },
    e: { name: 'Raio', description: 'Descarga telegrafada na posição do alvo.', icon: '🌩️', cooldown: 4500, damage: 17 },
    r: { name: 'Trovão', description: 'Três descargas sequenciais com aviso no solo.', icon: '⛈️', cooldown: 9000, damage: 13 }
  },
  geodude: {
    q: { name: 'Pedrada', description: 'Rock Throw: arremessa uma pedra física.', icon: '🪨', cooldown: 1250, damage: 8 },
    w: { name: 'Rolagem', description: 'Rollout: três investidas que ficam mais fortes.', icon: '🌀', cooldown: 5200, damage: 5 },
    e: { name: 'Tumba de Rochas', description: 'Rock Tomb: queda de rochas que reduz a velocidade.', icon: '⛰️', cooldown: 4900, damage: 14 },
    r: { name: 'Magnitude', description: 'Magnitude: terremoto com potência variável de 4 a 9.', icon: '🌋', cooldown: 9100, damage: 9 }
  },
  onix: {
    q: { name: 'Deslizamento de Rochas', description: 'Rock Slide: três projéteis em leque.', icon: '🪨', cooldown: 1700, damage: 6 },
    w: { name: 'Constrição', description: 'Bind: aprisiona temporariamente e causa dano contínuo.', icon: '⛓️', cooldown: 5000, damage: 8 },
    e: { name: 'Tumba de Rochas', description: 'Rock Tomb: pedra pesada que reduz a velocidade.', icon: '⛰️', cooldown: 5600, damage: 18 },
    r: { name: 'Terremoto', description: 'Earthquake: duas ondas sísmicas concêntricas.', icon: '🌋', cooldown: 9600, damage: 13 }
  }
};
export const dodge = { name: 'Esquiva', description: 'Avanço rápido em direção ao cursor.', icon: '💨', cooldown: 1900, damage: 0 };

export const cooldownFor = (action: Action): number =>
  action === 'dodge' ? dodge.cooldown : skills.charizard[action].cooldown;
