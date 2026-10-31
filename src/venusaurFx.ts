import Phaser from 'phaser';
import type { VfxShot } from './combatFx';
import { boomerangWingOffset, vineRoot } from './venusaurGeometry';

/**
 * Pixel-only, sprite-independent Venusaur moves. All marks are snapped to a
 * four-pixel grid; the canonical PMD body PNGs are never altered or stretched.
 * Draw once per battle frame rather than spawning hundreds of tween objects.
 */
export type SolarSide = 'player'|'enemy';
export interface SolarVisual {
  side: SolarSide;
  origin: Readonly<{x:number;y:number}>;
  direction: Readonly<{x:number;y:number}>;
  /** Manual aim cursor, not the enemy's position. */
  aimPoint?: Readonly<{x:number;y:number}>;
  startAt: number;
  releaseAt: number;
  endAt: number;
  reach: number;
  fired: boolean;
}
interface VineCue {
  /** Live actor body: the vine cannot detach when Venusaur recoils. */
  body:{x:number;y:number};
  dir:{x:number;y:number};
  startAt:number;
  length:number;
}
interface ImpactCue {
  x:number;y:number;time:number;kind:'leaf'|'vine'|'seed'|'solar'|'fizzle';
}
interface SeedCue {
  origin:{x:number;y:number};
  dir:{x:number;y:number};
  startAt:number;
  releaseAt:number;
}
const GRID=4;
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
const snap=(v:number)=>Math.round(v/GRID)*GRID;
const LEAF=0x75bf48,LEAF_LIGHT=0xc4f778,LEAF_DARK=0x267348;
const SUN=0xffffc0,SUN_YELLOW=0xffec65,SUN_GREEN=0xc4ff65;

export class VenusaurFx {
  private readonly ink:Phaser.GameObjects.Graphics;
  private readonly screen:Phaser.GameObjects.Rectangle;
  private readonly reduceMotion:boolean;
  private vines:VineCue[]=[];
  private impacts:ImpactCue[]=[];
  private seeds:SeedCue[]=[];

