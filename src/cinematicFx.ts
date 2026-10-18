import Phaser from 'phaser';

/**
 * Cinematic yet lightweight special-attack presentation.
 * One Graphics layer animates telegraphs, inward particles, rotating rings,
 * release waves and impact flares without loading textures or spawning
 * hundreds of GameObjects on mobile devices.
 */
export type Element = 'fire' | 'electric' | 'rock';
export type ActorSide = 'player' | 'enemy';

interface ChargeCue {
  side: ActorSide;
  element: Element;
  level: number;
  start: number;
  duration: number;
}
interface BurstCue {
  x: number;
  y: number;
  element: Element;
  level: number;
  start: number;
  duration: number;
}
interface Point { x: number; y: number }

const palette = {
  fire: { glow: 0xb54020, outer: 0xf07630, inner: 0xffd16c, core: 0xfff7c6 },
  electric: { glow: 0x3d73b7, outer: 0x6bd9ef, inner: 0xffe86a, core: 0xffffff },
  rock: { glow: 0x403d36, outer: 0x99846b, inner: 0xd1bb8b, core: 0xffedd0 }
};

const clamp01 = (t: number) => Phaser.Math.Clamp(t, 0, 1);

export class CinematicFx {
  private readonly layer: Phaser.GameObjects.Graphics;
  private readonly overlay: Phaser.GameObjects.Graphics;
  private readonly charges: ChargeCue[] = [];
  private readonly bursts: BurstCue[] = [];
  private readonly reducedMotion: boolean;

  constructor(private readonly scene: Phaser.Scene) {
    this.layer = scene.add.graphics().setDepth(5);
    this.overlay = scene.add.graphics().setDepth(16).setScrollFactor(0);
    this.reducedMotion = typeof window !== 'undefined'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  charge(side: ActorSide, element: Element, level: number, start: number, duration: number) {
    if (duration <= 0) return;
    this.charges.push({ side, element, level, start, duration });
    if (this.charges.length > 6) this.charges.shift();
  }

  burst(x: number, y: number, element: Element, level: number, time: number) {
    const duration = level >= 2 ? 560 : 410;
    this.bursts.push({ x, y, element, level, start: time, duration });
    if (this.bursts.length > 12) this.bursts.shift();
    if (level >= 2 && !this.reducedMotion) {
      // A subtle screen tint, short enough to emphasize impact without obscuring gameplay.
      this.screenFlash(element, Math.min(0.14, 0.075 + level * 0.015));
    }
  }

  release(x: number, y: number, element: Element, level: number, time: number) {
    this.burst(x, y, element, Math.max(0.75, level * 0.75), time);
  }

  private screenFlash(element: Element, alpha: number) {
    const tint = this.scene.add.rectangle(480, 288, 960, 576,
      element === 'fire' ? 0xffb66c : element==='rock' ? 0xffe1b6 : 0xd6f7ff, alpha)
      .setScrollFactor(0).setDepth(16);
    this.scene.tweens.add({
      targets: tint, alpha: 0, duration: 145, ease: 'Quad.easeOut',
      onComplete: () => tint.destroy()
    });
  }

  private line(a: Point, b: Point, color: number, width: number, alpha = 1) {
    this.layer.lineStyle(width, color, alpha).lineBetween(a.x, a.y, b.x, b.y);
  }

  update(time: number, player: Point, enemy: Point) {
    this.layer.clear();
    this.overlay.clear();

    for (let i = this.charges.length - 1; i >= 0; i--) {
      const cue = this.charges[i];
      const elapsed = time - cue.start;
      if (elapsed >= cue.duration) { this.charges.splice(i, 1); continue; }
      if (elapsed < 0) continue;
      const p = cue.side === 'player' ? player : enemy;
      this.renderCharge(cue, { x: p.x, y: p.y - 10 }, elapsed);
    }
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const cue = this.bursts[i];
      const elapsed = time - cue.start;
      if (elapsed >= cue.duration) { this.bursts.splice(i, 1); continue; }
      if (elapsed < 0) continue;
      this.renderBurst(cue, elapsed);
    }
  }

