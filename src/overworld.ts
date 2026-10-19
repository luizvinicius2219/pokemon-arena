import Phaser from 'phaser';
import type { Fighter } from './abilities';

/**
 * Pokémon Mystery Dungeon overworld sprite sheets.
 * Source: https://github.com/PMDCollab/SpriteCollab
 *
 * Each sheet is arranged by columns (animation frames) and eight direction rows:
 * S, SE, E, NE, N, NW, W, SW.
 * Original tiles and community additions belong to their respective owners.
 * PMDCollab community submissions use CC BY-NC 4.0; keep attribution and
 * this fan game non-commercial.
 */

export type Creature = Fighter;
export type Motion = 'Walk' | 'Idle' | 'Shoot' | 'Attack' | 'Charge' | 'Hurt' | 'Hop';

interface SheetInfo {
  width: number;
  height: number;
  ticks: readonly number[];
}

type SheetRegistry = Record<Creature, Record<Motion, SheetInfo>>;

const registry: SheetRegistry = {
  charmander: {
    Walk: { width: 32, height: 32, ticks: [6,8,6,8] },
    Idle: { width: 32, height: 40, ticks: [12,8,8,8] },
    // SpriteCollab aliases Shoot to Charge for Charmander.
    Shoot: { width: 32, height: 40, ticks: [2,2,2,2,2,2,2,2,2,2] },
    Attack: { width: 64, height: 64, ticks: [2,2,4,2,2,2,2,2,2,2,2] },
    Charge: { width: 32, height: 40, ticks: [2,2,2,2,2,2,2,2,2,2] },
    Hurt: { width: 48, height: 56, ticks: [2,8] },
    Hop: { width: 32, height: 88, ticks: [2,1,2,3,4,4,3,2,1,2] }
  },
  bulbasaur: {
    Walk:{width:40,height:40,ticks:[4,4,4,4,4,4]},
    Idle:{width:32,height:40,ticks:[40,6,6]},
    Shoot:{width:32,height:32,ticks:[12,4,4,4,2,2]},
    Attack:{width:64,height:72,ticks:[4,2,4,2,2,2,2,2,2,2,4]},
    Charge:{width:32,height:40,ticks:[2,2,2,2,2,2,2,2,2,2]},
    Hurt:{width:40,height:56,ticks:[2,8]},
    Hop:{width:32,height:80,ticks:[2,1,2,3,4,4,3,2,1,2]}
  },
  ivysaur: {
    Walk:{width:32,height:32,ticks:[8,10,8,10]},
    Idle:{width:32,height:32,ticks:[40,12,12,12]},
    Shoot:{width:32,height:40,ticks:[12,4,4,4,2,2]},
    Attack:{width:64,height:64,ticks:[4,2,4,2,2,2,2,2,2,2,4]},
    Charge:{width:32,height:32,ticks:[2,2,2,2,2,2,2,2,2,2]},
    Hurt:{width:48,height:56,ticks:[2,8]},
    Hop:{width:32,height:80,ticks:[2,1,2,3,4,4,3,2,1,2]}
  },
  squirtle: {
    Walk:{width:32,height:32,ticks:[12,8,12,8]},
    Idle:{width:32,height:32,ticks:[30,2,2,4,4,4,2,2]},
    Shoot:{width:40,height:32,ticks:[2,6,2,2,2,2,2,2,2,2,2]},
    Attack:{width:64,height:72,ticks:[2,4,1,1,1,2,2,2,2,2]},
    Charge:{width:32,height:32,ticks:[2,2,2,2,2,2,2,2,2,2]},
    Hurt:{width:40,height:56,ticks:[2,8]},
    Hop:{width:32,height:72,ticks:[2,1,2,3,4,4,3,2,1,2]}
  },
  wartortle: {
    Walk:{width:32,height:40,ticks:[8,10,8,10]},
    Idle:{width:24,height:40,ticks:[40,2,2,2]},
    Shoot:{width:32,height:40,ticks:[2,8,2,2,2,2,2,2,2]},
    Attack:{width:64,height:72,ticks:[4,2,4,2,2,2,2,2,2,2,4]},
    Charge:{width:32,height:40,ticks:[2,2,2,2,2,2,2,2,2,2]},
    Hurt:{width:48,height:48,ticks:[2,8]},
    Hop:{width:32,height:80,ticks:[2,1,2,3,4,4,3,2,1,2]}
  },
  charmeleon: {
    Walk:{width:24,height:32,ticks:[8,10,8,10]},
    Idle:{width:32,height:56,ticks:[40,2,3,3,3,2]},
    Shoot:{width:48,height:48,ticks:[2,2,4,1,1,2,2,2,2,2,2,2]},
    Attack:{width:72,height:80,ticks:[2,2,2,2,4,1,1,2,2,2,2,2]},
    Charge:{width:32,height:48,ticks:[2,2,2,2,2,2,2,2,2,2]},
    Hurt:{width:48,height:64,ticks:[2,8]},
    Hop:{width:40,height:88,ticks:[2,1,2,3,4,4,3,2,1,2]}
  },
  rattata: {
    Walk:{width:48,height:40,ticks:[6,4,4,4,4,4,4]},
    Idle:{width:32,height:32,ticks:[40,2,2,2,4,2,2,2]},
    Shoot:{width:32,height:40,ticks:[2,2,4,1,2,2,2,2,2,2,2,2,2]},
    Attack:{width:64,height:72,ticks:[2,4,1,1,1,2,2,2,2,2]},
    Charge:{width:32,height:32,ticks:[2,2,2,2,2,2,2,2,2,2]},
    Hurt:{width:56,height:56,ticks:[2,8]},
    Hop:{width:40,height:80,ticks:[2,1,2,3,4,4,3,2,1,2]}
  },
  jigglypuff: {
    Walk:{width:32,height:40,ticks:[6,4,4,4,6]},
    Idle:{width:24,height:32,ticks:[25,8,15,8,15]},
    Shoot:{width:32,height:40,ticks:[2,2,6,1,1,2,2,2,2,2,2,2]},
    Attack:{width:72,height:80,ticks:[2,2,6,1,1,2,2,2,2,2,2,2]},
    Charge:{width:24,height:24,ticks:[2,2,2,2,2,2,2,2,2,2]},
    Hurt:{width:40,height:48,ticks:[2,8]},
    Hop:{width:24,height:80,ticks:[2,1,2,3,4,4,3,2,1,2]}
  },
  pidgey: {
    Walk:{width:32,height:32,ticks:[6,4,4,4,4]},
    Idle:{width:24,height:40,ticks:[30,4,4,4,4]},
    Shoot:{width:24,height:48,ticks:[3,3,3,3,3,3,3,3,3,2,1]},
    Attack:{width:64,height:72,ticks:[2,2,2,4,1,1,2,2,2,2,2,2,2,2]},
    Charge:{width:24,height:32,ticks:[2,2,2,2,2,2,2,2,2,2]},
    Hurt:{width:48,height:48,ticks:[2,8]},
    Hop:{width:24,height:80,ticks:[2,1,2,3,4,4,3,2,1,2]}
  },
  pidgeotto: {
    Walk:{width:32,height:40,ticks:[6,10,6,10]},
    Idle:{width:32,height:48,ticks:[40,2,4,2]},
    Shoot:{width:32,height:56,ticks:[3,3,3,3,3,3,3,3,3,2,1]},
    Attack:{width:64,height:80,ticks:[2,2,2,4,1,1,2,2,2,2,2,2,2,2]},
    Charge:{width:32,height:48,ticks:[2,2,2,2,2,2,2,2,2,2]},
    Hurt:{width:48,height:64,ticks:[2,8]},
    Hop:{width:32,height:88,ticks:[2,1,2,3,4,4,3,2,1,2]}
  },
  spearow: {
    Walk:{width:32,height:40,ticks:[6,4,4,4,4]},
    Idle:{width:24,height:40,ticks:[40,2,3,4,3,2]},
    Shoot:{width:32,height:48,ticks:[2,3,3,3,3,2,2,2,2,2,2,2]},
    Attack:{width:64,height:80,ticks:[2,2,2,4,1,1,2,2,2,2,2,2,2,2]},
    Charge:{width:24,height:32,ticks:[2,2,2,2,2,2,2,2,2,2]},
    Hurt:{width:40,height:56,ticks:[2,8]},
    Hop:{width:32,height:72,ticks:[2,1,2,3,4,4,3,2,1,2]}
  },
  fearow: {
    Walk:{width:40,height:64,ticks:[4,5,6,4,5,6]},
    Idle:{width:40,height:72,ticks:[40,20,4,4,4,4,4,4,4,4]},
    Shoot:{width:48,height:64,ticks:[3,3,3,3,1,2,2,2,2,2,2,2,1]},
    Attack:{width:64,height:72,ticks:[2,2,2,2,2,4,1,1,2,2,2,2,2,2,2]},
    Charge:{width:40,height:64,ticks:[2,2,2,2,2,2,2,2,2,2]},
    Hurt:{width:48,height:72,ticks:[2,8]},
    Hop:{width:40,height:104,ticks:[2,1,2,3,4,4,3,2,1,2]}
  },
  caterpie: {
    Walk:{width:32,height:32,ticks:[10,10,10]},
    Idle:{width:32,height:32,ticks:[8,8,8,8,8,8,8,4,10,4]},
    Shoot:{width:32,height:40,ticks:[2,2,2,2,2,1,1,6]},
    Attack:{width:64,height:64,ticks:[4,2,4,2,2,2,2,2,2,2,4]},
    Charge:{width:24,height:40,ticks:[2,2,2,2,2,2,2,2,2,2]},
    Hurt:{width:48,height:56,ticks:[2,8]},
    Hop:{width:24,height:80,ticks:[2,1,2,3,4,4,3,2,1,2]}
  },
  metapod: {
    Walk:{width:32,height:48,ticks:[4,2,2,2,2,4,4,4,4,4]},
    Idle:{width:32,height:40,ticks:[10,14,10,14]},
    Shoot:{width:32,height:48,ticks:[4,2,2,2,4,2,2,2,2,2,2,2,2]},
    Attack:{width:72,height:80,ticks:[2,4,1,1,1,2,2,2,2,2]},
    Charge:{width:24,height:40,ticks:[2,2,2,2,2,2,2,2,2,2]},
    Hurt:{width:48,height:64,ticks:[2,8]},
    Hop:{width:32,height:80,ticks:[2,1,2,3,4,4,3,2,1,2]}
  },
  weedle: {
    Walk:{width:32,height:40,ticks:[8,10,8]},
    Idle:{width:32,height:40,ticks:[40,8,8,8]},
    Shoot:{width:32,height:40,ticks:[2,2,4,4,2,2,2,2,2,2,2,2,4]},
    Attack:{width:64,height:64,ticks:[4,2,4,2,2,2,2,2,2,2,4]},
    Charge:{width:24,height:32,ticks:[2,2,2,2,2,2,2,2,2,2]},
    Hurt:{width:56,height:64,ticks:[2,8]},
    Hop:{width:32,height:80,ticks:[2,1,2,3,4,4,3,2,1,2]}
  },
  kakuna: {
    Walk:{width:24,height:40,ticks:[8,4,4,4,10]},
    Idle:{width:24,height:40,ticks:[40,1,1,4,1,1]},
    Shoot:{width:24,height:40,ticks:[2,2,2,2,2,2,2,2,2,2]},
    Attack:{width:64,height:72,ticks:[2,2,2,2,2,2,2,6,1,1,1,2,2,2]},
    Charge:{width:24,height:40,ticks:[2,2,2,2,2,2,2,2,2,2]},
    Hurt:{width:48,height:56,ticks:[2,8]},
    Hop:{width:24,height:80,ticks:[2,1,2,3,4,4,3,2,1,2]}
  },
  raticate: {
    Walk:{width:40,height:48,ticks:[4,6,4,4,4,4]},
    Idle:{width:32,height:48,ticks:[30,6,3,4,3,6]},
    Shoot:{width:32,height:40,ticks:[2,2,4,2,2,1,2,2,2,2,2,2,2,2]},
    Attack:{width:72,height:72,ticks:[2,2,4,1,2,2,2,2,2,2,2,2,2]},
    Charge:{width:32,height:32,ticks:[2,2,2,2,2,2,2,2,2,2]},
    Hurt:{width:40,height:48,ticks:[2,8]},
    Hop:{width:32,height:80,ticks:[2,1,2,3,4,4,3,2,1,2]}
  },
  charizard: {
    Walk: { width: 40, height: 48, ticks: [8, 10, 8, 10] },
    Idle: { width: 40, height: 48, ticks: [15, 15, 15, 15] },
    Shoot: { width: 56, height: 56, ticks: [4, 6, 2, 2, 2, 2, 2, 2, 2, 2, 2] },
    Attack: { width: 80, height: 88, ticks: [2, 2, 2, 2, 4, 1, 1, 2, 2, 2, 2, 2, 2, 2] },
    Charge: { width: 48, height: 48, ticks: [2, 2, 2, 2, 2, 2, 2, 2, 2, 2] },
    Hurt: { width: 64, height: 64, ticks: [2, 8] },
    Hop: { width: 48, height: 96, ticks: [2, 1, 2, 3, 4, 4, 3, 2, 1, 2] }
  },
  pikachu: {
    Walk: { width: 32, height: 40, ticks: [8, 10, 8, 10] },
    Idle: { width: 40, height: 56, ticks: [40, 2, 3, 3, 3, 2] },
    Shoot: { width: 40, height: 56, ticks: [1, 2, 6, 2, 2, 2, 2, 2, 2, 2, 2] },
    Attack: { width: 80, height: 80, ticks: [2, 4, 1, 1, 1, 2, 2, 2, 2, 4] },
    Charge: { width: 40, height: 40, ticks: [2, 2, 2, 2, 2, 2, 2, 2, 2, 2] },
    Hurt: { width: 48, height: 64, ticks: [2, 8] },
    Hop: { width: 40, height: 88, ticks: [2, 1, 2, 3, 4, 4, 3, 2, 1, 2] }
  },
  geodude: {
    Walk: { width: 32, height: 32, ticks: [8,10,8,10] },
    Idle: { width: 32, height: 24, ticks: [8,12,8,12] },
    Shoot: { width: 48, height: 40, ticks: [2,2,4,1,1,2,2,2,2,2,2,2,2,2] },
    Attack: { width: 72, height: 80, ticks: [3,3,2,2,2,2,1,1,1,1,1,1,2,2] },
    Charge: { width: 32, height: 40, ticks: [2,2,2,2,2,2,2,2,2,2] },
    Hurt: { width: 40, height: 48, ticks: [2,8] },
    Hop: { width: 32, height: 80, ticks: [2,1,2,3,4,4,3,2,1,2] }
  },
  onix: {
    Walk: { width: 88, height: 112, ticks: [10,14,10,14] },
    Idle: { width: 96, height: 104, ticks: [16,16,16,16] },
    Shoot: { width: 96, height: 112, ticks: [2,2,6,2,2,2,2,2,2,2] },
    Attack: { width: 128, height: 152, ticks: [2,6,1,1,1,2,2,2,2,2,2] },
    Charge: { width: 56, height: 104, ticks: [2,2,2,2,2,2,2,2,2,2] },
    Hurt: { width: 80, height: 88, ticks: [2,8] },
    Hop: { width: 88, height: 160, ticks: [2,1,2,3,4,4,3,2,1,2] }
  }
};

