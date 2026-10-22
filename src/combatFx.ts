import Phaser from 'phaser';

/**
 * Procedural, pixel-friendly combat effects.
 * All visuals are generated in the browser: no external effect assets required.
 * The persistent graphics layer renders projectiles, while short-lived
 * particles are capped to avoid performance degradation on long battles.
 */
export type VfxKind = 'ember' | 'flame' | 'fireball' | 'fireburst' | 'spark' | 'rock' | 'shard' | 'water';
export interface VfxShot {
  body: { x: number; y: number; radius: number };
  velocity: { x: number; y: number };
  kind: VfxKind;
}
type Element = 'fire' | 'electric' | 'water';

/** Common collision/render geometry for the Flamethrower beam. */
export function beamReach(elapsed:number,duration:number,maxDistance=385): number {
  if(elapsed<0||elapsed>=duration)return 0;
  const extend=Phaser.Math.Clamp(elapsed/135,0,1);
  const retract=Phaser.Math.Clamp((duration-elapsed)/115,0,1);
  return maxDistance*Math.min(extend,retract);
}

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
      if(shot.kind==='water'){
        const vx=Math.cos(a),vy=Math.sin(a);
        const nx=-vy,ny=vx;
        g.fillStyle(0x1564a5,0.31).fillEllipse(x+4,y+7,r*3,r*1.8);
        g.fillStyle(0x35a7de,0.96).fillEllipse(x,y,r*3.1,r*2.35);
        g.fillStyle(0x6ce0fa,0.93).fillEllipse(
          x+vx*r*0.65,y+vy*r*0.65,r*2.30,r*1.78);
        g.fillStyle(0xe1ffff,0.97).fillEllipse(
          x+vx*r,y+vy*r,r*1.12,r*1.06);
        for(let j=0;j<4;j++){
          const d=r*(1.7+j*0.75);
          const oscillate=Math.sin(time*0.025+j*1.8)*r*0.60;
          g.fillStyle(j%2?0x7ee9f8:0xcafaff,0.88-j*0.12)
            .fillCircle(x-vx*d+nx*oscillate,
              y-vy*d+ny*oscillate,Math.max(2,r*0.37-j*0.45));
        }
        continue;
      }
      if(shot.kind==='rock'||shot.kind==='shard'){
        // A faceted boulder or jagged spear travels as a single grounded
        // stone projectile rather than a recolored fireball.
        const shard=shot.kind==='shard';
        const size=shard?r*1.5:r;
        const length=shard?r*2.7:r*1.35;
        const points=[
          this.offset(x,y,a,length,0),
          this.offset(x,y,a,-size*0.35,-size*0.82),
          this.offset(x,y,a,-length*0.82,-size*0.28),
          this.offset(x,y,a,-length*0.64,size*0.81),
          this.offset(x,y,a,size*0.16,size*0.91)
        ];
        g.fillStyle(0x697274,0.26).fillCircle(x+4,y+7,r*1.20);
        g.fillStyle(shard?0x9c927e:0xa8a394,1).fillPoints(points,true);
        g.lineStyle(shard?2.4:1.8,0x706d64,0.92).strokePoints(points,true);
        g.lineStyle(2,0xe0cfaa,0.95);
        g.lineBetween(points[0].x,points[0].y,points[1].x,points[1].y);
        g.fillStyle(0xc9bd9e,0.94).fillTriangle(
          points[0].x,points[0].y,points[1].x,points[1].y,
          x-Math.cos(a)*r*0.2,y-Math.sin(a)*r*0.2
        );
        g.fillStyle(0xe5d7b9,0.92).fillCircle(x+r*0.1,y-r*0.45,2.1);
        continue;
      }
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
   * Flamethrower and both water cannons use ONE fluid ribbon renderer:
   * identical layered geometry, moving edges, coherent leading cap and
   * longitudinal particles. Only the color palette and width vary.
   */
  drawFlamethrower(x:number,y:number,a:number,elapsed:number,duration=740,maxReach?:number){
    this.drawStream(this.ink,x,y,a,elapsed,duration,385,maxReach??Infinity,'fire',1);
  }

  /** A sustained Water Gun or twin Hydro Pump beam, not disconnected bullets.
   * A dedicated Graphics instance per jet lets both cannons render safely.
   */
  drawWaterStream(
    ink:Phaser.GameObjects.Graphics,x:number,y:number,a:number,
    elapsed:number,duration:number,reach:number,blocked:number,
    heavy=false
  ):void{
    ink.clear();
    this.drawStream(ink,x,y,a,elapsed,duration,reach,blocked,
      'water',heavy?1.03:0.64);
  }

  private drawStream(
    g:Phaser.GameObjects.Graphics,x:number,y:number,a:number,
    elapsed:number,duration:number,range:number,blocked:number,
    element:'fire'|'water',widthScale:number
  ):void{
    const length=Math.min(beamReach(elapsed,duration,range),blocked);
    if(length<=1)return;
    const water=element==='water';
    const phase=elapsed*0.030;
    const c=Math.cos(a),s=Math.sin(a);
    const normalX=-s,normalY=c;
    const progress=Math.min(1,length/150);

    const ribbon=(halfWidth:number,color:number,alpha:number)=>{
      const left:{x:number;y:number}[]=[];
      const right:{x:number;y:number}[]=[];
      const slices=24;
      for(let i=0;i<=slices;i++){
        const t=i/slices;
        const travel=t*length;
        const entry=Phaser.Math.Clamp(travel/26,0,1);
        const end=Phaser.Math.Clamp((length-travel)/14,0.2,1);
        // The same turbulence as Charizard's Flamethrower: continuous,
        // smoothly pulsing shape instead of rigid beams and disconnected dots.
        const turbulence=(Math.sin(phase*1.2+t*27)+
          Math.sin(phase*0.72+t*46))*halfWidth*0.12*entry;
        const bend=Math.sin(phase*0.66+t*11)*halfWidth*0.12*t;
        const centerX=x+c*travel+normalX*bend;
        const centerY=y+s*travel+normalY*bend;
        const width=(5+halfWidth*entry*progress)*end;
        left.push({x:centerX+normalX*(width+turbulence),
          y:centerY+normalY*(width+turbulence)});
        right.push({x:centerX-normalX*(width-turbulence),
          y:centerY-normalY*(width-turbulence)});
      }
      g.fillStyle(color,alpha);
      g.fillPoints([...left,...right.reverse()],true);
    };

    const layers=water
      ?([[38,0x123f72,0.25],[29,0x226fa7,0.84],
         [20,0x42b4da,0.96],[10,0x95e5f8,1],[3,0xe8fcff,0.97]] as const)
      :([[38,0x9d3520,0.22],[29,0xe34b20,0.84],
         [20,0xff902f,0.95],[10,0xffdf7b,1],[3,0xfff8ce,0.95]] as const);
    for(const [width,color,alpha] of layers)
      ribbon(width*widthScale,color,alpha);

    const endX=x+c*length,endY=y+s*length;
    g.fillStyle(water?0x2a88c0:0xff8a30,0.70)
      .fillCircle(endX,endY,24*progress*widthScale);
    g.fillStyle(water?0x83d7f2:0xffd86b,0.94)
      .fillCircle(endX,endY,14*progress*widthScale);
    g.fillStyle(water?0xe9ffff:0xfff8d4,0.95)
      .fillCircle(endX,endY,6*progress*widthScale);

    // Particle movement travels along the SAME beam for both elements.
    for(let i=0;i<10;i++){
      const t=(i/10+elapsed*0.0023)%1;
      const px=x+c*length*t+normalX*Math.sin(phase+t*17)*20*progress*widthScale;
      const py=y+s*length*t+normalY*Math.sin(phase+t*17)*20*progress*widthScale;
      g.fillStyle(water?(i%2?0x9be8f6:0x2c95c8):
        (i%2?0xffd668:0xff682b),0.70)
        .fillCircle(px,py,Math.max(1.1,(2+3*Math.sin(Math.PI*t))*widthScale));
    }
  }

  /**
   * Pixel-only motion lines: quantized 3px cells, muted gym-floor colors,
   * no translucent body clones, neon cyan particles, strokes or ellipses.
   * Each frame is an intentional stepped trail of square pixel clusters.
   */
  private pixelWind(
    x:number,y:number,dir:{x:number;y:number},
    power:number,kind:'step'|'headbutt'
  ):void{
    const length=Math.hypot(dir.x,dir.y)||1;
    const fx=dir.x/length,fy=dir.y/length,nx=-fy,ny=fx;
    const g=this.scene.add.graphics().setDepth(7);
    const palette=kind==='step'
      ?[0xf2edd9,0xd0d7c6,0x8ca69a]
      :[0xf4dda6,0xc6c7ac,0x91a498];
    const strength=Math.max(0.16,Math.min(1,power));
    const pixel=(v:number)=>Math.round(v/3)*3;
    for(let lane=-1;lane<=1;lane++){
      const count=kind==='step'?4:3;
      for(let i=0;i<count;i++){
        const back=13+(i*7+Math.abs(lane)*4)*strength;
        const sideways=lane*(kind==='step'?12:9)+(i%2?2:0);
        const bx=pixel(x-fx*back+nx*sideways);
        const by=pixel(y-fy*back+ny*sideways-6);
        const size=lane===0&&i<2?6:3;
        g.fillStyle(palette[(i+Math.abs(lane))%palette.length],
          Math.max(0.36,0.94-i*0.12));
        g.fillRect(bx,by,size,3);
        if(i===0&&lane!==0)g.fillRect(bx+3,by-3,3,3);
      }
    }
    this.scene.tweens.add({targets:g,alpha:0,
      x:-fx*(kind==='step'?12:7),
      y:-fy*(kind==='step'?12:7),
      duration:kind==='step'?165:135,
      onComplete:()=>g.destroy()});
  }

  dodgeWind(x:number,y:number,dir:{x:number;y:number},power=1):void{
    this.pixelWind(x,y,dir,power,'step');
  }

  /** Tiny 3px impact sparks stay aligned to the game's pixel grid. */
  tackleImpact(x:number,y:number,dir:{x:number;y:number},power=1):void{
    const g=this.scene.add.graphics().setDepth(11);
    const length=Math.hypot(dir.x,dir.y)||1;
    const dx=dir.x/length,dy=dir.y/length,nx=-dy,ny=dx;
    const pixel=(v:number)=>Math.round(v/3)*3;
    const originX=x-dx*5,originY=y-dy*5;
    for(let i=-2;i<=2;i++){
      const reach=(i===0?17:10)*power;
      const bx=pixel(originX+dx*reach+nx*i*7);
      const by=pixel(originY+dy*reach+ny*i*7);
      g.fillStyle(i%2?0xe5d1a1:0xfbf0c9,0.96);
      g.fillRect(bx,by,6,3);
      if(i===0)g.fillRect(bx+3,by-6,3,6);
    }
    this.scene.tweens.add({targets:g,alpha:0,
      duration:140,onComplete:()=>g.destroy()});
    this.pixelWind(x-dx*13,y-dy*6,dir,0.35,'headbutt');
  }

  dashDust(x:number,y:number,dir:{x:number;y:number},power=1):void{
    this.pixelWind(x,y,dir,power,'headbutt');
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
    const water=kind==='water';
    const rock=kind==='rock'||kind==='shard';
    const length=Math.hypot(velocity.x,velocity.y)||1;
    const backwardsX=-velocity.x/length, backwardsY=-velocity.y/length;
    const count=rock?1:large?4:2;
    for(let i=0;i<count;i++) {
      const spread=(Math.random()-0.5)*(large?35:14);
      const drift=22+Math.random()*35;
      const color=rock?[0xb6ac92,0x8f8e82,0x626a68][i%3]:water
        ? [0x58bfe9,0x9de9ff,0xd8fbff][i%3]:electric
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
    const electric=element==='electric',water=element==='water';
    const color=electric?0xffe784:water?0x64c6ed:0xff8b3c;
    const circle=this.scene.add.circle(x,y,12*power,color,0.10).setStrokeStyle(2,color,0.85).setDepth(5);
    this.scene.tweens.add({
      targets:circle,alpha:0,scaleX:2.5,scaleY:2.5,duration:220+power*45,
      onComplete:()=>circle.destroy()
    });
    for(let i=0;i<Math.round(6*power);i++) {
      const a=Math.PI*2*i/Math.round(6*power)+Math.random()*0.28;
      const d=14+Math.random()*20*power;
      this.mote(x+Math.cos(a)*d,y+Math.sin(a)*d,
        electric?(i%2?0xffffff:0xffeb75):
          water?(i%2?0xd8f9ff:0x43a9d5):(i%2?0xffdd68:0xff7638),
        2+Math.random()*4,-Math.cos(a)*d*0.5,-Math.sin(a)*d*0.5,180+Math.random()*110);
    }
  }

  breath(x:number,y:number,angle:number,scale=1,element:'fire'|'water'='fire') {
    // Each tongue has independent lifetime/trajectory so it reads as flowing flame.
    for(let i=0;i<7;i++) {
      const spread=(Math.random()-0.5)*0.58;
      const a=angle+spread;
      const d=48+Math.random()*100*scale;
      const c=(element==='water'
        ?[0x257bad,0x40add8,0x83ddf2,0xe3fbff]
        :[0xff4e22,0xff8b2d,0xffcd4c,0xfff2a2])[i%4];
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

  /** Directional strike marks so the impact is not just a bright circle. */
  hitAccent(x:number,y:number,angle:number,element:Element,power=1) {
    const g=this.scene.add.graphics().setPosition(x,y).setDepth(11);
    const electric=element==='electric',water=element==='water';
    const core=electric?0xffffc8:water?0xd9faff:0xffedbb;
    const rim=electric?0xffd45a:water?0x48aeda:0xff793d;
    for(let i=-2;i<=2;i++){
      const a=angle+Math.PI+i*0.33;
      const dx=Math.cos(a),dy=Math.sin(a);
      const side=(i%2===0?1:-1)*8*power;
      g.lineStyle((i===0?4:2.5)*power,rim,0.82)
        .lineBetween(-dx*7+side*dy,-dy*7-side*dx,dx*38*power+side*dy,dy*38*power-side*dx);
      g.lineStyle(1.6*power,core,0.9)
        .lineBetween(dx*7,dy*7,dx*29*power+side*dy,dy*29*power-side*dx);
    }
    const ground=this.scene.add.ellipse(x,y+15,27*power,8*power,
      electric?0xffe077:water?0x49afe0:0xf67c45,0.38).setDepth(2);
    this.scene.tweens.add({targets:ground,alpha:0,scaleX:2.1,scaleY:1.7,duration:260,
      onComplete:()=>ground.destroy()});
    this.scene.tweens.add({targets:g,alpha:0,scaleX:1.2,scaleY:1.2,
      duration:230,ease:'Cubic.easeOut',onComplete:()=>g.destroy()});
  }

  impact(x:number,y:number,element:Element,power=1) {
    const electric=element==='electric',water=element==='water';
    const base=electric?0xffee81:water?0x67cde9:0xffa14c;
    const ring=this.scene.add.circle(x,y,12*power,base,0.14).setStrokeStyle(4,base,0.9).setDepth(8);
    this.scene.tweens.add({targets:ring,alpha:0,scaleX:3.8,scaleY:3.8,duration:340,
      onComplete:()=>ring.destroy()});
    const flash=this.scene.add.circle(x,y,10*power,
      electric?0xffffff:water?0xe1fcff:0xffe2a1,0.92).setDepth(9);
    this.scene.tweens.add({targets:flash,alpha:0,scaleX:2.4,scaleY:2.4,duration:180,
      onComplete:()=>flash.destroy()});
    const count=Math.min(30,Math.round(10*power));
    for(let i=0;i<count;i++){
      const a=i/count*Math.PI*2+Math.random()*0.22;
      const dist=(28+Math.random()*65)*power;
      const color=electric?[0xfff5a5,0x9cddff,0xffffff][i%3]:
        water?[0x348dbc,0x82d8f0,0xe4fcff][i%3]:
        [0xff6126,0xffad46,0xffe48a][i%3];
      this.mote(x,y,color,2+Math.random()*7*power,
        Math.cos(a)*dist,Math.sin(a)*dist,220+Math.random()*240);
    }
  }

  telegraph(x:number,y:number,radius:number,element:Element,duration:number) {
    const color=element==='electric'?0xffea77:element==='water'?0x69c9eb:0xff9d57;
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
