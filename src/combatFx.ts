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

  private offset(x:number,y:number,a:number,forward:number,side=0) {
    const c=Math.cos(a),s=Math.sin(a);
    return {x:x+c*forward-s*side,y:y+s*forward+c*side};
  }

  /**
   * Wavy flame layers with rounded lobes instead of triangular projectiles.
   * The outline is recalculated at 60 fps so it visibly flows through the air.
   */
  private tongue(
    x:number,y:number,a:number,length:number,width:number,color:number,alpha:number,phase:number
  ) {
    const samples=12;
    const left:{x:number;y:number}[]=[];
    const right:{x:number;y:number}[]=[];
    for(let i=0;i<=samples;i++){
      const t=i/samples;
      const soft=Math.pow(Math.sin(Math.PI*Math.min(0.999,Math.max(0.001,t))),0.65);
      const half=width*(0.15+0.85*soft);
      const flicker=(Math.sin(phase*1.7+t*13)+Math.sin(phase*0.7+t*20))*width*0.09*t;
      const displacement=Math.sin(phase+t*8)*width*0.10*t;
      const p=this.offset(x,y,a,(t-0.35)*length,displacement+flicker);
      left.push(this.offset(p.x,p.y,a,0,half));
      right.push(this.offset(p.x,p.y,a,0,-half));
    }
    this.ink.fillStyle(color,alpha);
    this.ink.fillPoints([...left,...right.reverse()],true);
    const tip=this.offset(x,y,a,length*0.64,0);
    this.ink.fillCircle(tip.x,tip.y,Math.max(1.5,width*0.15));
  }

  drawShots(shots:ReadonlyArray<VfxShot>,time:number) {
    const g=this.ink;
    g.clear();
    for(const shot of shots){
      const {x,y,radius:r}=shot.body;
      const a=Math.atan2(shot.velocity.y,shot.velocity.x);
      const phase=time*0.018+x*0.02+y*0.01;
      if(shot.kind==='spark'){
        const points=[
          this.offset(x,y,a,-r*1.7,0),
          this.offset(x,y,a,-r*0.8,r*0.75),
          this.offset(x,y,a,r*0.1,-r*0.8),
          this.offset(x,y,a,r*0.65,r*0.38),
          this.offset(x,y,a,r*1.6,0)
        ];
        for(const [width,color,alpha] of [[9,0xffb439,0.21],[4,0xffe768,1],[2,0xffffff,0.95]] as const){
          g.lineStyle(width,color,alpha);
          for(let i=1;i<points.length;i++)g.lineBetween(points[i-1].x,points[i-1].y,points[i].x,points[i].y);
        }
        g.fillStyle(0xffffff,0.85).fillCircle(x,y,2.2);
        continue;
      }

      const big=shot.kind==='fireburst'||shot.kind==='fireball';
      const flame=shot.kind==='flame';
      const size=big?3:flame?2.5:2.1;
      // Outer heat halo, twisting orange body and hot cream-colored center.
      g.fillStyle(0xff5b22,big?0.22:0.16).fillCircle(x,y,r*(big?2.05:1.35));
      this.tongue(x,y,a,r*size,r*(big?1.35:flame?1.1:0.9),
        0xd54321,0.92,phase);
      this.tongue(x+r*0.14*Math.cos(a),y+r*0.14*Math.sin(a),
        a+Math.sin(phase)*0.10,r*size*0.79,r*(big?0.92:0.74),
        0xff8c30,0.96,phase+1);
      this.tongue(x+r*0.24*Math.cos(a),y+r*0.24*Math.sin(a),
        a,r*size*0.51,r*(big?0.61:0.47),0xffd66c,1,phase+2);
      if(big) {
        const swirl=time*0.006;
        for(let i=0;i<4;i++){
          const p=this.offset(x,y,swirl+i*Math.PI/2,r*1.25);
          g.fillStyle(i%2?0xffbb5a:0xff6930,0.85)
            .fillCircle(p.x,p.y,2.4+r*0.12);
        }
        g.fillStyle(0xfff2b0,0.88).fillCircle(x,y,r*0.27);
      }
    }
  }

  /**
   * A single cohesive, animated ribbon visually links Charizard's muzzle
   * to the far end of Flamethrower. Collision stays with existing hitboxes.
   */
  drawFlamethrower(
    x:number,y:number,a:number,elapsed:number,duration=580
  ) {
    if(elapsed<0||elapsed>=duration)return;
    const grow=Phaser.Math.Clamp(elapsed/230,0,1);
    const fade=Phaser.Math.Clamp((duration-elapsed)/145,0,1);
    const factor=Math.min(grow,fade);
    const length=(30+245*factor);
    const phase=elapsed*0.032;
    // Flickering layers flow across each other to avoid static wedge shapes.
    this.tongue(x,y,a,length,25*factor+6,0xa73b25,0.53,phase);
    this.tongue(x,y,a+Math.sin(phase*0.6)*0.025,length*0.92,20*factor+4,
      0xff632b,0.89,phase+0.7);
    this.tongue(x,y,a-0.015,length*0.83,14*factor+3,0xffa13e,0.95,phase+1.2);
    this.tongue(x,y,a,length*0.67,8*factor+2,0xffe6a2,0.96,phase+2);
    // Small moving embers and lobes give the beam a flowing flame texture.
    for(let i=0;i<6;i++){
      const t=((i/6+elapsed*0.0019)%1);
      const lengthAt=(t-0.18)*length;
      const side=Math.sin(t*12+phase)*13*factor;
      const p=this.offset(x,y,a,lengthAt,side);
      this.ink.fillStyle(i%2?0xffd36d:0xff5b23,0.78*factor)
        .fillCircle(p.x,p.y,2.5+Math.sin(t*Math.PI)*3.5*factor);
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
