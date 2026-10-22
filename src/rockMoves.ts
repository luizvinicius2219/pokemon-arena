import Phaser from 'phaser';
import { skills, type Skill } from './abilities';
import { GroundCracks } from './groundCracks';

export type RockSpecies = 'geodude'|'onix';
export type BattleSide = 'player'|'enemy';
type Point = Readonly<{x:number;y:number}>;
type EffectKind = 'slam'|'quake'|'fall'|'roll'|'bind'|'dig';

interface Warning {
  x:number;y:number;radius:number;start:number;duration:number;kind:EffectKind;
}
interface Impact {
  x:number;y:number;radius:number;start:number;duration:number;kind:EffectKind;
}

/**
 * Stone effects are rendered in one small Graphics object.
 * No sprite particles, continuous tweens or floor re-rendering.
 */
export class RockFx {
  private readonly ink:Phaser.GameObjects.Graphics;
  private readonly warnings:Warning[]=[];
  private readonly impacts:Impact[]=[];
  private readonly fractures:GroundCracks;
  constructor(private readonly scene:Phaser.Scene) {
    this.fractures=new GroundCracks(scene);
    this.ink=scene.add.graphics().setDepth(7);
  }
  warn(x:number,y:number,radius:number,now:number,duration:number,kind:EffectKind) {
    this.warnings.push({x,y,radius,start:now,duration,kind});
    if(this.warnings.length>12)this.warnings.shift();
  }
  burst(x:number,y:number,radius:number,now:number,kind:EffectKind){
    this.impacts.push({x,y,radius,start:now,duration:kind==='quake'?790:kind==='fall'?620:410,kind});
    if(this.impacts.length>12)this.impacts.shift();
    if(kind==='quake'){
      this.fractures.stamp(x,y,radius,Math.max(0.8,Math.min(1.2,radius/170)),
        radius>=200?'ultimate':'heavy');
      this.scene.cameras.main.shake(115,0.0015);
    }
  }

  /**
   * DIG: a shaded, elliptical opening with lifted stone rim and fragments.
   * Drawn once on one Graphics object, scaled in at the exact tunnel spot.
   * It stays open during the burrow and closes after the Pokémon emerges.
   */
  openHole(x:number,y:number,radius:number,openForMs:number){
    const g=this.scene.add.graphics().setPosition(x,y).setDepth(2);
    const w=radius,h=radius*0.42;
    // Ground depression: cast shadow, thin exposed sandstone, deep core.
    g.fillStyle(0x26343a,0.43).fillEllipse(2,9,w*2.33,h*2.10);
    g.fillStyle(0xc8ad82,0.86).fillEllipse(0,3,w*2.16,h*2.12);
    g.fillStyle(0x857b69,0.96).fillEllipse(0,2,w*1.98,h*1.84);
    g.fillStyle(0x3a3732,0.98).fillEllipse(0,5,w*1.75,h*1.62);
    g.fillStyle(0x101b21,0.98).fillEllipse(0,7,w*1.62,h*1.34);
    g.fillStyle(0x202c30,0.88).fillEllipse(0,11,w*1.33,h*0.91);
    g.lineStyle(2,0xe2c89c,0.77)
      .strokeEllipse(0,0,w*2.04,h*1.87);
    // Jagged stones on the elevated rim, no particles or full-map render.
    for(let i=0;i<11;i++){
      const theta=i*Math.PI*2/11+0.34;
      const bx=Math.cos(theta)*w*0.95,by=Math.sin(theta)*h*0.90+3;
      const size=3+(i%3)*2;
      g.fillStyle(i%2?0xb6a58b:0x81857d,0.92).fillTriangle(
        bx-size,by+size/2,bx,by-size*1.6,bx+size,by+size/2
      );
      g.lineStyle(1,0xe1d2b2,0.66)
        .lineBetween(bx-size,by+size/2,bx,by-size*1.6);
    }
    g.setScale(0.12,0.13).setAlpha(0.94);
    this.scene.tweens.add({
      targets:g,scaleX:1,scaleY:1,duration:350,ease:'Cubic.easeOut'
    });
    this.scene.tweens.add({
      targets:g,scaleX:0.05,scaleY:0.10,alpha:0,
      delay:openForMs,duration:540,ease:'Cubic.easeIn',
      onComplete:()=>g.destroy()
    });
  }

