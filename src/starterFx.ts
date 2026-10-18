import Phaser from 'phaser';

type Point = Readonly<{x:number;y:number}>;
/**
 * Readable, low-cost starter combat artwork. Effects are brief pre-drawn
 * Graphics shapes, each disposed after one tween. No per-frame floor redraw,
 * physics particles or remote assets.
 */
export class StarterFx {
  constructor(private readonly scene:Phaser.Scene){}

  scratch(source:Point,target:Point,direction:Point) {
    const g=this.scene.add.graphics().setDepth(13);
    const theta=Math.atan2(direction.y,direction.x);
    const centerX=target.x,centerY=target.y-18;
    // Three independent claw trails, diagonal and tapered.
    for(let j=-1;j<=1;j++){
      const shift=j*13;
      const ca=Math.cos(theta+Math.PI/3);
      const sa=Math.sin(theta+Math.PI/3);
      const x=centerX+shift*ca,y=centerY+shift*sa;
      g.lineStyle(11,0x70352a,0.18).lineBetween(
        x-20*ca+3,y-20*sa+4,x+24*ca+3,y+24*sa+4);
      g.lineStyle(6,0xf4c477,0.93).lineBetween(
        x-20*ca,y-20*sa,x+24*ca,y+24*sa);
      g.lineStyle(2,0xffffff,0.96).lineBetween(
        x-17*ca,y-17*sa,x+20*ca,y+20*sa);
    }
    const start={x:source.x+direction.x*13,y:source.y-12};
    const impact=this.scene.add.circle(centerX,centerY,11,0xffe5a4,0.48)
      .setDepth(12);
    this.scene.tweens.add({
      targets:g,alpha:0,x:direction.x*14,y:direction.y*14,
      duration:360,ease:'Quad.easeOut',onComplete:()=>g.destroy()
    });
    this.scene.tweens.add({
      targets:impact,alpha:0,scaleX:3,scaleY:3,duration:245,
      onComplete:()=>impact.destroy()
    });
    // Attack path feels connected to the body, even on touch controls.
    const trail=this.scene.add.graphics().setDepth(9);
    trail.lineStyle(3,0xffe5ad,0.6).lineBetween(
      start.x,start.y,centerX,centerY);
    this.scene.tweens.add({targets:trail,alpha:0,duration:135,
      onComplete:()=>trail.destroy()});
  }

  growl(origin:Point,toward:Point) {
    const dx=toward.x-origin.x,dy=toward.y-origin.y;
    const length=Math.max(1,Math.hypot(dx,dy));
    const dirX=dx/length,dirY=dy/length;
    const angle=Math.atan2(dirY,dirX);
    // Crisp concentric crescents visibly propagate away from Charmander.
    for(let wave=0;wave<4;wave++){
      const g=this.scene.add.graphics().setPosition(origin.x,origin.y-9)
        .setDepth(14);
      const r=18+wave*11;
      const span=0.9;
      for(const [extra,color,opacity] of [
        [4,0xa77d41,0.36],[1,0xffeb9a,0.96]
      ] as const){
        g.lineStyle(5+extra,color,opacity);
        g.beginPath();
        g.arc(0,0,r,angle-span,angle+span,false);
        g.strokePath();
      }
      this.scene.tweens.add({
        targets:g,x:origin.x+dirX*(60+wave*21),
        y:origin.y-9+dirY*(60+wave*21),
        alpha:0,duration:490+wave*90,delay:wave*78,
        ease:'Cubic.easeOut',onComplete:()=>g.destroy()
      });
    }
    const tag=this.scene.add.text(toward.x,toward.y-72,'ATAQUE ↓',{
      fontSize:'18px',fontStyle:'bold',color:'#ffe6a4',
      stroke:'#1b2932',strokeThickness:4
    }).setOrigin(0.5).setDepth(17);
    this.scene.tweens.add({targets:tag,y:tag.y-25,alpha:0,
      duration:1030,delay:280,onComplete:()=>tag.destroy()});
  }

