import Phaser from 'phaser';
import type { Action, Bindings } from './controls';
import { allActions, dodge, skillKeys, skills, type Skill } from './abilities';
import { currentGifFrame, hasGifClip, registerGifClip } from './gifAnimation';
import { keyLabel } from './controls';
import { CombatFx, beamReach, type VfxKind } from './combatFx';
import { CinematicFx } from './cinematicFx';
import { OverworldActor, preloadOverworld, releaseFrameMs } from './overworld';
import type { MobileControls } from './mobileControls';
import { StoryEnvironment, pewterGym, preloadPewter, type GameMode } from './story';
import { pokemonCatalog, gymTeams, type PokemonEncounter, type PokemonType } from './pokemonCatalog';
import { effectiveness, scaledDamage } from './typeChart';
import { RockFx, RockMoves, type RockStatus } from './rockMoves';
import { PokemonSwitchFx } from './pokemonSwitchFx';
import { StarterFx } from './starterFx';
import { getActivePokemon, loadCollection } from './playerCollection';
import { activeWildEncounter } from './encounters';
import { createSafariBattlefield } from './safariBattlefield';
import { difficultyRules,type DifficultyRules } from './gameBalance';
import { getTrainingSetup } from './trainingSetup';
import type { Fighter } from './abilities';
import { BattleStats, formatBattleTime, type BattleSummary } from './battleStats';
import { DODGE_DISTANCE, DODGE_DURATION_MS, TACKLE_DURATION_MS,
  TACKLE_MAX_DISTANCE, tackleDistance, tacklePosition, dodgePosition } from './combatMovement';
import { makeStatStages, changeStatStage, stageMultiplier,
  accuracyChance, physicalDamageMultiplier, type BattleStat,
  type StatStages } from './statStages';

type Side = 'player' | 'enemy';
type ProjectileKind = VfxKind;
interface Projectile {
  body: Phaser.GameObjects.Arc;
  velocity: Phaser.Math.Vector2;
  side: Side;
  kind: ProjectileKind;
  damage: number;
  expiry: number;
  lastTrail: number;
  blastRadius: number;
}
const W = 960, H = 576;
const bounds = { minX: 42, maxX: 918, minY: 42, maxY: 534 };
const clampX = (value: number) => Phaser.Math.Clamp(value, bounds.minX, bounds.maxX);
const clampY = (value: number) => Phaser.Math.Clamp(value, bounds.minY, bounds.maxY);
const vector = (x: number, y: number) => new Phaser.Math.Vector2(x, y);
interface FlameStream {
  startAt:number;
  direction:Phaser.Math.Vector2;
  duration:number;
  nextHitAt:number;
}
interface TackleState {
  from:Phaser.Math.Vector2;
  to:Phaser.Math.Vector2;
  direction:Phaser.Math.Vector2;
  startAt:number;
  duration:number;
  hit:boolean;
  lastDustAt:number;
  damage:number;
  element:PokemonType;
}
interface DashState {
  from:Phaser.Math.Vector2;
  to:Phaser.Math.Vector2;
  direction:Phaser.Math.Vector2;
  startAt:number;
  duration:number;
  lastTrailAt:number;
}
interface HitReaction {
  startAt:number;
  duration:number;
  distance:number;
  lastDistance:number;
  direction:Phaser.Math.Vector2;
}

export class ArenaScene extends Phaser.Scene {
  private environment?:StoryEnvironment;
  private mode:GameMode='training';
  private playerSpecies:Fighter='charizard';
  private fx!: CombatFx;
  private starterFx!:StarterFx;
  private battleStages:Record<Side,StatStages>={
    player:makeStatStages(),enemy:makeStatStages()
  };
  private playerStageText?:Phaser.GameObjects.Text;
  private enemyStageText?:Phaser.GameObjects.Text;
  private lastAccuracyCueAt:Record<Side,number>={player:-1000,enemy:-1000};
  private wildLevel=4;
  private rules:DifficultyRules=difficultyRules();
  private lastMoveLockedCue=-3000;
  private rockFx?:RockFx;
  private rockMoves?:RockMoves;
  private switchFx?:PokemonSwitchFx;
  private storyIntroUntil=0;
  private playerSlowUntil=0;
  private playerBindUntil=0;
  private enemySlowUntil=0;
  private enemyBindUntil=0;
  private enemyCastLockUntil=0;
  private enemyBurrowed=false;
  private readonly enemyBurrowVisual={depth:0};
  private enemyBurrowTween?:Phaser.Tweens.Tween;
  private rolloutUntil=0;
  private statusText?:Phaser.GameObjects.Text;
  private enemySpecies:Fighter='pikachu';
  private enemyMaxHp=100;
  private storyEncounters:readonly PokemonEncounter[]=[];
  private storyWave=0;
  private storySwitching=false;
  private enemyActiveAt=0;
  private storyWaveText?:Phaser.GameObjects.Text;
  private cinematic!: CinematicFx;
  private stats!: BattleStats;
  private comboText!: Phaser.GameObjects.Text;
  private comboMeter!: Phaser.GameObjects.Graphics;
  private hitStopUntil = -1000;
  private player!: Phaser.GameObjects.Arc;
  private enemy!: Phaser.GameObjects.Arc;
  private playerMotion?: OverworldActor;
  private enemyMotion?: OverworldActor;
  private playerArt?: Phaser.GameObjects.Image;
  private enemyArt?: Phaser.GameObjects.Image;
  private playerShadow?: Phaser.GameObjects.Ellipse;
  private enemyShadow?: Phaser.GameObjects.Ellipse;
  private playerLabel!: Phaser.GameObjects.Text;
  private enemyLabel!: Phaser.GameObjects.Text;
  private hpText!: Phaser.GameObjects.Text;
  private enemyHpText!: Phaser.GameObjects.Text;
  private destination = vector(210, 288);
  private playerFacing = vector(1, 0);
  private enemyFacing = vector(-1, 0);
  private playerHp = 100;
  private playerMaxHp = 100;
  private starterLevel = 5;
  private enemyHp = 100;
  private finished = false;
  private knockedOut:Record<Side,boolean>={player:false,enemy:false};
  private projectiles: Projectile[] = [];
  private flameStreams: FlameStream[] = [];
  private dash?: DashState;
  private tackles:Record<Side,TackleState|null>={player:null,enemy:null};
  private reactions: Record<Side,HitReaction|null> = {player:null,enemy:null};
  private lastHitAt:Record<Side,number>={player:-1000,enemy:-1000};
  private lastTypeCueAt:Record<Side,number>={player:-2000,enemy:-2000};
  private healthBars!:Phaser.GameObjects.Graphics;
  private shownHp:Record<Side,number>={player:100,enemy:100};
  private playerCastAt: Record<Action, number> = { q: -450, w: -2300, e: -3800, r: -7600, dodge: -1900 };
  private enemyCastAt: Record<Skill, number> = { q: -850, w: -3400, e: -4500, r: -9000 };
  private playerAttackAt = -1000;
  private enemyAttackAt = -1000;
  private playerHurtAt = -1000;
  private enemyHurtAt = -1000;
  private nextEnemyDecision = 1000;
  private enemyActionIndex = 0;
  private lastHudUpdate = -1000;
  private readonly enemyPattern: Skill[] = ['q','q','e','q','w','q','r','q','e','w'];

  constructor(
    private readonly getBindings: () => Bindings,
    private readonly heldKeys: () => ReadonlySet<string>,
    private readonly settingsOpen: () => boolean,
    private readonly mobile: MobileControls,
    private readonly getMode:()=>GameMode
  ) { super({ key: 'Arena' }); }

  private currentStarter():Fighter{
    // Story begins with a first-stage Pokémon. Prior Charizard test saves
    // never silently turn the story protagonist into its final evolution.
    const chosen=getActivePokemon(loadCollection()).species;
    return ['charmander','charmeleon','bulbasaur','ivysaur',
      'squirtle','wartortle'].includes(chosen)?chosen:'charmander';
  }

  preload() {
    const mode=this.getMode();
    const setup=getTrainingSetup();
    const player=mode==='training'?setup.player:this.currentStarter();
    const rival=mode==='story'?'geodude':mode==='wild'
      ?activeWildEncounter().species:mode==='training'
        ?setup.rival:'pikachu';
    const roster=[player,rival,...(mode==='story'?['onix']:[])] as Fighter[];
    preloadOverworld(this,roster);
    if(mode==='story')preloadPewter(this);
    const base='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/';
    for(const species of roster){
      const number=String(pokemonCatalog[species].number);
      this.load.image(species,base+number+'.png');
      this.load.image(species+'-back',base+'back/'+number+'.png');
      // Optional GIFs have no effect on PMD and aren't required for gameplay.
    }
  }

