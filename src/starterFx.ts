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
  /** Two living thorny vines arc out from Bulbasaur and snap toward the foe. */
  vines(source:Point,target:Point){
    const g=this.scene.add.graphics().setDepth(13);
    const dx=target.x-source.x,dy=target.y-source.y;
    const nx=-dy/Math.max(1,Math.hypot(dx,dy));
    const ny=dx/Math.max(1,Math.hypot(dx,dy));
    for(const side of [-1,1]){
      const points:Point[]=[];
      for(let i=0;i<=16;i++){
        const t=i/16;
        const wiggle=Math.sin(t*Math.PI*3+side*0.6)*(9+side*2)
          +(1-t)*side*9;
        points.push({
          x:source.x+dx*t+nx*wiggle,
          y:source.y+dy*t+ny*wiggle
        });
      }
      g.lineStyle(13,0x225942,0.62).strokePoints(points);
      g.lineStyle(8,0x3caa59,1).strokePoints(points);
      g.lineStyle(3,0xa8df78,1).strokePoints(points);
      for(let j=2;j<16;j+=3){
        const p=points[j];
        const theta=Math.atan2(dy,dx)+(side>0?1:-1)*1;
        g.fillStyle(0x9edd77,0.93).fillTriangle(
          p.x,p.y,p.x+Math.cos(theta)*22,p.y+Math.sin(theta)*22,
          p.x+Math.cos(theta-0.7)*10,p.y+Math.sin(theta-0.7)*10
        );
      }
    }
    this.scene.tweens.add({
      targets:g,alpha:0,duration:380,delay:120,
      onComplete:()=>g.destroy()
    });
  }

  /** Water Gun's bright launch, bubbles and directional blue splash. */
  water(source:Point,dir:Point){
    const g=this.scene.add.graphics().setPosition(source.x,source.y)
      .setDepth(13);
    const a=Math.atan2(dir.y,dir.x);
    const nx=-dir.y,ny=dir.x;
    g.fillStyle(0x287abb,0.40).fillCircle(0,0,24);
    g.fillStyle(0x57c8f5,0.90).fillCircle(0,0,15);
    g.fillStyle(0xe4fbff,1).fillCircle(0,0,6);
    for(let i=0;i<6;i++){
      const d=20+i*8,off=(i%2?1:-1)*(5+i*2);
      g.fillStyle(i%2?0x76e4fa:0xd5faff,0.85).fillCircle(
        dir.x*d+nx*off,dir.y*d+ny*off,3+(i%3)*2
      );
    }
    this.scene.tweens.add({targets:g,alpha:0,duration:310,
      scaleX:1.28,scaleY:1.28,onComplete:()=>g.destroy()});
    void a;
  }

  seed(source:Point,target:Point){
    const g=this.scene.add.graphics().setDepth(13);
    g.lineStyle(5,0x3e9e59,0.82).lineBetween(
      source.x,source.y,target.x,target.y
    );
    for(let i=0;i<8;i++){
      const t=i/8;
      const px=Phaser.Math.Linear(source.x,target.x,t);
      const py=Phaser.Math.Linear(source.y,target.y,t);
      g.fillStyle(i%2?0xf1e98e:0x74d982,0.93)
        .fillEllipse(px,py,6,11);
    }
    const ring=this.scene.add.circle(target.x,target.y,36,0x72e58b,0.12)
      .setStrokeStyle(4,0x92f59c,0.94).setDepth(13);
    this.scene.tweens.add({targets:ring,alpha:0,
      scaleX:1.8,scaleY:1.8,duration:690,
      onComplete:()=>ring.destroy()});
    this.scene.tweens.add({targets:g,alpha:0,duration:420,
      onComplete:()=>g.destroy()});
  }

  shell(position:Point){
    const outer=this.scene.add.circle(position.x,position.y-14,39,
      0x52bced,0.18).setStrokeStyle(5,0x99e9ff,0.92)
      .setDepth(14);
    const inner=this.scene.add.circle(position.x,position.y-14,31,
      0xa8e9ff,0.15).setStrokeStyle(2,0xdafcff,0.95)
      .setDepth(14);
    this.scene.tweens.add({targets:[outer,inner],alpha:0,
      scaleX:1.35,scaleY:1.35,duration:770,delay:700,
      onComplete:()=>{outer.destroy();inner.destroy();}});
  }

  notes(target:Point){
    const g=this.scene.add.graphics().setDepth(13);
    for(let i=0;i<6;i++){
      const x=target.x-66+i*25;
      const y=target.y-35-Math.sin(i)*23;
      g.fillStyle(0xeac8ff,0.98).fillEllipse(x,y,13,9);
      g.lineStyle(3,0xecb8f4,0.96)
        .lineBetween(x+6,y-1,x+6,y-17);
      g.fillStyle(0xffe0ff,0.92).fillCircle(x+6,y-17,3);
    }
    this.scene.tweens.add({targets:g,alpha:0,
      y:-40,duration:1100,onComplete:()=>g.destroy()});
  }

  /** Bird attacks are unmistakable: wind slashes with layered bright rings. */
  gust(origin:Point,target:Point,strong=false){
    const g=this.scene.add.graphics().setDepth(15);
    const dx=target.x-origin.x,dy=target.y-origin.y;
    const angle=Math.atan2(dy,dx);
    const palette=strong?[0xb5f4ec,0xffffff,0x69bbc6]:
      [0xd8f3dc,0xfef9cb,0x84bca5];
    for(let line=0;line<5;line++){
      const t=line/4;
      const px=Phaser.Math.Linear(origin.x,target.x,t);
      const py=Phaser.Math.Linear(origin.y,target.y,t);
      const r=15+line*8;
      g.lineStyle(7,line%2?palette[0]:palette[1],0.84);
      g.beginPath();g.arc(px,py,r,angle-0.72,
        angle+0.72,false);g.strokePath();
      g.lineStyle(3,palette[2],0.82);
      g.beginPath();g.arc(px,py,r+6,angle-0.62,
        angle+0.62,false);g.strokePath();
      for(const off of [-1,1]){
        g.lineStyle(2,0xe8fff3,0.9);
        g.lineBetween(px,py+off*10,px+dx*0.04,py+dy*0.04+off*4);
      }
    }
    this.scene.tweens.add({targets:g,alpha:0,
      x:Math.cos(angle)*23,y:Math.sin(angle)*23,duration:590,
      ease:'Sine.easeOut',onComplete:()=>g.destroy()});
  }

  /** Caterpie and Weedle make a net of web strings that persists briefly. */
  silk(origin:Point,target:Point){
    const g=this.scene.add.graphics().setDepth(15);
    g.lineStyle(5,0xd1e4df,0.92)
      .lineBetween(origin.x,origin.y,target.x,target.y);
    g.lineStyle(2,0xffffff,0.9)
      .lineBetween(origin.x,origin.y-4,target.x,target.y-4);
    for(let arm=0;arm<8;arm++){
      const a=arm*Math.PI/4;
      const radius=33;
      const fx=target.x+Math.cos(a)*radius;
      const fy=target.y+Math.sin(a)*radius*0.65;
      g.lineStyle(2,0xe4f3ee,0.96)
        .lineBetween(target.x,target.y,fx,fy);
      for(const ring of [0.42,0.78]){
        const one={
          x:target.x+Math.cos(a)*radius*ring,
          y:target.y+Math.sin(a)*radius*ring*0.65
        };
        const nextAngle=a+Math.PI/4;
        const two={
          x:target.x+Math.cos(nextAngle)*radius*ring,
          y:target.y+Math.sin(nextAngle)*radius*ring*0.65
        };
        g.lineStyle(2,0xbfd8d0,0.9)
          .lineBetween(one.x,one.y,two.x,two.y);
      }
    }
    this.scene.tweens.add({targets:g,alpha:0,duration:1150,
      delay:520,onComplete:()=>g.destroy()});
  }

  /** Poison Sting has a neon tip; Bug Bite stays green, not a recycled flame. */
  sting(origin:Point,target:Point,poison:boolean){
    const g=this.scene.add.graphics().setDepth(15);
    const angle=Math.atan2(target.y-origin.y,target.x-origin.x);
    const color=poison?0xcb8ce0:0x9ddc79;
    for(let i=-2;i<=2;i++){
      const a=angle+i*0.16;
      const endX=target.x+Math.cos(a)*15;
      const endY=target.y+Math.sin(a)*15;
      g.lineStyle(7,poison?0x723c88:0x438461,0.7)
        .lineBetween(origin.x,origin.y,endX,endY);
      g.lineStyle(3,color,0.95)
        .lineBetween(origin.x,origin.y,endX,endY);
      g.fillStyle(0xffffff,0.92).fillCircle(endX,endY,3);
    }
    const burst=this.scene.add.circle(target.x,target.y,
      16,color,0.32).setStrokeStyle(4,0xffffff,0.84).setDepth(15);
    this.scene.tweens.add({targets:g,alpha:0,duration:425,
      onComplete:()=>g.destroy()});
    this.scene.tweens.add({targets:burst,alpha:0,scaleX:2.7,
      scaleY:2.7,duration:480,onComplete:()=>burst.destroy()});
  }

}
