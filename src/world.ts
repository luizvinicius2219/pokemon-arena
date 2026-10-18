import Phaser from 'phaser';
import type { MobileControls } from './mobileControls';
import {
  getActivePokemon,loadCollection
} from './playerCollection';
import {
  loadStoryProgress,nextStoryObjective,updateStoryProgress,
  type StoryProgress
} from './storyProgress';
import {
  rollSafariEncounter,setWildEncounter,type WildEncounter
} from './encounters';
import { pokemonCatalog } from './pokemonCatalog';
import type { Fighter } from './abilities';

const PARTNER:Record<string,{number:string;width:number;height:number}>={
  charmander:{number:'0004',width:32,height:40},
  charmeleon:{number:'0005',width:32,height:56},
  bulbasaur:{number:'0001',width:32,height:40},
  ivysaur:{number:'0002',width:32,height:32},
  squirtle:{number:'0007',width:32,height:32},
  wartortle:{number:'0008',width:24,height:40}
};

/**
 * Compact, free-roaming Safari Route rather than a linear NPC quest.
 * Its map is pixel-painted once into a single static Phaser canvas texture.
 * Grass movement, encounters and touch actions cost no tilemap redraw.
 */
export class WorldScene extends Phaser.Scene{
  private player=new Phaser.Math.Vector2(190,425);
  private following=new Phaser.Math.Vector2(147,448);
  private hero?:Phaser.GameObjects.Image;
  private partner?:Phaser.GameObjects.Image;
  private heroShadow?:Phaser.GameObjects.Ellipse;
  private partnerShadow?:Phaser.GameObjects.Ellipse;
  private keys?:Record<string,Phaser.Input.Keyboard.Key>;
  private objective?:Phaser.GameObjects.Text;
  private info?:Phaser.GameObjects.Text;
  private message?:Phaser.GameObjects.Text;
  private actionLabel?:Phaser.GameObjects.Text;
  private modal?:Phaser.GameObjects.Container;
  private progress:StoryProgress=loadStoryProgress();
  private lastSave=0;
  private lastEncounterAt=0;
  private wildSteps=0;
  private actionHeld=false;
  private facing=0;
  private speechSerial=0;
  private species:Fighter='charmander';

  constructor(
    private readonly mobile:MobileControls,
    private readonly enterBattle:(mode:'practice'|'story'|'wild')=>void,
    private readonly menuOpen:()=>boolean=()=>false
  ){super({key:'World'});}

  preload(){
    const root='/assets/story/pewter/';
    this.load.spritesheet('safari-red',root+'red-overworld.png',
      {frameWidth:16,frameHeight:32});
    this.load.spritesheet('safari-trainer',root+'hiker-overworld.png',
      {frameWidth:16,frameHeight:32});
    this.species=getActivePokemon(loadCollection()).species;
    const texture=PARTNER[this.species]??PARTNER.charmander;
    this.load.spritesheet('safari-partner-'+this.species,
      'https://raw.githubusercontent.com/PMDCollab/SpriteCollab/master/sprite/'+
      texture.number+'/Idle-Anim.png',
      {frameWidth:texture.width,frameHeight:texture.height});
    for(const [name,number] of [['rattata',19],['jigglypuff',39],['pikachu',25]] as const){
      this.load.image('safari-icon-'+name,
        'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/'+number+'.png');
    }
  }

