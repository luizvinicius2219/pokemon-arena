import Phaser from 'phaser';

/**
 * A battle takes place IN the tall grass, not in the artificial duel ring.
 * Background is painted to one cached 480x288 canvas texture at boot,
 * preserving crisp pixels and avoiding any per-frame terrain allocations.
 */
export function createSafariBattlefield(scene:Phaser.Scene):void{
  const key='safari-wild-battlefield-v2';
  if(!scene.textures.exists(key)){
    const canvas=document.createElement('canvas');
    canvas.width=480;
    canvas.height=288;
    const g=canvas.getContext('2d');
    if(!g)return;
    g.imageSmoothingEnabled=false;
    const rect=(x:number,y:number,w:number,h:number,color:string)=>{
      g.fillStyle=color;
      g.fillRect(x,y,w,h);
    };
    let seed=0x5f314912;
    const rnd=()=>{
      seed=(Math.imul(seed,1664525)+1013904223)>>>0;
      return seed/4294967296;
    };
    rect(0,0,480,288,'#487956');
    // Fine grass tiles instead of large, noisy color stripes.
    const grassColors=['#4b805d','#4e8460','#487c59',
      '#51865f','#4c815a','#50825a'];
    for(let y=0;y<288;y+=8)for(let x=0;x<480;x+=8){
      rect(x,y,8,8,grassColors[Math.floor(rnd()*grassColors.length)]);
      if(rnd()>0.57){
        rect(x+2,y+3,2,4,'#61976a');
        rect(x+4,y+2,1,4,'#8aad77');
        rect(x+6,y+5,1,2,'#356c54');
      }
      if(rnd()>0.91)rect(x+2,y+3,2,2,'#d8c990');
    }
    // Dense trees at the top and sides make this a living green habitat.
    for(let x=0;x<480;x+=25){
      rect(x-3,0,26,34,'#1e4e40');
      rect(x-9,1,30,21,'#2e6b4d');
      rect(x-4,4,27,13,'#4f8e5d');
      rect(x+5,2,10,3,'#7fac76');
      rect(x-1,27,22,4,'#23483d');
    }
    for(let side=0;side<2;side++)for(let y=30;y<288;y+=29){
      const x=side?461:10;
      rect(x-16,y,33,21,'#20503f');
      rect(x-18,y-8,36,19,'#367954');
      rect(x-11,y-16,26,15,'#5c9567');
      rect(x-4,y-12,9,3,'#8bb983');
    }
    // Small mottled ground scuffs, not giant artificial arena ovals.
    const clearing=(cx:number,cy:number,rx:number,ry:number)=>{
      for(let py=-ry;py<=ry;py+=3)for(let px=-rx;px<=rx;px+=4){
        const norm=(px/rx)**2+(py/ry)**2+(rnd()-0.5)*0.2;
        if(norm>0.91)continue;
        const choice=rnd();
        rect(cx+px,cy+py,4,3,
          choice>0.84?'#a6a47b':
          choice>0.51?'#789871':'#649269');
      }
      for(let i=0;i<10;i++){
        const xx=cx-rx+(rnd()*rx*2)|0;
        const yy=cy-ry+(rnd()*ry*2)|0;
        rect(xx,yy,4,2,rnd()>0.5?'#bdaf88':'#426c57');
      }
    };
    clearing(114,168,31,12);
    clearing(362,159,35,13);
    // Grass clumps avoid the silhouettes of both battlers.
    for(let cluster=0;cluster<39;cluster++){
      const cx=55+(rnd()*370|0),cy=39+(rnd()*214|0);
      if(Math.hypot(cx-114,(cy-164)*2)<54||
        Math.hypot(cx-362,(cy-157)*2)<56)continue;
      rect(cx-17,cy+5,39,5,'#285d46');
      for(let sprig=0;sprig<10;sprig++){
        const x=cx-13+(rnd()*29|0),y=cy-3+(rnd()*14|0);
        rect(x,y,3,11,rnd()>0.48?'#79ad6e':'#568e5c');
        rect(x+1,y-5,2,9,rnd()>0.58?'#a5c985':'#92b97b');
        rect(x+5,y-2,2,7,'#296d50');
      }
    }
    // Dark forest fringe replaces the disconnected blue river stripe.
    rect(0,279,480,9,'#315b48');
    for(let x=0;x<480;x+=11){
      const h=5+(rnd()*10|0);
      rect(x,279-h,3,h,'#387658');
      rect(x+3,279-h-4,2,h+4,'#71a36c');
      rect(x+6,279-h+2,2,h-2,'#214f40');
    }
    scene.textures.addCanvas(key,canvas);
  }
  scene.add.image(480,288,key).setDisplaySize(960,576).setDepth(-10);
  const side=scene.add.graphics().setDepth(0);
  // Pixel-friendly leaves in the battle foreground; sparse and unobtrusive.
  for(const x of [43,79,433,465,122,322]){
    side.fillStyle(0x2a684d,0.85).fillEllipse(x,521,24,17);
    side.fillStyle(0x65a26b,0.96).fillTriangle(
      x-11,522,x-3,487,x+3,522);
    side.fillStyle(0x8db77b,0.85).fillTriangle(
      x,523,x+9,496,x+13,523);
  }
  scene.add.text(480,48,'ROTA 1  ·  MATO ALTO',{
    fontSize:'16px',fontStyle:'bold',color:'#e7ffd4',
    stroke:'#173e34',strokeThickness:5
  }).setOrigin(0.5).setDepth(5);
}