/**
 * Actual hit/launch frames from the PMDCollab AnimData.xml (zero-based).
 * The projectile releases when the body reaches its attack frame.
 */
export function releaseFrameMs(creature: Creature, motion: 'Shoot'|'Attack'|'Charge'): number {
  const frames: Record<Creature, Record<'Shoot'|'Attack'|'Charge',number>> = {
    charmander: { Shoot: 5, Attack: 5, Charge: 5 },
    bulbasaur: { Shoot: 2, Attack: 5, Charge: 5 },
    ivysaur: { Shoot: 2, Attack: 3, Charge: 5 },
    squirtle: { Shoot: 4, Attack: 3, Charge: 5 },
    wartortle: { Shoot: 4, Attack: 5, Charge: 5 },
    charmeleon: { Shoot: 2, Attack: 5, Charge: 5 },
    rattata: { Shoot: 4, Attack: 3, Charge: 5 },
    jigglypuff: { Shoot: 2, Attack: 3, Charge: 5 },
    pidgey: {Shoot:3,Attack:4,Charge:5},
    pidgeotto: {Shoot:3,Attack:4,Charge:5},
    spearow: {Shoot:3,Attack:4,Charge:5},
    fearow: {Shoot:3,Attack:6,Charge:5},
    caterpie: {Shoot:1,Attack:5,Charge:5},
    metapod: {Shoot:4,Attack:3,Charge:5},
    weedle: {Shoot:3,Attack:5,Charge:5},
    kakuna: {Shoot:3,Attack:7,Charge:5},
    raticate: {Shoot:2,Attack:5,Charge:5},
    charizard: { Shoot: 2, Attack: 5, Charge: 5 },
    pikachu:  { Shoot: 2, Attack: 3, Charge: 5 },
    geodude:  { Shoot: 5, Attack: 5, Charge: 5 },
    onix:     { Shoot: 2, Attack: 3, Charge: 5 }
  };
  const info=registry[creature][motion];
  return Math.round(info.ticks.slice(0,frames[creature][motion]).reduce((sum,t)=>sum+t,0)*1000/60);
}