  create() {
    this.mode=this.getMode();

    this.playerSpecies=this.mode==='training'
      ?getTrainingSetup().player:this.currentStarter();
    this.environment=undefined;
    this.rules=difficultyRules();
    this.enemySpecies=this.mode==='story'?'geodude':
      this.mode==='wild'?activeWildEncounter().species:
      this.mode==='training'?getTrainingSetup().rival:'pikachu';
    this.wildLevel=this.mode==='wild'?activeWildEncounter().level:
      this.mode==='training'?getTrainingSetup().level:4;
    this.enemyMaxHp=this.mode==='practice'?68:
      this.mode==='wild'?Math.round(
        pokemonCatalog[this.enemySpecies].maxHp*(0.66+this.wildLevel*0.055))
      :pokemonCatalog[this.enemySpecies].maxHp;
    this.storyEncounters=this.mode==='story'?gymTeams[pewterGym.id]:[];
    this.storyWave=0;
    this.storySwitching=false;
    this.enemyActiveAt=0;
    this.storyWaveText=undefined;
    this.statusText=undefined;
    this.playerSlowUntil=0;
    this.playerBindUntil=0;
    this.enemySlowUntil=0;
    this.enemyBindUntil=0;
    this.enemyCastLockUntil=0;
    this.enemyBurrowed=false;
    this.enemyBurrowVisual.depth=0;
    this.enemyBurrowTween=undefined;
    this.rolloutUntil=0;
    this.rockFx=this.mode==='story'?new RockFx(this):undefined;
    this.rockMoves=this.rockFx?new RockMoves(this,this.rockFx):undefined;
    this.switchFx=this.mode==='story'?new PokemonSwitchFx(this):undefined;
    this.storyIntroUntil=0;
    this.fx = new CombatFx(this);
    this.starterFx = new StarterFx(this);
    this.battleStages={player:makeStatStages(),enemy:makeStatStages()};
    this.playerStageText=undefined;
    this.enemyStageText=undefined;
    this.lastAccuracyCueAt={player:-1000,enemy:-1000};
    this.lastMoveLockedCue=-3000;
    this.cinematic = new CinematicFx(this);
    this.stats = new BattleStats(this.time.now);
    this.playerMotion = undefined;
    this.enemyMotion = undefined;
    this.hitStopUntil = -1000;
    this.starterLevel=this.mode==='training'?getTrainingSetup().level:
      getActivePokemon(loadCollection()).level;
    this.playerMaxHp=this.mode==='training'?
      Math.round(pokemonCatalog[this.playerSpecies].maxHp*
        (0.70+this.starterLevel*0.008)):
      pokemonCatalog[this.playerSpecies].maxHp+
        Math.min(55,Math.max(0,this.starterLevel-5)*3);
    if(this.mode==='story'){
      // Handicap is mild: prepare for Brock instead of farming one enemy.
      this.enemyMaxHp=Math.round(this.enemyMaxHp*
        Math.min(1.12,0.77+Math.max(0,this.starterLevel-5)*0.036));
    }
    if(this.mode==='story'||this.mode==='wild')
      this.enemyMaxHp=Math.max(20,Math.round(this.enemyMaxHp*this.rules.enemyHp));
    this.playerHp=this.playerMaxHp;
    this.enemyHp=this.enemyMaxHp;
    this.finished = false;
    this.knockedOut={player:false,enemy:false};
    this.projectiles = [];
    this.flameStreams = [];
    this.dash = undefined;
    this.tackles={player:null,enemy:null};
    this.reactions={player:null,enemy:null};
    this.lastHitAt={player:-1000,enemy:-1000};
    this.lastTypeCueAt={player:-2000,enemy:-2000};
    this.shownHp={player:this.playerHp,enemy:this.enemyHp};
    this.mobile.setAbilityNames(this.playerSpecies);
    const starterMoves=skills[this.playerSpecies];
    this.playerCastAt = {
      q:-starterMoves.q.cooldown,w:-starterMoves.w.cooldown,
      e:-starterMoves.e.cooldown,r:-starterMoves.r.cooldown,
      dodge:-dodge.cooldown
    };
    this.enemyCastAt = this.enemyReadyAt(0);
    this.playerFacing.set(1,0);
    this.enemyFacing.set(-1,0);
    this.playerAttackAt = this.enemyAttackAt = this.playerHurtAt = this.enemyHurtAt = -1000;
    this.nextEnemyDecision = 1100;
    this.enemyActionIndex = 0;
    this.lastHudUpdate = -1000;
    this.mobile.setFinished(false);

    this.cameras.main.setBackgroundColor('#142e31');
    if(this.mode==='story'){
      this.environment=new StoryEnvironment(this,pewterGym,this.playerSpecies);
      this.stats.excludeTime(3150);
      // The VS presentation is a genuine introduction, not a background
      // overlay during which either Pokémon can attack unnoticed.
      this.storyIntroUntil=this.time.now+3150;
      this.enemyActiveAt=this.storyIntroUntil+1050;
      this.nextEnemyDecision=this.enemyActiveAt;
    }else if(this.mode==='wild'){
      createSafariBattlefield(this);
    }else this.drawArena();
    const rawPlayerSpawn=this.mode==='story'?pewterGym.spawnPlayer:
      this.mode==='wild'?{x:230,y:319}:{x:210,y:288};
    const rawEnemySpawn=this.mode==='story'?pewterGym.spawnRival:
      this.mode==='wild'?{x:724,y:297}:{x:750,y:288};
    const playerSpawn=this.environment?.resolve(rawPlayerSpawn.x,rawPlayerSpawn.y,
      pokemonCatalog[this.playerSpecies].radius)??rawPlayerSpawn;
    const enemySpawn=this.environment?.resolve(rawEnemySpawn.x,rawEnemySpawn.y,
      pokemonCatalog[this.enemySpecies].radius)??rawEnemySpawn;
    this.player = this.add.circle(playerSpawn.x,playerSpawn.y,
      pokemonCatalog[this.playerSpecies].radius,0x60d1ff)
      .setStrokeStyle(4,0xffffff).setVisible(false);
    this.enemy = this.add.circle(enemySpawn.x,enemySpawn.y,pokemonCatalog[this.enemySpecies].radius,0xff8b69)
      .setStrokeStyle(4,0xffffff).setVisible(false);
    this.playerShadow=this.add.ellipse(playerSpawn.x,playerSpawn.y+5,
      42,10,0x06181c,0.35).setDepth(1);
    this.enemyShadow=this.add.ellipse(enemySpawn.x,
      enemySpawn.y+(this.mode==='story'?10:5),
      this.enemySpecies==='pikachu'?30:40,11,
      0x06181c,0.36).setDepth(1);
    const playerKey=this.playerSpecies;
    if (OverworldActor.available(this,playerKey)) {
      this.playerMotion = new OverworldActor(this,playerKey,playerSpawn.x,playerSpawn.y);
      this.playerArt = this.playerMotion.image;
    } else if(this.textures.exists(playerKey)) {
      this.playerArt = this.add.image(playerSpawn.x,playerSpawn.y-8,
        hasGifClip(playerKey+'-anim')?playerKey+'-anim':playerKey)
        .setDisplaySize(playerKey==='charmander'?70:88,
          playerKey==='charmander'?74:88).setDepth(3);
    } else this.player.setVisible(true);
    this.createEnemyArt(enemySpawn.x,enemySpawn.y);
    this.playerLabel = this.add.text(playerSpawn.x,playerSpawn.y-86,
      pokemonCatalog[this.playerSpecies].name.toUpperCase(),
      {color:'#c4f7ff',fontSize:'14px',fontStyle:'bold'}).setOrigin(0.5).setDepth(4);
    this.enemyLabel = this.add.text(enemySpawn.x,
      enemySpawn.y-(this.mode==='wild'?81:35),
      pokemonCatalog[this.enemySpecies].name.toUpperCase(),{
        color:'#ffe9b2',fontSize:'14px',fontStyle:'bold'
      }).setOrigin(0.5).setDepth(4);
    this.hpText = this.add.text(32,24,'',{fontSize:'20px',color:'#a5eeff'}).setDepth(10);
    this.enemyHpText = this.add.text(740,24,'',{fontSize:'20px',color:'#ffcd9e'}).setDepth(10);
    this.playerStageText=this.add.text(32,51,'',{
      fontSize:'12px',color:'#a5eeff',stroke:'#142e31',strokeThickness:2
    }).setDepth(10);
    this.enemyStageText=this.add.text(740,this.mode==='story'?83:51,'',{
      fontSize:'12px',color:'#ffcd9e',stroke:'#142e31',strokeThickness:2
    }).setDepth(10);
    this.updateStageHud();
    if(this.mode==='story'){
      this.storyWaveText=this.add.text(716,58,'',{
        fontSize:'16px',fontStyle:'bold',color:'#fff0c8',
        stroke:'#192c38',strokeThickness:4
      }).setOrigin(0.5).setDepth(12);
      this.updateWaveText();
      this.statusText=this.add.text(playerSpawn.x,playerSpawn.y-75,'',{
        fontSize:'13px',fontStyle:'bold',color:'#ffe8ac',
        stroke:'#152a34',strokeThickness:4
      }).setOrigin(0.5).setDepth(15).setVisible(false);
    }
    this.comboText=this.add.text(W/2,75,'',{
      color:'#ffe6a6',fontSize:'22px',fontStyle:'bold',
      stroke:'#182c36',strokeThickness:4
    }).setOrigin(0.5).setDepth(12).setVisible(false);
    this.comboMeter=this.add.graphics().setDepth(11);
    this.healthBars=this.add.graphics().setDepth(9);
    this.drawHealthBars(0);
    this.destination.set(this.player.x,this.player.y);
    this.input.mouse?.disableContextMenu();
    this.input.on('pointerdown',(p: Phaser.Input.Pointer) => {
      if(p.rightButtonDown() && !this.settingsOpen() && !this.finished) {
        const safe=this.environment?.resolve(p.x,p.y,this.player.radius);
        this.destination.set(safe?.x??clampX(p.x),safe?.y??clampY(p.y));
      }
    });
    this.input.on('pointermove',(p: Phaser.Input.Pointer) => {
      if(p.rightButtonDown() && !this.settingsOpen() && !this.finished) {
        const safe=this.environment?.resolve(p.x,p.y,this.player.radius);
        this.destination.set(safe?.x??clampX(p.x),safe?.y??clampY(p.y));
      }
    });
    this.input.keyboard?.on('keydown-ENTER',() => {
      if(this.finished)this.restartOrReturn();
    });
    // Pewter's short stage introduction conveys preview status and is
    // rendered by StoryEnvironment. It leaves the Red trainer unobstructed.
    this.updateHp();
    this.updateHud(0,true);
  }

  private enemyReadyAt(time:number):Record<Skill,number>{
    const abilities=pokemonCatalog[this.enemySpecies].skillSet;
    return {
      q:time-abilities.q.cooldown,
      w:time-abilities.w.cooldown,
      e:time-abilities.e.cooldown,
      r:time-abilities.r.cooldown
    };
  }

  private animateOnixBurrow(burrowed:boolean){
    this.enemyBurrowed=burrowed;
    this.enemyBurrowTween?.stop();
    if(burrowed){
      this.enemyLabel?.setVisible(false);
    }else{
      this.enemyArt?.setVisible(true);
    }
    this.enemyBurrowTween=this.tweens.add({
      targets:this.enemyBurrowVisual,
      depth:burrowed?1:0,
      duration:burrowed?480:560,
      ease:burrowed?'Cubic.easeIn':'Cubic.easeOut',
      onUpdate:()=>{
        const depth=this.enemyBurrowVisual.depth;
        if(this.enemyMotion)this.enemyMotion.setBurrowDepth(depth);
        else if(this.enemyArt){
          this.enemyArt.setAlpha(1-depth*0.94);
          this.enemyArt.setScale(1-depth*0.64,1-depth*0.92);
        }
        this.enemyShadow?.setAlpha((1-depth)*0.5);
      },
      onComplete:()=>{
        if(burrowed)this.enemyArt?.setVisible(false);
        else{
          this.enemyBurrowVisual.depth=0;
          this.enemyMotion?.setBurrowDepth(0);
          this.enemyArt?.setAlpha(1);
          this.enemyLabel?.setVisible(true);
        }
      }
    });
  }

  private createEnemyArt(x:number,y:number){
    const id=this.enemySpecies;
    this.enemy.setVisible(false);
    this.enemyMotion=undefined;
    this.enemyArt=undefined;
    if(OverworldActor.available(this,id)){
      this.enemyMotion=new OverworldActor(this,id,x,y);
      this.enemyArt=this.enemyMotion.image;
    }else if(this.textures.exists(id)){
      const width=id==='onix'?196:id==='geodude'?68:56;
      const height=id==='onix'?212:id==='geodude'?63:56;
      const baseTexture=hasGifClip(id+'-anim')?id+'-anim':id;
      this.enemyArt=this.add.image(x,y-(id==='onix'?52:9),baseTexture)
        .setDisplaySize(width,height).setDepth(3);
    }else this.enemy.setVisible(true);
  }

  private updateWaveText(){
    if(!this.storyWaveText)return;
    const name=pokemonCatalog[this.enemySpecies].name.toUpperCase();
    this.storyWaveText.setText('BROCK   ·   '+(this.storyWave+1)+'/'+this.storyEncounters.length
      +'   ·   '+name);
  }

  private nextStoryPokemon(){
    if(this.storySwitching || this.mode!=='story'){
      if(this.mode!=='story')this.endBattle();
      return;
    }
    if(this.storyWave+1>=this.storyEncounters.length){
      this.endBattle();
      return;
    }
    this.storySwitching=true;
    this.showKnockout('enemy');
    const switchStartedAt=this.time.now;
    this.enemyActiveAt=Infinity;
    this.reactions.enemy=null;
    const defeated=pokemonCatalog[this.enemySpecies].name.toUpperCase();
    this.skillCallout(this.enemy.x,this.enemy.y-79,
      defeated+' FOI DERROTADO!',0xf8d3a1);
    const from={x:this.enemy.x,y:this.enemy.y};
    const trainer=pewterGym.npc.find(n=>n.role==='leader')??{
      x:480,y:94
    };
    const next=this.storyEncounters[this.storyWave+1];
    const nextRawSpawn=next.species==='onix'
      ?{x:480,y:286}:pewterGym.spawnRival;
    const nextSpawn=this.environment?.resolve(nextRawSpawn.x,nextRawSpawn.y,
      pokemonCatalog[next.species].radius)??nextRawSpawn;
    this.time.delayedCall(1540,()=>{
      if(!this.sys.isActive())return;
      this.switchFx?.run({
      outgoing:this.enemyArt,
      from,
      trainer:{x:trainer.x,y:trainer.y},
      to:nextSpawn,
      nextName:next.displayName,
      onReturned:()=>{
        for(const shot of this.projectiles)shot.body.destroy();
        this.projectiles=[];
        this.flameStreams=[];
        this.fx.drawShots([],this.time.now);
        this.enemyArt?.destroy();
        this.enemyArt=undefined;
        this.enemyMotion=undefined;
        this.enemyShadow?.setVisible(false);
        this.enemyLabel.setVisible(false);
        this.enemy.setVisible(false);
      },
      onSummoned:()=>{
        this.storyWave++;
        this.enemySpecies=next.species;
        const info=pokemonCatalog[this.enemySpecies];
        const handicap=Math.min(1.12,0.77+
          Math.max(0,this.starterLevel-5)*0.036);
        this.enemyMaxHp=Math.round(info.maxHp*handicap*this.rules.enemyHp);
        this.enemyHp=this.enemyMaxHp;
        this.shownHp.enemy=this.enemyMaxHp;
        this.enemy.radius=info.radius;
        this.enemy.setPosition(nextSpawn.x,nextSpawn.y);
        this.enemyFacing.set(-1,1).normalize();
        this.reactions.enemy=null;
        this.lastHitAt.enemy=-1000;
        this.enemyCastAt=this.enemyReadyAt(this.time.now);
        this.enemyCastLockUntil=0;
        this.enemySlowUntil=0;
        this.enemyBindUntil=0;
        this.battleStages.enemy=makeStatStages();
        this.updateStageHud();
        this.enemyBurrowTween?.stop();
        this.enemyBurrowed=false;
        this.enemyBurrowVisual.depth=0;
        this.rolloutUntil=0;
        this.knockedOut.enemy=false;
        this.enemyAttackAt=-1000;
        this.enemyHurtAt=-1000;
        this.enemyActionIndex=0;
        this.enemyShadow?.setVisible(true).setAlpha(0.36)
          .setScale(1).setDisplaySize(
          this.enemySpecies==='onix'?142:45,
          this.enemySpecies==='onix'?26:17)
          .setPosition(this.enemy.x,this.enemy.y+15);
        this.createEnemyArt(this.enemy.x,this.enemy.y);
        this.enemyLabel.setText(info.name.toUpperCase()).setVisible(false);
        this.updateWaveText();
        this.updateHp();
        this.drawHealthBars(0);
        this.rockFx?.burst(this.enemy.x,this.enemy.y+10,49,this.time.now,'slam');
        return this.enemyArt;
      },
      onReady:()=>{
        this.stats.excludeTime(this.time.now-switchStartedAt);
        this.enemyLabel.setVisible(true);
        this.storySwitching=false;
        this.enemyActiveAt=this.time.now+1350;
        this.nextEnemyDecision=this.enemyActiveAt;
        this.updateHp();
      }
      });
    });
  }

