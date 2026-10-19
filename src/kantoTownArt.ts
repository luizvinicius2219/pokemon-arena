/**
 * Aurora / Kanto-inspired town art built from a tight 16px tile language.
 * Nothing is drawn by the GPU each frame: the whole map is cached as ONE
 * 480x288 texture, scaled exactly 2x by Phaser, with nearest-pixel sampling.
 *
 * Distinct, deliberately placed buildings/roof edges/windows/signs make this
 * a readable village instead of random noise stamped across a green plane.
 */
export function paintKantoTown(ctx:CanvasRenderingContext2D):void{
  const g=ctx;
  g.imageSmoothingEnabled=false;
  const rect=(x:number,y:number,w:number,h:number,c:string)=>{
    g.fillStyle=c;
    g.fillRect(Math.round(x),Math.round(y),
      Math.round(w),Math.round(h));
  };
  const px=(x:number,y:number,c:string)=>rect(x,y,1,1,c);
  const tile=(x:number,y:number,a:string,b:string,seed:number)=>{
    rect(x,y,16,16,a);
    rect(x,y,16,1,b);
    if(seed%4===0){
      rect(x+3,y+10,2,3,'#6a9b67');
      rect(x+7,y+8,2,5,'#7dac73');
      rect(x+11,y+11,2,2,'#416d55');
    }else if(seed%7===0){
      rect(x+6,y+7,1,3,'#3d6b52');
      rect(x+8,y+8,2,2,'#93bd78');
    }
  };
  // The ground uses clean, reusable 16x16 tiles and a fixed palette.
  for(let y=0;y<288;y+=16)for(let x=0;x<480;x+=16){
    const hash=((x*37+y*73)/16|0)>>>0;
    const variants=['#7fa76c','#82aa70','#7ca468','#86ad74'];
    tile(x,y,variants[hash%4],
      hash%3===0?'#8ab478':'#77a269',hash);
  }
  // North edge is a layer of believable gray stone cliffs, not a wall of
  // identical rectangles. Short ledges and exposed faces form 16px blocks.
  for(let x=0;x<480;x+=16){
    const step=(x/16|0)%5===0?4:0;
    rect(x,0,16,24+step,'#385a56');
    rect(x,0,16,5,'#617c70');
    rect(x+2,3,12,2,'#8a9f82');
    rect(x+1,8,14,1,'#263f44');
    rect(x,16,16,9+step,'#455c58');
    rect(x+1,18,4,5,'#57716b');
    rect(x+10,17,5,3,'#293e42');
    rect(x,25+step,16,3,'#2c4946');
  }

  // Road stones are 8x8 blocks, with breaks that read as actual pavement.
  const paving=(x:number,y:number,w:number,h:number)=>{
    rect(x-3,y-3,w+6,h+6,'#78956e');
    rect(x,y,w,h,'#c8b88e');
    rect(x+2,y+2,w-4,h-4,'#cfbc93');
    for(let row=0;row<h;row+=12){
      for(let col=0;col<w;col+=20){
        const xx=x+col+(row%24===0?0:9);
        const ww=Math.min(17,w-col-1);
        if(ww>0)rect(xx,y+row,ww,1,'#b9a784');
        if((row+col)%36===0)rect(xx+3,y+row+5,5,1,'#eee0b5');
      }
    }
    rect(x,y,w,2,'#e2d3a7');
    rect(x,y+h-2,w,2,'#a89476');
  };
  paving(0,202,480,42);            // continuous safe east-west path
  paving(91,92,23,139);            // west town walking corridor
  paving(173,153,30,90);           // trainer junction
  paving(389,97,37,140);           // Brock approach
  paving(200,167,28,30);           // route entrance connection
  // Town square is a composed layer of tidy sandstone.
  rect(82,198,129,51,'#adab80');
  for(let y=202;y<247;y+=12)for(let x=82;x<211;x+=14){
    rect(x+1,y+1,12,10,'#cabd96');
    rect(x+2,y+2,10,7,(x+y)%3?'#d7c8a2':'#c5b58e');
    rect(x+2,y+9,10,1,'#aa9d7f');
  }

  // Tall grass is a coherent high-contrast region, with recognisable
  // 16x16 tuft tiles. The left and top borders use darker vegetation.
  rect(219,117,166,108,'#386d4a');
  rect(223,121,158,100,'#508a5c');
  for(let ty=122;ty<220;ty+=12)for(let tx=223;tx<381;tx+=12){
    const hash=((tx*11+ty*17)/12|0)%5;
    rect(tx,ty,12,12,
      ['#548e5b','#4d8b5c','#468255','#5b9963','#4a8558'][hash]);
    // angular stalks with a one-pixel dark base and two shades of leaves
    rect(tx+2,ty+4,2,8,'#255f46');
    rect(tx+4,ty,2,10,'#a2ca72');
    rect(tx+7,ty+4,2,8,'#286c4c');
    rect(tx+9,ty+1,2,9,'#81b96b');
    rect(tx+1,ty+9,10,2,'#2c704a');
    if(hash===0){
      rect(tx+4,ty+5,2,2,'#f0dd89');
      rect(tx+5,ty+4,1,1,'#fff4b3');
    }
  }
  rect(218,117,166,3,'#2e6348');
  rect(218,117,4,105,'#316c4b');
  rect(383,118,3,108,'#275c45');
  rect(218,223,167,4,'#2e6948');
  // The path into the grass has a clear break in the border.
  paving(203,188,34,21);
  rect(223,188,9,22,'#6b9e66');

  // Pond on the left: tiled outline, dark banks and reflected pixels.
  rect(13,148,78,49,'#3e704d');
  rect(16,149,73,45,'#4a7962');
  rect(18,151,69,41,'#2e6d81');
  rect(22,154,61,35,'#3f91a5');
  rect(26,155,53,27,'#55a2ac');
  for(let k=0;k<18;k++){
    const x=29+(k*23)%48,y=160+(k*17)%24;
    rect(x,y,6+(k%3),2,'#90d0d4');
  }
  rect(20,185,65,4,'#36788b');
  rect(16,193,74,3,'#345e54');
  // Little pier / fence makes the pond a place rather than blue noise.
  rect(70,184,29,7,'#866e51');
  for(let x=70;x<101;x+=8)rect(x,184,3,7,'#cfb684');
  rect(70,182,29,2,'#e1cc97');

  // Tree tile helper, constructed out of multiple pixelated canopy layers.
  const tree=(cx:number,cy:number)=>{
    rect(cx-4,cy-1,9,16,'#564b38');
    rect(cx-6,cy+9,13,3,'#313c36');
    rect(cx-14,cy-19,30,22,'#275b42');
    rect(cx-18,cy-12,38,10,'#285e45');
    rect(cx-12,cy-26,28,16,'#347450');
    rect(cx-8,cy-32,20,13,'#4c905f');
    rect(cx-12,cy-24,9,7,'#519666');
    rect(cx-3,cy-29,10,4,'#94bf7b');
    rect(cx+7,cy-21,5,7,'#6ca56e');
    rect(cx-16,cy-6,31,3,'#1e513c');
    rect(cx+10,cy-14,6,3,'#3a7752');
  };
  for(const [x,y] of [
    [14,59],[44,57],[74,51],[220,56],[251,53],[285,50],
    [322,57],[355,54],[460,143],[458,177],[461,201],
    [15,253],[45,259],[66,259],[245,262],[272,261],
    [306,259],[339,258],[458,267],[430,262]
  ])tree(x,y);

  // Signs with readable icons near route junction.
  const sign=(x:number,y:number,c:string)=>{
    rect(x+7,y+12,4,14,'#6d5840');
    rect(x+2,y+2,15,14,'#655845');
    rect(x,y,19,13,'#f0dfb2');
    rect(x+2,y+2,15,8,c);
    rect(x+2,y+10,15,2,'#735a42');
  };
  sign(204,161,'#64aa7a');
  sign(379,119,'#e8c087');

  // Pixel-art buildings with visible floors and brick walls.
  const building=(x:number,y:number,w:number,h:number,
    roof:string,roofShadow:string,style:'center'|'house'|'gym')=>{
    rect(x+1,y+5,w+7,h+8,'#305244'); // building drop shadow
    rect(x,y+23,w,h-24,'#e2d3b0');
    rect(x+2,y+27,w-4,h-28,'#dfceaa');
    for(let i=0;i<h-31;i+=10){
      rect(x+1,y+28+i,w-2,1,'#b4a98c');
      for(let j=i%2?11:3;j<w-5;j+=18)
        rect(x+j,y+30+i,1,7,'#b8ae91');
    }
    rect(x-5,y+3,w+10,27,roofShadow);
    rect(x-8,y+12,w+16,13,roof);
    rect(x-4,y-3,w+8,21,roof);
    rect(x+1,y-7,w-2,6,roofShadow);
    rect(x+7,y-11,w-14,5,roof);
    for(let yy=y+3;yy<y+24;yy+=7){
      rect(x-3,yy,w+6,2,roofShadow);
      rect(x+3,yy-2,w-6,1,'#ffdfa4');
    }
    rect(x-8,y+24,w+16,4,'#554a43');
    rect(x-6,y+28,w+12,2,'#f9e8bc');
    rect(x+1,y+h-7,w,7,'#75694f');
    rect(x+3,y+h-9,w-4,4,'#efe0b8');
    // Distinct blue windowpanes, symmetrical.
    const windowAt=(xx:number)=>{
      rect(xx-1,y+33,15,16,'#5a665c');
      rect(xx+1,y+35,11,11,'#659cad');
      rect(xx+2,y+36,4,7,'#a8d4d2');
      rect(xx+7,y+36,2,11,'#ddebdc');
      rect(xx+1,y+42,11,2,'#e1eadb');
      rect(xx-2,y+49,17,2,'#9c866c');
    };
    windowAt(x+8);windowAt(x+w-22);
    // Door dark interior and sunlit bottom step.
    rect(x+w/2-9,y+35,18,h-35,'#5a5b4c');
    rect(x+w/2-7,y+38,14,h-38,'#38504e');
    rect(x+w/2-6,y+39,5,10,'#659294');
    rect(x+w/2+3,y+53,2,2,'#f3e6a8');
    rect(x+w/2-12,y+h,24,4,'#b9a78b');
    if(style==='center'){
      // Distinct PokéCenter-style cross emblem and red roof.
      rect(x+w/2-14,y+3,28,19,'#fbedd0');
      rect(x+w/2-7,y+8,14,9,'#bd534f');
      rect(x+w/2-2,y+5,4,16,'#bd534f');
      rect(x+w/2-14,y+21,28,2,'#8c6555');
    }
    if(style==='gym'){
      rect(x+w/2-23,y+3,46,21,'#ded8bb');
      rect(x+w/2-20,y+6,40,15,'#85785f');
      for(let k=-1;k<=1;k++){
        rect(x+w/2+k*9-2,y+9,5,9,'#eadab0');
      }
      rect(x+w/2-13,y+h-1,26,6,'#ad9773');
    }
    if(style==='house'){
      rect(x+w/2-9,y+7,18,13,'#eed7a1');
      rect(x+w/2-6,y+10,12,7,'#7b9d83');
      rect(x+w/2-1,y+11,3,5,'#d5edb3');
    }
    // A few flower patches outside, never in the walking corridor.
    for(const side of [-1,1]){
      const xx=side<0?x+6:x+w-7;
      rect(xx,y+h+6,4,5,'#3e8055');
      rect(xx-1,y+h+3,4,3,
        style==='center'?'#f5cfb4':'#eedf8b');
    }
  };
  building(28,72,65,65,'#c95a50','#7e4041','center');
  building(128,76,68,62,'#547f9b','#35566d','house');
  building(390,44,82,62,'#8b8993','#525863','gym');
  // Red roof alone is not enough: patterned stones around the clinic
  // and porch identify an orderly settlement.
  for(const [x,y] of [[21,133],[25,143],[84,140],[105,133],
    [120,139],[201,137],[388,115],[458,119]]){
    rect(x,y,6,4,'#d6c8a0');
    rect(x+1,y+1,4,1,'#eee0b6');
  }

  // Decorative waist-high fences and gardens are clear navigation borders.
  for(let x=17;x<115;x+=12){
    if(x>91&&x<113)continue;
    rect(x,140,3,13,'#785c43');
    rect(x+1,138,2,13,'#f8e8c8');
    rect(x,145,11,3,'#d5c49c');
  }
  for(let x=116;x<210;x+=14){
    rect(x,151,3,9,'#83654b');
    rect(x,148,3,8,'#f6e8c6');
    rect(x,152,14,2,'#d1bc9a');
  }
  // Route sign markers, Pokecenter door mat and clinic flowers.
  sign(116,199,'#a75f59');
  rect(75,216,11,4,'#97ac8c');
  for(let i=0;i<16;i++){
    const x=8+i*24,y=251+(i%3)*4;
    if(x>340&&x<460)continue;
    rect(x,y,3,4,'#3f8b56');
    rect(x-1,y-1,4,3,i%2?'#f5cdb7':'#f5e49c');
    px(x+1,y-2,'#fff6d0');
  }
}
