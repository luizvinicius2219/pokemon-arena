import Phaser from 'phaser';
import type { Action, Bindings } from './controls';
import { allActions, cooldownFor, dodge, skillKeys, skills, type Skill } from './abilities';
import { currentGifFrame, hasGifClip, registerGifClip } from './gifAnimation';
import { keyLabel } from './controls';
import { CombatFx, beamReach, type VfxKind } from './combatFx';
import { CinematicFx } from './cinematicFx';
import { OverworldActor, preloadOverworld, releaseFrameMs } from './overworld';
import type { MobileControls } from './mobileControls';
import { StoryEnvironment, pewterGym, preloadPewter, type GameMode } from './story';
import { BattleStats, formatBattleTime, type BattleSummary } from './battleStats';

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
interface DashState {
  from:Phaser.Math.Vector2;
  to:Phaser.Math.Vector2;
  direction:Phaser.Math.Vector2;
  startAt:number;
  duration:number;
  lastGhostAt:number;
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
  private fx!: CombatFx;
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
  private enemyHp = 100;
  private finished = false;
  private projectiles: Projectile[] = [];
  private flameStreams: FlameStream[] = [];
  private dash?: DashState;
  private reactions: Record<Side,HitReaction|null> = {player:null,enemy:null};
  private lastHitAt:Record<Side,number>={player:-1000,enemy:-1000};
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

  preload() {
    preloadOverworld(this);
    preloadPewter(this);
    // Sprites da PokeAPI carregados remotamente; não são copiados para o repositório.
    const base = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/';
    for (const [name,id] of [['charizard','6'],['pikachu','25']]) {
      this.load.image(name, base + id + '.png');
      this.load.image(name + '-back', base + 'back/' + id + '.png');
      this.load.binary(name + '-gif', base + 'animated/' + id + '.gif');
      this.load.binary(name + '-back-gif', base + 'animated/back/' + id + '.gif');
    }
  }