  private drawArena() {
    const g = this.add.graphics();
    g.fillStyle(0x142e31,1).fillRect(0,0,W,H);
    g.lineStyle(2,0x315b59,0.75);
    for(let x=0;x<W;x+=48)g.lineBetween(x,0,x,H);
    for(let y=0;y<H;y+=48)g.lineBetween(0,y,W,y);
    g.lineStyle(5,0x6fa296,1).strokeRoundedRect(20,20,W-40,H-40,18);
    g.lineStyle(1,0x51817d,0.6).strokeCircle(480,288,105);
    g.lineStyle(2,0x51817d,0.5).lineBetween(480,185,480,391);
  }

  private updateHp() {
    this.hpText.setText(pokemonCatalog[this.playerSpecies].name+
      ' Nv. '+this.starterLevel+
      ': '+this.playerHp+' / '+this.playerMaxHp+' HP');
    this.enemyHpText.setText(pokemonCatalog[this.enemySpecies].name+
      (this.mode==='wild'||this.mode==='training'
        ?' · Nv '+this.wildLevel:'')+
      ': '+this.enemyHp+' / '+this.enemyMaxHp+' HP');
  }

  /** Small overhead bars make damage visible even on narrow mobile screens. */
  private drawHealthBars(delta:number) {
    if(!this.healthBars)return;
    const g=this.healthBars;
    g.clear();
    for(const side of ['player','enemy'] as Side[]) {
      const entity=side==='player'?this.player:this.enemy;
      const hp=side==='player'?this.playerHp:this.enemyHp;
      const width=side==='player'?76:(this.enemySpecies==='onix'?98:70);
      const y=entity.y-(side==='player'?70:
        this.enemySpecies==='onix'?126:
        this.mode==='wild'?64:33);
      const x=entity.x-width/2;
      this.shownHp[side]=Phaser.Math.Linear(this.shownHp[side],hp,
        Phaser.Math.Clamp(delta/240,0,1));
      g.fillStyle(0x081921,0.94).fillRoundedRect(x-3,y-3,width+6,12,5);
      const maxHp=side==='player'?this.playerMaxHp:this.enemyMaxHp;
      g.fillStyle(0x9f423b,0.92).fillRect(x,y,width*hp/maxHp,6);
      const trailWidth=Math.max(0,width*this.shownHp[side]/maxHp);
      if(trailWidth>0.1)g.fillStyle(0xf4bf72,0.72).fillRect(x,y,trailWidth,6);
      const hpWidth=Math.max(0,width*hp/maxHp);
      if(hpWidth>0.1)g.fillStyle(hp/maxHp>0.28?(side==='player'?0x65d5b5:0xe7db72):0xf06262,1)
        .fillRect(x,y,hpWidth,6);
      g.lineStyle(1,0xc6e8e4,0.5).strokeRoundedRect(x-1,y-1,width+2,8,3);
    }
  }

  private updateCombo(time:number) {
    const combo=this.stats.comboAt(time);
    const active=combo>=2;
    this.comboText.setVisible(active);
    this.comboMeter.clear();
    if(!active)return;
    const strong=combo>=10;
    const remaining=this.stats.comboRemaining(time);
    this.comboText.setText(combo+' ACERTOS  ·  COMBO!');
    this.comboText.setColor(strong?'#fff6cb':'#ffe6a6');
    const width=148;
    const x=W/2-width/2;
    this.comboMeter.fillStyle(0x122932,0.82).fillRoundedRect(x,97,width,7,3);
    this.comboMeter.fillStyle(strong?0xffca57:0x74e2d9,0.98)
      .fillRoundedRect(x,97,Math.max(1,width*remaining),7,3);
  }

  private showEvade(time:number) {
    const text=this.add.text(this.player.x,this.player.y-54,'ESQUIVA!',{
      fontSize:'17px',fontStyle:'bold',color:'#f4eaca',
      stroke:'#273c42',strokeThickness:3
    }).setOrigin(0.5).setDepth(14);
    this.tweens.add({targets:text,y:text.y-23,alpha:0,duration:470,
      onComplete:()=>text.destroy()});
    this.fx.dashDust(this.player.x,this.player.y,this.playerFacing,0.3);
    this.lastHudUpdate=Math.min(this.lastHudUpdate,time-60);
  }

  private updateHud(time:number, force=false) {
    if(!force && time-this.lastHudUpdate<60)return;
    this.lastHudUpdate=time;
    const bindings=this.getBindings();
    for(const action of allActions) {
      const element=document.querySelector<HTMLElement>(`[data-action="${action}"]`);
      if(!element)continue;
      const duration=action==='dodge'
        ?dodge.cooldown:skills[this.playerSpecies][action].cooldown;
      const levelNeeded=this.playerSpecies==='charmander'?8:
        this.playerSpecies==='bulbasaur'?7:
        this.playerSpecies==='squirtle'?9:0;
      const unlocked=action!=='r'||this.starterLevel>=levelNeeded;
      const remaining=Math.max(0,duration-(time-this.playerCastAt[action]));
      const text=element.querySelector<HTMLElement>('[data-timer]');
      const fill=element.querySelector<HTMLElement>('[data-shade]');
      const key=element.querySelector<HTMLElement>('[data-key]');
      element.classList.toggle('cooling',remaining>0&&unlocked);
      element.classList.toggle('move-locked',!unlocked);
      if(text)text.textContent=!unlocked?'LIBERA NV '+levelNeeded:
        remaining>0?(remaining/1000).toFixed(1)+'s':'PRONTO';
      if(fill)fill.style.height=unlocked?(remaining/duration*100).toFixed(2)+'%':'0%';
      if(key)key.textContent=keyLabel(bindings[action]);
      this.mobile.setCooldown(action,unlocked?remaining:0,duration);
      if(!unlocked){
        const label=document.querySelector<HTMLElement>(
          '[data-touch-action="r"] [data-touch-timer]');
        if(label)label.textContent='NV '+levelNeeded;
      }
    }
  }

  private faceDirection(side:Side, direction:Phaser.Math.Vector2) {
    if(side==='player')this.playerFacing.copy(direction);
    else this.enemyFacing.copy(direction);
  }

  private directionTo(from:Phaser.Math.Vector2|Phaser.GameObjects.Arc,x:number,y:number,fallback:Phaser.Math.Vector2) {
    const dir=vector(x-from.x,y-from.y);
    if(dir.lengthSq()<0.0001)return fallback.clone();
    return dir.normalize();
  }

  private canCast(side:Side,skill:Skill,time:number) {
    const last=side==='player'?this.playerCastAt[skill]:this.enemyCastAt[skill];
    const species=side==='player'?this.playerSpecies:this.enemySpecies;
    return time-last>=pokemonCatalog[species].skillSet[skill].cooldown;
  }

  private playerCast(action:Action,time:number) {
    if(action==='dodge') {
      if(this.dash||this.tackles.player||
      time-this.playerCastAt.dodge<dodge.cooldown)return;
      const pointer=this.input.activePointer;
      const stick=this.mobile.axis;
      const dir=this.mobile.active
        ? (Math.hypot(stick.x,stick.y)>0.12
          ? vector(stick.x,stick.y).normalize()
          : this.directionTo(this.player,this.enemy.x,this.enemy.y,this.playerFacing))
        : this.directionTo(this.player,pointer.worldX,pointer.worldY,this.playerFacing);
      const start=vector(this.player.x,this.player.y);
      const raw=vector(clampX(start.x+dir.x*DODGE_DISTANCE),
        clampY(start.y+dir.y*DODGE_DISTANCE));
      const safe=this.environment?.resolve(raw.x,raw.y,this.player.radius);
      const end=safe?vector(safe.x,safe.y):raw;
      if(start.distance(end)<5)return;
      this.playerCastAt.dodge=time;
      this.stats.registerDodge();
      this.playerFacing.copy(dir);
      this.dash={from:start,to:end,direction:dir,startAt:time,
        duration:DODGE_DURATION_MS,lastTrailAt:-1000};
      // Walk frames remain grounded; the old Hop sprite made this look
      // like a teleport, especially when sliding near the circular rim.
      this.playerMotion?.face(dir);
      this.fx.dodgeWind(start.x,start.y,dir,0.85);
      this.destination.copy(end);
      return;
    }
    // Four slots become available as Charmander learns new moves.
    const needed=this.playerSpecies==='charmander'?8:
      this.playerSpecies==='bulbasaur'?7:
      this.playerSpecies==='squirtle'?9:0;
    if(action==='r'&&this.starterLevel<needed){
      if(time-this.lastMoveLockedCue>1250){
        this.skillCallout(this.player.x,this.player.y-80,
          'HABILIDADE NO NÍVEL '+needed,0xf3d49b);
        this.lastMoveLockedCue=time;
      }
      return;
    }
    // Dodge locks other casts briefly so the Hop frames play clearly.
    if(this.dash||this.tackles.player)return;
    if(!this.canCast('player',action,time))return;
    this.playerCastAt[action]=time;
    this.playerAttackAt=time;
    const pointer=this.input.activePointer;
    // Touchscreen has no mouse cursor: attacks automatically aim at Pikachu.
    const dir=this.mobile.active
      ? this.directionTo(this.player,this.enemy.x,this.enemy.y,this.playerFacing)
      : this.directionTo(this.player,pointer.worldX,pointer.worldY,this.playerFacing);
    this.faceDirection('player',dir);
    const isBase=this.playerSpecies!=='charizard';
    const motion=isBase
      ?action==='q'?'Attack':action==='w'?'Charge':
        action==='e'?'Shoot':'Charge'
      :action==='r'?'Attack':action==='e'?'Charge':'Shoot';
    this.playerMotion?.trigger(motion,time,dir,
      action==='w'&&this.playerSpecies==='charizard'?785:undefined);
    // Use the exact launch frame from PMD animations, not guessed timers.
    const windupMs=this.playerMotion ? releaseFrameMs(this.playerSpecies,motion)
      : ({q:60,w:115,e:180,r:270} as Record<Skill,number>)[action];
    const charge=action==='r'?1.8:action==='e'?1.4:1;
    const advanced=this.playerSpecies==='charizard';
    const flame=this.playerSpecies==='charmander'
      ||this.playerSpecies==='charmeleon';
    if(advanced||action==='e'&&flame)this.fx.charge(
      this.player.x+dir.x*23,this.player.y+dir.y*23,
      'fire',advanced?charge:0.72
    );
    if(advanced&&(action==='r'||action==='e')){
      const power=action==='r'?2.7:1.35;
      this.cinematic.charge('player','fire',power,time,Math.max(140,windupMs+40));
      if(action==='r')this.skillCallout(this.player.x,this.player.y-87,
        'RAJADA DE FOGO',0xffcf87);
    }
    // Intentional short wind-up: the body anticipates before the projectile releases.
    this.time.delayedCall(windupMs,()=>{
      if(this.finished)return;
      if(this.playerSpecies==='charizard')
        this.castCharizard(action,dir,this.time.now);
      else if(this.playerSpecies==='charmander'||this.playerSpecies==='charmeleon')
        this.castCharmander(action,dir,this.time.now);
      else
        this.castOtherStarter(action,dir,this.time.now);
    });
  }

