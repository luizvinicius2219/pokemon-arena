import Phaser from 'phaser';

/**
 * Procedural, pixel-friendly combat effects.
 * All visuals are generated in the browser: no external effect assets required.
 * The persistent graphics layer renders projectiles, while short-lived
 * particles are capped to avoid performance degradation on long battles.
 */
export type VfxKind = 'ember' | 'flame' | 'fireball' | 'fireburst' | 'spark';
export interface VfxShot {
  body: { x: number; y: number; radius: number };
  velocity: { x: number; y: number };
  kind: VfxKind;
}
type Element = 'fire' | 'electric';

export class CombatFx {
  private ink: Phaser.GameObjects.Graphics;
  private particles = 0;
  private readonly maxParticles = 190;

  constructor(private scene: Phaser.Scene) {
    this.ink = scene.add.graphics().setDepth(6);
  }

  private point(x: number, y: number, a: number, forward: number, side: number) {
    const c = Math.cos(a), s = Math.sin(a);
    return { x: x + c * forward - s * side, y: y + s * forward + c * side };
  }

  private triangle(x: number, y: number, a: number, length: number, width: number, color: number) {
    const g = this.ink;
    g.fillStyle(color, 1);
    g.fillPoints([
      this.point(x, y, a, length * 0.72, 0),
      this.point(x, y, a, -length * 0.55, width),
      this.point(x, y, a, -length * 0.78, 0),
      this.point(x, y, a, -length * 0.55, -width)
    ], true);
  }

  drawShots(shots: ReadonlyArray<VfxShot>, time: number) {
    const g = this.ink;
    g.clear();

    for (const shot of shots) {
      const { x, y, radius: r } = shot.body;
      const angle = Math.atan2(shot.velocity.y, shot.velocity.x);
      const pulse = Math.sin(time * 0.023 + x * 0.07 + y * 0.04);
      if (shot.kind === 'spark') {
        const base = this.point(x, y, angle, -r * 1.5, 0);
        const tip = this.point(x, y, angle, r * 1.7, 0);
        const p1 = this.point(x, y, angle, -r * 0.6, -r * 0.9);
        const p2 = this.point(x, y, angle, r * 0.2, r * (0.6 + pulse * 0.15));
        g.lineStyle(r > 8 ? 8 : 6, 0xe39d2c, 0.32);
        g.lineBetween(base.x, base.y, p1.x, p1.y);
        g.lineBetween(p1.x, p1.y, p2.x, p2.y);
        g.lineBetween(p2.x, p2.y, tip.x, tip.y);
        g.lineStyle(3, 0xffe559, 1);
        g.lineBetween(base.x, base.y, p1.x, p1.y);
        g.lineBetween(p1.x, p1.y, p2.x, p2.y);
        g.lineBetween(p2.x, p2.y, tip.x, tip.y);
        g.fillStyle(0xffffcf, 1).fillCircle(x, y, 2);
        const fork = this.point(x, y, angle, r * 0.9, -r * 1.2);
        g.lineStyle(2, 0xffffa3, 0.95).lineBetween(p2.x, p2.y, fork.x, fork.y);
        continue;
      }

      const big = shot.kind === 'fireball' || shot.kind === 'fireburst';
      const flame = shot.kind === 'flame';
      const length = big ? r * 2.8 : flame ? r * 3.2 : r * 2.5;
      const width = r * (big ? 1.2 : 0.85);

      g.fillStyle(0xff5e16, big ? 0.32 : 0.23).fillCircle(x, y, r * (big ? 1.8 : 1.4));
      this.triangle(x, y, angle, length, width, big ? 0xff6524 : flame ? 0xff6124 : 0xff8d2a);
      this.triangle(x + Math.cos(angle)*r*0.1, y + Math.sin(angle)*r*0.1,
        angle, length * 0.68, width * 0.60, 0xffc54b);
      this.triangle(x + Math.cos(angle)*r*0.25, y + Math.sin(angle)*r*0.25,
        angle, length * 0.35, width * 0.30, 0xfff3ab);

      // Side tongues create a flickering fire silhouette without circular bullets.
      if(big || flame) {
        this.triangle(x, y, angle + 0.50 + pulse * 0.12, length * 0.60, width * 0.48, 0xff8c2a);
        this.triangle(x, y, angle - 0.52 - pulse * 0.12, length * 0.55, width * 0.43, 0xffaa30);
      }
      if(shot.kind === 'fireburst') {
        g.lineStyle(2, 0xffe29a, 0.7).strokeCircle(x, y, r * (1.25 + Math.abs(pulse)*0.23));
        for(let i=0;i<5;i++) {
          const spin=time*0.006+i*Math.PI*2/5;
          const px=x+Math.cos(spin)*r*1.35,py=y+Math.sin(spin)*r*1.35;
          g.fillStyle(0xffce6c, 1).fillRect(px-2, py-2, 4, 4);
        }
      }
    }
  }

