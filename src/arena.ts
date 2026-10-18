import Phaser from 'phaser';
import type { Action, Bindings } from './controls';
import { allActions, cooldownFor, dodge, skillKeys, skills, type Skill } from './abilities';
import { currentGifFrame, hasGifClip, registerGifClip } from './gifAnimation';
import { keyLabel } from './controls';

type Side = 'player' | 'enemy';
type ProjectileKind = 'ember' | 'flame' | 'fireball' | 'fireburst' | 'spark';
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
  private player!: Phaser.GameObjects.Arc;
  private enemy!: Phaser.GameObjects.Arc;
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
    private readonly settingsOpen: () => boolean
  ) { super({ key: 'Arena' }); }

  preload() {
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

    this.playerHp = 100;
    this.enemyHp = 100;
    this.finished = false;
    this.projectiles = [];
    this.playerCastAt = { q: -450, w: -2300, e: -3800, r: -7600, dodge: -1900 };
    this.enemyCastAt = { q: -850, w: -3400, e: -4500, r: -9000 };
    this.playerFacing.set(1,0);
    this.enemyFacing.set(-1,0);
    this.playerAttackAt = this.enemyAttackAt = this.playerHurtAt = this.enemyHurtAt = -1000;
    this.nextEnemyDecision = 1100;
    this.enemyActionIndex = 0;
    this.lastHudUpdate = -1000;

    this.cameras.main.setBackgroundColor('#142e31');
    this.drawArena();
    this.player = this.add.circle(210,288,19,0x60d1ff).setStrokeStyle(4,0xffffff).setVisible(false);
    this.enemy = this.add.circle(750,288,19,0xff8b69).setStrokeStyle(4,0xffffff).setVisible(false);
    this.playerShadow = this.add.ellipse(210,303,48,14,0x06181c,0.5).setDepth(1);
    this.enemyShadow = this.add.ellipse(750,303,32,10,0x06181c,0.5).setDepth(1);
    if (this.textures.exists('charizard')) {
      this.playerArt = this.add.image(210,280,hasGifClip('charizard-anim')?'charizard-anim':'charizard').setDisplaySize(88,88).setDepth(3);
    } else this.player.setVisible(true);
    if (this.textures.exists('pikachu')) {
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
      const dir=this.directionTo(this.player,pointer.worldX,pointer.worldY,this.playerFacing);
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
    const dir=this.directionTo(this.player,pointer.worldX,pointer.worldY,this.playerFacing);
    this.faceDirection('player',dir);
    this.castCharizard(action,dir,time);
  }

  private castCharizard(skill:Skill,dir:Phaser.Math.Vector2,time:number) {
    const x=this.player.x+dir.x*22, y=this.player.y+dir.y*22;
    const ability=skills.charizard[skill];
    if(skill==='q') {
      this.projectile(x,y,dir,550,7,'ember','player',ability.damage,650,time);
      this.flash(x,y,0xff9b43,12);
    } else if(skill==='w') {
      this.pulse(x,y,0xff7932,28,0.6);
      for(const angle of [-0.20,-0.10,0,0.10,0.20]) {
        const ray=dir.clone().rotate(angle);
        this.projectile(x,y,ray,360,9,'flame','player',ability.damage,530,time);
      }
    } else if(skill==='e') {
      this.projectile(x,y,dir,305,17,'fireball','player',ability.damage,930,time,72);
      this.flash(x,y,0xff4f20,30);
    } else {
      this.pulse(x,y,0xffbd40,34,0.9);
      this.projectile(x,y,dir,380,21,'fireburst','player',ability.damage,1150,time,104);
      // Partículas adicionais formam as pontas da rajada especial.
      for(const angle of [-0.34,0.34]) {
        this.projectile(x,y,dir.clone().rotate(angle),370,8,'ember','player',6,680,time);
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
    if(skill==='q') {
      const x=from.x+dir.x*22,y=from.y+dir.y*22;
      this.projectile(x,y,dir,460,8,'spark','enemy',ability.damage,750,time);
      this.flash(x,y,0xffee78,17);
    } else if(skill==='w') {
      const x=from.x,y=from.y;
      const ring=this.add.circle(x,y,24,0xfde47e,0.13).setStrokeStyle(4,0xffed7a).setDepth(4);
      this.tweens.add({targets:ring,scaleX:5.4,scaleY:5.4,alpha:0,duration:400,onComplete:()=>ring.destroy()});
      for(let i=0;i<7;i++){
        const a=i*Math.PI*2/7;
        this.electricLine(x,y,x+Math.cos(a)*110,y+Math.sin(a)*110,0xfff6ac,2);
      }
      this.time.delayedCall(350,()=>{
        if(this.finished)return;
        if(Phaser.Math.Distance.Between(x,y,this.player.x,this.player.y)<133)
          this.damage('player',ability.damage,this.player.x,this.player.y,0xffec7c);
      });
    } else if(skill==='e') {
      this.warnLightning(this.player.x,this.player.y,42,ability.damage,480);
    } else {
      const first=vector(this.player.x,this.player.y);
      const approach=this.directionTo(this.enemy,this.player.x,this.player.y,dir);
      for(let i=0;i<3;i++){
        const offset=(i-1)*48;
        const x=clampX(first.x+approach.x*i*32-approach.y*offset);
        const y=clampY(first.y+approach.y*i*32+approach.x*offset);
        this.time.delayedCall(i*330,()=>{
          if(!this.finished)this.warnLightning(x,y,52,ability.damage,570);
        });
      }
    }
  }

  private projectile(
    x:number,y:number,dir:Phaser.Math.Vector2,speed:number,radius:number,
    kind:ProjectileKind,side:Side,damage:number,lifetime:number,time:number,blastRadius=0
  ) {
    const colors:Record<ProjectileKind,number>={
      ember:0xff9d37, flame:0xff5b2e,fireball:0xff4e28,fireburst:0xffca40,spark:0xfff36e
    };
    const body=this.add.circle(x,y,radius,colors[kind],0.95).setStrokeStyle(2,0xfff1bc).setDepth(5);
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
    const marker=this.add.circle(x,y,radius,0xffda5e,0.13).setStrokeStyle(3,0xffe883,0.85).setDepth(2);
    this.tweens.add({targets:marker,alpha:0.65,scaleX:0.85,scaleY:0.85,yoyo:true,repeat:2,duration:warning/6});
    this.time.delayedCall(warning,()=>{
      marker.destroy();
      if(this.finished)return;
      this.electricLine(x+24,bounds.minY,x,y,0xffffc5,6);
      this.electricLine(x-20,bounds.minY+45,x+10,y-25,0xffd747,3);
      this.pulse(x,y,0xfffaaf,radius*0.7);
      if(Phaser.Math.Distance.Between(x,y,this.player.x,this.player.y)<radius+this.player.radius)
        this.damage('player',damage,this.player.x,this.player.y,0xffe36a);
    });
  }

  private explode(x:number,y:number,radius:number,damage:number,side:Side,special:boolean) {
    const color=special?0xffd058:0xff6838;
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
    } else {
      this.enemyHp=Math.max(0,this.enemyHp-amount);
      this.enemyHurtAt=this.time.now;
    }
    this.updateHp();
    this.flash(x,y,color,16);
    const label=this.add.text(x,y-34,'-'+amount,{fontSize:'19px',fontStyle:'bold',color:'#fff4d3'}).setOrigin(0.5).setDepth(15);
    this.tweens.add({targets:label,y:y-63,alpha:0,duration:520,onComplete:()=>label.destroy()});
    if(this.playerHp<=0||this.enemyHp<=0)this.endBattle();
  }

  private endBattle() {
    if(this.finished)return;
    this.finished=true;
    this.add.rectangle(W/2,H/2,590,135,0x09181d,0.94).setDepth(20);
    this.add.text(W/2,H/2,
      (this.playerHp<=0?'DERROTA':'VITÓRIA')+'\nENTER para reiniciar',
      {fontSize:'30px',align:'center',color:'#ffffff'}
    ).setOrigin(0.5).setDepth(21);
  }

  private updateProjectiles(time:number,dt:number) {
    for(let i=this.projectiles.length-1;i>=0;i--){
      const shot=this.projectiles[i];
      shot.body.x+=shot.velocity.x*dt;
      shot.body.y+=shot.velocity.y*dt;
      const x=shot.body.x,y=shot.body.y;
      if(time-shot.lastTrail>50){
        shot.lastTrail=time;
        this.sparkParticle(x,y,shot.kind==='spark'?0xffec7b:shot.kind==='flame'?0xff6530:0xffae46,
          shot.kind==='fireburst'?9:shot.kind==='fireball'?7:4);
        if(shot.kind==='spark'){
          this.electricLine(x-shot.velocity.x*0.06,y-shot.velocity.y*0.06,x,y,0xfff8af,2);
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
      } else this.pulse(x,y,shot.kind==='spark'?0xffe56a:0xff7637,10,0.4);
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
    if(walking)facing.copy(velocity).normalize();
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
    const attack=Math.max(0,1-(time-attackAt)/190);
    image.setDisplaySize(size*(1+breathing+attack*0.12),size*(1-breathing*0.5-attack*0.07));
    image.setPosition(entity.x,entity.y-8-step-attack*6).setRotation(animated?0:Math.sin(time*0.002)*0.012);
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
    if(this.settingsOpen()||this.finished)return;
    const dt=Math.min(delta/1000,0.05);
    const oldPlayer=vector(this.player.x,this.player.y);
    const oldEnemy=vector(this.enemy.x,this.enemy.y);
    const to=this.destination.clone().subtract(oldPlayer);
    const length=to.length();
    if(length>3){
      const step=to.normalize().scale(Math.min(215*dt,length));
      this.player.x=clampX(this.player.x+step.x);
      this.player.y=clampY(this.player.y+step.y);
    }
    for(const action of allActions){
      if(this.heldKeys().has(this.getBindings()[action]))this.playerCast(action,time);
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
    this.animateSprite(this.playerArt,this.playerShadow,this.player,this.playerFacing,
      vector(this.player.x-oldPlayer.x,this.player.y-oldPlayer.y),
      'charizard','charizard-back',88,time,this.playerAttackAt,this.playerHurtAt);
    this.animateSprite(this.enemyArt,this.enemyShadow,this.enemy,this.enemyFacing,
      vector(this.enemy.x-oldEnemy.x,this.enemy.y-oldEnemy.y),
      'pikachu','pikachu-back',56,time,this.enemyAttackAt,this.enemyHurtAt);
    this.playerLabel.setPosition(this.player.x,this.player.y-55);
    this.enemyLabel.setPosition(this.enemy.x,this.enemy.y-43);
    this.updateHud(time);
  }
}