const ids: Record<Creature,string> = {
  charmander:'0004',charmeleon:'0005',charizard:'0006',
  bulbasaur:'0001',ivysaur:'0002',squirtle:'0007',wartortle:'0008',
  rattata:'0019',jigglypuff:'0039',pikachu:'0025',geodude:'0074',onix:'0095',
  pidgey:'0016',
  pidgeotto:'0017',
  spearow:'0021',
  fearow:'0022',
  caterpie:'0010',
  metapod:'0011',
  weedle:'0013',
  kakuna:'0014',
  raticate:'0020'
};
const motions: Motion[] = ['Walk', 'Idle', 'Shoot', 'Attack', 'Charge', 'Hurt', 'Hop'];
const base = 'https://raw.githubusercontent.com/PMDCollab/SpriteCollab/master/sprite/';

function spriteSize(creature:Creature):number {
  switch(creature){
    case 'charmander':return 2.55;
    case 'charmeleon':return 2.12;
    case 'bulbasaur':return 2.65;
    case 'ivysaur':return 2.04;
    case 'squirtle':return 2.55;
    case 'wartortle':return 2.10;
    case 'rattata':return 2.38;
    case 'jigglypuff':return 2.50;
    case 'pidgey':return 2.32;
    case 'pidgeotto':return 2.05;
    case 'spearow':return 2.05;
    case 'fearow':return 2;
    case 'caterpie':return 2.35;
    case 'metapod':return 2.05;
    case 'weedle':return 2.35;
    case 'kakuna':return 2.05;
    case 'raticate':return 1.91;
    case 'onix':return 1.95;
    case 'geodude':return 1.95;
    case 'charizard':return 1.9;
    case 'pikachu':return 1.7;
  }
}
function spriteLift(creature:Creature):number {
  return creature==='onix'?52:
    creature==='charmander'||creature==='bulbasaur'||creature==='squirtle'
    ||creature==='rattata'||creature==='jigglypuff'?24:
    creature==='ivysaur'||creature==='wartortle'||creature==='charmeleon'?27:
    creature==='geodude'?15:
    creature==='fearow'||creature==='pidgeotto'?37:
    creature==='pidgey'||creature==='spearow'?26:21;
}

