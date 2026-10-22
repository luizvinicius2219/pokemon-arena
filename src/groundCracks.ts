import Phaser from 'phaser';
import {
  buildFracturePlan,type FracturePreset,type PixelPoint,
  type FracturePlan
} from './groundFracturePattern';

let ownerSequence=0;
const GRID=2;
const SHADOW='#14252c';
const DEEP_FAULT='#081920';
const EDGE_LIGHT='#bdcbb6';
const SLAB_SHADES=['#667b76','#72857d','#536a6b'] as const;

/**
 * Each fracture is drawn ONCE as a small, snapped CanvasTexture and scaled with
 * nearest-neighbour filtering. There are no radial spokes or smooth strokes:
 * only a few distinct broken floor plates, 1-3 angled faults and chunky rubble.
 * Gameplay collision/damage is entirely independent of this purely visual art.
 */
export class GroundCracks {
  private serial=0;
  private readonly owner=++ownerSequence;
  private readonly decals=new Map<string,Phaser.GameObjects.Image>();

  constructor(private readonly scene:Phaser.Scene){
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{
      for(const key of [...this.decals.keys()])this.release(key);
    });
  }

  stamp(x:number,y:number,radius:number,force=1,preset?:FracturePreset):void{
    const chosen=preset??(force>=1.2?'ultimate':force>=0.8?'heavy':'small');
    const seed=(Math.imul(Math.round(x+1),73856093)
      ^Math.imul(Math.round(y+7),19349663)
      ^Math.imul(++this.serial,83492791))>>>0;
    const plan=buildFracturePlan(seed,chosen);
    const canvas=document.createElement('canvas');
    canvas.width=plan.width;
    canvas.height=plan.height;
    const ctx=canvas.getContext('2d',{alpha:true});
    if(!ctx)return;
    ctx.imageSmoothingEnabled=false;

    const snap=(v:number)=>Math.round(v/GRID)*GRID;
    const rasterLine=(start:PixelPoint,end:PixelPoint,width:number,color:string)=>{
      const dx=end.x-start.x,dy=end.y-start.y;
      const steps=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy))/GRID));
      ctx.fillStyle=color;
      for(let j=0;j<=steps;j++){
        const px=snap(start.x+dx*j/steps),py=snap(start.y+dy*j/steps);
        ctx.fillRect(px-Math.floor(width/2),py-Math.floor(width/2),width,width);
      }
    };
    const linePath=(path:readonly PixelPoint[],width:number,color:string)=>{
      for(let j=1;j<path.length;j++)rasterLine(path[j-1],path[j],width,color);
    };
    const pointInside=(px:number,py:number,poly:readonly PixelPoint[])=>{
      let inside=false;
      for(let i=0,j=poly.length-1;i<poly.length;j=i++){
        const a=poly[i],b=poly[j];
        if((a.y>py)!==(b.y>py)&&
          px<(b.x-a.x)*(py-a.y)/(b.y-a.y)+a.x)inside=!inside;
      }
      return inside;
    };
    // Rasterizing at 2x2 cells avoids antialiasing on diagonal tile edges.
    const polygon=(pts:readonly PixelPoint[],color:string)=>{
      const left=Math.max(0,snap(Math.min(...pts.map(p=>p.x))-3));
      const right=Math.min(plan.width,snap(Math.max(...pts.map(p=>p.x))+3));
      const top=Math.max(0,snap(Math.min(...pts.map(p=>p.y))-3));
      const bottom=Math.min(plan.height,snap(Math.max(...pts.map(p=>p.y))+3));
      ctx.fillStyle=color;
      for(let py=top;py<bottom;py+=GRID){
        for(let px=left;px<right;px+=GRID){
          if(pointInside(px+1,py+1,pts))ctx.fillRect(px,py,GRID,GRID);
        }
      }
    };

    this.drawFractures(ctx,plan,polygon,linePath);

    const spread=chosen==='ultimate'?0.83:chosen==='heavy'?0.57:0.42;
    const minimum=chosen==='ultimate'?90:chosen==='heavy'?56:29;
    const maximum=chosen==='ultimate'?182:chosen==='heavy'?129:79;
    const visualRadius=Phaser.Math.Clamp(
      radius*spread*Math.max(0.75,Math.min(1.18,force)),minimum,maximum);
    const key=`ground-fracture-${this.owner}-${this.serial}`;
    const texture=this.scene.textures.addCanvas(key,canvas);
    if(!texture)return;
    const image=this.scene.add.image(x,y,key)
      .setOrigin(0.5).setDisplaySize(visualRadius*2,visualRadius*1.25)
      .setDepth(1).setAlpha(0.96);
    this.decals.set(key,image);
    // Bounded texture count: repeated combo hits cannot exhaust phone memory.
    if(this.decals.size>11){
      const oldest=this.decals.keys().next().value;
      if(oldest)this.release(oldest);
    }
    const linger=chosen==='ultimate'?950:chosen==='heavy'?550:280;
    const duration=chosen==='ultimate'?2900:chosen==='heavy'?2100:1400;
    this.scene.tweens.add({
      targets:image,alpha:0,delay:linger,duration,ease:'Quad.easeIn',
      onComplete:()=>this.release(key)
    });
  }

  private drawFractures(
    ctx:CanvasRenderingContext2D,
    plan:FracturePlan,
    polygon:(points:readonly PixelPoint[],color:string)=>void,
    linePath:(points:readonly PixelPoint[],width:number,color:string)=>void
  ):void{
    // Small crushed gap underneath the slab edges, not a radial spiderweb.
    polygon(plan.core,DEEP_FAULT);
    for(let i=0;i<plan.plates.length;i++){
      const plate=plan.plates[i];
      const center=plate.points.reduce((sum,p)=>({x:sum.x+p.x,y:sum.y+p.y}),{x:0,y:0});
      const average={x:center.x/plate.points.length,y:center.y/plate.points.length};
      polygon(plate.points,SHADOW);
      const inset=plate.points.map(p=>({
        x:Math.round((average.x+(p.x-average.x)*0.88)/2)*2,
        y:Math.round((average.y+(p.y-average.y)*0.88-1)/2)*2
      }));
      polygon(inset,SLAB_SHADES[plate.tone]);
      // Exposed stone face: a staggered light rim, never a full circle.
      linePath([plate.points[0],plate.points[1],plate.points[2]],2,EDGE_LIGHT);
      const chip=plate.points[plate.points.length-2];
      ctx.fillStyle='#879c8c';
      ctx.fillRect(chip.x-2,chip.y-2,4,2);
    }
    const width=plan.preset==='ultimate'?5:plan.preset==='heavy'?4:3;
    for(const fault of plan.faults){
      const highlight=fault.map(p=>({x:p.x,y:p.y-2}));
      linePath(highlight,width+2,'#8b9e92');
      linePath(fault,width,DEEP_FAULT);
      // Short stepped dark offset adds depth without another branch.
      const middle=fault[Math.floor(fault.length/2)];
      ctx.fillStyle='#203138';
      ctx.fillRect(middle.x-2,middle.y+2,4,4);
    }
    for(const chip of plan.chips){
      ctx.fillStyle='#193039';
      ctx.fillRect(chip.x,chip.y+2,chip.width+2,chip.height+2);
      ctx.fillStyle=chip.tone===0?'#9db5a9':
        chip.tone===1?'#536c6b':'#c4ccad';
      ctx.fillRect(chip.x,chip.y,chip.width,chip.height);
      if(chip.width>=6){
        ctx.fillStyle='#d5dbc0';
        ctx.fillRect(chip.x,chip.y,chip.width-2,2);
      }
    }
  }

  private release(key:string):void{
    const image=this.decals.get(key);
    if(!image)return;
    this.decals.delete(key);
    this.scene.tweens.killTweensOf(image);
    image.destroy();
    if(this.scene.textures.exists(key))this.scene.textures.remove(key);
  }
}