  update(now:number) {
    const g=this.ink;
    g.clear();
    for(let i=this.warnings.length-1;i>=0;i--) {
      const w=this.warnings[i];
      const t=(now-w.start)/w.duration;
      if(t>1){this.warnings.splice(i,1);continue;}
      if(t<0)continue;
      const urgency=Math.max(0.1,t);
      const glow=(0.29+t*0.23)*(0.75+0.25*Math.sin(now*0.017));
      g.fillStyle(w.kind==='dig'?0x594d39:0x837968,0.09+t*0.10)
        .fillEllipse(w.x,w.y+8,w.radius*2,Math.max(18,w.radius*1.12));
      g.lineStyle(2,w.kind==='dig'?0xd5b78b:0xd4c5ab,glow)
        .strokeEllipse(w.x,w.y+8,w.radius*2,Math.max(16,w.radius*1.1));
      const n=w.kind==='quake'?6:w.kind==='dig'?7:4;
      for(let j=0;j<n;j++){
        const angle=j*Math.PI*2/n+0.39;
        const outer=w.radius*(0.78+0.1*Math.sin(now*0.01+j));
        const inner=w.radius*(0.25+0.16*t);
        g.lineStyle(2,0xc59a68,urgency*0.7).lineBetween(
          w.x+Math.cos(angle)*inner,w.y+8+Math.sin(angle)*inner*0.58,
          w.x+Math.cos(angle)*outer,w.y+8+Math.sin(angle)*outer*0.58
        );
      }
      if(w.kind==='dig'){
        const wobble=0.72+0.15*Math.sin(now*0.022);
        g.fillStyle(0x75694c,0.13+t*0.27)
          .fillEllipse(w.x,w.y+8,w.radius*1.7*wobble,w.radius*0.82*wobble);
        g.lineStyle(2,0xd7c9ad,0.17+t*0.45)
          .strokeEllipse(w.x,w.y+8,w.radius*1.60,w.radius*0.7);
      }
      // A layered, shaded rock mass descends from above: real angular
      // silhouette, cast shadow and light-facing facet, not a single triangle.
      if(w.kind==='fall'){
        const shadow=13+w.radius*t*0.52;
        g.fillStyle(0x152932,0.15+t*0.39)
          .fillEllipse(w.x,w.y+8,shadow*2.5,shadow*0.90);
        g.fillStyle(0x2e3539,0.30+t*0.32)
          .fillEllipse(w.x,w.y+6,shadow*1.54,shadow*0.50);
        const lift=170*(1-t)*(1-t);
        const bx=w.x,by=w.y-18-lift;
        const size=w.radius*(0.35+0.30*t);
        const contour=[
          {x:bx-size,y:by+size*0.35},
          {x:bx-size*0.75,y:by-size*0.57},
          {x:bx-size*0.17,y:by-size},
          {x:bx+size*0.61,y:by-size*0.82},
          {x:bx+size,y:by-size*0.10},
          {x:bx+size*0.74,y:by+size*0.82},
          {x:bx-size*0.26,y:by+size}
        ];
        g.fillStyle(0x202c34,0.87).fillPoints(contour,true);
        g.fillStyle(0x7c776a,1).fillTriangle(
          bx-size*0.78,by+size*0.26,
          bx-size*0.55,by-size*0.52,
          bx+size*0.14,by-size*0.72
        );
        g.fillStyle(0xb0a48b,1).fillTriangle(
          bx-size*0.62,by-size*0.52,
          bx+size*0.18,by-size*0.91,
          bx+size*0.68,by-size*0.63
        );
        g.fillStyle(0x514e49,0.98).fillTriangle(
          bx+size*0.16,by-size*0.61,
          bx+size*0.84,by-size*0.09,
          bx+size*0.58,by+size*0.71
        );
        g.lineStyle(2,0xe5d1a6,0.94)
          .lineBetween(bx-size*0.62,by-size*0.53,bx+size*0.18,by-size*0.88);
      }
    }
    for(let i=this.impacts.length-1;i>=0;i--) {
      const impact=this.impacts[i];
      const t=(now-impact.start)/impact.duration;
      if(t>1){this.impacts.splice(i,1);continue;}
      const ease=1-Math.pow(1-t,3);
      const alpha=(1-t)*0.95;
      const radius=impact.radius*(0.18+0.9*ease);
      g.fillStyle(0x796e59,0.13*alpha).fillEllipse(impact.x,impact.y+9,
        radius*2.2,radius*0.85);
      g.lineStyle(impact.kind==='quake'?2.4:3,0xcbb58c,alpha)
        .strokeEllipse(impact.x,impact.y+5,radius*2.0,radius*1.15);
      g.lineStyle(2,0x544c40,alpha*0.67)
        .strokeEllipse(impact.x,impact.y+5,radius*1.38,radius*0.81);
      const pieces=impact.kind==='quake'?12:impact.kind==='roll'?7:
        impact.kind==='fall'?12:impact.kind==='dig'?15:8;
      for(let n=0;n<pieces;n++){
        const a=n*2*Math.PI/pieces+0.27;
        const dist=impact.radius*(0.12+ease*(0.82+(n%3)*0.11));
        const x=impact.x+Math.cos(a)*dist;
        const y=impact.y+Math.sin(a)*dist*0.72-12*Math.sin(Math.PI*t);
        const size=Math.max(2,(impact.kind==='quake'?6:impact.kind==='dig'?8:impact.kind==='fall'?8:
          impact.kind==='bind'?4:7)*(1-t*0.75));
        g.fillStyle(n%3===0?0xd8c49f:n%2===0?0x6c6961:0x9b9482,alpha)
          .fillTriangle(x-size,y+size,x+size,y+size,x,y-size*1.5);
        g.lineStyle(1,0x3e4241,alpha*0.6)
          .lineBetween(x-size,y+size,x,y-size*1.5);
      }
      if(impact.kind==='quake'){
        // Jagged fault plates lift off the floor during the visible rupture.
        const reach=radius*0.87;
        for(let ridge=0;ridge<5;ridge++){
          const angle=ridge*2*Math.PI/5+0.27;
          const px=impact.x+Math.cos(angle)*reach;
          const py=impact.y+Math.sin(angle)*reach*0.78;
          const plate=8*(1-t)+2;
          g.fillStyle(0x666e6b,alpha*0.47).fillTriangle(
            px-plate,py+7,px,py-plate*1.6,px+plate,py+6
          );
          g.lineStyle(2,0xead0a1,alpha*0.74)
            .lineBetween(px-plate,py+6,px,py-plate*1.6);
        }
      }
      if(impact.kind==='bind'){
        // Dark chain-link loop: one GPU batch, brief lifetime.
        for(let link=0;link<8;link++){
          const angle=link*Math.PI/4+0.2;
          const px=impact.x+Math.cos(angle)*radius*0.68;
          const py=impact.y+Math.sin(angle)*radius*0.46;
          g.lineStyle(3,0x313b45,alpha).strokeEllipse(px,py,11,7);
          g.lineStyle(1,0xc7c4aa,alpha).strokeEllipse(px,py-1,9,6);
        }
      }
    }
  }
}