  private castCharmander(skill:Skill,dir:Phaser.Math.Vector2,time:number){
    const move=skills[this.playerSpecies][skill];
    const mx=this.player.x+dir.x*28,my=this.player.y-22+dir.y*24;
    const target={x:this.enemy.x,y:this.enemy.y};
    const source={x:mx,y:my};
    if(skill==='q'){
      // Scratch: three clear claw trails; the attack is physical NORMAL.
      const dx=this.enemy.x-this.player.x,dy=this.enemy.y-this.player.y;
      const dist=Math.hypot(dx,dy);
      const lands=dist<=88+this.enemy.radius && dx*dir.x+dy*dir.y>0;
      const marker=lands?target:{
        x:this.player.x+dir.x*69,y:this.player.y+dir.y*69
      };
      this.starterFx.scratch(source,marker,dir);
      if(lands)this.damage('enemy',move.damage,
        this.enemy.x,this.enemy.y,0xf1d4a0,'normal');
    } else if(skill==='w'){
      // Growl is a status move; it never fires flame or deals damage.
      this.starterFx.growl(source,target);
      this.skillCallout(this.player.x,this.player.y-72,'ROSNAR!',0xffe7aa);
      if(Phaser.Math.Distance.Between(this.player.x,this.player.y,
        this.enemy.x,this.enemy.y)<380){
        this.changeBattleStat('enemy','attack',-1);
      }
    } else if(skill==='e'){
      // Ember: visibly larger fireball and a luminous release marker.
      this.starterFx.ember(mx,my,Math.atan2(dir.y,dir.x));
      this.fx.breath(mx,my,Math.atan2(dir.y,dir.x),0.96);
      this.projectile(mx,my,dir,395,14,'ember','player',
        move.damage,1140,time);
      this.flash(mx,my,0xffc76c,19);
    } else {
      // Smokescreen emits an actual volumetric, lasting cloud from the muzzle.
      this.starterFx.smoke(source,target);
      this.skillCallout(this.player.x,this.player.y-74,
        'CORTINA DE FUMAÇA!',0xdae5df);
      if(Phaser.Math.Distance.Between(this.player.x,this.player.y,
        this.enemy.x,this.enemy.y)<400){
        this.enemySlowUntil=Math.max(this.enemySlowUntil,time+3200);
        this.enemyCastLockUntil=Math.max(this.enemyCastLockUntil,time+1250);
      }
    }
  }

  private castOtherStarter(skill:Skill,dir:Phaser.Math.Vector2,time:number){
    const grass=this.playerSpecies==='bulbasaur'||this.playerSpecies==='ivysaur';
    const move=skills[this.playerSpecies][skill];
    const origin={x:this.player.x+dir.x*27,y:this.player.y-14+dir.y*19};
    const target={x:this.enemy.x,y:this.enemy.y};
    const dist=Phaser.Math.Distance.Between(this.player.x,this.player.y,
      this.enemy.x,this.enemy.y);
    if(skill==='q'){
      // Player skill follows the mouse direction at the actual hit frame,
      // not an auto-aim vector to the enemy. On touch, use aim assist.
      const aim=this.mobile.active?dir:
        this.directionTo(this.player,this.input.activePointer.worldX,
          this.input.activePointer.worldY,dir);
      this.startTackle('player',move.damage,move.element,time,aim);
    }else if(skill==='w'){
      if(grass){
        this.starterFx.growl(origin,target);
        if(dist<380)this.changeBattleStat('enemy','attack',-1);
        this.skillCallout(this.player.x,this.player.y-65,
          'ROSNAR!',0xe6dda6);
      }else{
        this.starterFx.notes(target);
        if(dist<350)this.changeBattleStat('enemy','defense',-1);
        this.skillCallout(this.player.x,this.player.y-65,
          'DEFESA DO RIVAL ↓',0xb8e8f0);
      }
    }else if(skill==='e'){
      if(grass){
        this.starterFx.vines(origin,dist<310?target:{
          x:origin.x+dir.x*275,y:origin.y+dir.y*275
        });
        this.skillCallout(this.player.x,this.player.y-64,
          'CHICOTE DE VINHA!',0x9eee9a);
        if(dist<310)this.damage('enemy',move.damage,target.x,target.y,
          0x9ddd90,'grass','physical');
      }else{
        this.starterFx.water(origin,dir);
        this.projectile(origin.x,origin.y,dir,440,14,'water','player',
          move.damage,1080,time);
      }
    }else if(grass){
      this.starterFx.seed(origin,target);
      this.skillCallout(this.player.x,this.player.y-63,
        'SEMENTE SANGUE!',0xa0ec91);
      if(dist<380){
        for(let i=0;i<4;i++){
          this.time.delayedCall(470*(i+1),()=>{
            if(this.finished||this.storySwitching)return;
            const before=this.enemyHp;
            this.damage('enemy',move.damage,this.enemy.x,this.enemy.y,
              0x9bdf92,'grass');
            const drained=Math.max(0,before-this.enemyHp);
            if(drained>0){
              this.playerHp=Math.min(this.playerMaxHp,
                this.playerHp+Math.max(1,Math.round(drained*0.45)));
              this.updateHp();
            }
            this.starterFx.seed(
              {x:this.enemy.x,y:this.enemy.y},
              {x:this.player.x,y:this.player.y}
            );
          });
        }
      }
    }else{
      this.starterFx.shell({x:this.player.x,y:this.player.y});
      this.changeBattleStat('player','defense',1);
    }
  }

  private castCharizard(skill:Skill,dir:Phaser.Math.Vector2,time:number) {
    const x=this.player.x+dir.x*25, y=this.player.y-10+dir.y*20;
    const ability=skills.charizard[skill];
    const angle=Math.atan2(dir.y,dir.x);
    if(skill==='q') {
      this.fx.breath(x,y,angle,0.5);
      this.projectile(x,y,dir,570,7,'ember','player',ability.damage,670,time);
      this.flash(x,y,0xffd17b,11);
    } else if(skill==='w') {
      // One coherent, aimable beam with synchronized visual and hit geometry.
      this.flameStreams.push({
        startAt:time,direction:dir.clone(),duration:740,nextHitAt:time+145
      });
      this.fx.charge(x,y,'fire',1.25);
      this.fx.breath(x,y,angle,0.75);
      this.pulse(x,y,0xff7932,23,0.4);
    } else if(skill==='e') {
      this.playerMotion?.trigger('Shoot',time,dir);
      this.cinematic.release(x,y,'fire',1.35,time);
      this.fx.charge(x,y,'fire',1.35);
      this.projectile(x,y,dir,310,18,'fireball','player',ability.damage,990,time,78);
      this.flash(x,y,0xffb15a,26);
    } else {
      this.cinematic.release(x,y,'fire',2.6,time);
      this.fx.charge(x,y,'fire',2.3);
      this.pulse(x,y,0xffbd40,35,0.85);
      this.cameras.main.shake(115,0.003);
      this.projectile(x,y,dir,395,22,'fireburst','player',ability.damage,1150,time,112);
      // The extra embers form the characteristic split flame-star silhouette.
      for(const angleOffset of [-0.37,0.37]){
        this.projectile(x,y,dir.clone().rotate(angleOffset),370,8,'ember','player',6,710,time);
      }
    }
  }

  private castPikachu(skill:Skill,time:number) {
    if(!this.canCast('enemy',skill,time))return;
    const ability=skills.pikachu[skill];
    this.enemyCastAt[skill]=time;
    this.enemyAttackAt=time;
    const from=this.enemy;
    const dir=this.directionTo(from,this.player.x,this.player.y,this.enemyFacing);
    this.faceDirection('enemy',dir);
    const enemyMotion=skill==='r'?'Attack':skill==='w'||skill==='e'?'Charge':'Shoot';
    this.enemyMotion?.trigger(enemyMotion,time,dir);
    this.fx.charge(from.x,from.y-8,'electric',skill==='r'?1.8:1.1);
    if(skill==='e'||skill==='r') {
      this.cinematic.charge('enemy','electric',skill==='r'?2.7:1.45,time,
        skill==='r'?730:480);
      if(skill==='r')this.skillCallout(from.x,from.y-65,'TROVÃO',0xfff3a3);
    }
    if(skill==='q') {
      const x=from.x+dir.x*19,y=from.y+dir.y*19;
      this.time.delayedCall(this.enemyMotion?releaseFrameMs('pikachu','Shoot'):120,()=>{
        if(this.finished)return;
        this.projectile(this.enemy.x+dir.x*19,this.enemy.y+dir.y*19,dir,490,9,'spark','enemy',
          ability.damage,760,this.time.now);
        this.fx.bolt(x,y,x+dir.x*35,y+dir.y*35,3,120);
      });
    } else if(skill==='w') {
      const x=from.x,y=from.y;
      const ring=this.add.circle(x,y,24,0xfde47e,0.12).setStrokeStyle(4,0xffed7a).setDepth(4);
      this.tweens.add({targets:ring,scaleX:5.4,scaleY:5.4,alpha:0,duration:400,
        onComplete:()=>ring.destroy()});
      for(let i=0;i<10;i++) {
        const a=i*Math.PI*2/10;
        const distance=75+Math.random()*43;
        this.time.delayedCall(i*23,()=>{
          if(!this.finished)this.fx.bolt(x,y,x+Math.cos(a)*distance,y+Math.sin(a)*distance,3,200);
        });
      }
      this.time.delayedCall(350,()=>{
        if(this.finished)return;
        this.cinematic.release(x,y,'electric',1.1,this.time.now);
        this.fx.impact(x,y,'electric',1.3);
        if(Phaser.Math.Distance.Between(x,y,this.player.x,this.player.y)<133)
          this.damage('player',ability.damage,this.player.x,this.player.y,0xffec7c);
      });
    } else if(skill==='e') {
      this.warnLightning(this.player.x,this.player.y,43,ability.damage,510);
    } else {
      const first=vector(this.player.x,this.player.y);
      const approach=this.directionTo(this.enemy,this.player.x,this.player.y,dir);
      for(let i=0;i<3;i++){
        const offset=(i-1)*55;
        const x=clampX(first.x+approach.x*i*34-approach.y*offset);
        const y=clampY(first.y+approach.y*i*34+approach.x*offset);
        this.time.delayedCall(i*330,()=>{
          if(!this.finished)this.warnLightning(x,y,53,ability.damage,590);
        });
      }
    }
  }

  private castRockPokemon(skill:Skill,time:number){
    const species=this.enemySpecies;
    if(species!=='geodude'&&species!=='onix'||this.storySwitching)return;
    if(!this.canCast('enemy',skill,time))return;
    if(!this.rockMoves)return;
    this.enemyCastAt[skill]=time;
    this.enemyAttackAt=time;
    // Prevent AI strafing or casting a second attack during longer telegraphs.
    const lock=skill==='r'?1640:skill==='e'?990:
      skill==='w'&&species==='geodude'?1540:
      skill==='w'&&species==='onix'?2550:310;
    this.enemyCastLockUntil=Math.max(this.enemyCastLockUntil,time+lock);
    if(skill==='w'&&species==='geodude')this.rolloutUntil=time+1450;
    const dir=this.directionTo(this.enemy,this.player.x,this.player.y,this.enemyFacing);
    this.faceDirection('enemy',dir);
    const motion=skill==='q'?'Shoot':skill==='w'?'Attack':'Charge';
    this.enemyMotion?.trigger(motion,time,dir);
    // RockMoves owns the charge cue so each spell produces one coherent
    // wind-up, regardless of which side casts it.
    this.rockMoves.cast(species,skill,'enemy',time,{
      projectile:(x,y,direction,speed,radius,kind,side,damage,lifetime,now)=>
        this.projectile(x,y,direction,speed,radius,kind,side,damage,lifetime,now),
      targetPosition:()=>({x:this.player.x,y:this.player.y,radius:this.player.radius}),
      sourcePosition:()=>({x:this.enemy.x,y:this.enemy.y}),
      hitArea:(x,y,radius,damage,side)=>{
        const victimSide=side==='enemy'?'player':'enemy';
        const target=victimSide==='player'?this.player:this.enemy;
        const healthBefore=victimSide==='player'?this.playerHp:this.enemyHp;
        if(Phaser.Math.Distance.Between(x,y,target.x,target.y)>=radius+target.radius)
          return false;
        this.damage(victimSide,damage,target.x,target.y,0xcbb18b,
          pokemonCatalog[species].skillSet[skill].element);
        return (victimSide==='player'?this.playerHp:this.enemyHp)<healthBefore;
      },
      applyStatus:(status:RockStatus,duration,side)=>{
        const until=this.time.now+duration;
        if(status==='slow'){
          this.changeBattleStat(side==='enemy'?'player':'enemy','speed',-1);
        }else if(side==='enemy'){
          this.playerBindUntil=Math.max(this.playerBindUntil,until);
        }else{
          this.enemyBindUntil=Math.max(this.enemyBindUntil,until);
        }
      },
      moveSource:(x,y)=>{
        const safe=this.environment?.resolve(x,y,this.enemy.radius)??{x,y};
        this.enemy.setPosition(safe.x,safe.y);
        this.enemyShadow?.setPosition(safe.x,safe.y+15);
        return safe;
      },
      setBurrowed:(burrowed)=>this.animateOnixBurrow(burrowed),
      stillActive:()=>!this.finished&&!this.storySwitching&&this.enemySpecies===species,
      charge:(power,duration)=>this.cinematic.charge('enemy','rock',power,
        this.time.now,duration),
      signal:(name)=>{
        if(skill!=='q'||species==='onix')this.skillCallout(this.enemy.x,
          this.enemy.y-(species==='onix'?110:71),name,0xdfbb8b);
      }
    });
  }