  private renderCharge(cue: ChargeCue, origin: Point, elapsed: number) {
    const g = this.layer;
    const p = palette[cue.element];
    const t = clamp01(elapsed / cue.duration);
    const strength = Math.sin(Math.PI * Math.min(0.98, 0.16 + 0.84 * t));
    const radius = (cue.level >= 2 ? 63 : 42) * (1 - t * 0.44);
    const inner = 12 + cue.level * 3;
    const alpha = 0.26 + 0.53 * strength;

    g.fillStyle(p.glow, 0.10 * strength).fillCircle(origin.x, origin.y, radius + 18);
    g.lineStyle(cue.level >= 2 ? 3 : 2, p.outer, alpha)
      .strokeCircle(origin.x, origin.y, radius);
    g.lineStyle(2, p.inner, Math.min(1, alpha * 1.3))
      .strokeCircle(origin.x, origin.y, inner + (1 - t) * 9);
    const count = cue.level >= 2 ? 14 : 9;
    for (let n = 0; n < count; n++) {
      const theta = n * Math.PI * 2 / count
        + elapsed * (cue.element === 'electric' ? -0.004 : 0.0035);
      const r = radius + Math.sin(elapsed * 0.016 + n * 3) * 5;
      const x = origin.x + Math.cos(theta) * r;
      const y = origin.y + Math.sin(theta) * r * 0.65;
      const pull = 0.32 + 0.55 * t;
      const towards = {
        x: Phaser.Math.Linear(x, origin.x, pull),
        y: Phaser.Math.Linear(y, origin.y, pull)
      };
      g.fillStyle(n % 3 === 0 ? p.core : p.inner, 0.85 * strength)
        .fillCircle(towards.x, towards.y, cue.level >= 2 ? 3.5 : 2.7);
      if (n % 2 === 0) {
        this.line({x, y}, towards, p.outer, cue.level >= 2 ? 1.7 : 1.3, alpha * 0.65);
      }
    }
    if (cue.element === 'electric') {
      for (let n = 0; n < (cue.level >= 2 ? 5 : 3); n++) {
        const angle = n * 2.4 + elapsed * 0.019;
        const a = {
          x: origin.x + Math.cos(angle) * (radius * 0.7),
          y: origin.y + Math.sin(angle) * (radius * 0.7)
        };
        const b = {
          x: origin.x + Math.cos(angle + 0.7) * (radius * 0.26),
          y: origin.y + Math.sin(angle + 0.7) * (radius * 0.26)
        };
        this.line(a, b, p.core, 2, 0.65 * strength);
      }
    } else {
      for (let n = 0; n < 5; n++) {
        const theta = n * Math.PI * 2 / 5 + elapsed * (cue.element==='rock'?-0.002:0.003);
        const r = 16 + t * 8;
        g.fillStyle(n % 2 ? p.inner : p.outer, 0.8 * strength).fillRect(
          origin.x + Math.cos(theta) * r,
          origin.y + Math.sin(theta) * r - (cue.element==='rock'?0:(elapsed / 19) % 11),
          cue.element==='rock'?5:3, cue.element==='rock'?4:3
        );
      }
    }
    if (cue.level >= 2) {
      const arcAngle = elapsed * 0.004;
      for (let i = 0; i < 4; i++) {
        const a = arcAngle + i * Math.PI * 0.5;
        const r = radius + 6;
        const c = { x: origin.x + Math.cos(a) * r, y: origin.y + Math.sin(a) * r };
        const d = { x: origin.x + Math.cos(a + 0.19) * r, y: origin.y + Math.sin(a + 0.19) * r };
        this.line(c, d, p.core, 3, alpha);
      }
    }
  }

  private renderBurst(cue: BurstCue, elapsed: number) {
    const g = this.layer;
    const pal = palette[cue.element];
    const t = clamp01(elapsed / cue.duration);
    const fade = Math.pow(1 - t, 1.5);
    const radius = (12 + cue.level * 27) * (0.34 + t * 2.0);
    const coreRadius = (cue.level >= 2 ? 20 : 12) * Math.max(0, 1 - t * 2.8);
    g.fillStyle(pal.glow, 0.12 * fade).fillCircle(cue.x, cue.y, radius * 1.25);
    g.lineStyle(4, pal.outer, 0.85 * fade).strokeCircle(cue.x, cue.y, radius);
    g.lineStyle(2, pal.inner, 0.58 * fade).strokeCircle(cue.x, cue.y, radius * 0.72);
    if (coreRadius > 0.5) {
      g.fillStyle(pal.core, 0.85 * fade).fillCircle(cue.x, cue.y, coreRadius);
    }
    const shards = cue.level >= 2 ? 18 : 10;
    for (let i = 0; i < shards; i++) {
      const angle = i * 2 * Math.PI / shards + 0.13;
      const inner = radius * (0.38 + (i % 3) * 0.06);
      const outer = radius * (0.96 + (i % 4) * 0.12);
      const a = { x: cue.x + Math.cos(angle) * inner, y: cue.y + Math.sin(angle) * inner };
      const b = { x: cue.x + Math.cos(angle) * outer, y: cue.y + Math.sin(angle) * outer };
      if (cue.element === 'electric' && i % 3 === 0) {
        const corner = { x: Phaser.Math.Linear(a.x, b.x, 0.55) - Math.sin(angle) * 10,
          y: Phaser.Math.Linear(a.y, b.y, 0.55) + Math.cos(angle) * 10 };
        this.line(a, corner, pal.inner, 2.6, fade);
        this.line(corner, b, pal.core, 1.8, fade);
      } else {
        this.line(a, b, i % 2 ? pal.outer : pal.inner, cue.level >= 2 ? 3 : 2, fade);
      }
    }
    if (cue.level >= 2) {
      const y = cue.y + Math.min(16, cue.level * 9);
      g.lineStyle(3, pal.outer, 0.42 * fade)
        .strokeEllipse(cue.x, y, radius * 1.35, radius * 0.38);
    }
  }
}