export type RockStatus = 'slow' | 'bind';
export interface RockSkillHooks {
  // Callbacks are side-agnostic so each move is reusable for future players.
  projectile: (
    x:number,y:number,direction:Phaser.Math.Vector2,
    speed:number,radius:number,kind:'rock'|'shard',side:BattleSide,
    damage:number,lifetime:number,now:number
  )=>void;
  targetPosition:()=>Point & {radius:number};
  sourcePosition:()=>Point;
  hitArea:(x:number,y:number,radius:number,damage:number,side:BattleSide)=>boolean;
  applyStatus:(status:RockStatus,duration:number,side:BattleSide)=>void;
  moveSource:(x:number,y:number)=>Point;
  setBurrowed:(burrowed:boolean)=>void;
  stillActive:()=>boolean;
  charge:(power:number,duration:number)=>void;
  signal:(text:string)=>void;
}

/**
 * Real Pokémon moves, adapted to real-time combat:
 *  Geodude: Rock Throw, Rollout, Rock Tomb, Magnitude
 *  Onix: Rock Slide, Dig, Rock Tomb, Earthquake.
 * All effects and telegraphs are bounded and drawn on one shared Graphics.
 */
export class RockMoves {
  constructor(private readonly scene:Phaser.Scene,readonly fx:RockFx){}