  create() {
    for (const name of ['charizard','charizard-back','pikachu','pikachu-back']) {
      const data = this.cache.binary.get(name + '-gif') as ArrayBuffer | undefined;
      if (data && !this.textures.exists(name + '-anim')) registerGifClip(this, name + '-anim', data);
    }

    this.mode=this.getMode();
    this.environment=undefined;
    this.fx = new CombatFx(this);
    this.cinematic = new CinematicFx(this);
    this.stats = new BattleStats(this.time.now);
    this.playerMotion = undefined;
    this.enemyMotion = undefined;
    this.hitStopUntil = -1000;
    this.playerHp = 100;
    this.enemyHp = 100;
    this.finished = false;
    this.projectiles = [];
    this.flameStreams = [];
    this.dash = undefined;
    this.reactions={player:null,enemy:null};
    this.lastHitAt={player:-1000,enemy:-1000};
    this.shownHp={player:100,enemy:100};
    this.mobile.setAbilityNames('charizard');
    this.playerCastAt = { q: -450, w: -2300, e: -3800, r: -7600, dodge: -1900 };
    this.enemyCastAt = { q: -850, w: -3400, e: -4500, r: -9000 };
    this.playerFacing.set(1,0);
    this.enemyFacing.set(-1,0);
    this.playerAttackAt = this.enemyAttackAt = this.playerHurtAt = this.enemyHurtAt = -1000;
    this.nextEnemyDecision = 1100;
    this.enemyActionIndex = 0;
    this.lastHudUpdate = -1000;
    this.mobile.setFinished(false);

    this.cameras.main.setBackgroundColor('#142e31');
    if(this.mode==='story')this.environment=new StoryEnvironment(this,pewterGym);
    else this.drawArena();
    const playerSpawn=this.mode==='story'?pewterGym.spawnPlayer:{x:210,y:288};
    const enemySpawn=this.mode==='story'?pewterGym.spawnRival:{x:750,y:288};
    this.player = this.add.circle(playerSpawn.x,playerSpawn.y,19,0x60d1ff).setStrokeStyle(4,0xffffff).setVisible(false);
    this.enemy = this.add.circle(enemySpawn.x,enemySpawn.y,19,0xff8b69).setStrokeStyle(4,0xffffff).setVisible(false);
    this.playerShadow = this.add.ellipse(playerSpawn.x,playerSpawn.y+15,48,14,0x06181c,0.5).setDepth(1);
    this.enemyShadow = this.add.ellipse(enemySpawn.x,enemySpawn.y+15,32,10,0x06181c,0.5).setDepth(1);
    if (OverworldActor.available(this, 'charizard')) {
      this.playerMotion = new OverworldActor(this, 'charizard', playerSpawn.x, playerSpawn.y);
      this.playerArt = this.playerMotion.image;
    } else if (this.textures.exists('charizard')) {
      this.playerArt = this.add.image(playerSpawn.x,playerSpawn.y-8,hasGifClip('charizard-anim')?'charizard-anim':'charizard').setDisplaySize(88,88).setDepth(3);
    } else this.player.setVisible(true);
    if (OverworldActor.available(this, 'pikachu')) {
      this.enemyMotion = new OverworldActor(this, 'pikachu', enemySpawn.x, enemySpawn.y);
      this.enemyArt = this.enemyMotion.image;
    } else if (this.textures.exists('pikachu')) {
      this.enemyArt = this.add.image(enemySpawn.x,enemySpawn.y-8,hasGifClip('pikachu-anim')?'pikachu-anim':'pikachu').setDisplaySize(56,56).setDepth(3);
    } else this.enemy.setVisible(true);
    this.playerLabel = this.add.text(playerSpawn.x,playerSpawn.y-55,'CHARIZARD',{color:'#c4f7ff',fontSize:'14px',fontStyle:'bold'}).setOrigin(0.5).setDepth(4);
    this.enemyLabel = this.add.text(enemySpawn.x,enemySpawn.y-35,'PIKACHU',{color:'#ffe9b2',fontSize:'14px',fontStyle:'bold'}).setOrigin(0.5).setDepth(4);
    this.hpText = this.add.text(32,24,'Charizard: 100 HP',{fontSize:'20px',color:'#a5eeff'}).setDepth(10);
    this.enemyHpText = this.add.text(740,24,'Pikachu: 100 HP',{fontSize:'20px',color:'#ffcd9e'}).setDepth(10);
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
      if(p.rightButtonDown() && !this.settingsOpen() && !this.finished) this.destination.set(clampX(p.x),clampY(p.y));
    });
    this.input.on('pointermove',(p: Phaser.Input.Pointer) => {
      if(p.rightButtonDown() && !this.settingsOpen() && !this.finished) this.destination.set(clampX(p.x),clampY(p.y));
    });
    this.input.keyboard?.on('keydown-ENTER',() => {
      if (this.finished) this.scene.restart();
    });
    if(this.mode==='story'){
      this.add.text(W/2,551,'PRÉVIA: o adversário ainda é Pikachu. Brock e Pokémon de pedra virão nas próximas etapas.',{
        color:'#eadcbb',fontSize:'12px',fontStyle:'bold',
        stroke:'#30251c',strokeThickness:3
      }).setOrigin(0.5).setDepth(12);
    }
    this.updateHp();
    this.updateHud(0,true);
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
    this.hpText.setText('Charizard: ' + this.playerHp + ' HP');
    this.enemyHpText.setText('Pikachu: ' + this.enemyHp + ' HP');
  }

  /** Small overhead bars make damage visible even on narrow mobile screens. */
  private drawHealthBars(delta:number) {
    if(!this.healthBars)return;
    const g=this.healthBars;
    g.clear();
    for(const side of ['player','enemy'] as Side[]) {
      const entity=side==='player'?this.player:this.enemy;
      const hp=side==='player'?this.playerHp:this.enemyHp;
      const width=side==='player'?76:68;
      const y=entity.y-(side==='player'?42:33);
      const x=entity.x-width/2;
      this.shownHp[side]=Phaser.Math.Linear(this.shownHp[side],hp,
        Phaser.Math.Clamp(delta/240,0,1));
      g.fillStyle(0x081921,0.94).fillRoundedRect(x-3,y-3,width+6,12,5);
      g.fillStyle(0x9f423b,0.92).fillRect(x,y,width*hp/100,6);
      const trailWidth=Math.max(0,width*this.shownHp[side]/100);
      if(trailWidth>0.1)g.fillStyle(0xf4bf72,0.72).fillRect(x,y,trailWidth,6);
      const hpWidth=Math.max(0,width*hp/100);
      if(hpWidth>0.1)g.fillStyle(hp>28?(side==='player'?0x65d5b5:0xe7db72):0xf06262,1)
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
      fontSize:'17px',fontStyle:'bold',color:'#b1f5fa',
      stroke:'#173340',strokeThickness:3
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
      const remaining=Math.max(0,cooldownFor(action)-(time-this.playerCastAt[action]));
      const duration=cooldownFor(action);
      const text=element.querySelector<HTMLElement>('[data-timer]');
      const fill=element.querySelector<HTMLElement>('[data-shade]');
      const key=element.querySelector<HTMLElement>('[data-key]');
      element.classList.toggle('cooling',remaining>0);
      if(text)text.textContent=remaining>0?(remaining/1000).toFixed(1)+'s':'PRONTO';
      if(fill)fill.style.height=(remaining/duration*100).toFixed(2)+'%';
      if(key)key.textContent=keyLabel(bindings[action]);
      this.mobile.setCooldown(action,remaining,duration);
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
    return time-last>=skills[side==='player'?'charizard':'pikachu'][skill].cooldown;
  }

  private playerCast(action:Action,time:number) {
    if(action==='dodge') {
      if(this.dash || time-this.playerCastAt.dodge<dodge.cooldown)return;
      const pointer=this.input.activePointer;
      const stick=this.mobile.axis;
      const dir=this.mobile.active
        ? (Math.hypot(stick.x,stick.y)>0.12
          ? vector(stick.x,stick.y).normalize()
          : this.directionTo(this.player,this.enemy.x,this.enemy.y,this.playerFacing))
        : this.directionTo(this.player,pointer.worldX,pointer.worldY,this.playerFacing);
      const start=vector(this.player.x,this.player.y);
      const raw=vector(clampX(start.x+dir.x*120),clampY(start.y+dir.y*120));
      const safe=this.environment?.resolve(raw.x,raw.y,this.player.radius);
      const end=safe?vector(safe.x,safe.y):raw;
      if(start.distance(end)<5)return;
      this.playerCastAt.dodge=time;
      this.stats.registerDodge();
      this.playerFacing.copy(dir);
      this.dash={from:start,to:end,direction:dir,startAt:time,duration:230,lastGhostAt:-1000};
      this.playerMotion?.trigger('Hop',time,dir,230);
      this.fx.dashDust(start.x,start.y,dir);
      this.pulse(start.x,start.y,0x94e8ff,20,0.4);
      this.destination.copy(end);
      return;
    }
    // Dodge locks other casts briefly so the Hop frames play clearly.
    if(this.dash)return;
    if(!this.canCast('player',action,time))return;
    this.playerCastAt[action]=time;
    this.playerAttackAt=time;
    const pointer=this.input.activePointer;
    // Touchscreen has no mouse cursor: attacks automatically aim at Pikachu.
    const dir=this.mobile.active
      ? this.directionTo(this.player,this.enemy.x,this.enemy.y,this.playerFacing)
      : this.directionTo(this.player,pointer.worldX,pointer.worldY,this.playerFacing);
    this.faceDirection('player',dir);
    const motion=action==='r'?'Attack':action==='e'?'Charge':'Shoot';
    this.playerMotion?.trigger(motion,time,dir,action==='w'?785:undefined);
    // Use the exact launch frame from PMD animations, not guessed timers.
    const windupMs=this.playerMotion ? releaseFrameMs('charizard',motion)
      : ({q:60,w:115,e:180,r:270} as Record<Skill,number>)[action];
    const charge=action==='r'?1.8:action==='e'?1.4:1;
    this.fx.charge(this.player.x+dir.x*23,this.player.y+dir.y*23,'fire',charge);
    if(action==='e'||action==='r'){
      const power=action==='r'?2.7:1.35;
      this.cinematic.charge('player','fire',power,time,Math.max(140,windupMs+40));
      if(action==='r')this.skillCallout(this.player.x,this.player.y-87,'RAJADA DE FOGO',0xffcf87);
    }
    // Intentional short wind-up: the body anticipates before the projectile releases.
    this.time.delayedCall(windupMs,()=>{
      if(!this.finished) this.castCharizard(action,dir,this.time.now);
    });
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

  private damage(target:Side,amount:number,x:number,y:number,color:number) {
    if(this.finished)return;
    const now=this.time.now;
    // Real dodge invulnerability is tied to the visible Hop, not a teleport.
    if(target==='player' && this.dash && now-this.dash.startAt<this.dash.duration*0.70){
      if(this.stats.registerEvade(now))this.showEvade(now);
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
    const element=electric?'electric':'fire';
    this.fx.impact(x,y,element,heavy?1.18:0.72);
    this.fx.hitAccent(x,y,Math.atan2(direction.y,direction.x),element,heavy?1.35:0.85);
    this.flash(x,y,color,heavy?21:13);
    const label=this.add.text(victim.x,victim.y-36,'-'+amount,{
      fontSize:heavy?'24px':'18px',fontStyle:'bold',
      color:electric?'#fff5aa':'#ffe6c9',
      stroke:'#16222e',strokeThickness:3
    }).setOrigin(0.5).setDepth(15);
    this.tweens.add({targets:label,y:victim.y-(heavy?83:63),alpha:0,scaleX:heavy?1.2:1.05,
      scaleY:heavy?1.2:1.05,duration:heavy?570:460,onComplete:()=>label.destroy()});
    if(this.playerHp<=0||this.enemyHp<=0)this.endBattle();
  }

  private endBattle() {
    if(this.finished)return;
    this.finished=true;
    this.mobile.setFinished(true);
    this.comboText.setVisible(false);
    this.comboMeter.clear();
    const result=this.stats.finish(this.time.now,this.playerHp>0,this.playerHp);
    this.showResults(result);
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
    this.add.text(center,385,
      this.mobile.active?'TOQUE EM JOGAR NOVAMENTE':'ENTER PARA JOGAR NOVAMENTE',{
        fontSize:'16px',fontStyle:'bold',color:'#dbf5f2'
      }).setOrigin(0.5).setDepth(25);
    if(this.mode==='story'){
      const note=this.add.text(center,415,
        'PRÉVIA DE PEWTER CONCLUÍDA · O DESAFIO DE BROCK AINDA NÃO ESTÁ LIBERADO',{
          fontSize:'12px',fontStyle:'bold',color:'#e8cb98',align:'center'
        }).setOrigin(0.5).setDepth(25);
      void note;
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
      if(time-shot.lastTrail>(shot.kind==='flame'?38:54)){
        shot.lastTrail=time;
        this.fx.trail(x,y,shot.velocity,shot.kind,shot.kind==='fireburst'||shot.kind==='fireball');
        if(shot.kind==='spark'&&Math.random()<0.40){
          this.fx.bolt(x-shot.velocity.x*0.045,y-shot.velocity.y*0.045,x,y,2,105);
        }
      }
      const target=shot.side==='player'?this.enemy:this.player;
      const hit=Phaser.Math.Distance.Between(x,y,target.x,target.y)<shot.body.radius+target.radius;
      const rockHit=this.environment?.intercept(x,y,shot.body.radius,shot.damage)??false;
      const expired=time>=shot.expiry||x<30||x>W-30||y<30||y>H-30;
      if(!hit&&!expired&&!rockHit)continue;
      shot.body.destroy();
      this.projectiles.splice(i,1);
      if(rockHit){
        this.fx.impact(x,y,'fire',0.55);
      } else if(shot.blastRadius>0) {
        this.explode(x,y,shot.blastRadius,shot.damage,shot.side,shot.kind==='fireburst');
      } else if(hit) {
        this.damage(shot.side==='player'?'enemy':'player',shot.damage,target.x,target.y,
          shot.kind==='spark'?0xffee7a:0xff8b40);
      } else {
        this.fx.impact(x,y,shot.kind==='spark'?'electric':'fire',0.4);
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
        if(along>=0&&along<=blocked+this.enemy.radius&&lateral<=27+this.enemy.radius){
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

  private enemyDecision(time:number) {
    if(time<this.nextEnemyDecision||this.finished)return;
    this.nextEnemyDecision=time+Phaser.Math.Between(960,1330);
    const distance=Phaser.Math.Distance.Between(this.player.x,this.player.y,this.enemy.x,this.enemy.y);
    const preferred=this.enemyPattern[this.enemyActionIndex++ % this.enemyPattern.length];
    let selection:Skill=preferred;
    if(selection==='w' && distance>140)selection='q';
    if(!this.canCast('enemy',selection,time))selection='q';
    if(this.canCast('enemy',selection,time))this.castPikachu(selection,time);
  }

  private animateDash(time:number) {
    const dash=this.dash;
    if(!dash)return;
    const t=Phaser.Math.Clamp((time-dash.startAt)/dash.duration,0,1);
    // Smooth acceleration and deceleration: no instantaneous relocation.
    const eased=0.5-0.5*Math.cos(Math.PI*t);
    this.player.setPosition(
      Phaser.Math.Linear(dash.from.x,dash.to.x,eased),
      Phaser.Math.Linear(dash.from.y,dash.to.y,eased)
    );
    this.destination.set(this.player.x,this.player.y);
    if(time-dash.lastGhostAt>=47){
      dash.lastGhostAt=time;
      if(this.playerArt){
        const art=this.playerArt;
        const ghost=this.add.image(this.player.x,art.y,art.texture.key,art.frame.name)
          .setOrigin(art.originX,art.originY)
          .setDisplaySize(art.displayWidth,art.displayHeight)
          .setFlipX(art.flipX).setDepth(2).setAlpha(0.35).setTint(0x9be7f2);
        this.tweens.add({targets:ghost,alpha:0,duration:170,
          onComplete:()=>ghost.destroy()});
      }
      this.fx.dashDust(this.player.x,this.player.y,dash.direction,0.28);
    }
    if(t>=1){
      this.player.setPosition(dash.to.x,dash.to.y);
      this.destination.copy(dash.to);
      this.fx.dashDust(dash.to.x,dash.to.y,dash.direction,0.65);
      this.dash=undefined;
    }
  }

  update(time:number,delta:number) {
    if(this.mobile.consumeRestart() && this.finished) {
      this.mobile.clear();
      this.scene.restart();
      return;
    }
    if(this.settingsOpen()||this.finished)return;
    if(time<this.hitStopUntil){this.updateHud(time);return;}
    const dt=Math.min(delta/1000,0.05);
    const oldPlayer=vector(this.player.x,this.player.y);
    const oldEnemy=vector(this.enemy.x,this.enemy.y);
    const staggeredPlayer=this.reactions.player!==null
      && time-this.reactions.player.startAt<105;
    const channeling=this.flameStreams.some(stream=>time-stream.startAt<stream.duration);
    const moveFactor=channeling?0.72:1;
    if(this.dash){
      this.animateDash(time);
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
    if(distance>0.01 && !this.reactions.enemy){
      toward.normalize();
      const drift=vector(-toward.y,toward.x);
      const sign=Math.floor(time/3200)%2===0?1:-1;
      const chase=distance>208?112:distance<122?-94:distance>174?23:-12;
      const strafe=distance>285?18:distance<100?12:72;
      const step=toward.scale(chase).add(drift.scale(sign*strafe))
        .limit(122).scale(dt);
      this.enemy.x=clampX(this.enemy.x+step.x);
      this.enemy.y=clampY(this.enemy.y+step.y);
    }
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
    const playerVelocity=vector(this.player.x-oldPlayer.x,this.player.y-oldPlayer.y);
    const enemyVelocity=vector(this.enemy.x-oldEnemy.x,this.enemy.y-oldEnemy.y);
    if(this.playerMotion) {
      this.playerMotion.update(this.player.x,this.player.y,playerVelocity,time);
      this.playerShadow?.setPosition(this.player.x,this.player.y+15);
    } else {
      this.animateSprite(this.playerArt,this.playerShadow,this.player,this.playerFacing,
        playerVelocity,'charizard','charizard-back',88,time,this.playerAttackAt,this.playerHurtAt);
    }
    if(this.enemyMotion) {
      this.enemyMotion.update(this.enemy.x,this.enemy.y,enemyVelocity,time);
      this.enemyShadow?.setPosition(this.enemy.x,this.enemy.y+15);
    } else {
      this.animateSprite(this.enemyArt,this.enemyShadow,this.enemy,this.enemyFacing,
        enemyVelocity,'pikachu','pikachu-back',56,time,this.enemyAttackAt,this.enemyHurtAt);
    }
    this.playerLabel.setPosition(this.player.x,this.player.y-55);
    this.enemyLabel.setPosition(this.enemy.x,this.enemy.y-43);
    this.drawHealthBars(delta);
    this.updateCombo(time);
    this.cinematic.update(time,
      {x:this.player.x,y:this.player.y},{x:this.enemy.x,y:this.enemy.y});
    this.updateHud(time);
  }
}