  constructor(private readonly scene:Phaser.Scene){
    this.ink=scene.add.graphics().setDepth(11);
    this.screen=scene.add.rectangle(480,288,960,576,0xfff9bd,1)
      .setScrollFactor(0).setDepth(21).setAlpha(0);
    this.reduceMotion=typeof window!=='undefined'&&
      typeof window.matchMedia==='function'&&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{
      this.ink.destroy();this.screen.destroy();
      this.vines=[];this.impacts=[];this.seeds=[];
    });
  }

  clear():void{
    this.vines=[];this.impacts=[];this.seeds=[];
    this.ink.clear();this.screen.setAlpha(0);
  }

  whip(body:{x:number;y:number},dir:{x:number;y:number},time:number,length=174):void{
    this.vines.push({body,dir:{...dir},startAt:time,length});
    if(this.vines.length>6)this.vines.shift();
  }

  impact(x:number,y:number,time:number,kind:ImpactCue['kind']):void{
    this.impacts.push({x,y,time,kind});
    if(this.impacts.length>12)this.impacts.shift();
  }

  /** Seed Bomb grows as a cluster of hard-shelled seeds during PMD windup. */
  primeSeed(origin:{x:number;y:number},dir:{x:number;y:number},
    time:number,windupMs:number):void{
    this.seeds.push({
      origin:{...origin},dir:{...dir},
      startAt:time,releaseAt:time+Math.max(90,windupMs)
    });
    if(this.seeds.length>6)this.seeds.shift();
  }

  /** Purely visual burst: HP draining is exclusive to Leech Seed/Giga Drain. */
  seedBurst(x:number,y:number,time:number,power=1):void{
    this.impact(x,y,time,'seed');
    if(!this.reduceMotion&&power>=0.85){
      this.scene.cameras.main.shake(105,0.0016);
    }
  }

  private tile(x:number,y:number,color:number,size=GRID,alpha=1):void{
    this.ink.fillStyle(color,alpha);
    this.ink.fillRect(snap(x),snap(y),size,size);
  }

  /** Sharp pixel diamonds with individual central veins, never green fireballs. */
  private leaf(x:number,y:number,dx:number,dy:number,scale=1):void{
    const nx=-dy,ny=dx;
    for(let i=-3;i<=3;i++){
      const half=Math.max(0,3-Math.abs(i));
      const cx=x+dx*i*GRID*scale,cy=y+dy*i*GRID*scale;
      for(let j=-half;j<=half;j++){
        const color=j===0?LEAF_LIGHT:Math.abs(j)===half?LEAF_DARK:LEAF;
        this.tile(cx+nx*j*GRID*scale,cy+ny*j*GRID*scale,color);
      }
    }
    this.tile(x-dx*17*scale,y-dy*17*scale,LEAF_DARK);
  }

  /**
   * A real V-shaped boomerang, not a diamond or flat oval.
   * Each swept wing grows from the same beak and spins while flying.
   */
  private boomerang(x:number,y:number,dx:number,dy:number,
    spin:number,scale=1):void{
    const dir={x:dx,y:dy};
    for(const wing of [-1,1] as const){
      for(let i=0;i<=9;i++){
        const t=i/9;
        const offset=boomerangWingOffset(dir,spin,wing,t,scale);
        const px=x+offset.x,py=y+offset.y;
        const radius=t>0.81?5:t<0.23?8:7;
        this.tile(px,py,LEAF_DARK,Math.max(4,Math.round(radius*scale+2)));
        this.tile(px-2,py-2,i%4===0?LEAF_LIGHT:LEAF,
          Math.max(4,Math.round((radius-2)*scale+2)));
        if(i%3===1&&t>0.3&&t<0.86)
          this.tile(px-dy*5*scale,py+dx*5*scale,
            0xb2e66c,Math.max(4,Math.round(4*scale)));
      }
      const tip=boomerangWingOffset(dir,spin,wing,1,scale);
      this.tile(x+tip.x,y+tip.y,0xe2f7ac,4);
    }
    const nose=boomerangWingOffset(dir,spin,1,0,scale);
    this.tile(x+nose.x,y+nose.y,0xe4ffac,Math.max(4,Math.round(5*scale)));
  }

  private ring(x:number,y:number,r:number,color:number,step=24):void{
    for(let i=0;i<step;i++){
      const a=i*Math.PI*2/step;
      this.tile(x+Math.cos(a)*r,y+Math.sin(a)*r,color);
    }
  }

  private drawVine(cue:VineCue,time:number):void{
    const age=time-cue.startAt;
    const growth=clamp(age/125,0,1)*clamp((400-age)/165,0,1);
    const length=cue.length*growth;
    if(length<1)return;
    const root=vineRoot(cue.body);
    const {x:dx,y:dy}=cue.dir,nx=-dy,ny=dx;
    const sweep=(t:number,side:-1|1):number=>
      side*(7*t+14*t*t)+Math.sin(t*10+age*0.019+side)*9*t;
    // The joint begins inside the leaf canopy; both arms share this base.
    this.tile(root.x-3,root.y-3,LEAF_DARK,10);
    this.tile(root.x,root.y,LEAF_LIGHT,5);
    for(const side of [-1,1] as const){
      for(let i=0;i<=28;i++){
        const t=i/28;
        const sideways=sweep(t,side);
        const px=root.x+dx*length*t+nx*sideways;
        const py=root.y+dy*length*t+ny*sideways;
        // Keep the original curved twin-vine silhouette; trim its width
        // slightly so it reads as a flexible whip rather than a thick rope.
        this.tile(px,py,LEAF_DARK,t<0.16?9:7);
        this.tile(px-2,py-2,i%4===0?LEAF_LIGHT:LEAF,4);
        if(i>4&&i<25&&i%5===0){
          const leafX=px+nx*(side*10),leafY=py+ny*(side*10);
          this.tile(leafX,leafY,LEAF,7);
          this.tile(leafX+dx*4,leafY+dy*4,LEAF_LIGHT,4);
        }
      }
      const bend=sweep(1,side);
      const tipX=root.x+dx*length+nx*bend;
      const tipY=root.y+dy*length+ny*bend;
      this.leaf(tipX,tipY,dx,dy,0.60);
    }
  }

  /** Eight-bit hard seed shell with a pointed top and leaf cap. */
  private seedKernel(x:number,y:number,dx:number,dy:number,scale=1):void{
    const nx=-dy,ny=dx;
    for(let u=-3;u<=3;u++){
      for(let v=-3;v<=3;v++){
        const border=Math.abs(u)*0.70+Math.abs(v)*0.82;
        if(border>4.3)continue;
        const tone=border>3.1?0x32563a:
          v<=-1&&u<=0?0xbadd78:
          u>=2?0x5c783d:
          (u+v)%3===0?0xc0a971:0x9b8958;
        this.tile(x+dx*u*GRID*scale+nx*v*GRID*scale,
          y+dy*u*GRID*scale+ny*v*GRID*scale,tone,
          Math.max(4,Math.round(GRID*scale)));
      }
    }
    for(let i=-1;i<=1;i++){
      this.tile(x+dx*15*scale+nx*i*5*scale,
        y+dy*15*scale+ny*i*5*scale,i===0?LEAF_LIGHT:LEAF,5);
    }
  }

  private drawSeedPrime(cue:SeedCue,time:number):void{
    const p=clamp((time-cue.startAt)/
      Math.max(1,cue.releaseAt-cue.startAt),0,1);
    const elapsed=time-cue.releaseAt;
    const {x,y}=cue.origin;
    const dx=cue.dir.x,dy=cue.dir.y,nx=-dy,ny=dx;
    if(elapsed<0){
      // Seeds assemble and orbit in pixel-snapped arcs around the flower.
      for(let i=0;i<15;i++){
        const a=time*0.006+i*Math.PI*2/15;
        const orbit=29*(1-p)+9;
        const px=x+dx*12+Math.cos(a)*orbit;
        const py=y+dy*12+Math.sin(a)*orbit*0.72;
        this.tile(px,py,i%3===0?0xf1e7a6:i%2?LEAF_LIGHT:LEAF,
          i%5===0?8:4,0.92);
      }
      if(p>0.38)this.seedKernel(x+dx*13,y+dy*13,dx,dy,
        0.45+0.42*p);
      this.ring(x+dx*12,y+dy*12,18+12*p,LEAF_LIGHT,16);
      return;
    }
    if(elapsed>170)return;
    // The shell snaps forward and releases a crisp fan of loose leaves.
    const release=1-elapsed/170;
    for(let i=-5;i<=5;i++){
      const spread=i*9*release;
      const front=15+70*(1-release);
      const px=x+dx*front+nx*spread;
      const py=y+dy*front+ny*spread;
      this.tile(px,py,i%3===0?0xfff2b2:i%2?LEAF_LIGHT:LEAF,
        i%2===0?8:4,Math.max(0.15,release));
    }
    this.ring(x+dx*20,y+dy*20,16+24*(1-release),
      release>0.4?0xf7e7a1:LEAF_LIGHT,16);
  }

  private drawShot(shot:VfxShot,time:number):void{
    if(shot.kind!=='leaf'&&shot.kind!=='seed')return;
    const {x,y}=shot.body;
    const length=Math.hypot(shot.velocity.x,shot.velocity.y)||1;
    const dx=shot.velocity.x/length,dy=shot.velocity.y/length;
    const nx=-dy,ny=dx;
    if(shot.kind==='leaf'){
      // Three rotating boomerang blades share one real hitbox.
      const spin=time*0.022+x*0.006+y*0.003;
      const sway=Math.sin(spin*1.4)*6;
      this.boomerang(x,y,dx,dy,spin,1.0);
      this.boomerang(x-dx*21+nx*(11+sway),
        y-dy*21+ny*(11+sway),dx,dy,-spin*0.86+1.3,0.68);
      this.boomerang(x-dx*25-nx*(11-sway),
        y-dy*25-ny*(11-sway),dx,dy,spin*1.06+2.4,0.64);
      for(let i=0;i<5;i++){
        const d=30+i*12;
        const offset=(i%2===0?1:-1)*(6+i*2);
        this.tile(x-dx*d+nx*offset,
          y-dy*d+ny*offset,
          i%3===0?0xecf9c0:i%2===0?LEAF_LIGHT:LEAF,
          i%2===0?5:4,Math.max(0.25,0.88-i*0.15));
      }
      return;
    }
    // Three seeds whirl around a single legitimate projectile hitbox.
    // No bonus damage or hidden homing from the decorative side pods.
    const spin=Math.sin(time*0.021+x*0.02);
    this.seedKernel(x,y,dx,dy,1.05);
    this.seedKernel(x-dx*17+nx*(17+spin*6),
      y-dy*17+ny*(17+spin*6),dx,dy,0.65);
    this.seedKernel(x-dx*23-nx*(16-spin*5),
      y-dy*23-ny*(16-spin*5),dx,dy,0.57);
    for(let i=0;i<6;i++){
      const px=x-dx*(18+i*12)+nx*(i%2?8:-8);
      const py=y-dy*(18+i*12)+ny*(i%2?8:-8);
      this.tile(px,py,i%3===0?0xf4eab7:i%2?LEAF_LIGHT:LEAF,
        i%3===0?6:4,Math.max(0.25,0.95-i*0.12));
      if(i%2===0)this.tile(px-nx*8,py-ny*8,LEAF_DARK,4,0.75);
    }
  }

  /** Multi-phase shell crack, dust bloom and ballistic plant fragments. */
  private drawSeedImpact(cue:ImpactCue,time:number):void{
    const p=clamp((time-cue.time)/520,0,1);
    const x=cue.x,y=cue.y;
    const burst=clamp((p-0.06)/0.38,0,1);
    // Dense opening sparkle, then a two-layer polygonal blast wave.
    if(p<0.21){
      const t=1-p/0.21;
      this.ring(x,y,11+26*(1-t),t>0.5?0xfff1bb:LEAF_LIGHT,18);
      for(let i=0;i<14;i++){
        const a=i*Math.PI*2/14;
        const reach=(12+33*(1-t))*(i%2===0?1:0.72);
        this.tile(x+Math.cos(a)*reach,y+Math.sin(a)*reach,
          i%2?0xd9e99b:0xfff5be,i%3===0?8:5,t);
      }
      for(let q=-2;q<=2;q++)
        this.tile(x+q*8,y+(q%2)*4,
          q%2===0?0xfdf2b5:LEAF_LIGHT,8,t);
    }
    this.ring(x,y,17+49*burst,
      p<0.27?0xf4d48d:p<0.57?LEAF_LIGHT:LEAF,24);
    if(p<0.68)this.ring(x,y,9+29*p/0.68,0x8a743d,15);
    // Deterministic fragments and shell chunks fly out, then fall.
    // Gravity deliberately offsets falling debris toward screen-space Y.
    for(let i=0;i<36;i++){
      const angle=i*2.39996+cue.time*0.0008;
      const speed=33+(i%7)*9;
      const distance=speed*p*2.05;
      const drop=(p*p)*((i%4)*13+29);
      const px=x+Math.cos(angle)*distance;
      const py=y+Math.sin(angle)*distance*0.72+drop;
      const shell=i%3===0;
      const color=shell?[0x554b30,0xa48b50,0xe0bc75][Math.floor(i/3)%3]:
        [LEAF_DARK,LEAF,LEAF_LIGHT,0xeef8af][i%4];
      const alpha=clamp((1-p)*1.8,0,1);
      this.tile(px,py,color,shell?8:i%5===0?7:4,alpha);
      if(i%9===0&&p<0.78){
        const dx=Math.cos(angle),dy=Math.sin(angle);
        this.leaf(px+dx*7,py+dy*7,dx,dy,0.42);
      }
      if(shell&&i%6===0&&p<0.5)
        this.tile(px-8,py-5,0xf4e5a1,4,alpha);
    }
    // Ground contact: small angular dust blocks, not glowing spheres.
    if(p>0.11&&p<0.86){
      const dust=clamp((0.86-p)/0.75,0,1);
      for(let i=-6;i<=6;i++){
        const spread=i*(7+p*5);
        const py=y+19+Math.abs(i%3)*4-(1-p)*7;
        this.tile(x+spread,py,i%2===0?0xb9ad80:0x6c8060,
          i%3===0?9:5,dust*0.85);
      }
    }
  }

  private drawImpact(cue:ImpactCue,time:number):void{
    if(cue.kind==='seed'){
      this.drawSeedImpact(cue,time);
      return;
    }
    // 'seed' has already been handled above, so it cannot enter these branches.
    const age=time-cue.time;
    const big=cue.kind==='solar';
    const life=big?580:310;
    const p=clamp(age/life,0,1);
    const main=big?SUN_YELLOW:cue.kind==='fizzle'?0xa9dc85:LEAF_LIGHT;
    this.ring(cue.x,cue.y,13+(big?90:30)*p,
      p>0.65?LEAF:main,big?36:20);
    if(big)this.ring(cue.x,cue.y,25+65*p,SUN_GREEN,30);
    for(let i=0;i<(big?36:13);i++){
      const a=i*2.39996+cue.time*0.001;
      const radius=(12+(i%6)*6)*(0.5+p*(big?3:1.6));
      const color=big?[SUN,SUN_GREEN,LEAF_LIGHT][i%3]:
        [LEAF,LEAF_LIGHT,0xf1ffc6][i%3];
      this.tile(cue.x+Math.cos(a)*radius,cue.y+Math.sin(a)*radius*0.79,
        color,i%3===0?8:4,1-p*0.35);
    }
  }

  /**
   * Pixel dashed guide and reticle. It shows the exact hitbox ray and is only
   * visible to the local player while charging; nothing auto-aims at enemies.
   */
  private drawSolarGuide(cue:SolarVisual,time:number,p:number):void{
    if(!cue.aimPoint||cue.side!=='player')return;
    const {x,y}=cue.origin;
    const {x:dx,y:dy}=cue.direction;
    const reach=cue.reach;
    if(reach<=20)return; // blocked at muzzle; no false target marker
    const intensity=0.42+p*0.47;
    const shift=Math.floor(time/110);
    for(let d=34;d<reach;d+=18){
      if((Math.floor(d/18)+shift)%4===0)continue;
      this.tile(x+dx*d,y+dy*d,
        (Math.floor(d/18)%3===0)?SUN_YELLOW:LEAF_LIGHT,4,intensity);
    }
    // Cursor is projected to the actual finite ray: no misleading crosshair
    // past a wall, or target marker disconnected from the hitbox.
    const point=cue.aimPoint;
    const projection=(point.x-x)*dx+(point.y-y)*dy;
    const d=clamp(projection,16,reach);
    const cx=x+dx*d,cy=y+dy*d;
    const size=13+2*Math.sin(time*0.011);
    for(const s of [-1,1]){
      this.tile(cx+s*size,cy,SUN_GREEN,5,intensity);
      this.tile(cx,cy+s*size,SUN_GREEN,5,intensity);
      this.tile(cx+s*size*0.68,cy+s*size*0.68,LEAF_LIGHT,4,intensity);
    }
    this.tile(cx,cy,SUN_YELLOW,4,0.72);
  }

  private drawSolarCharge(cue:SolarVisual,time:number):number{
    const elapsed=clamp(time-cue.startAt,0,cue.releaseAt-cue.startAt);
    const duration=Math.max(1,cue.releaseAt-cue.startAt);
    const p=elapsed/duration;
    const x=cue.origin.x,y=cue.origin.y;
    const core=SUN_GREEN;
    this.drawSolarGuide(cue,time,p);
    this.ring(x,y,22+34*p,p<0.65?LEAF_LIGHT:SUN_YELLOW,28);
    if(p>0.35)this.ring(x,y,46+19*p,LEAF,32);
    if(p>0.72)this.ring(x,y,15+13*p,SUN,20);
    // Compact, pixel-snapped charging meter: shows exactly when the beam is ready.
    for(let i=0;i<22;i++){
      this.tile(x-44+i*4,y-77,i/22<=p?SUN_YELLOW:0x31553a,4);
    }
    // Energy motes collapse into the flower during the preparation phase.
    const count=this.reduceMotion?13:28;
    for(let i=0;i<count;i++){
      const a=i*2.39996+time*0.0017*(i%2?1:-1);
      const distance=(125-i%5*11)*(1-p)+15+p*16;
      const px=x+Math.cos(a)*distance;
      const py=y+Math.sin(a)*distance*0.70;
      this.tile(px,py,i%4===0?SUN_YELLOW:i%2?LEAF_LIGHT:core,i%5===0?8:4);
      if(p>0.82&&i%4===0)this.tile(px+4,py-4,SUN);
    }
    for(let i=-2;i<=2;i++){
      this.tile(x+i*4,y,SUN_GREEN,8);
      if(p>0.65)this.tile(x+i*4,y-4,SUN,4);
    }
    if(this.reduceMotion)return 0;
    // Two restrained brightness pulses, with a final pre-release glint.
    const bright=p>0.65?Math.max(0,Math.sin((p-0.65)*Math.PI*9))*0.075:0;
    return 0.016+p*0.055+bright;
  }

  private drawSolarBeam(cue:SolarVisual,time:number):number{
    const elapsed=time-cue.releaseAt,duration=cue.endAt-cue.releaseAt;
    if(elapsed<0||elapsed>duration)return 0;
    const growth=clamp(elapsed/145,0,1)*clamp((duration-elapsed)/135,0,1);
    const reach=cue.reach*growth;
    if(reach<=0)return 0;
    const {x:dx,y:dy}=cue.direction,nx=-dy,ny=dx;
    const {x,y}=cue.origin;
    const ripple=time*0.024;
    // Solid stepped outer corona + green stripe + brilliant yellow-white core.
    // No soft canvas blur, gradients or image scaling.
    for(let d=0;d<=reach;d+=9){
      const wobble=Math.sin(d*0.043+ripple)*3;
      for(let band=-3;band<=3;band++){
        const width=band*6+wobble;
        const px=x+dx*d+nx*width;
        const py=y+dy*d+ny*width;
        const color=Math.abs(band)===3?LEAF:
          Math.abs(band)===2?SUN_GREEN:
          Math.abs(band)===1?SUN_YELLOW:SUN;
        this.tile(px,py,color,band===0?12:9);
      }
      if(Math.round(d)%36===0){
        this.tile(x+dx*d+nx*27,y+dy*d+ny*27,LEAF_LIGHT,5);
        this.tile(x+dx*d-nx*27,y+dy*d-ny*27,LEAF_LIGHT,5);
      }
    }
    for(let d=105;d<reach;d+=120){
      const cx=x+dx*d,cy=y+dy*d;
      for(let i=0;i<16;i++){
        const a=i*Math.PI/8;
        const radial=23+Math.sin(ripple+d*0.03)*4;
        this.tile(cx+Math.cos(a)*radial,cy+Math.sin(a)*radial,
          i%2?SUN_YELLOW:SUN_GREEN,6);
      }
    }
    const tx=x+dx*reach,ty=y+dy*reach;
    for(let i=0;i<22;i++){
      const a=i*Math.PI*2/22+ripple*0.13;
      this.tile(tx+Math.cos(a)*25,ty+Math.sin(a)*25,
        i%3===0?SUN:LEAF_LIGHT,6);
    }
    if(this.reduceMotion)return 0;
    const releaseFlash=elapsed<125?0.25*(1-elapsed/125):0;
    const echo=elapsed>185&&elapsed<260?0.085*(1-(elapsed-185)/75):0;
    return releaseFlash+echo;
  }

  render(time:number,channels:ReadonlyArray<SolarVisual>,
    shots:ReadonlyArray<VfxShot>):void{
    this.ink.clear();
    this.vines=this.vines.filter(c=>time-c.startAt<400);
    this.seeds=this.seeds.filter(c=>time-c.startAt<800&&time-c.releaseAt<170);
    this.impacts=this.impacts.filter(c=>time-c.time<
      (c.kind==='solar'?580:c.kind==='seed'?520:310));
    for(const cue of this.seeds)this.drawSeedPrime(cue,time);
    for(const shot of shots)this.drawShot(shot,time);
    for(const vine of this.vines)this.drawVine(vine,time);
    for(const impact of this.impacts)this.drawImpact(impact,time);
    let flash=0;
    for(const impact of this.impacts){
      if(impact.kind!=='seed')continue;
      const elapsed=time-impact.time;
      if(elapsed>=0&&elapsed<125&&!this.reduceMotion)
        flash=Math.max(flash,0.11*(1-elapsed/125));
    }
    for(const cue of channels){
      flash=Math.max(flash,cue.fired?
        this.drawSolarBeam(cue,time):this.drawSolarCharge(cue,time));
    }
    this.screen.setAlpha(this.reduceMotion?0:clamp(flash,0,0.28));
  }
}