  cast(species:RockSpecies,skill:Skill,side:BattleSide,time:number,hooks:RockSkillHooks){
    const attack=skills[species][skill];
    const source=hooks.sourcePosition(),target=hooks.targetPosition();
    const direction=new Phaser.Math.Vector2(target.x-source.x,target.y-source.y);
    if(direction.lengthSq()<0.00001)direction.set(1,0);
    direction.normalize();

    const later=(ms:number,fn:()=>void)=>{
      this.scene.time.delayedCall(ms,()=>{
        if(hooks.stillActive())fn();
      });
    };
    const now=()=>this.scene.time.now;
    const impact=(x:number,y:number,radius:number,damage:number,
      kind:EffectKind='slam')=>{
      this.fx.burst(x,y,radius,now(),kind);
      return hooks.hitArea(x,y,radius,damage,side);
    };

    if(skill==='q'&&species==='geodude'){
      // Rock Throw: fast, single boulder that can break stadium stones.
      later(175,()=>{
        const p=hooks.sourcePosition();
        const x=p.x+direction.x*25,y=p.y-9+direction.y*19;
        hooks.projectile(x,y,direction,405,13,'rock',side,
          attack.damage,850,now());
      });
      return;
    }

    if(skill==='q'&&species==='onix'){
      // Rock Slide: staggered cluster, not an overpowered simultaneous hit.
      hooks.signal('DESLIZAMENTO DE ROCHAS');
      for(let i=0;i<3;i++){
        later(130+i*120,()=>{
          const p=hooks.sourcePosition();
          const spread=(i-1)*0.24;
          const d=direction.clone().rotate(spread);
          const x=p.x+d.x*34,y=p.y-28+d.y*27;
          hooks.projectile(x,y,d,435,12,'shard',side,
            attack.damage,900,now());
        });
      }
      return;
    }

    if(skill==='w'&&species==='geodude'){
      // Rollout: three escalating charges that advance the rock Pokémon.
      hooks.signal('ROLAGEM');
      hooks.charge(1.1,250);
      for(let step=0;step<3;step++){
        later(step*470,()=>{
          const from=hooks.sourcePosition(),toward=hooks.targetPosition();
          const d=new Phaser.Math.Vector2(toward.x-from.x,toward.y-from.y);
          if(d.lengthSq()<0.001)d.copy(direction);else d.normalize();
          const tx=Phaser.Math.Clamp(from.x+d.x*52,66,894);
          const ty=Phaser.Math.Clamp(from.y+d.y*52,82,495);
          this.fx.warn(tx,ty,45,now(),240,'roll');
          later(240,()=>{
            const moved=hooks.moveSource(tx,ty);
            impact(moved.x,moved.y,43,
              attack.damage+step*4,'roll');
          });
        });
      }
      return;
    }

    if(skill==='w'&&species==='onix'){
      // Dig in three visible phases: force open a pit and physically sink,
      // travel beneath the floor, then open another pit and rise from it.
      hooks.signal('ESCAVAR!');
      hooks.charge(1.2,330);
      this.fx.openHole(source.x,source.y,67,1290);
      this.fx.burst(source.x,source.y,34,time,'dig');
      later(120,()=>{
        hooks.setBurrowed(true); // animates the full body shrinking downward
      });
      later(680,()=>{
        const current=hooks.targetPosition();
        const origin=hooks.sourcePosition();
        const toward=new Phaser.Math.Vector2(
          current.x-origin.x,current.y-origin.y
        );
        if(toward.lengthSq()<0.01)toward.copy(direction);
        else toward.normalize();
        // Arrive close, not on top of the player; a visible final pit
        // remains so the target can dodge the eruption.
        const exitX=Phaser.Math.Clamp(current.x-toward.x*62,75,885);
        const exitY=Phaser.Math.Clamp(current.y-toward.y*62,90,490);
        this.fx.openHole(exitX,exitY,79,1360);
        this.fx.warn(exitX,exitY,87,now(),860,'dig');
        later(860,()=>{
          const landing=hooks.moveSource(exitX,exitY);
          hooks.setBurrowed(false); // long visible rise, not instant teleport
          this.fx.burst(landing.x,landing.y,73,now(),'dig');
          later(360,()=>{
            this.fx.burst(landing.x,landing.y,48,now(),'slam');
            hooks.hitArea(landing.x,landing.y,81,attack.damage,side);
          });
        });
      });
      return;
    }

    if(skill==='e'){
      // Rock Tomb: telegraphed area strike slows the target on real contact.
      const big=species==='onix';
      const radius=big?71:58,delay=big?680:590;
      hooks.signal('TUMBA DE ROCHAS');
      hooks.charge(big?1.8:1.3,delay);
      this.fx.warn(target.x,target.y,radius,time,delay,'fall');
      later(delay,()=>{
        const landed=impact(target.x,target.y,radius,
          attack.damage,'fall');
        if(landed)hooks.applyStatus('slow',big?2300:1750,side);
      });
      return;
    }

    if(skill==='r'&&species==='geodude'){
      // Magnitude: a canonical variable-strength Ground move.
      const level=4+Phaser.Math.Between(0,6);
      const radius=129+(level-4)*17;
      const damage=attack.damage+(level-4)*3;
      const delay=920;
      hooks.signal('MAGNITUDE '+level+'!');
      hooks.charge(2.2,delay);
      this.fx.warn(source.x,source.y,radius,time,delay,'quake');
      later(delay,()=>{
        const p=hooks.sourcePosition();
        impact(p.x,p.y,radius,damage,'quake');
        if(level>=8)this.scene.cameras.main.shake(90,0.0014);
      });
      return;
    }

    if(skill==='r'&&species==='onix'){
      // Earthquake: two expanding seismic waves, each with a readable windup.
      hooks.signal('TERREMOTO');
      hooks.charge(2.7,860);
      const ranges=[{radius:145,delay:890,damage:10},
        {radius:302,delay:1330,damage:attack.damage}];
      for(const range of ranges){
        this.fx.warn(source.x,source.y,range.radius,time,
          range.delay,'quake');
        later(range.delay,()=>{
          const p=hooks.sourcePosition();
          impact(p.x,p.y,range.radius,range.damage,'quake');
          this.scene.cameras.main.shake(90,0.0015);
        });
      }
    }
  }
}