  private mote(x: number, y: number, color: number, size: number, vx: number, vy: number, lifetime: number, alpha=1) {
    if(this.particles >= this.maxParticles || !this.scene.sys.isActive()) return;
    this.particles++;
    const rect=this.scene.add.rectangle(x,y,size,size,color,alpha).setDepth(7).setRotation(Math.random()*Math.PI);
    this.scene.tweens.add({
      targets:rect, x:x+vx,y:y+vy,alpha:0,scaleX:0.15,scaleY:0.15,
      rotation:rect.rotation+(Math.random()-0.5)*2.2,duration:lifetime,ease:'Quad.easeOut',
      onComplete:()=>{rect.destroy();this.particles=Math.max(0,this.particles-1);}
    });
  }

  trail(x:number,y:number,velocity:{x:number;y:number},kind:VfxKind,large=false) {
    const electric=kind==='spark';
    const length=Math.hypot(velocity.x,velocity.y)||1;
    const backwardsX=-velocity.x/length, backwardsY=-velocity.y/length;
    const count=large?4:2;
    for(let i=0;i<count;i++) {
      const spread=(Math.random()-0.5)*(large?35:14);
      const drift=22+Math.random()*35;
      const color=electric
        ? [0xfff6af,0xffdc52,0x8fe5ff][i%3]
        : [0xffec99,0xffb447,0xff6b30,0x874039][i%4];
      this.mote(x+spread*backwardsY,y-spread*backwardsX,color,
        electric?3+Math.random()*3:3+Math.random()*5,
        backwardsX*drift+(Math.random()-0.5)*25,
        backwardsY*drift+(Math.random()-0.5)*25,
        180+Math.random()*190);
    }
  }

  charge(x:number,y:number,element:Element,power=1) {
    const electric=element==='electric', color=electric?0xffe784:0xff8b3c;
    const circle=this.scene.add.circle(x,y,12*power,color,0.10).setStrokeStyle(2,color,0.85).setDepth(5);
    this.scene.tweens.add({
      targets:circle,alpha:0,scaleX:2.5,scaleY:2.5,duration:220+power*45,
      onComplete:()=>circle.destroy()
    });
    for(let i=0;i<Math.round(6*power);i++) {
      const a=Math.PI*2*i/Math.round(6*power)+Math.random()*0.28;
      const d=14+Math.random()*20*power;
      this.mote(x+Math.cos(a)*d,y+Math.sin(a)*d,
        electric?(i%2?0xffffff:0xffeb75):(i%2?0xffdd68:0xff7638),
        2+Math.random()*4,-Math.cos(a)*d*0.5,-Math.sin(a)*d*0.5,180+Math.random()*110);
    }
  }

  breath(x:number,y:number,angle:number,scale=1) {
    // Each tongue has independent lifetime/trajectory so it reads as flowing flame.
    for(let i=0;i<7;i++) {
      const spread=(Math.random()-0.5)*0.58;
      const a=angle+spread;
      const d=48+Math.random()*100*scale;
      const c=[0xff4e22,0xff8b2d,0xffcd4c,0xfff2a2][i%4];
      this.mote(x+Math.cos(a)*14,y+Math.sin(a)*14,c,6+Math.random()*12,
        Math.cos(a)*d,Math.sin(a)*d,(230+Math.random()*180)*scale,0.95);
    }
  }

