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
    const visualRadius=Math.min(128,Math.max(58,radius*0.43));
    const size=192,mid=size/2;
    const canvas=document.createElement('canvas');
    canvas.width=size;
    canvas.height=size;
    const ctx=canvas.getContext('2d');
    if(!ctx)return;
    ctx.imageSmoothingEnabled=false;
    ctx.lineCap='square';
    ctx.lineJoin='miter';

    let seed=(Math.imul(Math.round(x+1),73856093)
      ^Math.imul(Math.round(y+7),19349663)
      ^Math.imul(++this.serial,83492791))>>>0;
    const random=()=>{
      seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;
      return(seed>>>0)/4294967296;
    };

    type Vertex={x:number;y:number};
    const drawFault=(nodes:Vertex[],weight:number)=>{
      if(nodes.length<2)return;
      const path=()=> {
        ctx.beginPath();
        ctx.moveTo(nodes[0].x,nodes[0].y);
        for(const p of nodes.slice(1))ctx.lineTo(p.x,p.y);
      };
      ctx.save();
      ctx.translate(0.75,1.25);
      path();
      ctx.lineWidth=weight+1.25;
      ctx.strokeStyle='rgba(52,63,63,0.38)';
      ctx.stroke();
      ctx.restore();
      ctx.save();
      ctx.translate(-0.55,-0.75);
      path();
      ctx.lineWidth=weight+0.65;
      ctx.strokeStyle='#c8bba4';
      ctx.globalAlpha=0.66;
      ctx.stroke();
      ctx.restore();
      path();
      ctx.lineWidth=weight;
      ctx.strokeStyle='#293039';
      ctx.stroke();
      path();
      ctx.lineWidth=Math.max(0.6,weight*0.44);
      ctx.strokeStyle='#3e4748';
      ctx.stroke();
    };

    const spokes=Math.min(11,Math.round(6+visualRadius/32));
    for(let i=0;i<spokes;i++){
      const angle=(i+random()*0.56)*2*Math.PI/spokes;
      const span=45+random()*37;
      const nodes:Vertex[]=[{
        x:mid+(random()-0.5)*10,
        y:mid+(random()-0.5)*10
      }];
      const steps=5+Math.floor(random()*4);
      for(let j=1;j<=steps;j++){
        const t=j/steps;
        const r=span*t;
        const sideways=(random()-0.5)*11*t;
        const phi=angle+(random()-0.5)*0.22*t;
        nodes.push({
          x:mid+Math.cos(phi)*r-Math.sin(phi)*sideways,
          y:mid+Math.sin(phi)*r+Math.cos(phi)*sideways
        });
      }
      drawFault(nodes,(i%4===0?1.85:1.15)*Math.max(0.7,force*0.72));
      // Branches fork along the rupture, producing jagged terrain plates.
      for(const index of [Math.min(3,steps-1)]){
        if(random()>0.46)continue;
        const root=nodes[index];
        if(!root)continue;
        const rotate=angle+(random()>0.5?1:-1)*(0.55+random()*0.48);
        const extension=13+random()*15;
        const end={
          x:root.x+Math.cos(rotate)*extension,
          y:root.y+Math.sin(rotate)*extension
        };
        const midpoint={
          x:(root.x+end.x)/2+(random()-0.5)*12,
          y:(root.y+end.y)/2+(random()-0.5)*12
        };
        drawFault([root,midpoint,end],0.72+random()*0.61);
      }
    }
    // Chipped slate, warm underside highlights and tiny broken stones.
    for(let i=0;i<12;i++){
      const angle=random()*Math.PI*2;
      const dist=10+random()*71;
      const px=mid+Math.cos(angle)*dist;
      const py=mid+Math.sin(angle)*dist;
      const w=1+random()*2,h=1+random()*2;
      ctx.fillStyle=i%3===0?'#bfb59f':i%3===1?'#78837f':'#9c998c';
      ctx.fillRect(Math.round(px),Math.round(py),Math.round(w),Math.round(h));
      ctx.fillStyle='rgba(62,69,70,0.22)';
      ctx.fillRect(Math.round(px+2),Math.round(py+h),Math.round(w),2);
    }

    const key='ground-fracture-'+this.serial;
    const texture=this.scene.textures.addCanvas(key,canvas);
    if(!texture)return;
    const decal=this.scene.add.image(x,y,key).setOrigin(0.5)
      .setDisplaySize(visualRadius*2,visualRadius*2)
      .setDepth(0).setAlpha(0.82);
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