  /** Update status stages and show both a floating confirmation and a persistent HUD. */
  private changeBattleStat(side:Side,stat:BattleStat,amount:number):void{
    if(this.finished||this.storySwitching)return;
    const changed=changeStatStage(this.battleStages[side],stat,amount);
    const entity=side==='player'?this.player:this.enemy;
    const name=({attack:'ATAQUE',defense:'DEFESA',accuracy:'PRECISÃO',
      speed:'VELOCIDADE'} as const)[stat];
    const owner=side==='enemy'?'RIVAL':'SEU POKÉMON';
    const text=changed===0?name+' NO LIMITE':
      name+' '+(changed>0?'↑':'↓')+' ('+
      (this.battleStages[side][stat]>0?'+':'')+
      this.battleStages[side][stat]+')';
    this.skillCallout(entity.x,entity.y-(side==='enemy'?82:67),
      owner+' · '+text,changed>0?0xbbe9ab:0xffd9a2);
    this.updateStageHud();
  }

  private updateStageHud():void{
    const summary=(stages:StatStages):string=>
      (['attack','defense','accuracy','speed'] as BattleStat[])
        .filter(stat=>stages[stat]!==0)
        .map(stat=>({
          attack:'ATQ',defense:'DEF',accuracy:'PRE',speed:'VEL'
        })[stat]+' '+(stages[stat]>0?'+':'')+stages[stat])
        .join(' · ');
    this.playerStageText?.setText(summary(this.battleStages.player));
    this.enemyStageText?.setText(summary(this.battleStages.enemy));
  }

  private skillCallout(x:number,y:number,message:string,color:number){
    const label=this.add.text(x,y,message,{
      color:'#fff6df',fontSize:'17px',fontStyle:'bold',
      stroke:'#151e2a',strokeThickness:4,
      backgroundColor:'#122530b8',padding:{x:7,y:4}
    }).setOrigin(0.5).setDepth(13).setTint(color).setAlpha(0.96);
    this.tweens.add({
      targets:label,y:y-23,alpha:0,scaleX:1.07,scaleY:1.07,
      duration:650,ease:'Quad.easeOut',onComplete:()=>label.destroy()
    });
  }

  private projectile(
    x:number,y:number,dir:Phaser.Math.Vector2,speed:number,radius:number,
    kind:ProjectileKind,side:Side,damage:number,lifetime:number,time:number,blastRadius=0
  ) {
    // Invisible hitbox: VFX draws angular flames/lightning over it every frame.
    const body=this.add.circle(x,y,radius,0xffffff,0).setVisible(false);
    this.projectiles.push({body,velocity:dir.clone().scale(speed),side,kind,damage,expiry:time+lifetime,lastTrail:-1000,blastRadius});
  }

  private flash(x:number,y:number,color:number,radius:number) {
    const flash=this.add.circle(x,y,radius,color,0.65).setDepth(4);
    this.tweens.add({targets:flash,alpha:0,scaleX:1.9,scaleY:1.9,duration:210,onComplete:()=>flash.destroy()});
  }

  private pulse(x:number,y:number,color:number,radius:number,alpha=0.8) {
    const ring=this.add.circle(x,y,radius,color,0.1).setStrokeStyle(3,color,alpha).setDepth(4);
    this.tweens.add({targets:ring,alpha:0,scaleX:2.7,scaleY:2.7,duration:350,onComplete:()=>ring.destroy()});
  }

  private sparkParticle(x:number,y:number,color:number,radius=4) {
    const particle=this.add.circle(x,y,radius,color,0.85).setDepth(3);
    this.tweens.add({targets:particle,alpha:0,scaleX:0.2,scaleY:0.2,duration:210,onComplete:()=>particle.destroy()});
  }

  private electricLine(x1:number,y1:number,x2:number,y2:number,color=0xffe77b,width=3) {
    const graphics=this.add.graphics().setDepth(6);
    const dx=x2-x1,dy=y2-y1,distance=Math.max(1,Math.hypot(dx,dy));
    const px=-dy/distance,py=dx/distance;
    const segments=Math.max(3,Math.ceil(distance/23));
    graphics.lineStyle(width,color,1);
    let ox=x1,oy=y1;
    for(let i=1;i<=segments;i++){
      const t=i/segments;
      const offset=i===segments?0:(i%2?1:-1)*Math.min(12,distance/14);
      const nx=x1+dx*t+px*offset,ny=y1+dy*t+py*offset;
      graphics.lineBetween(ox,oy,nx,ny);
      ox=nx;oy=ny;
    }
    this.tweens.add({targets:graphics,alpha:0,duration:200,onComplete:()=>graphics.destroy()});
  }

  private warnLightning(x:number,y:number,radius:number,damage:number,warning:number) {
    this.fx.telegraph(x,y,radius,'electric',warning);
    this.time.delayedCall(warning,()=>{
      if(this.finished)return;
      this.fx.lightning(x,y,1.2);
      this.cinematic.burst(x,y,'electric',radius>=50?2.35:1.5,this.time.now);
      this.cameras.main.shake(105,0.0025);
      if(Phaser.Math.Distance.Between(x,y,this.player.x,this.player.y)<radius+this.player.radius)
        this.damage('player',damage,this.player.x,this.player.y,0xffe36a);
    });
  }

  private explode(x:number,y:number,radius:number,damage:number,side:Side,special:boolean) {
    const color=special?0xffd058:0xff6838;
    this.fx.impact(x,y,'fire',special?2.3:1.45);
    this.cinematic.burst(x,y,'fire',special?3:1.6,this.time.now);
    if(special)this.cameras.main.shake(165,0.006);
    const bloom=this.add.circle(x,y,radius*0.5,color,0.24).setStrokeStyle(special?5:3,0xffd89b).setDepth(4);
    this.tweens.add({targets:bloom,alpha:0,scaleX:2,scaleY:2,duration:420,onComplete:()=>bloom.destroy()});
    for(let i=0;i<(special?12:8);i++){
      const a=i*Math.PI*2/(special?12:8);
      const endX=x+Math.cos(a)*radius*0.8,endY=y+Math.sin(a)*radius*0.8;
      const c=this.add.circle(x,y,special?7:5,i%2?0xffb653:0xff5126,0.9).setDepth(5);
      this.tweens.add({targets:c,x:endX,y:endY,alpha:0,scaleX:0.3,scaleY:0.3,duration:360,onComplete:()=>c.destroy()});
    }
    const target=side==='player'?this.enemy:this.player;
    if(Phaser.Math.Distance.Between(x,y,target.x,target.y)<radius+target.radius)
      this.damage(side==='player'?'enemy':'player',damage,target.x,target.y,color);
  }

  private damage(
    target:Side,amount:number,x:number,y:number,color:number,
    attackType?:PokemonType,damageClass?:'physical'|'special'
  ) {
    if(this.finished || this.storySwitching ||
      (target==='enemy'&&this.enemyBurrowed) ||
      (this.mode==='story'&&this.time.now<this.storyIntroUntil))return;
    const now=this.time.now;
    const elemental=attackType ??
      ([0xffec7c,0xffe36a,0xffee7a].includes(color)?'electric':
        [0xcbb18b,0xbca57c].includes(color)?'rock':'fire');
    const defender=target==='player'?this.playerSpecies:this.enemySpecies;
    const multiplier=effectiveness(elemental,pokemonCatalog[defender].elements);
    const attacker:Side=target==='player'?'enemy':'player';
    const physical=damageClass==='physical'||(!damageClass&&
      ['normal','rock','ground','flying','bug','poison'].includes(elemental));
    const stagePower=physical?physicalDamageMultiplier(
      this.battleStages[attacker],this.battleStages[target]):1;
    const difficultyFactor=target==='player'&&this.mode!=='training'
      ?this.rules.enemyDamage:1;
    const encounterLevel=target==='player'&&this.mode==='wild'
      ?Math.max(0.82,Math.min(1.35,1+
        (this.wildLevel-this.starterLevel)*0.07)):1;
    const trainer=target==='player'&&this.mode==='practice'?0.52:
      target==='player'&&this.mode==='wild'?0.96:1;
    const levelBoost=target==='enemy'&&this.mode==='training'
      ?Math.max(0.7,Math.min(1.58,
        0.6+this.starterLevel*0.026)):
      target==='enemy'
        ?1+Math.min(0.72,Math.max(0,this.starterLevel-5)*0.064):1;
    const received=scaledDamage(
      Math.max(1,Math.round(amount*stagePower*trainer*levelBoost*difficultyFactor*encounterLevel)),
      elemental,pokemonCatalog[defender].elements);
    if(multiplier.category!=='neutral'&&now-this.lastTypeCueAt[target]>1280){
      const label=multiplier.category==='immune'?'NÃO AFETA!':
        multiplier.category==='resisted'?'POUCO EFETIVO':
        'SUPER EFETIVO! ×'+multiplier.multiplier;
      const tint=multiplier.category==='effective'?0xffd076:
        multiplier.category==='immune'?0xb4d2e5:0xaabac5;
      this.skillCallout(x,y-(target==='enemy'?90:76),label,tint);
      this.lastTypeCueAt[target]=now;
    }
    // In main-series Pokémon, Flying makes Charizard completely immune
    // to ground moves such as Dig, Earthquake and Magnitude.
    if(received===0)return;
    // Real dodge invulnerability is tied to the visible Hop, not a teleport.
    if(target==='player' && this.dash && now-this.dash.startAt<this.dash.duration*0.70){
      if(this.stats.registerEvade(now))this.showEvade(now);
      return;
    }
    // A reduced accuracy stage means the attack can miss despite reaching the hitbox.
    if(Math.random()>accuracyChance(this.battleStages[attacker])){
      if(now-this.lastAccuracyCueAt[target]>950){
        this.lastAccuracyCueAt[target]=now;
        this.skillCallout(x,y-63,'ERROU!',0xdfe7b5);
      }
      return;
    }
    // Prevent overlapping impact events in the same couple of frames; long
    // streams can still tick as the Pokémon remains exposed to them.
    if(now-this.lastHitAt[target]<75)return;
    this.lastHitAt[target]=now;
    const victim=target==='player'?this.player:this.enemy;
    const source=target==='player'?this.enemy:this.player;
    const direction=vector(victim.x-source.x,victim.y-source.y);
    if(direction.lengthSq()<0.0001)direction.set(target==='player'?-1:1,0);
    direction.normalize();
    amount=received;
    const heavy=amount>=17;
    this.reactions[target]={
      startAt:now,duration:heavy?195:140,distance:heavy?29:15,
      lastDistance:0,direction
    };
    if(target==='player') {
      const actual=Math.min(this.playerHp,amount);
      this.playerHp=Math.max(0,this.playerHp-amount);
      this.stats.registerDamage(actual);
      this.playerHurtAt=now;
      this.playerMotion?.hurt(now);
    } else {
      const actual=Math.min(this.enemyHp,amount);
      this.enemyHp=Math.max(0,this.enemyHp-amount);
      const combo=this.stats.registerHit(actual,now);
      if(combo===5||combo===10||combo===20)
        this.skillCallout(this.enemy.x,this.enemy.y-75,
          combo+' ACERTOS!',0xffe69c);
      this.enemyHurtAt=now;
      this.enemyMotion?.hurt(now);
    }
    this.updateHp();
    this.hitStopUntil=now+(heavy?48:24);
    this.cameras.main.shake(heavy?115:64,heavy?0.0038:0.0017);
    const electric=[0xffec7c,0xffe36a,0xffee7a].includes(color);
    const rock=color===0xcbb18b || color===0xbca57c;
    const element=electric?'electric':'fire';
    if(rock){
      this.rockFx?.burst(x,y,heavy?42:24,now,'slam');
    }else{
      this.fx.impact(x,y,element,heavy?1.18:0.72);
      this.fx.hitAccent(x,y,Math.atan2(direction.y,direction.x),element,heavy?1.35:0.85);
    }
    this.flash(x,y,color,heavy?21:13);
    const label=this.add.text(victim.x,victim.y-36,'-'+amount,{
      fontSize:heavy?'24px':'18px',fontStyle:'bold',
      color:electric?'#fff5aa':rock?'#f0dfc1':'#ffe6c9',
      stroke:'#16222e',strokeThickness:3
    }).setOrigin(0.5).setDepth(15);
    this.tweens.add({targets:label,y:victim.y-(heavy?83:63),alpha:0,scaleX:heavy?1.2:1.05,
      scaleY:heavy?1.2:1.05,duration:heavy?570:460,onComplete:()=>label.destroy()});
    if(this.playerHp<=0)this.endBattle();
    else if(this.enemyHp<=0){
      if(this.mode==='story')this.nextStoryPokemon();
      else this.endBattle();
    }
  }

