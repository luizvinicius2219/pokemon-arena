import Phaser from 'phaser';

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

export type Creature = 'charizard' | 'pikachu';
export type Motion = 'Walk' | 'Idle' | 'Shoot' | 'Attack' | 'Charge' | 'Hurt';

interface SheetInfo {
  width: number;
  height: number;
  ticks: readonly number[];
}

type SheetRegistry = Record<Creature, Record<Motion, SheetInfo>>;

const registry: SheetRegistry = {
  charizard: {
    Walk: { width: 40, height: 48, ticks: [8, 10, 8, 10] },
    Idle: { width: 40, height: 48, ticks: [15, 15, 15, 15] },
    Shoot: { width: 56, height: 56, ticks: [4, 6, 2, 2, 2, 2, 2, 2, 2, 2, 2] },
    Attack: { width: 80, height: 88, ticks: [2, 2, 2, 2, 4, 1, 1, 2, 2, 2, 2, 2, 2, 2] },
    Charge: { width: 48, height: 48, ticks: [2, 2, 2, 2, 2, 2, 2, 2, 2, 2] },
    Hurt: { width: 64, height: 64, ticks: [2, 8] }
  },
  pikachu: {
    Walk: { width: 32, height: 40, ticks: [8, 10, 8, 10] },
    Idle: { width: 40, height: 56, ticks: [40, 2, 3, 3, 3, 2] },
    Shoot: { width: 40, height: 56, ticks: [1, 2, 6, 2, 2, 2, 2, 2, 2, 2, 2] },
    Attack: { width: 80, height: 80, ticks: [2, 4, 1, 1, 1, 2, 2, 2, 2, 4] },
    Charge: { width: 40, height: 40, ticks: [2, 2, 2, 2, 2, 2, 2, 2, 2, 2] },
    Hurt: { width: 48, height: 64, ticks: [2, 8] }
  }
};

/**
 * Actual hit/launch frames from the PMDCollab AnimData.xml (zero-based).
 * The projectile releases when the body reaches its attack frame.
 */
export function releaseFrameMs(creature: Creature, motion: 'Shoot'|'Attack'|'Charge'): number {
  const frames: Record<Creature, Record<'Shoot'|'Attack'|'Charge',number>> = {
    charizard: { Shoot: 2, Attack: 5, Charge: 5 },
    pikachu:  { Shoot: 2, Attack: 3, Charge: 5 }
  };
  const info=registry[creature][motion];
  return Math.round(info.ticks.slice(0,frames[creature][motion]).reduce((sum,t)=>sum+t,0)*1000/60);
}

const ids: Record<Creature, string> = { charizard: '0006', pikachu: '0025' };
const motions: Motion[] = ['Walk', 'Idle', 'Shoot', 'Attack', 'Charge', 'Hurt'];
const base = 'https://raw.githubusercontent.com/PMDCollab/SpriteCollab/master/sprite/';

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

export function preloadOverworld(scene: Phaser.Scene) {
  for (const creature of ['charizard', 'pikachu'] as Creature[]) {
    for (const motion of motions) {
      const info = registry[creature][motion];
      scene.load.spritesheet(key(creature, motion), base + ids[creature] + '/' + motion + '-Anim.png', {
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
  private hurtStartedAt = -1000;
  private hurtExpiresAt = -1000;
  private lastFrame = -1;
  private lastTexture = '';

  static available(scene: Phaser.Scene, creature: Creature): boolean {
    return scene.textures.exists(key(creature, 'Walk')) && scene.textures.exists(key(creature, 'Idle'));
  }

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly creature: Creature,
    x: number,
    y: number
  ) {
    this.image = scene.add.image(x, y - 17, key(creature, 'Idle'))
      .setOrigin(0.5, 0.5)
      .setScale(creature === 'charizard' ? 1.9 : 1.7)
      .setDepth(3);
  }

  trigger(motion: 'Shoot' | 'Attack' | 'Charge', time: number, dir: Phaser.Math.Vector2) {
    if (!this.scene.textures.exists(key(this.creature, motion))) return;
    this.action = motion;
    this.actionStartedAt = time;
    this.actionExpiresAt = time + totalMs(registry[this.creature][motion]);
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
    const index = Math.min(currentFrame(info, Math.max(0, elapsed), next === 'Walk' || next === 'Idle'), columns - 1);
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
    const walkingBob = moving && next === 'Walk' ? Math.abs(Math.sin(time * 0.012)) * 1.2 : 0;
    this.image.setPosition(x, y - 17 - walkingBob);
    this.image.setScale(this.creature === 'charizard' ? 1.9 : 1.7);
  }
}
