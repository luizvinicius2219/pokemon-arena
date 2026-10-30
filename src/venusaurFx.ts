import Phaser from 'phaser';
import type { VfxShot } from './combatFx';

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
  startAt: number;
  releaseAt: number;
  endAt: number;
  reach: number;
  fired: boolean;
}
interface VineCue {
  origin:{x:number;y:number};
  dir:{x:number;y:number};
  startAt:number;
  length:number;
}
interface ImpactCue {
  x:number;y:number;time:number;kind:'leaf'|'vine'|'seed'|'solar'|'fizzle';
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

  constructor(private readonly scene:Phaser.Scene){
    this.ink=scene.add.graphics().setDepth(11);
    this.screen=scene.add.rectangle(480,288,960,576,0xfff9bd,1)
      .setScrollFactor(0).setDepth(21).setAlpha(0);
    this.reduceMotion=typeof window!=='undefined'&&
      typeof window.matchMedia==='function'&&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{
      this.ink.destroy();this.screen.destroy();this.vines=[];this.impacts=[];
    });
  }

  clear():void{
    this.vines=[];this.impacts=[];
    this.ink.clear();this.screen.setAlpha(0);
  }

  whip(origin:{x:number;y:number},dir:{x:number;y:number},time:number,length=174):void{
    this.vines.push({origin:{...origin},dir:{...dir},startAt:time,length});
    if(this.vines.length>6)this.vines.shift();
  }

  impact(x:number,y:number,time:number,kind:ImpactCue['kind']):void{
    this.impacts.push({x,y,time,kind});
    if(this.impacts.length>12)this.impacts.shift();
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
    const {x:dx,y:dy}=cue.dir,nx=-dy,ny=dx;
    for(const side of [-1,1]){
      for(let i=0;i<=27;i++){
        const t=i/27;
        const sideways=side*(11+10*t)+Math.sin(t*10+age*0.019+side)*10*t;
        const px=cue.origin.x+dx*length*t+nx*sideways;
        const py=cue.origin.y+dy*length*t+ny*sideways;
        this.tile(px,py,LEAF_DARK,8);
        this.tile(px-2,py-2,i%4===0?LEAF_LIGHT:LEAF,4);
        if(i>4&&i<26&&i%5===0){
          this.tile(px+nx*(side*10),py+ny*(side*10),LEAF_LIGHT,6);
        }
      }
      const tipX=cue.origin.x+dx*length+nx*side*21;
      const tipY=cue.origin.y+dy*length+ny*side*21;
      this.leaf(tipX,tipY,dx,dy,0.65);
    }
  }

  private drawShot(shot:VfxShot,time:number):void{
    if(shot.kind!=='leaf'&&shot.kind!=='seed')return;
    const {x,y}=shot.body;
    const length=Math.hypot(shot.velocity.x,shot.velocity.y)||1;
    const dx=shot.velocity.x/length,dy=shot.velocity.y/length;
    const nx=-dy,ny=dx;
    if(shot.kind==='leaf'){
      const sway=Math.sin(time*0.018+x*0.017)*7;
      this.leaf(x,y,dx,dy,0.9);
      this.leaf(x-dx*14+nx*(8+sway),y-dy*14+ny*(8+sway),dx,dy,0.58);
      this.leaf(x-dx*23-nx*(9-sway),y-dy*23-ny*(9-sway),dx,dy,0.54);
      for(let i=0;i<3;i++)
        this.tile(x-dx*(28+i*12)+nx*(i%2?6:-6),
          y-dy*(28+i*12)+ny*(i%2?6:-6),i%2?LEAF_LIGHT:LEAF,4,0.8);
      return;
    }
    // Seed Bomb: olive-brown shell with angular green highlights and leaf trail.
    for(let row=-2;row<=2;row++){
      const half=row===-2||row===2?1:2;
      for(let col=-half;col<=half;col++){
        const c=row===-2||col===-half?0x4c6f35:
          row===0&&col===0?0xf5eb8d:col>0?0xb9a065:0x8b774b;
        this.tile(x+col*5,y+row*5,c,5);
      }
    }
    this.tile(x-7,y-9,LEAF_LIGHT,6);
    for(let i=0;i<3;i++)
      this.tile(x-dx*(19+i*13)+nx*(i%2?8:-8),
        y-dy*(19+i*13)+ny*(i%2?8:-8),i%2?LEAF:LEAF_LIGHT,5);
  }

  private drawImpact(cue:ImpactCue,time:number):void{
    const age=time-cue.time;
    const life=cue.kind==='solar'?580:cue.kind==='seed'?440:310;
    const p=clamp(age/life,0,1);
    const big=cue.kind==='solar',seed=cue.kind==='seed';
    const main=big?SUN_YELLOW:seed?0xd6c076:cue.kind==='fizzle'?0xa9dc85:LEAF_LIGHT;
    this.ring(cue.x,cue.y,(13+(big?90:seed?52:30)*p),
      p>0.65?LEAF:main,big?36:20);
    if(big)this.ring(cue.x,cue.y,25+65*p,SUN_GREEN,30);
    for(let i=0;i<(big?36:seed?24:13);i++){
      const a=i*2.39996+cue.time*0.001;
      const r=(12+(i%6)*6)*(0.5+p*(big?3:seed?2.3:1.6));
      const color=big?[SUN,SUN_GREEN,LEAF_LIGHT][i%3]:
        seed?[0x806743,0xb69952,LEAF,LEAF_LIGHT][i%4]:
        [LEAF,LEAF_LIGHT,0xf1ffc6][i%3];
      this.tile(cue.x+Math.cos(a)*r,cue.y+Math.sin(a)*r*0.79,color,i%3===0?8:4,1-p*0.35);
    }
  }

  private drawSolarCharge(cue:SolarVisual,time:number):number{
    const elapsed=clamp(time-cue.startAt,0,cue.releaseAt-cue.startAt);
    const duration=Math.max(1,cue.releaseAt-cue.startAt);
    const p=elapsed/duration;
    const x=cue.origin.x,y=cue.origin.y;
    const core=SUN_GREEN;
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
    this.impacts=this.impacts.filter(c=>time-c.time<
      (c.kind==='solar'?580:c.kind==='seed'?440:310));
    for(const shot of shots)this.drawShot(shot,time);
    for(const vine of this.vines)this.drawVine(vine,time);
    for(const impact of this.impacts)this.drawImpact(impact,time);
    let flash=0;
    for(const cue of channels){
      flash=Math.max(flash,cue.fired?
        this.drawSolarBeam(cue,time):this.drawSolarCharge(cue,time));
    }
    this.screen.setAlpha(this.reduceMotion?0:clamp(flash,0,0.28));
  }
}
