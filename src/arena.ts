import Phaser from 'phaser';
import type { Action, Bindings } from './controls';
import { allActions, cooldownFor, dodge, skillKeys, skills, type Skill } from './abilities';
import { currentGifFrame, hasGifClip, registerGifClip } from './gifAnimation';
import { keyLabel } from './controls';
import { CombatFx, type VfxKind } from './combatFx';
import { OverworldActor, preloadOverworld, releaseFrameMs } from './overworld';
import type { MobileControls } from './mobileControls';

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

export class ArenaScene extends Phaser.Scene {
  private fx!: CombatFx;
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
  private flameStreams: { startAt: number; direction: Phaser.Math.Vector2; duration: number }[] = [];
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
    private readonly mobile: MobileControls
  ) { super({ key: 'Arena' }); }

  preload() {
    preloadOverworld(this);
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

    this.fx = new CombatFx(this);
    this.playerMotion = undefined;
    this.enemyMotion = undefined;
    this.hitStopUntil = -1000;
    this.playerHp = 100;
    this.enemyHp = 100;
    this.finished = false;
    this.projectiles = [];
    this.flameStreams = [];
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
    this.drawArena();
    this.player = this.add.circle(210,288,19,0x60d1ff).setStrokeStyle(4,0xffffff).setVisible(false);
    this.enemy = this.add.circle(750,288,19,0xff8b69).setStrokeStyle(4,0xffffff).setVisible(false);
    this.playerShadow = this.add.ellipse(210,303,48,14,0x06181c,0.5).setDepth(1);
    this.enemyShadow = this.add.ellipse(750,303,32,10,0x06181c,0.5).setDepth(1);
    if (OverworldActor.available(this, 'charizard')) {
      this.playerMotion = new OverworldActor(this, 'charizard', 210, 288);
      this.playerArt = this.playerMotion.image;
    } else if (this.textures.exists('charizard')) {
      this.playerArt = this.add.image(210,280,hasGifClip('charizard-anim')?'charizard-anim':'charizard').setDisplaySize(88,88).setDepth(3);
    } else this.player.setVisible(true);
    if (OverworldActor.available(this, 'pikachu')) {
      this.enemyMotion = new OverworldActor(this, 'pikachu', 750, 288);
      this.enemyArt = this.enemyMotion.image;
    } else if (this.textures.exists('pikachu')) {
      this.enemyArt = this.add.image(750,280,hasGifClip('pikachu-anim')?'pikachu-anim':'pikachu').setDisplaySize(56,56).setDepth(3);
    } else this.enemy.setVisible(true);
    this.playerLabel = this.add.text(210,233,'CHARIZARD',{color:'#c4f7ff',fontSize:'14px',fontStyle:'bold'}).setOrigin(0.5).setDepth(4);
    this.enemyLabel = this.add.text(750,253,'PIKACHU',{color:'#ffe9b2',fontSize:'14px',fontStyle:'bold'}).setOrigin(0.5).setDepth(4);
    this.hpText = this.add.text(32,24,'Charizard: 100 HP',{fontSize:'20px',color:'#a5eeff'}).setDepth(10);
    this.enemyHpText = this.add.text(740,24,'Pikachu: 100 HP',{fontSize:'20px',color:'#ffcd9e'}).setDepth(10);
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
      if(time-this.playerCastAt.dodge<dodge.cooldown)return;
      this.playerCastAt.dodge=time;
      const pointer=this.input.activePointer;
      const stick=this.mobile.axis;
      const dir=this.mobile.active
        ? (Math.hypot(stick.x,stick.y)>0.12
          ? vector(stick.x,stick.y).normalize()
          : this.directionTo(this.player,this.enemy.x,this.enemy.y,this.playerFacing))
        : this.directionTo(this.player,pointer.worldX,pointer.worldY,this.playerFacing);
      this.playerFacing.copy(dir);
      if(this.playerArt) {
        const ghost=this.add.image(this.player.x,this.player.y-8,this.playerArt.texture.key,this.playerArt.frame.name)
          .setDisplaySize(88,88).setDepth(2).setTint(0x86dcff).setAlpha(0.52).setFlipX(this.playerArt.flipX);
        this.tweens.add({targets:ghost,alpha:0,scaleX:0.7,scaleY:0.7,duration:240,onComplete:()=>ghost.destroy()});
      }
      this.player.setPosition(clampX(this.player.x+dir.x*100),clampY(this.player.y+dir.y*100));
      this.destination.set(this.player.x,this.player.y);
      this.pulse(this.player.x,this.player.y,0x94e8ff,22,0.5);
      return;
    }
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
    this.playerMotion?.trigger(motion,time,dir);
    // Use the exact launch frame from PMD animations, not guessed timers.
    const windupMs=this.playerMotion ? releaseFrameMs('charizard',motion)
      : ({q:60,w:115,e:180,r:270} as Record<Skill,number>)[action];
    const charge=action==='r'?1.8:action==='e'?1.4:1;
    this.fx.charge(this.player.x+dir.x*23,this.player.y+dir.y*23,'fire',charge);
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
      // Rapid, overlapping flames become a sustained jet, not five static balls.
      this.pulse(x,y,0xff7932,23,0.4);
      this.flameStreams.push({startAt:time,direction:dir.clone(),duration:580});
      for(let i=0;i<9;i++){
        this.time.delayedCall(i*48,()=>{
          if(this.finished)return;
          const spread=Phaser.Math.FloatBetween(-0.17,0.17);
          const ray=dir.clone().rotate(spread);
          const sx=this.player.x+ray.x*25, sy=this.player.y-10+ray.y*20;
          this.projectile(sx,sy,ray,390+Math.random()*65,8+Math.random()*3,
            'flame','player',3,660,this.time.now);
          this.fx.breath(sx,sy,Math.atan2(ray.y,ray.x),0.85);
        });
      }
    } else if(skill==='e') {
      this.fx.charge(x,y,'fire',1.35);
      this.projectile(x,y,dir,310,18,'fireball','player',ability.damage,990,time,78);
      this.flash(x,y,0xffb15a,26);
    } else {
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
      this.cameras.main.shake(105,0.0025);
      if(Phaser.Math.Distance.Between(x,y,this.player.x,this.player.y)<radius+this.player.radius)
        this.damage('player',damage,this.player.x,this.player.y,0xffe36a);
    });
  }

  private explode(x:number,y:number,radius:number,damage:number,side:Side,special:boolean) {
    const color=special?0xffd058:0xff6838;
    this.fx.impact(x,y,'fire',special?2.3:1.45);
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
    if(target==='player') {
      this.playerHp=Math.max(0,this.playerHp-amount);
      this.playerHurtAt=this.time.now;
      this.playerMotion?.hurt(this.time.now);
    } else {
      this.enemyHp=Math.max(0,this.enemyHp-amount);
      this.enemyHurtAt=this.time.now;
      this.enemyMotion?.hurt(this.time.now);
    }
    this.updateHp();
    const heavy=amount>=17;
    this.hitStopUntil=this.time.now+(heavy?46:22);
    this.cameras.main.shake(heavy?125:65,heavy?0.004:0.0018);
    this.fx.impact(x,y,color===0xffec7c||color===0xffe36a||color===0xffee7a?'electric':'fire',
      heavy?1.05:0.65);
    this.flash(x,y,color,heavy?23:13);
    const label=this.add.text(x,y-34,'-'+amount,{fontSize:'19px',fontStyle:'bold',color:'#fff4d3'}).setOrigin(0.5).setDepth(15);
    this.tweens.add({targets:label,y:y-63,alpha:0,duration:520,onComplete:()=>label.destroy()});
    if(this.playerHp<=0||this.enemyHp<=0)this.endBattle();
  }

  private endBattle() {
    if(this.finished)return;
    this.finished=true;
    this.mobile.setFinished(true);
    this.add.rectangle(W/2,H/2,590,135,0x09181d,0.94).setDepth(20);
    this.add.text(W/2,H/2,
      (this.playerHp<=0?'DERROTA':'VITÓRIA')+(this.mobile.active?'\nToque em Jogar novamente':'\nENTER para reiniciar'),
      {fontSize:'30px',align:'center',color:'#ffffff'}
    ).setOrigin(0.5).setDepth(21);
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
      const expired=time>=shot.expiry||x<30||x>W-30||y<30||y>H-30;
      if(!hit&&!expired)continue;
      shot.body.destroy();
      this.projectiles.splice(i,1);
      if(shot.blastRadius>0) {
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
      const dir=stream.direction;
      const x=this.player.x+dir.x*25,y=this.player.y-10+dir.y*20;
      this.fx.drawFlamethrower(x,y,Math.atan2(dir.y,dir.x),
        time-stream.startAt,stream.duration);
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
    if(this.mobile.active) {
      // Analog joystick: movement follows the finger and stops when released.
      const stick=this.mobile.axis;
      if(Math.hypot(stick.x,stick.y)>0.12) {
        this.player.x=clampX(this.player.x+stick.x*215*dt);
        this.player.y=clampY(this.player.y+stick.y*215*dt);
        this.destination.set(this.player.x,this.player.y);
      }
    } else {
      const to=this.destination.clone().subtract(oldPlayer);
      const length=to.length();
      if(length>3){
        const step=to.normalize().scale(Math.min(215*dt,length));
        this.player.x=clampX(this.player.x+step.x);
        this.player.y=clampY(this.player.y+step.y);
      }
    }
    for(const action of allActions){
      if(this.heldKeys().has(this.getBindings()[action]) || (this.mobile.active && this.mobile.isPressed(action))) {
        this.playerCast(action,time);
      }
    }
    const toward=vector(this.player.x-this.enemy.x,this.player.y-this.enemy.y);
    const distance=toward.length();
    if(distance>185){
      toward.normalize();
      this.enemy.x=clampX(this.enemy.x+toward.x*115*dt);
      this.enemy.y=clampY(this.enemy.y+toward.y*115*dt);
    } else if(distance<125){
      toward.normalize();
      this.enemy.x=clampX(this.enemy.x-toward.x*90*dt);
      this.enemy.y=clampY(this.enemy.y-toward.y*90*dt);
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
    this.updateHud(time);
  }
}