  /** Show the real fallen Pokémon before any score card or changeover.
   * The actual OverworldActor image is held in a hurt frame and tipped
   * onto the ground; it is never replaced by a generic blank outline.
   */
  private showKnockout(side:Side):void{
    if(this.knockedOut[side])return;
    this.knockedOut[side]=true;
    this.tackles[side]=null;
    const body=side==='player'?this.player:this.enemy;
    const actor=side==='player'?this.playerMotion:this.enemyMotion;
    const art=side==='player'?this.playerArt:this.enemyArt;
    const shadow=side==='player'?this.playerShadow:this.enemyShadow;
    const name=side==='player'
      ?pokemonCatalog[this.playerSpecies].name
      :pokemonCatalog[this.enemySpecies].name;
    actor?.knockOut(body.x,body.y);
    if(!actor&&art){
      const angle=side==='player'?86:-86;
      this.tweens.add({
        targets:art,y:body.y-4,angle,
        scaleX:art.scaleX*0.86,scaleY:art.scaleY*0.63,
        duration:570,ease:'Cubic.easeOut'
      });
    }
    if(!art)body.setVisible(true);
    if(shadow){
      this.tweens.add({targets:shadow,alpha:0.17,scaleX:1.35,
        scaleY:0.75,duration:630,ease:'Cubic.easeOut'});
    }
    if(side==='player'){
      this.playerLabel?.setVisible(false);
      this.dash=undefined;
    }else{
      this.enemyLabel?.setVisible(false);
      this.enemyBurrowTween?.stop();
      this.enemyBurrowed=false;
    }
    const dust=this.add.ellipse(body.x,body.y+12,48,13,
      0xd6bea1,0.25).setStrokeStyle(2,0xf5e5c4,0.49).setDepth(3);
    this.tweens.add({targets:dust,alpha:0,
      scaleX:2.1,scaleY:1.5,duration:580,
      onComplete:()=>dust.destroy()});
    const word=this.add.text(body.x,body.y-
      (side==='enemy'&&this.enemySpecies==='onix'?160:77),
      name.toUpperCase()+' NOCAUTEADO!',{
        fontSize:'19px',fontStyle:'bold',color:'#f5dab4',
        stroke:'#14242a',strokeThickness:5
      }).setOrigin(0.5).setDepth(18).setAlpha(0);
    this.tweens.add({targets:word,alpha:1,y:word.y-7,
      duration:300,delay:410,ease:'Cubic.easeOut'});
    this.tweens.add({targets:word,alpha:0,duration:240,
      delay:1300,onComplete:()=>word.destroy()});
  }

  private endBattle() {
    if(this.finished)return;
    // The combat stops immediately, but the score panel must wait until
    // the losing Pokémon has visibly dropped onto the battlefield.
    this.finished=true;
    this.comboText.setVisible(false);
    this.comboMeter.clear();
    this.tackles={player:null,enemy:null};
    this.flameStreams=[];
    const loser:Side=this.playerHp<=0?'player':'enemy';
    this.showKnockout(loser);
    for(const shot of this.projectiles)shot.body.destroy();
    this.projectiles=[];
    this.fx.drawShots([],this.time.now);
    const result=this.stats.finish(
      this.time.now,this.playerHp>0,this.playerHp
    );
    this.time.delayedCall(1700,()=>{
      if(!this.sys.isActive())return;
      this.mobile.setFinished(true);
      const returnOnly=this.mode==='wild'||this.mode==='practice';
      const rematch=document.querySelector<HTMLButtonElement>(
        '[data-battle-rematch]');
      if(rematch)rematch.textContent=returnOnly
        ?'↩ Voltar à Safari':'↻ Jogar novamente';
      const touchRestart=document.querySelector<HTMLButtonElement>(
        '[data-touch-restart]');
      if(touchRestart)touchRestart.textContent=returnOnly
        ?'↩ Voltar à Safari':'↻ Jogar novamente';
      if(this.mode==='story'){
        const back=document.querySelector<HTMLButtonElement>(
          '[data-return-story]');
        if(back)back.hidden=false;
      }
      if(this.mode==='practice'||this.mode==='wild'){
        const wild=this.mode==='wild'?activeWildEncounter():null;
        window.dispatchEvent(new CustomEvent('monster-arena:practice-result',{
          detail:{
            victory:result.victory,
            experience:result.victory?(wild?.experience??100):0,
            species:this.enemySpecies,level:this.wildLevel,mode:this.mode
          }
        }));
      }
      if(this.mode==='story'&&result.victory)
        window.dispatchEvent(new Event('monster-arena:gym-victory'));
      this.showResults(result);
    });
  }

  private showResults(result:BattleSummary) {
    const center=W/2;
    const tint=result.victory?0x79e4ba:0xffbb85;
    this.add.rectangle(center,H/2,650,346,0x071820,0.96)
      .setStrokeStyle(3,0x4e8383,0.92).setDepth(23);
    const headline=result.victory?'VITÓRIA!':'DERROTA';
    this.add.text(center,147,headline,{
      fontSize:'35px',fontStyle:'bold',color:result.victory?'#a4f1d3':'#ffb7aa',
      stroke:'#14313b',strokeThickness:3
    }).setOrigin(0.5).setDepth(25);
    this.add.text(center,182,
      'TEMPO  '+formatBattleTime(result.durationSeconds)+'   ·   RANK  '+result.rank,
      {fontSize:'18px',fontStyle:'bold',color:'#d6e9e7'}
    ).setOrigin(0.5).setDepth(25);
    this.add.rectangle(center,206,530,1,0x47747b).setDepth(25);
    const left=238,right=494;
    const addRow=(x:number,y:number,label:string,value:string,highlight=false)=>{
      this.add.text(x,y,label,{
        fontSize:'15px',color:'#a8c7cb'
      }).setDepth(25);
      this.add.text(x+228,y,value,{
        fontSize:'16px',fontStyle:'bold',color:highlight?'#ffe4a7':'#f0faf6'
      }).setOrigin(1,0).setDepth(25);
    };
    addRow(left,230,'Dano causado',String(result.damageDealt));
    addRow(left,265,'Dano recebido',String(result.damageTaken));
    addRow(left,300,'Acertos',String(result.hitsLanded));
    addRow(right,230,'Maior combo',String(result.bestCombo),result.bestCombo>=5);
    addRow(right,265,'Esquivas usadas',String(result.dodgesUsed));
    addRow(right,300,'Golpes evitados',String(result.attacksDodged),result.attacksDodged>0);
    const recordNotes:string[]=[];
    if(result.newComboRecord)recordNotes.push('NOVO RECORDE DE COMBO');
    if(result.newTimeRecord)recordNotes.push('MELHOR TEMPO');
    const record=recordNotes.length?recordNotes.join('  ·  ')
      : 'RECORDE DE COMBO: '+result.bestComboRecord+
        (result.fastestVictorySeconds===null?'':'   ·   MELHOR VITÓRIA: '+formatBattleTime(result.fastestVictorySeconds));
    this.add.text(center,351,record,{
      fontSize:'14px',fontStyle:'bold',color:recordNotes.length?'#ffe2a1':'#8fb8c1',
      align:'center'
    }).setOrigin(0.5).setDepth(25);
    const mustReturn=this.mode==='wild'||this.mode==='practice';
    this.add.text(center,385,
      mustReturn?
        (this.mobile.active?'TOQUE EM VOLTAR À SAFARI':'ENTER PARA VOLTAR À SAFARI'):
        (this.mobile.active?'TOQUE EM JOGAR NOVAMENTE':'ENTER PARA JOGAR NOVAMENTE'),{
        fontSize:'16px',fontStyle:'bold',color:'#dbf5f2'
      }).setOrigin(0.5).setDepth(25);
    if(this.mode==='practice'||this.mode==='wild'){
      const reward=this.mode==='wild'?activeWildEncounter().experience:100;
      let evolution:string|null=null;
      try{evolution=window.sessionStorage.getItem('monster-arena-evolution');}catch{}
      this.add.text(center,414,
        evolution&&result.victory?'EVOLUÇÃO! '+evolution.toUpperCase():
        result.victory?'TREINO CONCLUÍDO · +'+reward+' XP':
          'TREINE SEUS MOVIMENTOS E TENTE NOVAMENTE',{
          fontSize:'14px',fontStyle:'bold',color:'#f6d9a0'
        }).setOrigin(0.5).setDepth(25);
      const back=this.add.text(center,445,'↩ VOLTAR À SAFARI',{
        fontSize:'16px',fontStyle:'bold',color:'#d4f9e9',
        backgroundColor:'#22585a',padding:{x:18,y:9}
      }).setOrigin(0.5).setDepth(27).setInteractive({useHandCursor:true});
      back.on('pointerdown',()=>window.dispatchEvent(
        new Event('monster-arena:return-world')));
    }
    if(this.mode==='story'){
      const note=this.add.text(center,415,
        result.victory?'GEODUDE + ONIX VENCIDOS · INSÍGNIA DA PEDRA!':
          'VOCÊ PODE TREINAR NA SAFARI E TENTAR NOVAMENTE',{
          fontSize:'12px',fontStyle:'bold',color:'#e8cb98',align:'center'
        }).setOrigin(0.5).setDepth(25);
      void note;
      const returnLink=this.add.text(center,449,'↩ VOLTAR À ZONA SAFARI',{
        fontSize:'15px',fontStyle:'bold',color:'#d4f9e9',
        backgroundColor:'#22585a',padding:{x:16,y:8}
      }).setOrigin(0.5).setDepth(27).setInteractive({useHandCursor:true});
      returnLink.on('pointerdown',()=>window.dispatchEvent(
        new Event('monster-arena:return-world')));
    }
    this.cameras.main.shake(result.victory?120:80,0.0015);
    if(result.victory)this.cinematic.burst(center,149,'fire',1.15,this.time.now);
    this.mobile.showSummary(result);
    void tint;
  }