  ember(x:number,y:number,angle:number) {
    // Bright nozzle pulse makes the projectile release unmistakable.
    const g=this.scene.add.graphics().setPosition(x,y).setDepth(14);
    g.fillStyle(0xff5631,0.30).fillCircle(0,0,23);
    g.fillStyle(0xffa742,0.90).fillCircle(0,0,13);
    g.fillStyle(0xffebad,1).fillCircle(0,0,7);
    for(let i=0;i<5;i++){
      const a=angle+(i-2)*0.22,span=21+(i%2)*12;
      g.lineStyle(4,i%2?0xff8d3a:0xffe69a,0.93)
        .lineBetween(Math.cos(a)*7,Math.sin(a)*7,
          Math.cos(a)*span,Math.sin(a)*span);
    }
    this.scene.tweens.add({targets:g,alpha:0,
      scaleX:1.55,scaleY:1.55,duration:285,onComplete:()=>g.destroy()});
  }

  smoke(origin:Point,target:Point) {
    const dx=target.x-origin.x,dy=target.y-origin.y;
    const distance=Math.max(1,Math.hypot(dx,dy));
    const length=Math.min(distance,370);
    const dirX=dx/distance,dirY=dy/distance;
    const landing={x:origin.x+dirX*length,y:origin.y+dirY*length};
    // Visible puff trail from muzzle to enemy; smoke doesn't appear out
    // of thin air over the target without an emission cue.
    const trail=this.scene.add.graphics().setDepth(11);
    for(let j=0;j<9;j++){
      const t=j/9;
      const x=origin.x+(landing.x-origin.x)*t;
      const y=origin.y+(landing.y-origin.y)*t-10;
      const size=7+16*t;
      const shade=j%3===0?0xb6c2bd:j%2?0x515c62:0x89989a;
      trail.fillStyle(shade,0.65).fillEllipse(x,y,size*1.8,size*1.2);
      trail.fillStyle(0xd2dbd2,0.24).fillEllipse(x-4,y-5,size*0.8,size*0.65);
    }
    this.scene.tweens.add({targets:trail,alpha:0,duration:560,delay:260,
      onComplete:()=>trail.destroy()});

    // Persistent colored cloud with readable silhouette and soft movement.
    const cloud=this.scene.add.container(landing.x,landing.y-13).setDepth(12);
    const g=this.scene.add.graphics();
    g.fillStyle(0x14252d,0.36).fillEllipse(3,17,160,55);
    for(let i=0;i<15;i++){
      const phi=i*Math.PI*2/15;
      const r=38+(i%4)*7;
      const px=Math.cos(phi)*r,py=Math.sin(phi)*r*0.56;
      const width=36+(i%3)*16,height=27+(i%4)*6;
      g.fillStyle(i%3===0?0xa8b4ae:i%3===1?0x5e6b70:0x879598,0.74)
        .fillEllipse(px,py,width,height);
      g.fillStyle(0xe3ded1,0.20).fillEllipse(
        px-5,py-height*0.21,width*0.50,height*0.35);
    }
    g.fillStyle(0x6c7d81,0.78).fillEllipse(0,1,95,62);
    g.fillStyle(0xb4bdb6,0.38).fillEllipse(-17,-11,70,30);
    cloud.add(g);
    cloud.setScale(0.24).setAlpha(0.95);
    this.scene.tweens.add({
      targets:cloud,scaleX:1.05,scaleY:1.05,duration:430,
      ease:'Back.easeOut'
    });
    this.scene.tweens.add({
      targets:cloud,y:cloud.y-14,alpha:0,
      duration:1300,delay:1450,ease:'Sine.easeInOut',
      onComplete:()=>cloud.destroy()
    });
    const badge=this.scene.add.text(landing.x,landing.y-74,'VISÃO ↓',{
      fontSize:'16px',fontStyle:'bold',color:'#d9e8e1',
      stroke:'#203038',strokeThickness:4
    }).setOrigin(0.5).setDepth(17);
    this.scene.tweens.add({targets:badge,y:badge.y-21,alpha:0,
      duration:820,delay:590,onComplete:()=>badge.destroy()});
  }
}
