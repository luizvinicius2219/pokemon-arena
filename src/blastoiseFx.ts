import Phaser from 'phaser';
import { CombatFx } from './combatFx';
import { blastoiseCannonPoint } from './waterJet';

type Point=Readonly<{x:number;y:number}>;
type Side='player'|'enemy';

/**
 * Effects in world coordinates for Blastoise only. PMD body frames remain
 * untouched; water jets, cannon charge and shielding are separate VFX.
 * Transient graphics are destroyed after their short tweens.
 */
export class BlastoiseFx {
  private readonly shieldInk:Phaser.GameObjects.Graphics;

  constructor(private readonly scene:Phaser.Scene,private readonly fx:CombatFx){
    this.shieldInk=scene.add.graphics().setDepth(4);
  }

  cannon(x:number,y:number,dir:Point,barrel:-1|1):Point{
    return blastoiseCannonPoint(x,y,dir,barrel);
  }

  /** Pixel-only outlet spray: no round lasers or smooth halos. */
  muzzle(point:Point,dir:Point,heavy=false):void{
    const g=this.scene.add.graphics().setDepth(12);
    const n=Math.hypot(dir.x,dir.y)||1,dx=dir.x/n,dy=dir.y/n;
    const nx=-dy,ny=dx;
    const snap=(v:number)=>Math.round(v/3)*3;
    for(let i=0;i<(heavy?9:6);i++){
      const forward=7+(i%4)*6,side=(i%3-1)*(heavy?9:6);
      g.fillStyle([0x1b6497,0x49aed8,0xcaf9ff][i%3],1);
      g.fillRect(snap(point.x+dx*forward+nx*side),
        snap(point.y+dy*forward+ny*side),i%2?6:3,i%3?6:3);
    }
    this.scene.tweens.add({targets:g,alpha:0,duration:150,
      onComplete:()=>g.destroy()});
  }

  /** Both cannons gather water before Hydro Pump releases. */
  charge(x:number,y:number,dir:Point,duration:number):void{
    const g=this.scene.add.graphics().setDepth(11);
    for(const side of [-1,1] as const){
      const p=this.cannon(x,y,dir,side);
      g.lineStyle(3,0xa7f5ff,0.9).strokeCircle(p.x,p.y,21);
      g.lineStyle(2,0x469cd1,0.75).strokeCircle(p.x,p.y,29);
      g.fillStyle(0x9bedff,0.77).fillCircle(p.x,p.y,7);
      for(let i=0;i<7;i++){
        const a=i*Math.PI*2/7;
        const sx=p.x+Math.cos(a)*34,sy=p.y+Math.sin(a)*34;
        g.fillStyle(i%2?0x68d3f3:0xd6faff,0.88)
          .fillRect(Math.round(sx),Math.round(sy),4,4);
      }
    }
    this.scene.tweens.add({targets:g,alpha:0,scaleX:1.10,scaleY:1.10,
      duration:Math.max(180,duration),onComplete:()=>g.destroy()});
  }

  /** Shell shine on cast, followed by an animated guard while the buff lasts. */
  guardCast(point:Point):void{
    const g=this.scene.add.graphics().setDepth(12);
    for(const radius of [34,52]){
      g.lineStyle(radius===34?5:3,0x8ce8ff,0.90).strokeEllipse(point.x,point.y-20,radius*2,radius*1.7);
    }
    for(let i=0;i<8;i++){
      const a=i*Math.PI/4;
      g.fillStyle(i%2?0x63cde8:0xe8fcff,0.90)
        .fillRect(point.x+Math.cos(a)*37-3,point.y-20+Math.sin(a)*31-3,6,6);
    }
    this.scene.tweens.add({targets:g,alpha:0,scaleX:1.14,scaleY:1.14,
      duration:600,onComplete:()=>g.destroy()});
  }

  renderGuards(time:number,ends:ReadonlyArray<{side:Side;x:number;y:number;until:number}>):void{
    const g=this.shieldInk;
    g.clear();
    for(const guard of ends){
      const left=guard.until-time;
      if(left<=0)continue;
      const fade=Phaser.Math.Clamp(left/550,0,1);
      const pulse=1+Math.sin(time*0.010)*0.035;
      g.lineStyle(4,0x74d9f5,0.64*fade)
        .strokeEllipse(guard.x,guard.y-26,102*pulse,88*pulse);
      g.lineStyle(2,0xe4ffff,0.66*fade)
        .strokeEllipse(guard.x,guard.y-26,112*pulse,96*pulse);
      for(let i=0;i<5;i++){
        const a=time*0.0025+i*Math.PI*2/5;
        g.fillStyle(i%2?0x86e8f7:0xcffaff,0.70*fade)
          .fillRect(Math.round(guard.x+Math.cos(a)*53)-3,
            Math.round(guard.y-26+Math.sin(a)*45)-3,6,6);
      }
    }
  }

  /** Uses exactly the Flamethrower's layered geometry, with a water palette. */
  drawJet(g:Phaser.GameObjects.Graphics,origin:Point,dir:Point,
    elapsed:number,duration:number,reach:number,blocked:number,heavy=false):void{
    this.fx.drawWaterStream(g,origin.x,origin.y,Math.atan2(dir.y,dir.x),
      elapsed,duration,reach,blocked,heavy);
  }

  /** A restrained, pixel-grid water impact with square spray and foam. */
  splash(x:number,y:number,power=1):void{
    const g=this.scene.add.graphics().setDepth(12);
    const snap=(v:number)=>Math.round(v/3)*3;
    const strength=Math.max(0.45,Math.min(1.8,power));
    const count=Math.round(7+strength*5);
    for(let i=0;i<count;i++){
      const a=Math.PI*2*i/count;
      const spread=(12+(i%3)*7)*strength;
      const px=snap(x+Math.cos(a)*spread);
      const py=snap(y+Math.sin(a)*spread*0.73);
      g.fillStyle([0x1c699a,0x46b7dc,0x93e5fa,0xe4fcff][i%4],1);
      const size=i%3===0?6:3;
      g.fillRect(px,py,size,size);
    }
    g.fillStyle(0xdafaff,1).fillRect(snap(x)-6,snap(y)-6,12,12);
    this.scene.tweens.add({targets:g,alpha:0,scaleX:1.18,scaleY:1.18,
      duration:195,onComplete:()=>g.destroy()});
  }
}
