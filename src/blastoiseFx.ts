import Phaser from 'phaser';

type Point=Readonly<{x:number;y:number}>;
type Side='player'|'enemy';

/**
 * Effects in world coordinates for Blastoise only. PMD body frames remain
 * untouched; water jets, cannon charge and shielding are separate VFX.
 * Transient graphics are destroyed after their short tweens.
 */
export class BlastoiseFx {
  private readonly shieldInk:Phaser.GameObjects.Graphics;

  constructor(private readonly scene:Phaser.Scene){
    this.shieldInk=scene.add.graphics().setDepth(4);
  }

  cannon(x:number,y:number,dir:Point,barrel:-1|1):Point{
    const length=Math.hypot(dir.x,dir.y)||1;
    const dx=dir.x/length,dy=dir.y/length;
    return {
      x:x+dx*34-dy*barrel*21,
      y:y-34+dy*19+dx*barrel*16
    };
  }

  /** A short muzzle flare timed to the release frame of Shoot-Anim.png. */
  muzzle(point:Point,dir:Point,heavy=false):void{
    const g=this.scene.add.graphics().setDepth(12);
    const len=heavy?53:29, spread=heavy?16:9;
    const ox=point.x,oy=point.y;
    const nx=-dir.y,ny=dir.x;
    g.fillStyle(0x1c82bc,0.30).fillCircle(ox,oy,heavy?25:15);
    g.fillStyle(0x67d9f5,0.93).fillCircle(ox,oy,heavy?13:8);
    g.fillStyle(0xf1ffff,0.97).fillCircle(ox,oy,heavy?6:4);
    for(let i=-2;i<=2;i++){
      const reach=len-5*Math.abs(i);
      const wx=ox+dir.x*reach+nx*i*spread*0.45;
      const wy=oy+dir.y*reach+ny*i*spread*0.45;
      g.lineStyle(i===0?5:3,i%2?0x52c7ef:0xb9f7ff,0.86)
        .lineBetween(ox+nx*i*3,oy+ny*i*3,wx,wy);
      g.fillStyle(i%2?0x67d6ff:0xe8fcff,0.9).fillRect(wx-3,wy-3,6,6);
    }
    this.scene.tweens.add({targets:g,alpha:0,duration:heavy?280:180,
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

  /** Crisp cyan droplets, white foam, ground ring and a brief expanding shock. */
  splash(x:number,y:number,power=1):void{
    const amount=Math.min(17,Math.max(6,Math.round(9*power)));
    const g=this.scene.add.graphics().setDepth(12);
    const radius=20*power;
    g.fillStyle(0x1c79b5,0.19).fillEllipse(x,y+11,radius*2.7,radius*0.8);
    g.lineStyle(Math.max(2,3*power),0x50c5e9,0.86)
      .strokeEllipse(x,y,radius*2.2,radius*1.45);
    g.lineStyle(Math.max(1,2*power),0xd7fbff,0.85)
      .strokeEllipse(x,y,radius*1.55,radius*1.0);
    g.fillStyle(0xe8ffff,0.77).fillCircle(x,y,Math.max(5,8*power));
    for(let i=0;i<amount;i++){
      const a=i*Math.PI*2/amount+0.12;
      const distance=(16+(i%4)*6)*power;
      const px=x+Math.cos(a)*distance,py=y+Math.sin(a)*distance*0.72;
      g.fillStyle(i%3===0?0xffffff:i%2?0x4eb9eb:0x8aeaff,0.92)
        .fillRect(Math.round(px)-3,Math.round(py)-3,i%3===0?4:6,i%3===0?4:6);
    }
    this.scene.tweens.add({targets:g,alpha:0,scaleX:1.52,scaleY:1.35,
      duration:Math.round(230+70*power),onComplete:()=>g.destroy()});
  }
}