function key(creature: Creature, motion: Motion) {
  return 'pmd-' + creature + '-' + motion.toLowerCase();
}

function totalMs(info: SheetInfo): number {
  return info.ticks.reduce((sum, tick) => sum + tick, 0) * 1000 / 60;
}

function currentFrame(info: SheetInfo, elapsed: number, loop: boolean): number {
  const span = totalMs(info);
  const t = loop ? ((elapsed % span) + span) % span : Math.min(Math.max(0, elapsed), span - 0.001);
  let cumulative = 0;
  for (let i = 0; i < info.ticks.length; i++) {
    cumulative += info.ticks[i] * (1000 / 60);
    if (t < cumulative) return i;
  }
  return info.ticks.length - 1;
}

function directionRow(x: number, y: number): number {
  // Screen-space Y points downward. Right=2, Down=0, Left=6, Up=4.
  const radians = Math.atan2(y, x);
  return ((Math.round(2 - radians * 4 / Math.PI) % 8) + 8) % 8;
}

export function preloadOverworld(scene: Phaser.Scene, roster: readonly Creature[] = ['charizard','pikachu']) {
  for (const creature of roster) {
    // Only active player creatures need Hop sheets; the two gym opponents
    // never dash. Avoid downloading very tall Onix Hop frames on mobile.
    for (const motion of motions) {
      if((creature==='geodude'||creature==='onix')&&motion==='Hop')continue;
      const info = registry[creature][motion];
      const spriteMotion=(creature==='charmander'||creature==='kakuna')&&motion==='Shoot'?'Charge':motion;
      scene.load.spritesheet(key(creature, motion), base + ids[creature] + '/' + spriteMotion + '-Anim.png', {
        frameWidth: info.width,
        frameHeight: info.height
      });
    }
  }
}

