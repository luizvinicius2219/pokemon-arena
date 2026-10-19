import Phaser from 'phaser';
import { paintKantoTown } from './kantoTownArt';
import { findWalkingPath } from './worldNavigation';
import type { MobileControls } from './mobileControls';
import {
  getActivePokemon,loadCollection
} from './playerCollection';
import {
  loadStoryProgress,nextStoryObjective,updateStoryProgress,
  trainerCooldownRemaining,trainerCooldownText,
  type StoryProgress
} from './storyProgress';
import {
  rollSafariEncounter,setWildEncounter,type WildEncounter,type WildSpecies
} from './encounters';
import { pokemonCatalog } from './pokemonCatalog';
import { experienceForLevel,experienceToNext } from './starterProgression';
import { difficultyRules } from './gameBalance';
import type { Fighter } from './abilities';

const ROAMERS:Record<WildSpecies,{number:string;width:number;height:number}>={
  rattata:{number:'0019',width:32,height:32},
  pidgey:{number:'0016',width:24,height:40},
  caterpie:{number:'0010',width:32,height:32},
  weedle:{number:'0013',width:32,height:40},
  spearow:{number:'0021',width:24,height:40},
  jigglypuff:{number:'0039',width:24,height:32},
  pikachu:{number:'0025',width:40,height:56}
};
const HGSS_STARTERS=new Set(['bulbasaur','charmander','squirtle']);
const PARTNER:Record<string,{
  number:string;idle:readonly [number,number];walk:readonly [number,number]
}>={
  charmander:{number:'0004',idle:[32,40],walk:[32,32]},
  charmeleon:{number:'0005',idle:[32,56],walk:[24,32]},
  bulbasaur:{number:'0001',idle:[32,40],walk:[40,40]},
  ivysaur:{number:'0002',idle:[32,32],walk:[32,32]},
  squirtle:{number:'0007',idle:[32,32],walk:[32,32]},
  wartortle:{number:'0008',idle:[24,40],walk:[32,40]}
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
  private lastPartnerTexture='';
  private pointerDestination:Phaser.Math.Vector2|null=null;
  private pointerPath:Phaser.Math.Vector2[]=[];
  private destinationMarker?:Phaser.GameObjects.Arc;
  private lastPathAt=-1000;
  private walkingDirection=new Phaser.Math.Vector2(0,1);
  private heroShadow?:Phaser.GameObjects.Ellipse;
  private partnerShadow?:Phaser.GameObjects.Ellipse;
  private keys?:Record<string,Phaser.Input.Keyboard.Key>;
  private objective?:Phaser.GameObjects.Text;
  private info?:Phaser.GameObjects.Text;
  private trainerLabel?:Phaser.GameObjects.Text;
  private xpFill?:Phaser.GameObjects.Rectangle;
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
  private featured:WildEncounter|null=null;
  private featuredIcon?:Phaser.GameObjects.Image;
  private featuredGrass?:Phaser.GameObjects.Graphics;
  private featuredX=630;
  private featuredY=359;

  constructor(
    private readonly mobile:MobileControls,
    private readonly enterBattle:(mode:'practice'|'story'|'wild')=>void,
    private readonly menuOpen:()=>boolean=()=>false
  ){super({key:'World'});}

  preload(){
    const root='/assets/story/pewter/';
    this.load.spritesheet('safari-red',root+'red-overworld.png',
      {frameWidth:16,frameHeight:32});
    this.load.spritesheet('world-red-hgss',
      '/assets/world/hgss/red.png',{frameWidth:32,frameHeight:32});
    this.load.spritesheet('safari-trainer',root+'hiker-overworld.png',
      {frameWidth:16,frameHeight:32});
    this.species=getActivePokemon(loadCollection()).species;
    if(HGSS_STARTERS.has(this.species)){
      // Real HeartGold/SoulSilver follower sprites: six 32x32 frames
      // (down/up/side idle + down/up/side walking), bundled locally.
      this.load.spritesheet('world-hgss-'+this.species,
        '/assets/world/hgss/'+this.species+'.png',
        {frameWidth:32,frameHeight:32});
    }else{
      // Evolved starters retain the PMD sheet until their own HGSS assets
      // are added; no forced stretching or wrong aspect ratio.
      const texture=PARTNER[this.species]??PARTNER.charmander;
      for(const motion of ['idle','walk'] as const){
        const [width,height]=texture[motion];
        this.load.spritesheet('world-'+motion+'-'+this.species,
          'https://raw.githubusercontent.com/PMDCollab/SpriteCollab/master/sprite/'+
            texture.number+'/'+(motion==='idle'?'Idle':'Walk')+'-Anim.png',
          {frameWidth:width,frameHeight:height});
      }
    }
    for(const [name,number] of [
      ['rattata',19],['pidgey',16],['caterpie',10],
      ['weedle',13],['spearow',21],['jigglypuff',39],
      ['pikachu',25]
    ] as const){
      this.load.image('safari-icon-'+name,
        'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/'+number+'.png');
      const art=ROAMERS[name];
      this.load.spritesheet('safari-roamer-'+name,
        'https://raw.githubusercontent.com/PMDCollab/SpriteCollab/master/sprite/'+
          art.number+'/Idle-Anim.png',
        {frameWidth:art.width,frameHeight:art.height});
    }
  }

  create(){
    this.progress=loadStoryProgress();
    this.species=getActivePokemon(loadCollection()).species;
    this.player.set(this.progress.lastX,this.progress.lastY);
    // Migrate impossible positions from the older prototype safely.
    if(this.blocked(this.player.x,this.player.y))
      this.player.set(207,426);
    this.following.set(this.player.x-39,this.player.y+15);
    this.walkingDirection.set(0,1);
    this.pointerDestination=null;
    this.pointerPath=[];
    this.lastPathAt=-1000;
    this.mobile.setFinished(false);
    this.cameras.main.setBackgroundColor('#274a41');
    this.drawMap();
    this.rotateFeatured();
    // Explicit keycode map avoids browser keyboard layout / implicit
    // Phaser string alias conflicts (W walks north, never casts a skill).
    const keyCodes=Phaser.Input.Keyboard.KeyCodes;
    this.keys=this.input.keyboard?.addKeys({
      W:keyCodes.W,A:keyCodes.A,S:keyCodes.S,D:keyCodes.D,
      UP:keyCodes.UP,DOWN:keyCodes.DOWN,
      LEFT:keyCodes.LEFT,RIGHT:keyCodes.RIGHT,
      E:keyCodes.E,SPACE:keyCodes.SPACE
    },false,true) as Record<string,Phaser.Input.Keyboard.Key>|undefined;
    this.destinationMarker=this.add.circle(0,0,12,0xf3e4b2,0.08)
      .setStrokeStyle(3,0xfff0b7,0.94).setDepth(22)
      .setVisible(false);
    // Mouse right button chooses a reachable walking route around houses,
    // instead of walking into a wall and appearing unresponsive.
    this.input.mouse?.disableContextMenu();
    const steer=(pointer:Phaser.Input.Pointer)=>{
      const now=this.time.now;
      if(now-this.lastPathAt<90)return;
      const destination={
        x:Phaser.Math.Clamp(pointer.worldX,38,920),
        y:Phaser.Math.Clamp(pointer.worldY,86,489)
      };
      if(this.pointerDestination&&
        Phaser.Math.Distance.Between(
          this.pointerDestination.x,this.pointerDestination.y,
          destination.x,destination.y)<17)return;
      this.lastPathAt=now;
      const points=findWalkingPath(this.player,destination,
        (x,y)=>this.blocked(x,y));
      if(!points.length){
        this.say('Esse local não é acessível. Clique no caminho livre.',2200);
        return;
      }
      this.pointerPath=points.map(p=>new Phaser.Math.Vector2(p.x,p.y));
      const last=points[points.length-1];
      this.pointerDestination=new Phaser.Math.Vector2(last.x,last.y);
      this.destinationMarker?.setPosition(last.x,last.y).setVisible(true);
    };
    this.input.on('pointerdown',(pointer:Phaser.Input.Pointer)=>{
      if(pointer.rightButtonDown())steer(pointer);
    });
    this.input.on('pointermove',(pointer:Phaser.Input.Pointer)=>{
      if(pointer.rightButtonDown())steer(pointer);
    });
    this.heroShadow=this.add.ellipse(this.player.x,
      this.player.y+3,25,7,0x172b28,0.34).setDepth(6);
    // Real bundled HGSS sheet: 32x192 => six 32x32 vertical frames.
    // Frames 0/1/2 idle down/up/side; 3/4/5 matching walk poses.
    // NEVER split frames at width=16: that crops Red down the middle.
    // Keep the original eight-frame strip as a fallback only.
    const redTexture=this.textures.exists('world-red-hgss')
      ?'world-red-hgss':'safari-red';
    this.hero=this.add.image(this.player.x,this.player.y+2,
      redTexture,0).setOrigin(0.5,0.90)
      .setScale(redTexture==='world-red-hgss'?2.65:2.15)
      .setDepth(8);
    this.partnerShadow=this.add.ellipse(this.following.x,
      this.following.y+3,25,7,0x153b2d,0.30).setDepth(6);
    const hgss='world-hgss-'+this.species;
    const idleKey='world-idle-'+this.species;
    if(this.textures.exists(hgss)){
      this.partner=this.add.image(this.following.x,
        this.following.y+2,hgss,0)
        .setOrigin(0.5,0.87).setScale(2.65).setDepth(7);
      this.lastPartnerTexture=hgss;
    }else if(this.textures.exists(idleKey)){
      this.partner=this.add.image(this.following.x,
        this.following.y+2,idleKey,0)
        .setOrigin(0.5,0.80).setScale(1.80).setDepth(7);
      this.lastPartnerTexture=idleKey;
    }else{
      // Non-stretch fallback if the PMD network image is unavailable.
      this.partner=this.add.image(this.following.x,
        this.following.y,'safari-red',0)
        .setOrigin(0.5,0.88).setScale(1.2)
        .setTint(0x9dd888).setDepth(7);
      this.lastPartnerTexture='safari-red';
    }
    this.add.text(27,19,'VILA DE KANTO  ·  ROTA 1',{
      fontSize:'24px',fontStyle:'bold',color:'#f7e3b9',
      stroke:'#203b3d',strokeThickness:5
    }).setDepth(19);
    this.info=this.add.text(28,52,'',{
      fontSize:'16px',fontStyle:'bold',color:'#dcf0cf',
      stroke:'#1d3936',strokeThickness:4
    }).setDepth(19);
    this.add.rectangle(28,79,310,8,0x183b38,0.86)
      .setOrigin(0,0).setDepth(19);
    this.xpFill=this.add.rectangle(28,79,1,8,0x9ce38a,0.96)
      .setOrigin(0,0).setDepth(20);
    this.trainerLabel=this.add.text(351,347,'',{
      fontSize:'12px',fontStyle:'bold',color:'#e7f2d1',
      stroke:'#193837',strokeThickness:4
    }).setOrigin(0.5).setDepth(17);
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
    this.say('PC: WASD ou setas para andar · botão direito para seguir um caminho · E para interagir.',5100);
    try{
      const evolved=window.sessionStorage.getItem('monster-arena-evolution');
      if(evolved){
        window.sessionStorage.removeItem('monster-arena-evolution');
        const banner=this.add.text(480,143,
          '✨ EVOLUÇÃO! '+evolved.toUpperCase()+' ✨',{
            fontSize:'29px',fontStyle:'bold',color:'#f4edb9',
            stroke:'#1e4e42',strokeThickness:8
          }).setOrigin(0.5).setDepth(32);
        this.tweens.add({targets:banner,y:104,alpha:0,
          duration:1350,delay:2300,onComplete:()=>banner.destroy()});
        this.say('Seu Pokémon evoluiu para '+evolved+'! Nova forma e golpes.',5000);
      }
    }catch{}
    this.lastEncounterAt=this.time.now+3500;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{
      updateStoryProgress({lastX:this.player.x,lastY:this.player.y});
      this.mobile.clear();
    });
  }

  private drawMap(){
    const key='kanto-pixel-town-v1';
    if(!this.textures.exists(key)){
      const canvas=document.createElement('canvas');
      canvas.width=480;
      canvas.height=288;
      const ctx=canvas.getContext('2d');
      if(!ctx)return;
      paintKantoTown(ctx);
      this.textures.addCanvas(key,canvas);
    }
    // No blurry re-rasterization or 8-bit texture filtering per update.
    this.add.image(480,288,key).setDisplaySize(960,576).setDepth(0);
    const marker=(x:number,y:number,label:string,color='#fff7d9')=>
      this.add.text(x,y,label,{
        fontSize:'12px',fontStyle:'bold',color,
        stroke:'#23463e',strokeThickness:4
      }).setOrigin(0.5).setDepth(10);
    marker(119,294,'CENTRO DE CURA');
    marker(321,294,'VILA');
    marker(575,234,'MATO ALTO');
    marker(845,231,'GINÁSIO');
    marker(349,369,'TREINADOR');
    // The trainer uses the authentic eight-frame overworld strip.
    this.add.ellipse(347,412,28,8,0x28443b,0.32).setDepth(3);
    this.add.image(347,406,'safari-trainer',0)
      .setOrigin(0.5,0.94).setScale(2.35).setDepth(7);
  }

  private refresh(){
    const collection=loadCollection();
    const pokemon=getActivePokemon(collection);
    const badge=collection.badges.includes('pedra')?' · 🏅 PEDRA':'';
    const remaining=experienceToNext(pokemon.experience,pokemon.level);
    const current=experienceForLevel(pokemon.level);
    const next=experienceForLevel(pokemon.level+1);
    const progress=next>current?Math.max(0,Math.min(1,
      (pokemon.experience-current)/(next-current))):1;
    this.info?.setText(
      pokemon.nickname.toUpperCase()+' · NV '+pokemon.level+
      ' · '+remaining+' XP P/ PRÓXIMO · '+
      difficultyRules().name.toUpperCase()+badge
    );
    if(this.xpFill)this.xpFill.width=Math.max(1,310*progress);
    const trainerLeft=trainerCooldownRemaining();
    this.trainerLabel?.setText(trainerLeft>0
      ?'⏳ '+Math.ceil(trainerLeft/60000)+' MIN':
      '⚔ TREINADOR');
    this.objective?.setText('OBJETIVO  ·  '+
      (this.inGrass()?'Batalhe no mato para ganhar XP e subir de nível.':
        nextStoryObjective(this.progress)));
  }

  private say(value:string,duration=3700){
    this.message?.setText(value);
    const id=++this.speechSerial;
    this.time.delayedCall(duration,()=>{
      if(id===this.speechSerial&&this.sys.isActive())
        this.message?.setText(
          'WASD / setas: andar · mouse direito: caminhar · E: interagir'
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
      const delay=trainerCooldownRemaining();
      if(delay>0){
        this.say(trainerCooldownText()+'. Treine no mato alto enquanto isso.',3300);
        return;
      }
      this.say('Treinador pronto! Uma vitória rende 100 XP. Próximo duelo em 20 min.',2200);
      this.enterBattle('practice');
    }else if(this.near(864,227,117)){
      this.progress=updateStoryProgress({enteredGym:true});
      this.enterBattle('story');
    }else if(this.near(134,286,76)){
      const sparkle=this.add.text(this.player.x,this.player.y-78,
        '✚ EQUIPE RECUPERADA!',{
          fontSize:'16px',fontStyle:'bold',color:'#dcffde',
          stroke:'#315946',strokeThickness:5
        }).setOrigin(0.5).setDepth(24);
      this.tweens.add({targets:sparkle,y:sparkle.y-33,alpha:0,
        duration:1200,onComplete:()=>sparkle.destroy()});
      this.say('Centro de Cura: descanse antes de outra batalha.');
    }else{
      this.say('Entre no mato alto para TREINAR ou siga para o ginásio.');
    }
  }


  /** Visible creature belongs to the actual pending grass encounter. */
  private rotateFeatured(){
    const lvl=getActivePokemon(loadCollection()).level;
    this.featured=rollSafariEncounter(Math.random,lvl);
    this.featuredX=512+Math.random()*218;
    this.featuredY=296+Math.random()*106;
    this.featuredIcon?.destroy();
    this.featuredGrass?.destroy();
    const key='safari-roamer-'+this.featured.species;
    this.featuredGrass=this.add.graphics().setDepth(5);
    const ground=this.featuredGrass;
    const x=this.featuredX,y=this.featuredY;
    ground.fillStyle(0x183f37,0.41).fillEllipse(x,y+10,57,14);
    for(let i=0;i<7;i++){
      const px=x-28+i*9;
      const h=i%2?13:20;
      ground.lineStyle(4,i%2?0x5fa66d:0xa0c983,0.96)
        .lineBetween(px,y+9,px+3,y+9-h);
    }
    if(this.textures.exists(key)){
      this.featuredIcon=this.add.image(x,y+2,key,0)
        .setOrigin(0.5,0.82)
        .setScale(this.featured.species==='pikachu'?1.85:2.0)
        .setDepth(7).setInteractive({useHandCursor:true});
    }else if(this.textures.exists('safari-icon-'+this.featured.species)){
      this.featuredIcon=this.add.image(x,y+2,
        'safari-icon-'+this.featured.species,0)
        .setOrigin(0.5,0.85)
        .setDisplaySize(62,62).setDepth(7)
        .setInteractive({useHandCursor:true});
    }
    this.featuredIcon?.on('pointerdown',()=>{
      if(this.near(this.featuredX,this.featuredY,118)){
        this.openEncounter();
      }else{
        this.say('Aproxime-se do Pokémon escondido no mato.');
      }
    });
  }

  private openEncounter(){
    if(this.modal||this.menuOpen())return;
    this.lastEncounterAt=this.time.now;
    this.wildSteps=0;
    const burst=this.add.graphics().setDepth(12);
    for(let i=0;i<14;i++){
      const a=i*Math.PI*2/14;
      burst.fillStyle(i%2?0x85c77d:0xc8df9e,0.88);
      burst.fillEllipse(
        this.player.x+Math.cos(a)*(22+i%4*7),
        this.player.y+Math.sin(a)*(18+i%4*5)-11,
        7,13);
    }
    this.tweens.add({targets:burst,alpha:0,duration:650,
      onComplete:()=>burst.destroy()});
    this.progress=updateStoryProgress({visitedRoute:true});
    this.refresh();
    const roll=this.featured??rollSafariEncounter(
      Math.random,getActivePokemon(loadCollection()).level
    );
    const species=pokemonCatalog[roll.species];
    const screen=this.add.container(480,279).setDepth(35);
    screen.add(this.add.rectangle(0,0,700,374,0x10272a,0.97)
      .setStrokeStyle(4,0xb4d6ab));
    screen.add(this.add.text(0,-145,'ENCONTRO NO MATO ALTO',{
      fontSize:'24px',fontStyle:'bold',color:'#ffe4a7'
    }).setOrigin(0.5));
    if(this.textures.exists('safari-icon-'+roll.species)){
      const reveal=this.add.image(0,-39,'safari-icon-'+roll.species)
        .setDisplaySize(145,145);
      screen.add(reveal);
      this.tweens.add({
        targets:reveal,y:reveal.y-10,duration:780,
        yoyo:true,repeat:-1,ease:'Sine.easeInOut'
      });
      screen.once(Phaser.GameObjects.Events.DESTROY,()=>{
        this.tweens.killTweensOf(reveal);
      });
    }else{
      screen.add(this.add.circle(0,-40,49,0x658767));
    }
    screen.add(this.add.text(0,46,
      species.name.toUpperCase()+' · Nv '+roll.level,{
        fontSize:'27px',fontStyle:'bold',color:'#e8fbe7'
      }).setOrigin(0.5));
    screen.add(this.add.text(0,84,
      roll.species==='pikachu'?'ENCONTRO RARO! ⚡ · 3%':
      'Se vencer: +'+roll.experience+' XP',{
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
      this.rotateFeatured();
      this.say('Você saiu do encontro. Outra criatura se escondeu no mato.');
    });
    this.modal=screen;
    this.mobile.clear();
  }

  private blocked(x:number,y:number){
    if(x<37||x>923||y<83||y>496)return true;
    // Exact footprints match the three new building roofs. A walkable
    // north–south lane around x=190 stays clear even when W is held.
    return (x>51&&x<178&&y>124&&y<278)||
      (x>251&&x<395&&y>119&&y<279)||
      (x>779&&x<944&&y>60&&y<208)||
      (x>39&&x<180&&y>299&&y<393); // pond water collision
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
    const touch=this.mobile.active&&this.mobile.isPressed('q');
    if(touch&&!this.actionHeld)this.interact();
    this.actionHeld=touch;

    const manual=Math.abs(vx)>0.1||Math.abs(vy)>0.1;
    if(manual){
      this.pointerDestination=null;
      this.pointerPath.length=0;
      this.destinationMarker?.setVisible(false);
    }else if(this.pointerPath.length){
      while(this.pointerPath.length&&
        this.player.distance(this.pointerPath[0])<12)
        this.pointerPath.shift();
      if(this.pointerPath.length){
        const point=this.pointerPath[0];
        const vx0=point.x-this.player.x;
        const vy0=point.y-this.player.y;
        const distance=Math.hypot(vx0,vy0);
        if(distance>0.01){vx=vx0/distance;vy=vy0/distance;}
      }else{
        this.pointerDestination=null;
        this.destinationMarker?.setVisible(false);
      }
    }
    const len=Math.hypot(vx,vy);
    let movedX=0,movedY=0;
    if(len>0.1){
      vx/=Math.max(1,len);vy/=Math.max(1,len);
      const dx=vx*174*dt,dy=vy*174*dt;
      if(!this.blocked(this.player.x+dx,this.player.y)){
        this.player.x+=dx;movedX=dx;
      }
      if(!this.blocked(this.player.x,this.player.y+dy)){
        this.player.y+=dy;movedY=dy;
      }
      // Don't keep pushing the character into a building on mouse input.
      if(!manual&&Math.hypot(movedX,movedY)<0.01){
        // Impossible destination: do not spin in place.
        this.pointerDestination=null;
        this.pointerPath.length=0;
        this.destinationMarker?.setVisible(false);
      }
      const actual=Math.hypot(movedX,movedY);
      if(actual>0.1){
        this.walkingDirection.set(movedX,movedY).normalize();
        if(Math.abs(movedX)>Math.abs(movedY))
          this.facing=movedX>0?3:2;
        else this.facing=movedY>0?0:1;
        // The strip is 8 frames total: 2 frames per direction,
        // rather than indexing rows/columns that do not exist.
        const hgss=this.hero?.texture.key==='world-red-hgss';
        if(hgss){
          const direction=this.facing===0?0:this.facing===1?1:2;
          this.hero?.setFrame(direction+3*(Math.floor(time/155)%2));
          this.hero?.setFlipX(this.facing===3);
        }else{
          const firstFrame=[0,2,4,6][this.facing];
          this.hero?.setFrame(firstFrame+Math.floor(time/195)%2);
        }
        if(this.inGrass()){
          this.wildSteps+=actual;
          if(this.wildSteps>190&&time-this.lastEncounterAt>8500){
            this.wildSteps=0;
            this.lastEncounterAt=time;
            if(Math.random()<0.55){
              this.openEncounter();
              return;
            }
          }
        }
      }
    }
    const moving=Math.hypot(movedX,movedY)>0.1;
    if(!moving){
      const hgss=this.hero?.texture.key==='world-red-hgss';
      this.hero?.setFrame(hgss
        ?this.facing===0?0:this.facing===1?1:2
        :[0,2,4,6][this.facing]);
      this.hero?.setFlipX(hgss&&this.facing===3);
    }
    this.hero?.setPosition(Math.round(this.player.x),
      Math.round(this.player.y)+2);
    this.heroShadow?.setPosition(Math.round(this.player.x),
      Math.round(this.player.y)+3);

    // The companion follows the trail, stands on its feet, faces in eight
    // directions and selects actual PMD WALK sprites instead of just IDLE.
    const tx=this.player.x-this.walkingDirection.x*48;
    const ty=this.player.y-this.walkingDirection.y*38+7;
    const previousX=this.following.x,previousY=this.following.y;
    const distance=Math.hypot(tx-previousX,ty-previousY);
    if(distance>5){
      const step=Math.min(distance,181*dt);
      const ratio=step/Math.max(1,distance);
      this.following.x+=(tx-previousX)*ratio;
      this.following.y+=(ty-previousY)*ratio;
    }
    const dx=this.following.x-previousX,dy=this.following.y-previousY;
    const companionWalking=Math.hypot(dx,dy)>0.35;
    const hgssKey='world-hgss-'+this.species;
    const idleKey='world-idle-'+this.species;
    const walkKey='world-walk-'+this.species;
    const face=companionWalking?
      new Phaser.Math.Vector2(dx,dy):
      this.walkingDirection;
    if(this.partner&&this.textures.exists(hgssKey)){
      const horizontal=Math.abs(face.x)>Math.abs(face.y);
      const direction=horizontal?2:face.y<0?1:0;
      const frame=direction+(companionWalking?
        3*(Math.floor(time/165)%2):0);
      this.partner.setFrame(frame); // frame 0–5, never an invalid PMD row
      this.partner.setFlipX(horizontal&&face.x>0);
    }else{
      const spriteKey=companionWalking&&this.textures.exists(walkKey)
        ?walkKey:idleKey;
      if(this.partner&&this.textures.exists(spriteKey)){
        if(spriteKey!==this.lastPartnerTexture){
          this.partner.setTexture(spriteKey,0);
          this.lastPartnerTexture=spriteKey;
        }
        const meta=PARTNER[this.species]??PARTNER.charmander;
        const [width]=companionWalking?meta.walk:meta.idle;
        const cols=Math.max(1,Math.floor(
          this.textures.get(spriteKey).source[0].width/width
        ));
        const angle=Math.atan2(face.y,face.x);
        const row=((Math.round(2-angle*4/Math.PI)%8)+8)%8;
        const tick=companionWalking?Math.floor(time/155):Math.floor(time/540);
        const columns=Math.min(cols,companionWalking?6:3);
        this.partner.setFrame(row*cols+tick%Math.max(1,columns));
        this.partner.setFlipX(false);
      }
    }
    this.partner?.setPosition(Math.round(this.following.x),
      Math.round(this.following.y)+2);
    this.partnerShadow?.setPosition(Math.round(this.following.x),
      Math.round(this.following.y)+3);
    // A little ground-aware depth keeps the protagonist in front when
    // the two overlap, without lifting Bulbasaur off the floor.
    this.partner?.setDepth(this.following.y>this.player.y?9:7);

    if(this.featuredIcon?.texture.key.startsWith('safari-roamer-'))
      this.featuredIcon.setFrame(Math.floor(time/470)%3);
    if(this.actionLabel){
      const label=this.inGrass()?'TREINAR':
        this.near(864,227,117)?'BROCK':
        this.near(347,404,94)?
          trainerCooldownRemaining()>0?'DESCANSO':'BATALHAR':
        'INTERAGIR';
      if(this.actionLabel.text!==label)this.actionLabel.setText(label);
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
