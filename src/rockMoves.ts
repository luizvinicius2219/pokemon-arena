import Phaser from 'phaser';
import { skills, type Skill } from './abilities';

export type RockSpecies = 'geodude'|'onix';
export type BattleSide = 'player'|'enemy';
type Point = Readonly<{x:number;y:number}>;
type EffectKind = 'slam'|'quake'|'fall'|'roll'|'bind';

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
  constructor(private readonly scene:Phaser.Scene) {
    this.ink=scene.add.graphics().setDepth(7);
  }
  warn(x:number,y:number,radius:number,now:number,duration:number,kind:EffectKind) {
    this.warnings.push({x,y,radius,start:now,duration,kind});
    if(this.warnings.length>12)this.warnings.shift();
  }
  burst(x:number,y:number,radius:number,now:number,kind:EffectKind){
    this.impacts.push({x,y,radius,start:now,duration:kind==='quake'?570:410,kind});
    if(this.impacts.length>12)this.impacts.shift();
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
      g.fillStyle(0x6e5640,0.12+t*0.11).fillEllipse(w.x,w.y+8,w.radius*2,Math.max(18,w.radius*1.12));
      g.lineStyle(3,0xe3bc7e,glow).strokeEllipse(w.x,w.y+8,w.radius*2,Math.max(16,w.radius*1.1));
      const n=w.kind==='quake'?8:4;
      for(let j=0;j<n;j++){
        const angle=j*Math.PI*2/n+0.39;
        const outer=w.radius*(0.78+0.1*Math.sin(now*0.01+j));
        const inner=w.radius*(0.25+0.16*t);
        g.lineStyle(2,0xc59a68,urgency*0.7).lineBetween(
          w.x+Math.cos(angle)*inner,w.y+8+Math.sin(angle)*inner*0.58,
          w.x+Math.cos(angle)*outer,w.y+8+Math.sin(angle)*outer*0.58
        );
      }
      // Falling boulder shadow converges toward impact; player can read ETA.
      if(w.kind==='fall'){
        const shadow=18+w.radius*(1-t)*0.5;
        g.fillStyle(0x282c2a,0.25+t*0.25)
          .fillEllipse(w.x,w.y+3,shadow*2,shadow*0.58);
        const centerY=w.y-125*(1-t*t);
        g.fillStyle(0xa99a7c,0.72).fillTriangle(
          w.x-18,centerY+13,w.x,centerY-15,w.x+21,centerY+14
        );
        g.lineStyle(2,0xe4ceb0,0.88).lineBetween(w.x-18,centerY+13,w.x,centerY-15);
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
      g.lineStyle(impact.kind==='quake'?5:3,0xcbb58c,alpha)
        .strokeEllipse(impact.x,impact.y+5,radius*2.0,radius*1.15);
      g.lineStyle(2,0x544c40,alpha*0.67)
        .strokeEllipse(impact.x,impact.y+5,radius*1.38,radius*0.81);
      const pieces=impact.kind==='quake'?13:impact.kind==='roll'?5:8;
      for(let n=0;n<pieces;n++){
        const a=n*2*Math.PI/pieces+0.27;
        const dist=impact.radius*(0.12+ease*(0.82+(n%3)*0.11));
        const x=impact.x+Math.cos(a)*dist;
        const y=impact.y+Math.sin(a)*dist*0.72-12*Math.sin(Math.PI*t);
        const size=Math.max(2,(impact.kind==='bind'?4:7)*(1-t*0.75));
        g.fillStyle(n%3===0?0xd8c49f:n%2===0?0x6c6961:0x9b9482,alpha)
          .fillTriangle(x-size,y+size,x+size,y+size,x,y-size*1.5);
        g.lineStyle(1,0x3e4241,alpha*0.6)
          .lineBetween(x-size,y+size,x,y-size*1.5);
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
  stillActive:()=>boolean;
  charge:(power:number,duration:number)=>void;
  signal:(text:string)=>void;
}

/**
 * Real Pokémon moves, adapted to real-time combat:
 *  Geodude: Rock Throw, Rollout, Rock Tomb, Magnitude
 *  Onix: Rock Slide, Bind, Rock Tomb, Earthquake.
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
        later(step*340,()=>{
          const from=hooks.sourcePosition(),toward=hooks.targetPosition();
          const d=new Phaser.Math.Vector2(toward.x-from.x,toward.y-from.y);
          if(d.lengthSq()<0.001)d.copy(direction);else d.normalize();
          const tx=Phaser.Math.Clamp(from.x+d.x*52,66,894);
          const ty=Phaser.Math.Clamp(from.y+d.y*52,82,495);
          this.fx.warn(tx,ty,45,now(),190,'roll');
          later(190,()=>{
            const moved=hooks.moveSource(tx,ty);
            impact(moved.x,moved.y,43,
              attack.damage+step*4,'roll');
          });
        });
      }
      return;
    }

    if(skill==='w'&&species==='onix'){
      // Bind: short-range grab with a persistent slow + periodic chip damage.
      const center={
        x:source.x+direction.x*55,
        y:source.y+direction.y*55
      };
      this.fx.warn(center.x,center.y,82,time,360,'bind');
      later(370,()=>{
        const from=hooks.sourcePosition(),enemy=hooks.targetPosition();
        const x=from.x+direction.x*58,y=from.y+direction.y*58;
        const landed=impact(x,y,70,attack.damage,'bind');
        if(!landed)return;
        hooks.applyStatus('bind',1850,side);
        // Damage-over-time only after the first hit connected.
        for(let tick=1;tick<=3;tick++){
          later(tick*470,()=>{
            const victim=hooks.targetPosition();
            impact(victim.x,victim.y,25,3,'bind');
          });
        }
        void enemy;
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
      const level=4+Phaser.Math.Between(0,5);
      const radius=125+(level-4)*12;
      const damage=attack.damage+(level-4)*3;
      const delay=670;
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
      hooks.charge(2.7,580);
      const ranges=[{radius:112,delay:650,damage:9},
        {radius:195,delay:950,damage:attack.damage}];
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
