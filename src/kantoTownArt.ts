/**
 * Aurora Town — original, GBA-inspired 16px pixel tile scene.
 *
 * Art direction: Gen III proportions, crisp geometric pixels, a restrained
 * 32-colour palette, detailed roofs, real street hierarchy and readable
 * grass tiles. The scene is painted ONCE to a 480×288 canvas and scaled 2×
 * with nearest-neighbour filtering by Phaser.
 *
 * The three solid buildings, pond, grass and paths deliberately retain
 * the world-space coordinates consumed by WorldScene interactions,
 * findWalkingPath() and the existing save positions.
 */
export function paintKantoTown(ctx:CanvasRenderingContext2D):void{
  ctx.imageSmoothingEnabled=false;
  type Point=readonly [number,number];
  const C={
    grass:'#87ae75',grassLight:'#94b980',grassShade:'#78a56d',
    grassDeep:'#61915e',leaf:'#4b895f',leafDark:'#275a48',
    leafMid:'#347551',leafLight:'#6ba477',leafGlint:'#9fc68a',
    dark:'#293c41',outline:'#415454',shadow:'#506e59',
    earth:'#b6a37e',earthLight:'#dcc89b',earthTop:'#f0ddae',
    earthDark:'#877e66',stone:'#b9b4a1',stoneLight:'#e4dbc5',
    wall:'#e5d5b3',wallLight:'#f5e4c3',wallShadow:'#b3a58c',
    timber:'#876d54',timberDark:'#584b3f',water:'#408ca5',
    waterLight:'#89cbd0',waterDark:'#2c687c',
    red:'#cb645e',redHi:'#e98c74',redShadow:'#844b54',
    blue:'#5088ab',blueHi:'#83b6c8',blueShadow:'#345975',
    slate:'#787f89',slateHi:'#acacb0',slateDark:'#505762',
    cream:'#f7e9cb',gold:'#f3ca7f'
  };
  const fill=(x:number,y:number,w:number,h:number,color:string)=>{
    ctx.fillStyle=color;
    ctx.fillRect(Math.round(x),Math.round(y),
      Math.max(1,Math.round(w)),Math.max(1,Math.round(h)));
  };
  const poly=(points:readonly Point[],color:string)=>{
    ctx.fillStyle=color;
    ctx.beginPath();
    ctx.moveTo(points[0][0],points[0][1]);
    for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);
    ctx.closePath();
    ctx.fill();
  };
  const hash=(x:number,y:number)=>
    ((Math.imul(x+71,741103597)^Math.imul(y+19,1597334677))>>>0);

  // 1. Grass is made of actual repeating 16px tiles, rather than
  // a giant noisy rectangle. Sparse highlights preserve player readability.
  const meadow=(tx:number,ty:number)=>{
    const x=tx*16,y=ty*16;
    const value=hash(tx,ty);
    const swatches=[C.grass,C.grassLight,C.grassShade,C.grass];
    fill(x,y,16,16,swatches[value%swatches.length]);
    fill(x,y,16,1,value%3===0?'#9bbe84':'#80a971');
    if(value%5===0){
      fill(x+3,y+9,2,4,C.grassDeep);
      fill(x+5,y+6,2,6,'#afd18b');
      fill(x+10,y+10,2,3,'#659765');
    }else if(value%7===1){
      fill(x+11,y+5,2,3,'#679965');
      fill(x+3,y+12,3,2,'#b0d390');
    }
    if(value%17===1)fill(x+8,y+2,3,2,'#c2d897');
  };
  for(let ty=0;ty<18;ty++)for(let tx=0;tx<30;tx++)meadow(tx,ty);

  // 2. Continuous ground terrain: roads and door approaches are NOT
  // separate floating islands; all roads converge on one broad junction.
  const road=(x:number,y:number,w:number,h:number,variant='dirt')=>{
    fill(x-3,y-3,w+6,h+6,C.grassDeep);
    fill(x-1,y-1,w+2,h+2,'#9b9d77');
    fill(x,y,w,h,variant==='square'?'#b9ae92':C.earth);
    fill(x+2,y+2,w-4,h-4,variant==='square'?'#c9b99a':C.earthLight);
    const step=variant==='square'?12:16;
    for(let yy=y+2;yy<y+h-3;yy+=step){
      for(let xx=x+3;xx<x+w-4;xx+=step){
        const stagger=((yy-y)/step|0)%2?5:0;
        const rx=Math.min(x+w-6,xx+stagger);
        const length=Math.min(step-2,x+w-rx-3);
        if(length<3)continue;
        fill(rx,yy,length,1,'#a99576');
        fill(rx+1,yy+2,Math.max(2,length-3),1,'#f3ddb3');
        if(hash(rx,yy)%4===0)
          fill(rx+4,yy+step-4,3,2,'#ae9e80');
      }
    }
    fill(x,y,w,2,'#ecdbb3');
    fill(x,y+h-2,w,2,'#a28c70');
  };
  road(0,204,480,42);
  road(88,135,29,108);
  road(146,137,35,109);
  road(385,108,56,132);
  road(181,188,65,53);
  road(83,191,127,55,'square');
  // Route/grass threshold: a walkable narrow strip aligns with inGrass().
  fill(206,185,36,24,'#9c9976');
  fill(206,188,35,19,'#d9c79f');
  fill(210,193,25,9,C.earthTop);
  for(let i=0;i<5;i++)fill(210+i*6,206,3,2,'#b3a380');

  // 3. Town plaza laid in alternating sandstone tiles.
  // Large, low-contrast squares keep NPCs readable on top.
  for(let y=196;y<245;y+=13){
    for(let x=88;x<209;x+=15){
      const odd=((x+y)>>2)&1;
      fill(x+1,y+1,13,11,odd?'#d5c7a4':'#daceac');
      fill(x+1,y+10,13,1,'#b8a989');
      fill(x+2,y+2,11,1,'#f1e2b9');
      fill(x+3,y+6,1,3,'#cab894');
    }
  }
  // Lower street boundary has a consistent stone kerb.
  for(let x=0;x<480;x+=16){
    fill(x,243,16,2,'#a48f70');
    fill(x+2,243,12,1,'#e6d4aa');
  }

  // 4. Pond: organic 8-bit shoreline (not a flat blue rectangle).
  const bank:Point[]=[
    [19,150],[29,147],[73,147],[85,153],[90,166],
    [89,183],[80,195],[29,197],[18,192],[13,181],[13,163]
  ];
  poly(bank,'#5b8b61');
  poly(bank.map(([x,y])=>[x+2,y+3] as Point),'#3f704f');
  poly([[22,155],[77,154],[85,164],[85,182],[77,191],
    [25,190],[19,179],[19,162]],C.waterDark);
  poly([[25,158],[75,157],[80,166],[80,180],
    [74,186],[28,187],[23,177],[23,164]],C.water);
  fill(27,160,46,3,'#64abb8');
  for(const [x,y,len] of [[28,168,13],[54,165,18],[41,176,11],
    [65,182,9],[28,183,15]] as readonly [number,number,number][])
    fill(x,y,len,2,C.waterLight);
  for(const [x,y] of [[33,172],[71,171],[45,183]] as Point[]){
    fill(x-5,y,8,2,'#3f7c60');
    fill(x-3,y-3,5,3,'#93bc7b');
    fill(x+1,y-1,3,2,'#d4dc8f');
  }
  // Simple narrow pond footbridge, within already blocked water.
  fill(67,188,32,6,C.timberDark);
  fill(69,185,30,4,'#c7a77b');
  for(let x=71;x<98;x+=6)fill(x,185,2,4,'#e5c79b');

  // 5. Grass field: 16px dense vegetation tiles, warm highlights,
  // readable edge and a deliberate west entrance.
  fill(214,112,178,119,'#416b4a');
  fill(218,116,169,111,'#2f664a');
  fill(220,119,165,106,'#52875b');
  const tuft=(x:number,y:number,variant:number)=>{
    fill(x,y,16,16,variant%3===0?'#4e8c61':
      variant%3===1?'#528c5b':'#46815b');
    fill(x,y+11,16,5,'#39704e');
    fill(x+1,y+8,2,5,'#275e46');
    fill(x+3,y+2,2,11,'#90c37b');
    fill(x+6,y+6,2,7,'#72ad6d');
    fill(x+9,y+1,2,12,'#a9d187');
    fill(x+12,y+5,2,8,'#77b66e');
    fill(x+3,y+11,10,2,'#2f694b');
    fill(x+5,y+3,1,3,'#d1dfa0');
    if(variant%7===0){
      fill(x+12,y+3,2,2,'#f1d28f');
      fill(x+13,y+1,1,2,'#fff4ba');
    }
  };
  for(let ty=0;ty<6;ty++)for(let tx=0;tx<10;tx++)
    tuft(222+tx*16,120+ty*16,hash(tx,ty)%23);
  // East and north boundary decorated with dark hedge lips.
  fill(217,115,170,4,'#31634a');
  fill(218,119,4,103,'#2d6048');
  fill(385,119,3,107,'#265940');
  fill(217,222,171,6,'#2e5c45');
  for(let x=222;x<386;x+=16){
    fill(x,116,10,2,'#699c6b');
    fill(x+4,227,8,2,'#628e5d');
  }
  // West opening looks like an actual worn gate in the tall grass.
  fill(215,182,20,28,'#987e5a');
  fill(218,184,17,23,'#c4b18b');
  fill(220,190,16,13,'#e3cb9e');
  for(let y=185;y<209;y+=6)fill(218,y,3,2,'#f1dda9');

  // 6. Tree clusters use well-defined GBA-style trunks + crowns, outlined
  // by dark foliage. They are composed by hand, not soft canvas circles.
  const tree=(x:number,y:number,scale=1)=>{
    const p=(xx:number,yy:number,w:number,h:number,c:string)=>
      fill(x+xx*scale,y+yy*scale,w*scale,h*scale,c);
    p(-4,-1,10,17,'#5f6242');
    p(-3,0,7,13,'#846f4e');
    p(-1,4,2,7,'#b19a64');
    p(-18,-16,37,18,'#214e3f');
    p(-21,-11,42,10,'#2b5b42');
    p(-17,-25,36,17,'#2e6849');
    p(-13,-32,29,15,'#3a7c51');
    p(-8,-37,21,12,'#569663');
    p(-13,-29,11,6,'#46895c');
    p(2,-33,11,4,'#95c37c');
    p(-8,-34,6,2,'#83b878');
    p(9,-26,6,8,'#629f68');
    p(-18,-13,7,6,'#235942');
    p(-2,-7,19,4,'#26583f');
    p(15,-14,6,3,'#366b4b');
  };
  // Background treeline covers the old monotonous stone wall.
  for(const [x,y] of [[12,48],[45,42],[76,44],[111,38],[217,46],
    [250,45],[287,45],[324,43],[358,48],[463,140],
    [463,176],[460,210],[18,270],[48,267],[77,268],
    [238,268],[267,268],[297,268],[332,268],[363,269],
    [459,277],[425,266]] as Point[])tree(x,y);

  // 7. Construct real 3/4-perspective pixel buildings with readable roof
  // caps, ridge highlights, tile rows, side walls and a recessed door.
  type Kind='healing'|'home'|'gym';
  function building(
    x:number,y:number,w:number,h:number,
    kind:Kind
  ){
    const center=x+w/2;
    const color=kind==='healing'?C.red:
      kind==='home'?C.blue:C.slate;
    const light=kind==='healing'?C.redHi:
      kind==='home'?C.blueHi:C.slateHi;
    const dark=kind==='healing'?C.redShadow:
      kind==='home'?C.blueShadow:C.slateDark;
    // House shadow sits on grass but is never a walking blocker.
    fill(x-6,y+h-5,w+13,13,'#557d5b');
    fill(x-3,y+18,w+7,h-13,C.timberDark);
    // Side wall: shaded left and lighter front facade.
    fill(x-3,y+22,9,h-25,'#b0a387');
    fill(x+4,y+21,w-6,h-21,C.wall);
    fill(x+8,y+24,w-12,h-28,C.wallLight);
    for(let yy=y+28;yy<y+h-4;yy+=9){
      fill(x+6,yy,w-10,1,C.wallShadow);
      for(let xx=x+8+(yy%2?5:0);xx<x+w-8;xx+=16){
        fill(xx,yy+1,1,5,'#d3c5a5');
      }
    }
    // Thick red/blue/stone tiled roof with terraced overhang.
    fill(x-10,y+15,w+20,8,C.dark);
    fill(x-9,y+15,w+18,5,dark);
    fill(x-8,y+9,w+16,11,color);
    fill(x-6,y+3,w+12,12,color);
    fill(x-2,y-3,w+4,9,color);
    fill(x+5,y-9,w-10,7,dark);
    fill(x+9,y-12,w-18,5,light);
    fill(x-4,y+1,w+8,3,light);
    fill(x-6,y+12,w+12,2,light);
    for(let yy=y+5;yy<y+18;yy+=6){
      fill(x-4,yy,w+8,2,dark);
      fill(x,yy-2,w,1,light);
      for(let xx=x+5+(yy%4)*3;xx<x+w-6;xx+=13){
        fill(xx,yy+2,2,3,dark);
        fill(xx+2,yy+2,7,1,light);
      }
    }
    fill(x-10,y+21,w+20,4,C.dark);
    fill(x-8,y+23,w+16,3,light);
    // Two correctly framed crystalline window sets.
    function window(cx:number){
      fill(cx-9,y+33,19,20,C.timberDark);
      fill(cx-7,y+35,15,15,C.cream);
      fill(cx-6,y+36,13,13,'#3d788b');
      fill(cx-5,y+37,5,10,'#8bc8d2');
      fill(cx+2,y+37,4,10,'#67afbd');
      fill(cx,y+36,2,13,'#f6ead0');
      fill(cx-6,y+42,13,2,C.cream);
      fill(cx-10,y+51,21,3,'#ad9a79');
      fill(cx-8,y+50,17,1,'#f1dfb9');
    }
    window(x+15);window(x+w-16);
    // A real recessed doorway, larger than a single black rectangle.
    fill(center-12,y+31,25,h-29,C.timberDark);
    fill(center-9,y+33,18,h-32,'#546960');
    fill(center-7,y+35,14,h-36,kind==='gym'?'#374646':'#537770');
    fill(center-5,y+38,4,7,'#93b7ac');
    fill(center+4,y+46,2,2,C.gold);
    fill(center-14,y+h,29,4,C.earthDark);
    fill(center-10,y+h+1,21,3,C.earthTop);
    // Strongly distinguish each building through proper roof emblems.
    if(kind==='healing'){
      fill(center-13,y-4,27,22,'#5b5657');
      fill(center-11,y-6,23,20,C.cream);
      fill(center-4,y-3,9,14,'#d45b5c');
      fill(center-8,y+2,17,5,'#d45b5c');
      fill(center-3,y-1,7,11,'#f39b89');
      fill(center-8,y+2,17,2,'#dc6e69');
    }else if(kind==='home'){
      fill(center-12,y-4,25,17,dark);
      fill(center-10,y-5,21,14,C.cream);
      fill(center-8,y-3,17,9,'#87b1a0');
      fill(center-2,y-2,6,8,'#587d83');
      fill(center-11,y+11,24,2,light);
    }else{
      fill(center-24,y-3,49,19,'#505d62');
      fill(center-21,y-5,43,17,C.cream);
      fill(center-18,y-2,37,12,'#8b887e');
      for(let j=-1;j<=1;j++){
        fill(center+j*12-3,y+1,6,9,'#e0cfab');
        fill(center+j*12-2,y+1,2,9,'#fff0cd');
      }
      fill(center-25,y+15,51,3,C.gold);
    }
    // Flower boxes, handmade pots and wooden porch details.
    for(const side of [-1,1]){
      const fx=side<0?x+7:x+w-9;
      fill(fx-5,y+h-10,12,6,C.timber);
      fill(fx-4,y+h-13,10,4,C.leafMid);
      fill(fx-1,y+h-17,4,5,C.leafLight);
      fill(fx+3,y+h-15,3,3,kind==='healing'?'#f6b6a4':'#f2d48f');
      fill(fx-3,y+h-15,2,2,'#fff1be');
    }
    // Doorstep remains south of the building collision footprint.
    fill(center-13,y+h+5,27,2,'#eee0b5');
    fill(center-10,y+h+7,21,2,'#aa9677');
  }
  building(25,69,68,65,'healing');
  building(128,72,68,65,'home');
  building(392,42,76,63,'gym');

  // 8. Route furniture: signposts, porch fences, planter boxes, flowers.
  // Keep all collision and access points free for keyboard and mouse.
  const sign=(x:number,y:number,paint:string)=>{
    fill(x+7,y+14,4,14,C.timberDark);
    fill(x,y+2,19,15,C.timberDark);
    fill(x+2,y,17,14,C.cream);
    fill(x+4,y+2,13,8,paint);
    fill(x+3,y+12,15,2,'#a08b6f');
    fill(x+4,y+14,2,2,'#fff6d4');
  };
  sign(199,164,'#59946c');
  sign(368,137,'#b39b78');
  sign(108,193,'#d76c66');
  // Short waist-high fence: visual guidance without long impassable walls.
  const fence=(x:number,y:number,sections:number)=>{
    fill(x,y+6,sections*10,2,'#e1cc9e');
    fill(x,y+11,sections*10,2,'#a28562');
    for(let j=0;j<=sections;j++){
      fill(x+j*10,y+2,4,16,'#7a6049');
      fill(x+j*10+1,y,2,13,'#f2ddb0');
      fill(x+j*10,y+2,4,2,'#fff2cb');
    }
  };
  fence(18,137,7);
  fence(119,144,7);
  fence(305,241,5);
  // Low flower beds around the town, never over the road.
  const flowerbed=(x:number,y:number,count:number,seed:number)=>{
    for(let k=0;k<count;k++){
      const xx=x+k*7,shade=(k+seed)%3;
      fill(xx,y+4,8,5,'#437b54');
      fill(xx+1,y+1,6,5,shade===0?'#edc087':
        shade===1?'#e9a9b6':'#f6e3a3');
      fill(xx+3,y,2,2,'#fff3c7');
      fill(xx+6,y+5,2,3,'#307047');
    }
  };
  flowerbed(23,138,6,1);
  flowerbed(127,142,7,2);
  flowerbed(16,255,9,0);
  flowerbed(240,252,11,3);
  // Border stones emphasize routes toward grass and the gym.
  for(const [x,y] of [[204,183],[210,212],[385,221],[401,108],
    [441,117],[75,193],[119,204],[366,220]] as Point[]){
    fill(x,y,8,4,'#817c65');
    fill(x+1,y-1,6,3,'#c6bda0');
    fill(x+2,y,2,1,'#f8e8c3');
  }
}