  create(){
    this.progress=loadStoryProgress();
    this.species=getActivePokemon(loadCollection()).species;
    this.player.set(this.progress.lastX,this.progress.lastY);
    this.following.set(this.player.x-38,this.player.y+23);
    this.mobile.setFinished(false);
    this.cameras.main.setBackgroundColor('#274a41');
    this.drawMap();
    this.keys=this.input.keyboard?.addKeys(
      'W,A,S,D,UP,DOWN,LEFT,RIGHT,E,SPACE'
    ) as Record<string,Phaser.Input.Keyboard.Key>|undefined;
    this.heroShadow=this.add.ellipse(this.player.x,this.player.y+12,
      33,10,0x142d2a,0.45).setDepth(3);
    this.hero=this.add.image(this.player.x,this.player.y-31,
      'safari-red',0).setDisplaySize(48,95).setDepth(6);
    this.partnerShadow=this.add.ellipse(this.following.x,
      this.following.y+11,30,8,0x1c4132,0.43).setDepth(3);
    if(this.textures.exists('safari-partner-'+this.species)){
      this.partner=this.add.image(this.following.x,
        this.following.y-23,'safari-partner-'+this.species,0)
        .setDisplaySize(72,83).setDepth(5);
    }else{
      this.partner=this.add.circle(
        this.following.x,this.following.y-15,26,0xeaa87e,1
      ) as unknown as Phaser.GameObjects.Image;
    }
    this.add.text(27,19,'ZONA SAFARI  ·  KANTO',{
      fontSize:'24px',fontStyle:'bold',color:'#f7e3b9',
      stroke:'#203b3d',strokeThickness:5
    }).setDepth(19);
    this.info=this.add.text(28,52,'',{
      fontSize:'16px',fontStyle:'bold',color:'#dcf0cf',
      stroke:'#1d3936',strokeThickness:4
    }).setDepth(19);
    this.add.rectangle(480,543,924,62,0x132b2b,0.94)
      .setStrokeStyle(2,0xc3a67e).setDepth(18);
    this.objective=this.add.text(35,515,'',{
      fontSize:'16px',fontStyle:'bold',color:'#fff0ca',
      stroke:'#122d30',strokeThickness:3,
      wordWrap:{width:710}
    }).setDepth(20);
    this.message=this.add.text(35,551,'',{
      fontSize:'13px',color:'#d3e6da',
      stroke:'#122d30',strokeThickness:3,
      wordWrap:{width:708}
    }).setDepth(20);
    const hit=this.add.rectangle(843,510,193,49,0x286a60,0.98)
      .setStrokeStyle(2,0xf5dbb5).setDepth(21)
      .setInteractive({useHandCursor:true});
    this.actionLabel=this.add.text(843,510,'INTERAGIR',{
      fontSize:'18px',fontStyle:'bold',color:'#fff4d1'
    }).setOrigin(0.5).setDepth(22);
    hit.on('pointerdown',()=>this.interact());
    hit.on('pointerover',()=>hit.setFillStyle(0x36786b));
    hit.on('pointerout',()=>hit.setFillStyle(0x286a60));
    this.refresh();
    this.say('Livre para explorar: mato alto, treinos e ginásio de Brock.',4200);
    this.lastEncounterAt=this.time.now+3500;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{
      updateStoryProgress({lastX:this.player.x,lastY:this.player.y});
      this.mobile.clear();
    });
  }

  private drawMap(){
    const key='safari-kanto-free-roam-v2';
    if(!this.textures.exists(key)){
      const cv=document.createElement('canvas');
      cv.width=480;cv.height=288;
      const g=cv.getContext('2d');
      if(!g)return;
      g.imageSmoothingEnabled=false;
      const rect=(x:number,y:number,w:number,h:number,c:string)=>{
        g.fillStyle=c;g.fillRect(x,y,w,h);
      };
      let seed=20261019;
      const rnd=()=>{
        seed=(Math.imul(seed,1664525)+1013904223)>>>0;
        return seed/4294967296;
      };
      rect(0,0,480,288,'#53795a');
      for(let y=0;y<288;y+=12)for(let x=0;x<480;x+=12){
        rect(x,y,12,12,
          ['#638b62','#5b865e','#6b9064','#608761'][
            Math.floor(rnd()*4)]);
        if(rnd()>0.69)rect(x+4,y+5,2,3,'#95b57c');
        if(rnd()>0.83)rect(x+9,y+2,2,2,'#365d4c');
      }
      // Distant slate cliffs and low mountains give this zone a border.
      for(let x=0;x<480;x+=24){
        rect(x,0,24,33,x%48===0?'#405750':'#384d47');
        rect(x+3,4,18,5,'#617368');
        rect(x+1,27,22,7,'#293f3d');
      }
      // Open paths connect to wild grass, a roaming trainer and the gym.
      rect(0,212,480,31,'#9a9175');
      rect(0,219,480,16,'#c7b28d');
      rect(177,104,26,134,'#a7997d');
      rect(182,104,17,129,'#d0bb96');
      rect(385,54,28,190,'#a39478');
      rect(390,59,18,171,'#d3bb91');
      for(let y=105;y<236;y+=17){
        rect(182,y,17,1,'#aa9878');
        rect(391,y+7,17,1,'#aa9878');
      }
      for(let x=0;x<480;x+=16){
        rect(x+2,224,12,2,'#e0cba6');
        rect(x+7,237,9,1,'#857b68');
      }
      // Wild-tall-grass clearing. Repeated slender tufts, each tile shaded.
      rect(216,117,169,107,'#3f7656');
      rect(221,121,160,99,'#4f9166');
      for(let y=124;y<218;y+=10)for(let x=221;x<381;x+=11){
        const shift=(y/10|0)%2===0?0:4;
        const xx=x+shift;
        rect(xx,y,9,9,['#3e825b','#4b9162','#357753'][
          Math.floor(rnd()*3)]);
        rect(xx+3,y-5,2,12,'#8eb876');
        rect(xx+6,y-2,2,9,'#a7c781');
        rect(xx+1,y+5,8,1,'#2d6c4c');
      }
      // Fewer obscuring tree canopies to keep navigation clear.
      const trees=[[15,44],[58,49],[98,33],[130,46],[210,48],
        [259,43],[322,49],[352,38],[11,142],[32,155],
        [71,125],[103,128],[145,143],[19,266],[65,264],
        [135,271],[228,265],[283,272],[333,261],[469,264],
        [456,166],[469,126]];
      for(const [x,y] of trees){
        rect(x-10,y+4,21,15,'#254b40');
        rect(x-15,y-10,31,21,'#33684d');
        rect(x-10,y-23,22,16,'#528963');
        rect(x-7,y-20,11,3,'#87b580');
        rect(x-4,y+8,9,3,'#204037');
      }
      // Wooden Safari rest cabin on the west of the path.
      rect(28,78,100,75,'#384a41');
      rect(33,85,91,65,'#bca783');
      rect(25,68,107,48,'#4b5a4b');
      rect(29,64,99,41,'#748067');
      for(let y=72;y<107;y+=7)rect(33,y,92,2,'#a5aa7d');
      rect(57,112,35,37,'#8e7054');
      rect(65,117,20,31,'#364b46');
      rect(105,117,14,16,'#6d9a93');
      // Stone gym on the top right with central visible doorway.
      rect(386,30,87,76,'#303e40');
      rect(391,35,78,72,'#8f8c80');
      rect(384,25,92,31,'#555c55');
      rect(389,23,82,22,'#9fa58d');
      rect(396,50,67,54,'#b8a98c');
      rect(418,67,32,37,'#304443');
      rect(423,71,23,35,'#1a3537');
      rect(432,104,6,7,'#e9c48c');
      rect(401,107,57,6,'#625f54');
      // A natural pond accents the left of the route.
      rect(18,151,66,46,'#385f68');
      rect(22,152,60,42,'#347781');
      rect(26,157,52,34,'#4c94a1');
      for(let j=0;j<15;j++){
        const xx=28+Math.floor(rnd()*43),yy=158+Math.floor(rnd()*29);
        rect(xx,yy,6,2,'#96c3bc');
      }
      // Guidepost at the edge of the grassy Safari biome.
      rect(201,142,3,24,'#615b49');
      rect(193,139,21,13,'#b39e7a');
      rect(195,141,17,8,'#ead1a4');
      rect(199,144,9,2,'#776547');
      for(let j=0;j<32;j++){
        const x=223+Math.floor(rnd()*152);
        const y=121+Math.floor(rnd()*98);
        if(rnd()>0.65)rect(x,y,2,2,'#d4ba8d');
      }
      this.textures.addCanvas(key,cv);
    }
    this.add.image(480,288,key).setDisplaySize(960,576).setDepth(0);
    const label=(x:number,y:number,value:string,color='#fff0c8')=>
      this.add.text(x,y,value,{
        fontSize:'14px',fontStyle:'bold',color,
        stroke:'#193b3c',strokeThickness:4
      }).setOrigin(0.5).setDepth(9);
    label(114,416,'PONTO DE PARTIDA');
    label(573,245,'MATO ALTO  ·  TREINAR');
    label(351,338,'ROTA 1');
    label(848,236,'GINÁSIO DE BROCK');
    label(351,370,'TREINADOR');
    this.add.ellipse(347,408,34,10,0x1f392f,0.48).setDepth(2);
    this.add.image(347,377,'safari-trainer',0)
      .setDisplaySize(47,86).setDepth(4);
  }

  private refresh(){
    const pokemon=getActivePokemon(loadCollection());
    const evolved=pokemon.level>=16;
    const prompt=pokemon.level<16
      ?' · Evolução no Nv 16':' · Forma evoluída';
    this.info?.setText(
      pokemon.nickname.toUpperCase()+'  ·  Nv '+pokemon.level+
      '  ·  '+pokemon.experience+' XP'+prompt
    );
    this.objective?.setText('OBJETIVO  ·  '+nextStoryObjective(this.progress));
  }

  private say(value:string,duration=3700){
    this.message?.setText(value);
    const id=++this.speechSerial;
    this.time.delayedCall(duration,()=>{
      if(id===this.speechSerial&&this.sys.isActive())
        this.message?.setText(
          'Mova-se no mato alto, escolha TREINAR ou desafie o ginásio.'
        );
    });
  }

  private inGrass(){
    return this.player.x>444&&this.player.x<770&&
      this.player.y>245&&this.player.y<449;
  }
  private near(x:number,y:number,distance:number){
    return Phaser.Math.Distance.Between(this.player.x,this.player.y,x,y)
      <distance;
  }
  private interact(){
    if(this.modal||this.menuOpen())return;
    if(this.inGrass()||this.near(590,350,85)){
      this.openEncounter();
    }else if(this.near(347,404,94)){
      this.say('Treinador da rota: vamos praticar! Vitória vale 220 XP.',1100);
      this.enterBattle('practice');
    }else if(this.near(864,227,117)){
      this.progress=updateStoryProgress({enteredGym:true});
      this.enterBattle('story');
    }else if(this.near(146,406,90)){
      this.say('Você está pronto. Treine no mato alto ou explore livremente.');
    }else{
      this.say('Entre no mato alto para TREINAR ou siga para o ginásio.');
    }
  }

  private openEncounter(){
    if(this.modal||this.menuOpen())return;
    this.lastEncounterAt=this.time.now;
    this.wildSteps=0;
    this.progress=updateStoryProgress({visitedRoute:true});
    this.refresh();
    const roll=rollSafariEncounter();
    const species=pokemonCatalog[roll.species];
    const screen=this.add.container(480,279).setDepth(35);
    screen.add(this.add.rectangle(0,0,700,374,0x10272a,0.97)
      .setStrokeStyle(4,0xb4d6ab));
    screen.add(this.add.text(0,-145,'ENCONTRO NO MATO ALTO',{
      fontSize:'24px',fontStyle:'bold',color:'#ffe4a7'
    }).setOrigin(0.5));
    if(this.textures.exists('safari-icon-'+roll.species)){
      screen.add(this.add.image(0,-39,'safari-icon-'+roll.species)
        .setDisplaySize(135,135));
    }else{
      screen.add(this.add.circle(0,-40,49,0x658767));
    }
    screen.add(this.add.text(0,46,
      species.name.toUpperCase()+' · Nv '+roll.level,{
        fontSize:'27px',fontStyle:'bold',color:'#e8fbe7'
      }).setOrigin(0.5));
    screen.add(this.add.text(0,84,
      roll.species==='pikachu'?'ENCONTRO RARO! ⚡':'Vença para receber XP.',{
        fontSize:'15px',color:'#e7d3b4'
      }).setOrigin(0.5));
    const button=(x:number,label:string,color:number,click:()=>void)=>{
      const hit=this.add.rectangle(x,145,238,56,color,0.94)
        .setStrokeStyle(2,0xece2c3)
        .setInteractive({useHandCursor:true});
      const title=this.add.text(x,145,label,{
        fontSize:'21px',fontStyle:'bold',color:'#fff8dc'
      }).setOrigin(0.5);
      hit.on('pointerdown',click);
      screen.add([hit,title]);
    };
    button(-143,'⚔ BATALHAR',0x2e7969,()=>{
      setWildEncounter(roll);
      screen.destroy(true);
      this.modal=undefined;
      this.enterBattle('wild');
    });
    button(143,'↩ FUGIR',0x65594e,()=>{
      screen.destroy(true);
      this.modal=undefined;
      this.say('Você saiu do encontro. Continue explorando.');
    });
    this.modal=screen;
    this.mobile.clear();
  }

  private blocked(x:number,y:number){
    if(x<37||x>923||y<80||y>496)return true;
    // The cabin and gym walls stop collisions; grass never does.
    return(x>50&&x<261&&y>129&&y<302)||
      (x>771&&x<948&&y>49&&y<199);
  }

  update(time:number,delta:number){
    if(this.menuOpen()||this.modal)return;
    const dt=Math.min(delta/1000,0.05);
    let vx=0,vy=0;
    const keys=this.keys;
    if(keys){
      if(keys.A?.isDown||keys.LEFT?.isDown)vx--;
      if(keys.D?.isDown||keys.RIGHT?.isDown)vx++;
      if(keys.W?.isDown||keys.UP?.isDown)vy--;
      if(keys.S?.isDown||keys.DOWN?.isDown)vy++;
      if(Phaser.Input.Keyboard.JustDown(keys.E)||
        Phaser.Input.Keyboard.JustDown(keys.SPACE))this.interact();
    }
    if(this.mobile.active){
      const stick=this.mobile.axis;
      if(Math.hypot(stick.x,stick.y)>0.11){
        vx=stick.x;vy=stick.y;
      }
    }
    const active=this.mobile.active&&this.mobile.isPressed('q');
    if(active&&!this.actionHeld)this.interact();
    this.actionHeld=active;
    const len=Math.hypot(vx,vy);
    if(len>0.1){
      vx/=Math.max(1,len);vy/=Math.max(1,len);
      const dx=vx*196*dt,dy=vy*196*dt;
      if(!this.blocked(this.player.x+dx,this.player.y))
        this.player.x+=dx;
      if(!this.blocked(this.player.x,this.player.y+dy))
        this.player.y+=dy;
      if(Math.abs(vx)>Math.abs(vy))
        this.facing=vx>0?3:2;
      else this.facing=vy>0?0:1;
      this.hero?.setFrame([0,3,6,9][this.facing]+
        Math.floor(time/180)%3);
      if(this.inGrass()){
        this.wildSteps+=Math.hypot(dx,dy);
        if(this.wildSteps>190&&time-this.lastEncounterAt>8500){
          this.wildSteps=0;
          this.lastEncounterAt=time;
          if(Math.random()<0.55){
            this.openEncounter();
            return;
          }
        }
      }
    }else this.hero?.setFrame([0,3,6,9][this.facing]);
    const bob=len>0.1?Math.abs(Math.sin(time*0.013))*1.2:0;
    this.hero?.setPosition(this.player.x,this.player.y-31-bob);
    this.heroShadow?.setPosition(this.player.x,this.player.y+12);
    const toward=new Phaser.Math.Vector2(
      this.player.x-this.following.x,
      this.player.y-this.following.y
    );
    if(toward.length()>54){
      const distance=toward.length();
      this.following.add(toward.normalize().scale(
        Math.min(distance,dt*164)
      ));
    }
    this.partner?.setPosition(this.following.x,this.following.y-24);
    this.partnerShadow?.setPosition(this.following.x,this.following.y+11);
    if(this.actionLabel){
      const title=this.inGrass()?'TREINAR':
        this.near(864,227,117)?'BROCK':
        this.near(347,404,94)?'BATALHAR':'INTERAGIR';
      if(this.actionLabel.text!==title)this.actionLabel.setText(title);
    }
    if(time-this.lastSave>4000){
      this.lastSave=time;
      updateStoryProgress({
        lastX:this.player.x,lastY:this.player.y,
        visitedRoute:this.progress.visitedRoute||this.inGrass()
      });
      this.refresh();
    }
  }
}