  bolt(x1:number,y1:number,x2:number,y2:number,thickness=4,life=165) {
    const g=this.scene.add.graphics().setDepth(9);
    const dx=x2-x1,dy=y2-y1,len=Math.max(1,Math.hypot(dx,dy));
    const px=-dy/len,py=dx/len;
    const count=Math.max(4,Math.ceil(len/17));
    const vertices=[{x:x1,y:y1}];
    for(let i=1;i<count;i++){
      const t=i/count;
      const jitter=(Math.random()-0.5)*Math.min(22,len/6);
      vertices.push({x:x1+dx*t+px*jitter,y:y1+dy*t+py*jitter});
    }
    vertices.push({x:x2,y:y2});
    for(const [width,color,alpha] of [[thickness*2.8,0xf8ba36,0.22],[thickness,0xffe573,1],[Math.max(1,thickness*0.32),0xffffff,1]] as const){
      g.lineStyle(width,color,alpha);
      for(let i=1;i<vertices.length;i++)g.lineBetween(vertices[i-1].x,vertices[i-1].y,vertices[i].x,vertices[i].y);
    }
    this.scene.tweens.add({targets:g,alpha:0,duration:life,onComplete:()=>g.destroy()});
  }

  lightning(x:number,y:number,scale=1) {
    this.bolt(x-15*scale,Math.max(25,y-190*scale),x,y,6*scale,245);
    this.bolt(x+24*scale,Math.max(25,y-150*scale),x+8*scale,y-12*scale,3*scale,210);
    this.bolt(x+3*scale,y-60*scale,x+45*scale,y-30*scale,2*scale,160);
    this.impact(x,y,'electric',scale);
  }

  impact(x:number,y:number,element:Element,power=1) {
    const electric=element==='electric';
    const base=electric?0xffee81:0xffa14c;
    const ring=this.scene.add.circle(x,y,12*power,base,0.14).setStrokeStyle(4,base,0.9).setDepth(8);
    this.scene.tweens.add({targets:ring,alpha:0,scaleX:3.8,scaleY:3.8,duration:340,
      onComplete:()=>ring.destroy()});
    const flash=this.scene.add.circle(x,y,10*power,electric?0xffffff:0xffe2a1,0.92).setDepth(9);
    this.scene.tweens.add({targets:flash,alpha:0,scaleX:2.4,scaleY:2.4,duration:180,
      onComplete:()=>flash.destroy()});
    const count=Math.min(30,Math.round(10*power));
    for(let i=0;i<count;i++){
      const a=i/count*Math.PI*2+Math.random()*0.22;
      const dist=(28+Math.random()*65)*power;
      const color=electric?[0xfff5a5,0x9cddff,0xffffff][i%3]:[0xff6126,0xffad46,0xffe48a][i%3];
      this.mote(x,y,color,2+Math.random()*7*power,
        Math.cos(a)*dist,Math.sin(a)*dist,220+Math.random()*240);
    }
  }

  telegraph(x:number,y:number,radius:number,element:Element,duration:number) {
    const color=element==='electric'?0xffea77:0xff9d57;
    const ring=this.scene.add.circle(x,y,radius,color,0.10)
      .setStrokeStyle(3,color,0.88).setDepth(2);
    const center=this.scene.add.circle(x,y,4,color,0.7).setDepth(2);
    this.scene.tweens.add({targets:ring,alpha:0.6,scaleX:0.90,scaleY:0.90,
      duration:Math.max(60,duration/6),repeat:2,yoyo:true});
    this.scene.tweens.add({targets:center,scaleX:3.5,scaleY:3.5,alpha:0.05,
      duration:duration, onComplete:()=>{ring.destroy();center.destroy();}});
    return ring;
  }
}