  private updateProjectiles(time:number,dt:number) {
    for(let i=this.projectiles.length-1;i>=0;i--){
      const shot=this.projectiles[i];
      shot.body.x+=shot.velocity.x*dt;
      shot.body.y+=shot.velocity.y*dt;
      const x=shot.body.x,y=shot.body.y;
      if(time-shot.lastTrail>(shot.kind==='rock'||shot.kind==='shard'?100:shot.kind==='flame'?38:54)){
        shot.lastTrail=time;
        this.fx.trail(x,y,shot.velocity,shot.kind,shot.kind==='fireburst'||shot.kind==='fireball');
        if(shot.kind==='spark'&&Math.random()<0.40){
          this.fx.bolt(x-shot.velocity.x*0.045,y-shot.velocity.y*0.045,x,y,2,105);
        }
      }
      const target=shot.side==='player'?this.enemy:this.player;
      const hit=Phaser.Math.Distance.Between(x,y,target.x,target.y)<shot.body.radius+target.radius
        && !(shot.side==='player' && (this.storySwitching||this.enemyBurrowed));
      const rockHit=this.environment?.intercept(x,y,shot.body.radius,shot.damage)??false;
      const expired=time>=shot.expiry||x<30||x>W-30||y<30||y>H-30;
      if(!hit&&!expired&&!rockHit)continue;
      shot.body.destroy();
      this.projectiles.splice(i,1);
      if(rockHit){
        if(shot.kind==='rock'||shot.kind==='shard')
          this.rockFx?.burst(x,y,19,time,'slam');
        else this.fx.impact(x,y,'fire',0.55);
      } else if(shot.blastRadius>0) {
        this.explode(x,y,shot.blastRadius,shot.damage,shot.side,shot.kind==='fireburst');
      } else if(hit) {
        this.damage(shot.side==='player'?'enemy':'player',shot.damage,target.x,target.y,
          shot.kind==='spark'?0xffee7a:
          shot.kind==='rock'||shot.kind==='shard'?0xcbb18b:
            shot.kind==='water'?0x82dfff:0xff8b40,
          shot.kind==='water'?'water':undefined);
      } else {
        if(shot.kind==='rock'||shot.kind==='shard')
          this.rockFx?.burst(x,y,15,time,'slam');
        else this.fx.impact(x,y,
          shot.kind==='spark'||shot.kind==='water'?'electric':'fire',0.4);
      }
    }
    this.fx.drawShots(this.projectiles,time);
    this.flameStreams=this.flameStreams.filter(stream=>time-stream.startAt<stream.duration);
    for(const stream of this.flameStreams){
      const elapsed=time-stream.startAt;
      const pointer=this.input.activePointer;
      // The beam rotates gradually, so the player can sweep the fire while moving.
      const aim=this.mobile.active
        ? this.directionTo(this.player,this.enemy.x,this.enemy.y,stream.direction)
        : this.directionTo(this.player,pointer.worldX,pointer.worldY,stream.direction);
      const currentAngle=Math.atan2(stream.direction.y,stream.direction.x);
      const desiredAngle=Math.atan2(aim.y,aim.x);
      const difference=Phaser.Math.Angle.Wrap(desiredAngle-currentAngle);
      const nextAngle=currentAngle+Phaser.Math.Clamp(difference,-dt*3.0,dt*3.0);
      stream.direction.set(Math.cos(nextAngle),Math.sin(nextAngle));
      this.playerFacing.copy(stream.direction);
      this.playerMotion?.face(stream.direction);
      const dir=stream.direction;
      const x=this.player.x+dir.x*25,y=this.player.y-10+dir.y*20;
      const reach=beamReach(elapsed,stream.duration);
      const blocked=this.environment?.beam(x,y,dir.x,dir.y,reach,0)??reach;
      this.fx.drawFlamethrower(x,y,nextAngle,elapsed,stream.duration,blocked);

      if(time>=stream.nextHitAt && reach>25 && !this.finished){
        stream.nextHitAt=time+113;
        this.environment?.beam(x,y,dir.x,dir.y,reach,4);
        const vx=this.enemy.x-x,vy=this.enemy.y-y;
        const along=vx*dir.x+vy*dir.y;
        const lateral=Math.abs(vx*dir.y-vy*dir.x);
        if(!this.enemyBurrowed && along>=0
          && along<=blocked+this.enemy.radius&&lateral<=27+this.enemy.radius){
          this.damage('enemy',4,this.enemy.x,this.enemy.y,0xff9f41);
        }
        if(Math.random()<0.65){
          const tipX=x+dir.x*blocked,tipY=y+dir.y*blocked;
          this.fx.breath(tipX,tipY,nextAngle,0.22);
        }
      }
    }
  }

  private animateSprite(
    image:Phaser.GameObjects.Image|undefined,
    shadow:Phaser.GameObjects.Ellipse|undefined,
    entity:Phaser.GameObjects.Arc,
    facing:Phaser.Math.Vector2,
    velocity:Phaser.Math.Vector2,
    front:string,
    back:string,
    size:number,
    time:number,
    attackAt:number,
    hurtAt:number
  ) {
    if(!image)return;
    const walking=velocity.lengthSq()>0.05;
    if(walking && (time-attackAt>290||time<attackAt))facing.copy(velocity).normalize();
    const backwards=facing.y< -0.3 && Math.abs(facing.y)>Math.abs(facing.x)*0.75;
    const pose=backwards&&this.textures.exists(back)?back:front;
    const clip=pose+'-anim';
    const animated=hasGifClip(clip);
    const texture=animated?clip:pose;
    const frame=animated?String(currentGifFrame(clip,time+(front==='pikachu'?230:0))):'__BASE';
    if(image.texture.key!==texture)image.setTexture(texture,animated?frame:undefined);
    else if(animated && image.frame.name!==frame)image.setFrame(frame);
    image.setFlipX(facing.x< -0.25);
    const step=walking?Math.abs(Math.sin(time*0.017))*2.4:0;
    const breathing=animated?0:Math.sin(time*0.003)*0.018;
    const elapsed=time-attackAt;
    // Anticipation -> release -> recovery, synchronized with GIF idle frames.
    const anticipate=elapsed>=0&&elapsed<95 ? Math.sin(Math.PI*elapsed/95) : 0;
    const release=elapsed>=95&&elapsed<220 ? Math.sin(Math.PI*(elapsed-95)/125) : 0;
    const recovery=elapsed>=220&&elapsed<330 ? (330-elapsed)/110 : 0;
    const squash=1-anticipate*0.12+release*0.15;
    const stretch=1+anticipate*0.11-release*0.07+recovery*0.035;
    image.setDisplaySize(size*squash*(1+breathing),size*stretch*(1-breathing*0.5));
    image.setPosition(entity.x+facing.x*(release*9-anticipate*7),
      entity.y-8-step-anticipate*3-release*7);
    image.setRotation((animated?0:Math.sin(time*0.002)*0.012)+
      (anticipate*-0.07+release*0.095)*Math.sign(facing.x||1));
    if(time-hurtAt<220 && Math.floor(time/55)%2===0)image.setTint(0xff7575);
    else image.clearTint();
    shadow?.setPosition(entity.x,entity.y+15);
    shadow?.setScale(1-step*0.025);
  }

  private applyHitReaction(side:Side,time:number):boolean {
    const reaction=this.reactions[side];
    if(!reaction)return false;
    const t=Phaser.Math.Clamp((time-reaction.startAt)/reaction.duration,0,1);
    const distance=reaction.distance*(1-Math.pow(1-t,3));
    const shift=distance-reaction.lastDistance;
    reaction.lastDistance=distance;
    const target=side==='player'?this.player:this.enemy;
    target.setPosition(
      clampX(target.x+reaction.direction.x*shift),
      clampY(target.y+reaction.direction.y*shift)
    );
    if(t>=1){this.reactions[side]=null;return false;}
    return true;
  }

  private castSafariMove(skill:Skill,time:number){
    if(!this.canCast('enemy',skill,time))return;
    const species=this.enemySpecies;
    const move=skills[species][skill];
    this.enemyCastAt[skill]=time;
    this.enemyAttackAt=time;
    const dir=this.directionTo(this.enemy,this.player.x,this.player.y,
      this.enemyFacing);
    this.faceDirection('enemy',dir);
    const origin={x:this.enemy.x,y:this.enemy.y-18};
    const target={x:this.player.x,y:this.player.y-16};
    const distance=Phaser.Math.Distance.Between(
      this.enemy.x,this.enemy.y,this.player.x,this.player.y);
    const bird=species==='pidgey'||species==='pidgeotto'||
      species==='spearow'||species==='fearow';
    const insect=species==='caterpie'||species==='metapod'||
      species==='weedle'||species==='kakuna';
    const rat=species==='rattata'||species==='raticate';
    this.enemyMotion?.trigger(skill==='q'?'Attack':
      skill==='w'?'Charge':'Shoot',time,dir);
    this.enemyCastLockUntil=Math.max(this.enemyCastLockUntil,time+510);

    const snapshot={x:this.player.x,y:this.player.y};
    const deferredHit=(delay:number,reach:number,type:PokemonType,damage:number)=>{
      // Check destination at impact time: moving/dodging is rewarded.
      this.time.delayedCall(delay,()=>{
        if(this.finished||this.enemyHp<=0)return;
        const dodgeDistance=Phaser.Math.Distance.Between(
          this.player.x,this.player.y,snapshot.x,snapshot.y);
        if(dodgeDistance>reach||distance>430)return;
        this.damage('player',damage,this.player.x,this.player.y,
          type==='flying'?0xa8ebd2:
            type==='poison'?0xdba0ec:type==='bug'?0x91d78b:0xe8d4b2,
          type);
      });
    };
    // Every enemy status move is resolved before the damaging move branches.
    // In particular, Rattata/Raticate Growl previously fell through to a
    // zero-damage Scratch animation, and Harden incorrectly slowed the player.
    if(move.name==='Rosnar'){
      this.starterFx.growl(origin,target);
      if(distance<370)this.changeBattleStat('player','attack',-1);
      return;
    }
    if(move.name==='Endurecer'){
      this.starterFx.shell(origin);
      this.changeBattleStat('enemy','defense',1);
      return;
    }
    if(move.name==='Tiro de Seda'){
      this.starterFx.silk(origin,target);
      if(distance<370)this.changeBattleStat('player','speed',-1);
      return;
    }
    if(move.name==='Ataque de Areia'){
      this.starterFx.gust(origin,target);
      if(distance<345)this.changeBattleStat('player','accuracy',-1);
      return;
    }
    if(rat&&(skill==='q'||skill==='w')){
      this.startTackle('enemy',move.damage,move.element,time);
      return;
    }
    if(rat){
      const reach=125;
      this.starterFx.scratch(origin,{
        x:origin.x+dir.x*reach*0.7,y:origin.y+dir.y*reach*0.7
      },dir);
      if(distance<reach)deferredHit(310,76,'normal',move.damage);
      return;
    }
    if(bird){
      if(skill==='q'&&(species==='pidgey'||species==='pidgeotto')){
        this.startTackle('enemy',move.damage,move.element,time);
        return;
      }
      if(skill==='w'){
        this.starterFx.gust(origin,target);
        if(distance<345){
          this.playerSlowUntil=Math.max(this.playerSlowUntil,time+1350);
          this.skillCallout(this.player.x,this.player.y-72,
            'AREIA NOS OLHOS!',0xdde7b4);
        }
      }else{
        // Gust and Peck are contrasting shapes, distinct from Jigglypuff.
        if(skill==='e'||skill==='r'){
          this.starterFx.gust(origin,target,skill==='r');
          this.fx.telegraph(snapshot.x,snapshot.y,65,'electric',480);
          deferredHit(490,74,skill==='e'?'flying':
            move.element,move.damage);
        }else{
          this.starterFx.scratch(origin,{
            x:origin.x+dir.x*91,y:origin.y+dir.y*91
          },dir);
          if(distance<200)deferredHit(250,76,move.element,move.damage);
        }
      }
      return;
    }
    if(insect){
      if(skill==='q'&&(species==='caterpie'||species==='metapod')){
        this.startTackle('enemy',move.damage,move.element,time);
        return;
      }
      if(skill==='w'||species==='metapod'||species==='kakuna'&&skill==='e'){
        this.starterFx.silk(origin,target);
        if(distance<370){
          this.playerSlowUntil=Math.max(this.playerSlowUntil,time+2250);
          this.skillCallout(snapshot.x,snapshot.y-65,
            'PRESO NA SEDA!',0xecf9ee);
        }
      }else{
        const poisonous=species==='weedle'||species==='kakuna';
        this.starterFx.sting(origin,target,poisonous);
        if(distance<270){
          deferredHit(320,75,move.element,move.damage);
          if(poisonous&&skill==='q'){
            this.time.delayedCall(1100,()=>{
              if(this.finished||this.enemyHp<=0)return;
              if(Phaser.Math.Distance.Between(
                this.player.x,this.player.y,snapshot.x,snapshot.y)<100){
                this.damage('player',3,this.player.x,this.player.y,
                  0xc38cdb,'poison');
              }
            });
          }
        }
      }
      return;
    }
    // Jigglypuff: visible singing notes and a slower fairy shockwave.
    this.starterFx.notes(target);
    if(skill==='w'){
      this.playerSlowUntil=Math.max(this.playerSlowUntil,time+1900);
      this.skillCallout(snapshot.x,snapshot.y-68,'CANTAR ♫',0xe4c1f7);
    }else{
      this.fx.telegraph(snapshot.x,snapshot.y,59,'electric',550);
      deferredHit(555,78,skill==='e'?'fairy':'normal',move.damage);
    }
  }

