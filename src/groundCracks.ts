import Phaser from 'phaser';

/**
 * Earthquake-ground decals. Each fracture network is rendered only ONCE
 * into a tiny transparent CanvasTexture and shown as one image.
 * The expensive floor bitmap remains untouched and mobile gets no
 * full-screen redraw or continuous decal animation.
 */
export class GroundCracks {
  private serial=0;
  private readonly decals=new Map<string,Phaser.GameObjects.Image>();

  constructor(private readonly scene:Phaser.Scene){
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{
      for(const [key,decal] of this.decals){
        decal.destroy();
        if(scene.textures.exists(key))scene.textures.remove(key);
      }
      this.decals.clear();
    });
  }

  stamp(x:number,y:number,radius:number,force=1){
    // Narrow local fractures. Damage radius is gameplay-only; it must not
    // dictate the size of a huge dark floor decal.
    const visualRadius=Math.min(168,Math.max(52,radius*0.64));
    const size=128,mid=size/2;
    const canvas=document.createElement('canvas');
    canvas.width=size;canvas.height=size;
    const ctx=canvas.getContext('2d');
    if(!ctx)return;
    ctx.imageSmoothingEnabled=false;
    const pixel=(v:number)=>Math.round(v/2)*2;
    let seed=(Math.imul(Math.round(x+1),73856093)
      ^Math.imul(Math.round(y+7),19349663)
      ^Math.imul(++this.serial,83492791))>>>0;
    const random=()=>{
      seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;
      return(seed>>>0)/4294967296;
    };
    const branch=(angle:number,length:number,originX:number,originY:number,width:number)=>{
      let px=originX,py=originY;
      const steps=Math.max(3,Math.ceil(length/6));
      for(let j=0;j<steps;j++){
        const wobble=(random()-0.5)*0.45;
        const t=angle+wobble;
        const nx=pixel(px+Math.cos(t)*6),ny=pixel(py+Math.sin(t)*6);
        const sx=pixel(px),sy=pixel(py);
        ctx.fillStyle='#091922';
        ctx.fillRect(Math.min(sx,nx)-width,Math.min(sy,ny)-width,
          Math.max(2,Math.abs(nx-sx)+width*2),Math.max(2,Math.abs(ny-sy)+width*2));
        ctx.fillStyle='#6a8d90';
        ctx.fillRect(Math.min(sx,nx),Math.min(sy,ny),
          Math.max(2,Math.abs(nx-sx)),2);
        ctx.fillStyle='#b2d7d0';
        ctx.fillRect(Math.min(sx,nx),Math.min(sy,ny)-2,
          Math.max(2,Math.abs(nx-sx)),2);
        px=nx;py=ny;
      }
    };
    const spokes=Math.min(17,Math.round(9+force*5));
    for(let i=0;i<spokes;i++){
      const angle=i*Math.PI*2/spokes+(random()-0.5)*0.28;
      branch(angle,18+random()*35,mid,mid,force>1.1?2:1);
      const r=17+random()*21;
      const offX=pixel(mid+Math.cos(angle)*r),offY=pixel(mid+Math.sin(angle)*r);
      if(i%2===0)branch(angle+(i%3===0?0.85:-0.7),8+random()*16,offX,offY,1);
    }
    // Pixelated debris, not the antialiased vector strokes of old fractures.
    for(let i=0;i<26;i++){
      const angle=random()*Math.PI*2,r=8+random()*54;
      ctx.fillStyle=i%3===0?'#d4ece6':i%3===1?'#456770':'#17313c';
      ctx.fillRect(pixel(mid+Math.cos(angle)*r),
        pixel(mid+Math.sin(angle)*r),i%4===0?4:2,i%5===0?4:2);
    }
    const key='ground-fracture-'+this.serial;
    const texture=this.scene.textures.addCanvas(key,canvas);
    if(!texture)return;
    const decal=this.scene.add.image(x,y,key).setOrigin(0.5)
      .setDisplaySize(visualRadius*2,visualRadius*2)
      .setDepth(1).setAlpha(0.92);
    this.decals.set(key,decal);
    this.scene.tweens.add({
      targets:decal,alpha:0,duration:2400,delay:500,
      ease:'Quad.easeIn',
      onComplete:()=>{
        decal.destroy();
        this.decals.delete(key);
        if(this.scene.textures.exists(key))this.scene.textures.remove(key);
      }
    });
  }
}
