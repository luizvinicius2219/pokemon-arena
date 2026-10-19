import Phaser from 'phaser';

/**
 * A battle takes place IN the tall grass, not in the artificial duel ring.
 * Background is painted to one cached 480x288 canvas texture at boot,
 * preserving crisp pixels and avoiding any per-frame terrain allocations.
 */
export function createSafariBattlefield(scene:Phaser.Scene):void{
  const key='safari-wild-battlefield-v1';
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
    rect(0,0,480,288,'#37664d');
    const grassColors=['#497e58','#53885d','#4a7f58','#588b60',
      '#3e7352','#507f56','#5b8b63'];
    for(let y=0;y<288;y+=12)for(let x=0;x<480;x+=12){
      rect(x,y,12,12,grassColors[Math.floor(rnd()*grassColors.length)]);
      if(rnd()>0.62)rect(x+2,y+6,3,3,'#76a678');
      if(rnd()>0.75)rect(x+9,y+3,2,2,'#2f6b4b');
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
    // Mid-field has two natural muddy clearings under the combatants.
    const clearing=(cx:number,cy:number,rx:number,ry:number)=>{
      g.fillStyle='#427457';
      g.beginPath();g.ellipse(cx,cy,rx+10,ry+8,0,0,Math.PI*2);g.fill();
      g.fillStyle='#81966b';
      g.beginPath();g.ellipse(cx,cy,rx,ry,0,0,Math.PI*2);g.fill();
      g.fillStyle='#a9a17e';
      g.beginPath();g.ellipse(cx,cy+2,rx-5,ry-4,0,0,Math.PI*2);g.fill();
      for(let i=0;i<19;i++){
        const r=Math.sqrt(rnd());
        const a=rnd()*Math.PI*2;
        const px=cx+Math.cos(a)*rx*r;
        const py=cy+Math.sin(a)*ry*r;
        rect(px|0,py|0,3+(rnd()*3|0),2,rnd()>0.5?'#d2b68c':'#788c6b');
      }
    };
    clearing(116,150,65,31);
    clearing(375,148,64,30);
    // Patches of thin tall grass mark the lateral field and central lane.
    for(let cluster=0;cluster<27;cluster++){
      const cx=55+(rnd()*370|0),cy=43+(rnd()*205|0);
      if(Math.hypot(cx-116,(cy-150)*2)<77||
        Math.hypot(cx-375,(cy-148)*2)<75)continue;
      rect(cx-17,cy+5,39,5,'#285d46');
      for(let sprig=0;sprig<10;sprig++){
        const x=cx-13+(rnd()*29|0),y=cy-3+(rnd()*14|0);
        rect(x,y,3,11,rnd()>0.48?'#79ad6e':'#568e5c');
        rect(x+1,y-5,2,9,rnd()>0.58?'#a5c985':'#92b97b');
        rect(x+5,y-2,2,7,'#296d50');
      }
    }
    // River glint at bottom edge; unlike the gym, no stone ring or emblem.
    rect(0,277,480,11,'#365f62');
    rect(10,281,73,2,'#6d9c94');
    rect(164,282,89,2,'#7fa9a0');
    rect(319,281,94,2,'#5d8d8a');
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
  scene.add.text(480,43,'ROTA 1  ·  ENCONTRO SELVAGEM',{
    fontSize:'16px',fontStyle:'bold',color:'#e7ffd4',
    stroke:'#173e34',strokeThickness:5
  }).setOrigin(0.5).setDepth(5);
}