/**
 * A direction-aware, real frame-by-frame character controller.
 * It keeps a single image across the whole battle so dash afterimages,
 * tints and sprite depth continue to work without changing combat logic.
 */
export class OverworldActor {
  readonly image: Phaser.GameObjects.Image;
  private pose: Motion = 'Idle';
  private poseStart = 0;
  private facing = new Phaser.Math.Vector2(1, 0);
  private action: Motion | null = null;
  private actionStartedAt = -1000;
  private actionExpiresAt = -1000;
  private actionDuration = 0;
  private hurtStartedAt = -1000;
  private hurtExpiresAt = -1000;
  private lastFrame = -1;
  private lastTexture = '';
  private burrowDepth=0;

  /**
   * 0 = above ground, 1 = underground. The actor remains animated while
   * the upper body sinks/rises; no external sprite-size tween can fight the
   * frame-by-frame animation controller.
   */
  setBurrowDepth(depth:number){
    this.burrowDepth=Phaser.Math.Clamp(depth,0,1);
  }

  static available(scene: Phaser.Scene, creature: Creature): boolean {
    return scene.textures.exists(key(creature, 'Walk')) && scene.textures.exists(key(creature, 'Idle'));
  }

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly creature: Creature,
    x: number,
    y: number
  ) {
    const huge=creature==='onix';
    this.image = scene.add.image(x, huge?y-spriteLift(creature):y,
      key(creature, 'Idle'), 0)
      .setOrigin(0.5, huge?0.5:0.80)
      .setScale(spriteSize(creature))
      .setDepth(3);
  }

  trigger(motion: 'Shoot' | 'Attack' | 'Charge' | 'Hop', time: number, dir: Phaser.Math.Vector2, duration?: number) {
    if (!this.scene.textures.exists(key(this.creature, motion))) return;
    this.action = motion;
    this.actionStartedAt = time;
    this.actionDuration = duration ?? totalMs(registry[this.creature][motion]);
    this.actionExpiresAt = time + this.actionDuration;
    if (dir.lengthSq() > 0.0001) this.facing.copy(dir).normalize();
  }

  face(dir: Phaser.Math.Vector2) {
    if (dir.lengthSq() > 0.0001) this.facing.copy(dir).normalize();
  }

  hurt(time: number) {
    if (!this.scene.textures.exists(key(this.creature, 'Hurt'))) return;
    this.hurtStartedAt = time;
    this.hurtExpiresAt = time + totalMs(registry[this.creature].Hurt);
  }

  update(x: number, y: number, velocity: Phaser.Math.Vector2, time: number) {
    const moving = velocity.lengthSq() > 0.05;
    const actionActive = this.action !== null && time < this.actionExpiresAt;
    const hurtActive = time < this.hurtExpiresAt;

    if (!actionActive && moving) this.facing.copy(velocity).normalize();

    let next: Motion = moving ? 'Walk' : 'Idle';
    if (actionActive && this.action) next = this.action;
    if (hurtActive) next = 'Hurt';

    // Graceful fallback if a particular remote sheet could not be loaded.
    if (!this.scene.textures.exists(key(this.creature, next))) {
      next = moving ? 'Walk' : 'Idle';
    }

    if (next !== this.pose) {
      this.pose = next;
      this.poseStart = time;
      this.lastFrame = -1;
    }

    const info = registry[this.creature][next];
    const spriteKey = key(this.creature, next);
    const texture = this.scene.textures.get(spriteKey);
    const source = texture.source[0];
    const columns = Math.max(1, Math.floor(source.width / info.width));
    const rows = Math.max(1, Math.floor(source.height / info.height));
    const row = rows >= 8 ? directionRow(this.facing.x, this.facing.y) : 0;

    const elapsed = next === 'Hurt' ? time - this.hurtStartedAt
      : actionActive && next === this.action ? time - this.actionStartedAt
      : time - this.poseStart;
    const hop = actionActive && next === 'Hop';
    const elapsedFrames = hop && this.actionDuration>0
      ? elapsed * totalMs(info) / this.actionDuration : elapsed;
    const sustainedShoot = actionActive && next === 'Shoot'
      && this.actionDuration > totalMs(info)+50;
    const index = Math.min(currentFrame(info, Math.max(0,elapsedFrames),
      next === 'Walk' || next === 'Idle' || sustainedShoot),columns-1);
    const frame = row * columns + index;

    if (spriteKey !== this.lastTexture) {
      this.image.setTexture(spriteKey, frame);
      this.lastTexture = spriteKey;
      this.lastFrame = frame;
    } else if (frame !== this.lastFrame) {
      this.image.setFrame(frame);
      this.lastFrame = frame;
    }

    this.image.setFlipX(false).setRotation(0);
    const hurtElapsed=time-this.hurtStartedAt;
    const hurtPulse=hurtActive?Math.sin(Math.PI*Phaser.Math.Clamp(hurtElapsed/200,0,1)):0;
    if(hurtActive && Math.floor(hurtElapsed/50)%2===0) this.image.setTint(0xffb3a7);
    else this.image.clearTint();
    const walkingBob = moving && next === 'Walk' ? Math.abs(Math.sin(time * 0.012)) * 1.2 : 0;
    const hopProgress=hop && this.actionDuration>0
      ? Phaser.Math.Clamp((time-this.actionStartedAt)/this.actionDuration,0,1) : 0;
    const lift=hop?Math.sin(Math.PI*hopProgress)*8:0;
    const sinking=this.burrowDepth;
    // Anchor sprites by the actual feet instead of floating the whole
    // centred sheet over a shadow. PMD frame heights vary by move:
    // the bottom anchor keeps idle, walk and attack on the same floor.
    // Onix retains its original tall-body anchor for Dig's sink/tunnel FX.
    const isOnix=this.creature==='onix';
    const restY=isOnix
      ?y-spriteLift(this.creature)*(1-sinking*0.82)
      :y+2+(sinking*12);
    this.image.setPosition(x-this.facing.x*3*hurtPulse,
      restY-walkingBob*(1-sinking)-lift*(1-sinking)-3*hurtPulse);
    const size=spriteSize(this.creature);
    const width= this.creature==='onix'?1.17:1;
    this.image.setScale(
      size*width*(1+hurtPulse*0.075)*(1-sinking*0.42),
      size*(1-hurtPulse*0.055)*Math.max(0.06,1-sinking*0.94)
    );
    this.image.setAlpha(Math.max(0.04,1-sinking*0.96));
  }
}
