import Phaser from 'phaser';
import type { MobileControls } from './mobileControls';
import { getActivePokemon, loadCollection } from './playerCollection';
import {
  loadStoryProgress, nextStoryObjective, updateStoryProgress,
  type StoryProgress
} from './storyProgress';

/**
 * The first playable chunk of the journey. The whole 480x288 world is
 * painted once into one pixel-art canvas texture; no procedural floor
 * tiles, grass movement, or other full-screen redraw runs per frame.
 */
export class WorldScene extends Phaser.Scene {
  private position=new Phaser.Math.Vector2(190,425);
  private hero?:Phaser.GameObjects.Image;
  private partner?:Phaser.GameObjects.Image;
  private heroShadow?:Phaser.GameObjects.Ellipse;
  private partnerShadow?:Phaser.GameObjects.Ellipse;
  private keys?:Record<string,Phaser.Input.Keyboard.Key>;
  private message?:Phaser.GameObjects.Text;
  private objective?:Phaser.GameObjects.Text;
  private levelLabel?:Phaser.GameObjects.Text;
  private actionLabel?:Phaser.GameObjects.Text;
  private progress:StoryProgress=loadStoryProgress();
  private messageSerial=0;
  private wasTouching=false;
  private lastProgressSave=0;
  private facing=0;
  private following=new Phaser.Math.Vector2(148,445);
  private areaLabel?:Phaser.GameObjects.Text;

  constructor(
    private readonly mobile:MobileControls,
    private readonly enterArena:(mode:'practice'|'story')=>void
  ) {super({key:'World'});}

  preload(){
    const root='/assets/story/pewter/';
    this.load.spritesheet('world-red',root+'red-overworld.png',
      {frameWidth:16,frameHeight:32});
    this.load.spritesheet('world-professor',root+'camper-overworld.png',
      {frameWidth:16,frameHeight:32});
    this.load.spritesheet('world-trainer',root+'hiker-overworld.png',
      {frameWidth:16,frameHeight:32});
    this.load.spritesheet('world-charmander',
      'https://raw.githubusercontent.com/PMDCollab/SpriteCollab/master/sprite/0004/Idle-Anim.png',
      {frameWidth:32,frameHeight:40});
  }