  private enemyDecision(time:number) {
    if(time<this.nextEnemyDecision || time<this.enemyActiveAt
      || time<this.enemyCastLockUntil || this.storySwitching
      || this.finished || this.tackles.enemy || this.enemyHp<=0)return;
    // A slower decision beat makes attacks legible while longer telegraphs
    // and a tougher two-Pokémon team maintain the challenge.
    const rhythm=this.mode==='training'?1:this.rules.enemySpeed;
    this.nextEnemyDecision=time+Math.round(Phaser.Math.Between(
      this.mode==='story'?1540:1060,
      this.mode==='story'?2130:1480)/rhythm);
    const distance=Phaser.Math.Distance.Between(this.player.x,this.player.y,this.enemy.x,this.enemy.y);
    const storyPattern:readonly Skill[]=this.enemySpecies==='onix'
      ?['e','q','w','q','r','e','q','w','r','q']
      :['q','e','w','q','r','e','q','w','q','r'];
    const sequence=this.mode==='story'?storyPattern:
      this.mode==='wild'?(['q','q','w','q','e','q','w','q'] as const):
      this.enemyPattern;
    const preferred=sequence[this.enemyActionIndex++ % sequence.length];
    let selection:Skill=preferred;
    const critical=this.enemyHp/this.enemyMaxHp<0.46;
    if(this.mode==='story'&&critical&&this.enemyActionIndex%4===0
      &&this.canCast('enemy','r',time))selection='r';
    const meleeReach=this.enemySpecies==='geodude'?265:
      this.enemySpecies==='onix'?145:140;
    if(selection==='w'&&distance>meleeReach &&
      this.mode!=='wild'&&this.enemySpecies!=='onix')
      selection=this.mode==='story'&&this.canCast('enemy','e',time)?'e':'q';
    if(!this.canCast('enemy',selection,time))selection='q';
    if(this.canCast('enemy',selection,time)){
      if(this.enemySpecies==='pikachu')this.castPikachu(selection,time);
      else if(this.enemySpecies==='geodude'||this.enemySpecies==='onix')
        this.castRockPokemon(selection,time);
      else this.castSafariMove(selection,time);
    }
  }

  /** A short headbutt with a restrained windup and recoil.
   * Both fighters move only a few real pixels; never a 180-225px dash.
   */
  private startTackle(side:Side,damage:number,element:PokemonType,time:number,
    manualDirection?:Phaser.Math.Vector2):void{
    if(this.finished||this.storySwitching||this.tackles[side])return;
    const source=side==='player'?this.player:this.enemy;
    const target=side==='player'?this.enemy:this.player;
    const relative=vector(target.x-source.x,target.y-source.y);
    const distance=relative.length();
    const direction=manualDirection&&manualDirection.lengthSq()>0.0001
      ?manualDirection.clone().normalize()
      :distance>0.01?relative.scale(1/distance)
        :(side==='player'?this.playerFacing:this.enemyFacing).clone();
    // Player headbutt travels towards the cursor, even if the enemy is elsewhere.
    // AI can still calculate approach distance against its intended target.
    const travel=side==='player'?TACKLE_MAX_DISTANCE:
      tackleDistance(distance,source.radius,target.radius);
    const requested=vector(clampX(source.x+direction.x*travel),
      clampY(source.y+direction.y*travel));
    const safe=this.environment?.resolve(requested.x,requested.y,source.radius);
    this.tackles[side]={
      from:vector(source.x,source.y),
      to:vector(safe?.x??requested.x,safe?.y??requested.y),
      direction,startAt:time,duration:TACKLE_DURATION_MS,
      hit:false,lastDustAt:time-100,damage,element
    };
    if(side==='player'){
      this.playerFacing.copy(direction);
      // The player already began the Attack sheet at cast time.
      // Don't restart it on release; that causes sudden sprite jumps.
      this.playerMotion?.face(direction);
      this.destination.set(source.x,source.y);
    }else{
      this.enemyFacing.copy(direction);
      this.enemyMotion?.face(direction);
      this.enemyCastLockUntil=Math.max(this.enemyCastLockUntil,
        time+TACKLE_DURATION_MS+55);
    }
    this.fx.dashDust(source.x,source.y,direction,0.22);
  }

  private animateTackles(time:number):void{
    for(const side of ['player','enemy'] as const){
      const state=this.tackles[side];
      if(!state)continue;
      const source=side==='player'?this.player:this.enemy;
      const target=side==='player'?this.enemy:this.player;
      const t=Phaser.Math.Clamp((time-state.startAt)/state.duration,0,1);
      const progress=tacklePosition(t);
      const cx=state.from.x+(state.to.x-state.from.x)*progress;
      const cy=state.from.y+(state.to.y-state.from.y)*progress;
      const safe=this.environment?.resolve(clampX(cx),clampY(cy),source.radius);
      source.setPosition(safe?.x??clampX(cx),safe?.y??clampY(cy));
      // A few low, blocky pixels behind the headbutt, not a blue vortex.
      if(t>0.25&&t<0.66&&time-state.lastDustAt>88){
        state.lastDustAt=time;
        this.fx.dashDust(source.x,source.y,state.direction,0.32);
      }
      const close=Phaser.Math.Distance.Between(
        source.x,source.y,target.x,target.y)<=
        source.radius+target.radius+13;
      const inFront=(target.x-source.x)*state.direction.x+
        (target.y-source.y)*state.direction.y>0;
      if(!state.hit&&t>=0.25&&t<=0.74&&close&&inFront){
        state.hit=true;
        this.fx.tackleImpact(target.x,target.y,state.direction,0.72);
        this.damage(side==='player'?'enemy':'player',
          state.damage,target.x,target.y,0xe8d5b3,state.element);
      }
      if(t>=1||this.finished){
        this.tackles[side]=null;
        if(side==='player')this.destination.set(source.x,source.y);
      }
    }
  }

  private animateDash(time:number) {
    const dash=this.dash;
    if(!dash)return;
    const t=Phaser.Math.Clamp((time-dash.startAt)/dash.duration,0,1);
    const eased=dodgePosition(t);
    const x=Phaser.Math.Linear(dash.from.x,dash.to.x,eased);
    const y=Phaser.Math.Linear(dash.from.y,dash.to.y,eased);
    const safe=this.environment?.resolve(x,y,this.player.radius);
    this.player.setPosition(safe?.x??x,safe?.y??y);
    this.destination.set(this.player.x,this.player.y);
    if(time-dash.lastTrailAt>=85){
      dash.lastTrailAt=time;
      this.fx.dodgeWind(this.player.x,this.player.y,dash.direction,0.48);
    }
    if(t>=1){
      this.destination.set(this.player.x,this.player.y);
      this.dash=undefined;
    }
  }

  private restartOrReturn():void{
    if(this.mode==='wild'||this.mode==='practice'){
      window.dispatchEvent(new Event('monster-arena:return-world'));
    }else{
      this.scene.restart();
    }
  }

  update(time:number,delta:number) {
    if(this.mobile.consumeRestart() && this.finished) {
      this.mobile.clear();
      this.restartOrReturn();
      return;
    }
    if(this.settingsOpen()||this.finished)return;
    if((this.mode==='story'&&time<this.storyIntroUntil)||this.storySwitching){
      // The VS card and Poké Ball switch are deliberate non-combat moments.
      // Effects and Phaser tweens can finish, but no unseen projectiles land.
      this.rockFx?.update(time);
      this.updateHud(time);
      return;
    }
    if(time<this.hitStopUntil){this.updateHud(time);return;}
    const dt=Math.min(delta/1000,0.05);
    const oldPlayer=vector(this.player.x,this.player.y);
    const oldEnemy=vector(this.enemy.x,this.enemy.y);
    const staggeredPlayer=this.reactions.player!==null
      && time-this.reactions.player.startAt<105;
    const channeling=this.flameStreams.some(stream=>time-stream.startAt<stream.duration);
    const slowed=time<this.playerSlowUntil?0.64:1;
    const bound=time<this.playerBindUntil?0.52:1;
    const moveFactor=(channeling?0.72:1)*Math.min(slowed,bound)*
      stageMultiplier(this.battleStages.player.speed);
    if(this.dash){
      this.animateDash(time);
    } else if(this.tackles.player){
      // Current animation owns the hitbox.
    } else if(staggeredPlayer){
      // A brief stagger lets the Hurt animation read without dropping inputs.
    } else if(this.mobile.active) {
      // Analog joystick: movement follows the finger and stops when released.
      const stick=this.mobile.axis;
      if(Math.hypot(stick.x,stick.y)>0.12) {
        this.player.x=clampX(this.player.x+stick.x*215*dt*moveFactor);
        this.player.y=clampY(this.player.y+stick.y*215*dt*moveFactor);
        this.destination.set(this.player.x,this.player.y);
      }
    } else {
      const to=this.destination.clone().subtract(oldPlayer);
      const length=to.length();
      if(length>3){
        const step=to.normalize().scale(Math.min(215*dt*moveFactor,length));
        this.player.x=clampX(this.player.x+step.x);
        this.player.y=clampY(this.player.y+step.y);
      }
    }
    for(const action of allActions){
      if(this.heldKeys().has(this.getBindings()[action]) || (this.mobile.active && this.mobile.isPressed(action))) {
        this.playerCast(action,time);
      }
    }
    // Pikachu stays active: closes distance, retreats, and circles the target.
    // Direction changes gradually so it does not oscillate on every frame.
    const toward=vector(this.player.x-this.enemy.x,this.player.y-this.enemy.y);
    const distance=toward.length();
    if(distance>0.01 && !this.reactions.enemy && !this.storySwitching
      && !this.tackles.enemy && time>=this.enemyCastLockUntil){
      toward.normalize();
      const drift=vector(-toward.y,toward.x);
      const sign=Math.floor(time/3200)%2===0?1:-1;
      const chase=distance>208?112:distance<122?-94:distance>174?23:-12;
      const strafe=distance>285?18:distance<100?12:72;
      const profile=pokemonCatalog[this.enemySpecies];
      const impeded=time<this.enemyBindUntil?0.52:time<this.enemySlowUntil?0.64:1;
      const scale=profile.moveSpeed/122*impeded*
        stageMultiplier(this.battleStages.enemy.speed);
      const step=toward.scale(chase*scale).add(drift.scale(sign*strafe*scale))
        .limit(profile.moveSpeed*impeded*
          stageMultiplier(this.battleStages.enemy.speed)).scale(dt);
      this.enemy.x=clampX(this.enemy.x+step.x);
      this.enemy.y=clampY(this.enemy.y+step.y);
    }
    this.animateTackles(time);
    this.applyHitReaction('player',time);
    this.applyHitReaction('enemy',time);
    if(this.environment){
      for(const entity of [this.player,this.enemy]){
        const safe=this.environment.resolve(entity.x,entity.y,entity.radius);
        entity.setPosition(safe.x,safe.y);
      }
      if(!this.dash && this.mobile.active)this.destination.set(this.player.x,this.player.y);
    }
    this.enemyDecision(time);
    this.updateProjectiles(time,dt);
    this.rockFx?.update(time);
    const playerVelocity=vector(this.player.x-oldPlayer.x,this.player.y-oldPlayer.y);
    const enemyVelocity=vector(this.enemy.x-oldEnemy.x,this.enemy.y-oldEnemy.y);
    if(this.playerMotion) {
      this.playerMotion.update(this.player.x,this.player.y,playerVelocity,time);
      this.playerShadow?.setPosition(this.player.x,this.player.y+5);
    } else {
      this.animateSprite(this.playerArt,this.playerShadow,this.player,this.playerFacing,
        playerVelocity,this.playerSpecies,this.playerSpecies+'-back',
        this.playerSpecies==='charmander'?72:88,
        time,this.playerAttackAt,this.playerHurtAt);
    }
    if(this.enemyMotion) {
      this.enemyMotion.update(this.enemy.x,this.enemy.y,enemyVelocity,time);
      this.enemyShadow?.setPosition(this.enemy.x,
        this.enemy.y+(this.enemySpecies==='onix'?15:
          this.enemySpecies==='geodude'?10:5));
    } else {
      this.animateSprite(this.enemyArt,this.enemyShadow,this.enemy,this.enemyFacing,
        enemyVelocity,this.enemySpecies,this.enemySpecies+'-back',
        this.enemySpecies==='onix'?112:this.enemySpecies==='geodude'?68:56,
        time,this.enemyAttackAt,this.enemyHurtAt);
    }
    // Sprite-body Rollout is intentionally short and never affects the arena
    // floor; the hitboxes are controlled by RockMoves.
    if(this.enemySpecies==='geodude'&&time<this.rolloutUntil){
      this.enemyArt?.setRotation(time*0.020);
    }
    if(this.statusText){
      const status=time<this.playerBindUntil?'⛓ CONSTRIÇÃO':
        time<this.playerSlowUntil?'↓ VELOCIDADE':'';
      if(this.statusText.text!==status)this.statusText.setText(status);
      this.statusText.setVisible(status!=='')
        .setPosition(this.player.x,this.player.y-78);
    }
    this.playerLabel.setPosition(this.player.x,this.player.y-86);
    this.enemyLabel.setPosition(this.enemy.x,
      this.enemy.y-(this.enemySpecies==='onix'?160:
        this.mode==='wild'?81:43));
    this.drawHealthBars(delta);
    this.updateCombo(time);
    this.cinematic.update(time,
      {x:this.player.x,y:this.player.y},{x:this.enemy.x,y:this.enemy.y});
    this.updateHud(time);
  }
}