  create(){
    this.progress=loadStoryProgress();
    this.mobile.setFinished(false);
    this.position.set(this.progress.lastX,this.progress.lastY);
    this.following.set(this.position.x-36,this.position.y+18);
    this.cameras.main.setBackgroundColor('#344d3b');
    this.drawWorldOnce();
    this.keys=this.input.keyboard?.addKeys(
      'W,A,S,D,UP,DOWN,LEFT,RIGHT,E,SPACE'
    ) as Record<string,Phaser.Input.Keyboard.Key>|undefined;
    this.heroShadow=this.add.ellipse(this.position.x,
      this.position.y+10,34,10,0x1b302d,0.46).setDepth(3);
    this.hero=this.add.image(this.position.x,this.position.y-31,
      'world-red',0).setDisplaySize(47,95).setDepth(5);
    this.partnerShadow=this.add.ellipse(this.following.x,
      this.following.y+7,29,9,0x18322a,0.35).setDepth(3);
    if(this.textures.exists('world-charmander')){
      this.partner=this.add.image(this.following.x,
        this.following.y-18,'world-charmander',0)
        .setDisplaySize(65,78).setDepth(5);
    }else{
      // Only used if the remote PMD image could not load.
      this.partner=this.add.image(this.following.x,
        this.following.y-17,'world-professor',0)
        .setDisplaySize(36,67).setTint(0xffa25e).setDepth(5);
    }
    this.add.text(24,14,'CAPÍTULO 1  ·  VILA AURORA',{
      fontSize:'21px',fontStyle:'bold',color:'#fff1c7',
      stroke:'#203334',strokeThickness:5
    }).setDepth(20);
    this.levelLabel=this.add.text(24,44,'',{
      fontSize:'15px',fontStyle:'bold',color:'#d4e5c4',
      stroke:'#283c32',strokeThickness:4
    }).setDepth(20);
    this.areaLabel=this.add.text(480,18,'MUNDO EM CONSTRUÇÃO • PRÓLOGO',{
      fontSize:'13px',fontStyle:'bold',color:'#e4ecda',
      stroke:'#28382e',strokeThickness:4
    }).setOrigin(0.5,0).setDepth(20);
    this.add.rectangle(480,541,910,56,0x162b2c,0.89)
      .setStrokeStyle(2,0xc7ae83).setDepth(18);
    this.objective=this.add.text(41,517,'',{
      fontSize:'17px',fontStyle:'bold',color:'#fff0cd',
      stroke:'#10252a',strokeThickness:3,
      wordWrap:{width:705}
    }).setDepth(20);
    this.message=this.add.text(41,552,'',{
      fontSize:'13px',color:'#cededa',
      stroke:'#142e32',strokeThickness:3,
      wordWrap:{width:730}
    }).setDepth(20);
    const button=this.add.rectangle(856,509,170,48,0x234c4f,0.94)
      .setStrokeStyle(2,0xf2d5a1).setDepth(21).setInteractive({
        useHandCursor:true
      });
    const label=this.add.text(856,509,'INTERAGIR',{
      fontSize:'17px',fontStyle:'bold',color:'#fff3d1'
    }).setOrigin(0.5).setDepth(22);
    this.actionLabel=label;
    button.on('pointerdown',()=>this.interact());
    button.on('pointerover',()=>button.setFillStyle(0x327176,0.96));
    button.on('pointerout',()=>button.setFillStyle(0x234c4f,0.94));
    this.refreshGoal();
    this.say(this.progress.metProfessor
      ?'Continue sua jornada. A rota leste leva até o primeiro ginásio.'
      :'Você chegou à Vila Aurora. Procure a pesquisadora perto do laboratório.',
      3700);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{
      updateStoryProgress({lastX:this.position.x,lastY:this.position.y});
      this.mobile.clear();
    });
  }

  private drawWorldOnce(){
    const key='vila-aurora-world-v1';
    if(!this.textures.exists(key)){
      const canvas=document.createElement('canvas');
      canvas.width=480;canvas.height=288;
      const g=canvas.getContext('2d');
      if(!g)return;
      g.imageSmoothingEnabled=false;
      const rect=(x:number,y:number,w:number,h:number,c:string)=>{
        g.fillStyle=c;g.fillRect(x,y,w,h);
      };
      let seed=20261018;
      const random=()=>{
        seed=(Math.imul(1664525,seed)+1013904223)>>>0;
        return seed/4294967296;
      };
      rect(0,0,480,288,'#567d5b');
      for(let y=0;y<288;y+=16)
        for(let x=0;x<480;x+=16){
          rect(x+1,y+1,14,14,['#658e65','#698c61','#628562',
            '#608860','#708d63'][Math.floor(random()*5)]);
          if(random()>0.57)rect(x+6,y+8,3,2,'#85a977');
          if(random()>0.76)rect(x+11,y+4,2,2,'#345b4b');
        }
      // Raised north cliffs frame the wild pathway.
      for(let x=0;x<480;x+=21){
        rect(x,0,21,26,x%42?'#364f48':'#3d554c');
        rect(x+2,3,16,4,'#627469');
        rect(x+1,22,20,5,'#253f3d');
      }
      // Stone pathways with intermittent cracks and warm highlights.
      rect(0,202,480,34,'#847b63');
      rect(0,206,480,24,'#b6a181');
      rect(211,66,28,176,'#968971');
      rect(215,69,20,166,'#c8b190');
      rect(312,95,26,145,'#a8987e');
      rect(315,99,20,133,'#d0b999');
      rect(410,56,27,149,'#a08f74');
      rect(414,56,19,151,'#c1aa86');
      // Garden walking-stones and subtle irregular brick lines.
      for(let x=0;x<480;x+=15){
        rect(x+2,206+(x%3),11,2,'#d7c5a1');
        rect(x+2,226-(x%4),12,1,'#746e5d');
      }
      for(let y=70;y<235;y+=18){
        rect(215,y,21,1,'#908672');
        rect(314,y+3,22,2,'#92826e');
        rect(412,y+6,23,1,'#95826d');
      }
      // Pond: open reflective pixels and mossy banks.
      rect(24,39,76,80,'#355f69');
      rect(29,39,66,82,'#387b84');
      rect(33,43,59,75,'#428a92');
      for(let i=0;i<20;i++){
        const x=35+Math.floor(random()*52),y=45+Math.floor(random()*65);
        rect(x,y,5+Math.floor(random()*7),2,'#69a8ac');
      }
      rect(22,39,7,80,'#71886b');
      rect(97,39,5,80,'#71886b');
      // Laboratory with top-down projecting roof and entrance.
      rect(113,63,91,70,'#334641');
      rect(117,69,82,62,'#aa9e83');
      rect(114,54,90,45,'#7d493d');
      rect(118,51,84,38,'#b8664b');
      for(let y=56;y<89;y+=7)rect(121,y,77,2,'#d48459');
      rect(144,89,29,43,'#e1c7a1');
      rect(149,96,20,30,'#435757');
      rect(149,107,20,4,'#e3d8b7');
      rect(125,101,13,16,'#6b9da7');rect(181,101,12,16,'#6b9da7');
      rect(126,102,11,2,'#e6e5bc');
      rect(114,129,89,6,'#5c5848');
      // Field hut / healing rest stop.
      rect(25,145,85,64,'#3f4f47');
      rect(30,153,74,53,'#d1b78b');
      rect(23,135,89,40,'#335d53');
      rect(28,139,80,30,'#538478');
      for(let y=145;y<169;y+=6)rect(34,y,69,2,'#78a18a');
      rect(62,169,17,32,'#e3bc8f');rect(67,177,10,21,'#594b3e');
      rect(35,178,13,13,'#557e7b');rect(92,178,10,12,'#557e7b');
      // The gym is beyond the wild path at the upper eastern cliff.
      rect(391,39,87,72,'#30383e');
      rect(395,44,78,63,'#707676');
      rect(390,35,87,30,'#696159');
      rect(394,32,79,23,'#afa080');
      rect(406,63,55,44,'#514b44');
      rect(409,68,49,35,'#b2a080');
      rect(418,81,29,26,'#26363b');
      rect(425,81,15,23,'#16292e');
      rect(430,101,7,6,'#d1b381');
      rect(406,108,50,5,'#514a3d');
      // Grassy route with a winding path and sturdy trees on its edges.
      for(let row=0;row<9;row++){
        for(let col=0;col<11;col++){
          const xx=258+col*12+(row%2)*3,yy=127+row*12;
          if(xx>397||yy>215)continue;
          const c=['#326e55','#357856','#43875d','#55946a'][Math.floor(random()*4)];
          rect(xx,yy,9,10,c);
          rect(xx+3,yy-3,2,10,'#a0bf82');
          rect(xx+5,yy+2,2,5,'#76a36e');
        }
      }
      // Rock trail toward the Pewter gate.
      for(let i=0;i<35;i++){
        const x=332+Math.floor(random()*75),y=82+Math.floor(random()*148);
        rect(x,y,3+(i%3),2,'#a4a69a');
        rect(x+1,y-2,2,1,'#e3d3a8');
      }
      // Evergreen groves give depth without expensive moving grass.
      for(const [x,y] of [
        [12,44],[5,120],[104,17],[260,38],[278,88],[355,35],
        [465,128],[448,159],[15,247],[64,260],[124,261],
        [167,254],[274,270],[360,264],[465,258],[449,250]
      ]){
        rect(x-12,y+1,25,19,'#213f38');
        rect(x-16,y-12,32,19,'#2e644f');
        rect(x-10,y-23,22,15,'#468460');
        rect(x-8,y-20,11,3,'#76a67a');
        rect(x-5,y+6,15,3,'#1c473a');
      }
      // Well-lit tutorial and route markers.
      for(const [x,y] of [[136,93],[254,103],[306,194],[374,111]]){
        rect(x,y,3,18,'#5c5246');
        rect(x-7,y-4,17,11,'#b5a077');
        rect(x-5,y-2,13,7,'#e9d0a0');
        rect(x-3,y+1,9,1,'#796846');
      }
      this.textures.addCanvas(key,canvas);
    }
    this.add.image(480,288,key).setDisplaySize(960,576).setDepth(0);
    // Place markers are one-time UI labels, not full-screen animations.
    const text=(x:number,y:number,label:string,color='#ffe8bb')=>
      this.add.text(x,y,label,{
        fontSize:'13px',fontStyle:'bold',color,
        stroke:'#20343b',strokeThickness:4
      }).setOrigin(0.5).setDepth(6);
    text(318,170,'LABORATÓRIO');
    text(132,420,'DESCANSO');
    text(677,256,'TRILHA ALTA');
    text(861,256,'PEWTER');
    text(602,452,'TREINADOR');
    // Interactable trainers use the actual Gen III overworld art.
    this.add.ellipse(465,263,35,11,0x243b3b,0.5).setDepth(2);
    this.add.image(465,233,'world-professor',0)
      .setDisplaySize(48,89).setDepth(4);
    this.add.ellipse(600,416,35,11,0x243b3b,0.5).setDepth(2);
    this.add.image(600,384,'world-trainer',0)
      .setDisplaySize(50,88).setDepth(4);
    this.add.text(465,181,'PESQUISADORA',{
      fontSize:'12px',fontStyle:'bold',color:'#fff5d5',
      stroke:'#293b3b',strokeThickness:4
    }).setOrigin(0.5).setDepth(7);
  }

  private refreshGoal(){
    const pokemon=getActivePokemon(loadCollection());
    this.objective?.setText('OBJETIVO  ·  '+nextStoryObjective(this.progress));
    const moves=pokemon.level<8
      ?' • Cortina de Fumaça no Nv. 8':' • Fumaça desbloqueada';
    this.levelLabel?.setText(
      pokemon.nickname.toUpperCase()+' · NV '+pokemon.level+
      ' · '+pokemon.experience+' XP'+moves
    );
  }

  private say(message:string,forMs=3000){
    const id=++this.messageSerial;
    this.message?.setText(message);
    this.time.delayedCall(forMs,()=>{
      if(id===this.messageSerial&&this.scene.isActive())
        this.message?.setText('E / toque INTERAGIR  ·  WASD/setas ou joystick: mover');
    });
  }

  private interact(){
    const near=(x:number,y:number,dist=90)=>
      Phaser.Math.Distance.Between(x,y,this.position.x,this.position.y)<dist;
    if(near(465,263,89)){
      if(!this.progress.metProfessor){
        this.progress=updateStoryProgress({metProfessor:true});
        this.refreshGoal();
      }
      this.say('Pesquisadora: Charmander será seu parceiro. Visite a trilha e desafie o treinador antes de Brock.',5400);
      return;
    }
    if(near(600,416,98)){
      if(!this.progress.metProfessor){
        this.say('Treinador: primeiro converse com a pesquisadora, perto do laboratório.');
        return;
      }
      this.say('Treinador: vamos praticar combate em tempo real! Prepare as habilidades.');
      this.enterArena('practice');
      return;
    }
    if(near(860,230,110)){
      if(!this.progress.defeatedTrainer){
        this.say('O ginásio está aberto apenas depois do primeiro treino. Volte ao campo!');
        return;
      }
      this.progress=updateStoryProgress({enteredGym:true});
      this.enterArena('story');
      return;
    }
    if(near(130,405,82)){
      this.say('Descanso recuperado! Equipe pronta para enfrentar o próximo desafio.');
      return;
    }
    this.say('Aproxime-se da pesquisadora, do treinador ou do portão de Pewter.');
  }

  private blocked(x:number,y:number){
    if(x<35||x>925||y<76||y>502)return true;
    // Rectangles protect doors/buildings but never trap the player in tile art.
    const obstacles=[
      {left:220,right:415,top:95,bottom:224},  // laboratory roof
      {left:43,right:221,top:265,bottom:359},  // rest hut
      {left:782,right:947,top:75,bottom:208}    // gym building
    ];
    return obstacles.some(rect=>
      x>rect.left&&x<rect.right&&y>rect.top&&y<rect.bottom);
  }

  update(time:number,delta:number){
    const dt=Math.min(delta/1000,0.05);
    let vx=0,vy=0;
    const key=this.keys;
    if(key){
      if(key.A?.isDown||key.LEFT?.isDown)vx-=1;
      if(key.D?.isDown||key.RIGHT?.isDown)vx+=1;
      if(key.W?.isDown||key.UP?.isDown)vy-=1;
      if(key.S?.isDown||key.DOWN?.isDown)vy+=1;
      if(Phaser.Input.Keyboard.JustDown(key.E)||
        Phaser.Input.Keyboard.JustDown(key.SPACE))this.interact();
    }
    if(this.mobile.active){
      const stick=this.mobile.axis;
      if(Math.hypot(stick.x,stick.y)>0.11){
        vx=stick.x;vy=stick.y;
      }
    }
    const touch=this.mobile.active&&this.mobile.isPressed('q');
    if(touch&&!this.wasTouching)this.interact();
    this.wasTouching=touch;

    const len=Math.hypot(vx,vy);
    const moving=len>0.1;
    if(moving){
      vx/=Math.max(1,len);vy/=Math.max(1,len);
      const speed=192,dx=vx*speed*dt,dy=vy*speed*dt;
      if(!this.blocked(this.position.x+dx,this.position.y))
        this.position.x+=dx;
      if(!this.blocked(this.position.x,this.position.y+dy))
        this.position.y+=dy;
      if(Math.abs(vx)>Math.abs(vy))
        this.facing=vx>0?3:2;
      else this.facing=vy>0?0:1;
      this.hero?.setFrame([0,3,6,9][this.facing]+
        (Math.floor(time/175)%3));
    }else this.hero?.setFrame([0,3,6,9][this.facing]);

    const bob=moving?Math.abs(Math.sin(time*0.013))*1.4:0;
    this.hero?.setPosition(this.position.x,this.position.y-31-bob);
    this.heroShadow?.setPosition(this.position.x,this.position.y+10);

    const direction=new Phaser.Math.Vector2(this.position.x-this.following.x,
      this.position.y-this.following.y);
    if(direction.length()>55){
      const step=direction.normalize().scale(
        Math.min(direction.length(),dt*173));
      this.following.add(step);
    }
    this.partner?.setPosition(this.following.x,this.following.y-19);
    this.partnerShadow?.setPosition(this.following.x,this.following.y+7);

    if(!this.progress.visitedRoute &&
      this.progress.metProfessor &&
      this.position.x>536&&this.position.y>256&&this.position.y<490){
      this.progress=updateStoryProgress({visitedRoute:true});
      this.refreshGoal();
      this.say('Trilha descoberta! Procure o treinador próximo ao caminho para ganhar XP.',4100);
    }
    if(time-this.lastProgressSave>4000){
      this.lastProgressSave=time;
      updateStoryProgress({lastX:this.position.x,lastY:this.position.y});
      this.refreshGoal();
    }
  }
}
