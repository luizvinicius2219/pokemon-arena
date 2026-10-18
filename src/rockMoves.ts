import Phaser from 'phaser';
import { skills, type Skill } from './abilities';

export type RockSpecies = 'geodude'|'onix';
export type BattleSide = 'player'|'enemy';
type Point = Readonly<{x:number;y:number}>;
type EffectKind = 'slam'|'quake'|'fall'|'fissure';

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
      const n=w.kind==='fissure'?7:4;
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
      const pieces=impact.kind==='quake'?13:impact.kind==='fissure'?11:8;
      for(let n=0;n<pieces;n++){
        const a=n*2*Math.PI/pieces+0.27;
        const dist=impact.radius*(0.12+ease*(0.82+(n%3)*0.11));
        const x=impact.x+Math.cos(a)*dist;
        const y=impact.y+Math.sin(a)*dist*0.72-12*Math.sin(Math.PI*t);
        const size=Math.max(2,(impact.kind==='fissure'?9:7)*(1-t*0.75));
        g.fillStyle(n%3===0?0xd8c49f:n%2===0?0x6c6961:0x9b9482,alpha)
          .fillTriangle(x-size,y+size,x+size,y+size,x,y-size*1.5);
        g.lineStyle(1,0x3e4241,alpha*0.6)
          .lineBetween(x-size,y+size,x,y-size*1.5);
      }
      if(impact.kind==='fissure'){
        // A little jagged scar, fades before the next turn.
        g.lineStyle(4,0x3d4141,alpha).lineBetween(
          impact.x-radius*0.58,impact.y+3,
          impact.x+radius*0.18,impact.y-7
        );
        g.lineBetween(impact.x+radius*0.18,impact.y-7,
          impact.x+radius*0.57,impact.y+6);
        g.lineStyle(2,0xd2af80,alpha*0.83).lineBetween(
          impact.x-radius*0.46,impact.y+7,
          impact.x+radius*0.22,impact.y-3
        );
      }
    }
  }
}

export interface RockSkillHooks {
  /**
   * Runtime is independent of fighter allegiance. The same method will be
   * called from the future character select for playable rock Pokémon.
   */
  projectile: (
    x:number,y:number,direction:Phaser.Math.Vector2,
    speed:number,radius:number,kind:'rock'|'shard',side:BattleSide,
    damage:number,lifetime:number,now:number
  )=>void;
  targetPosition:()=>Point & {radius:number};
  sourcePosition:()=>Point;
  hitArea:(x:number,y:number,radius:number,damage:number,side:BattleSide)=>void;
  stillActive:()=>boolean;
  charge:(power:number,duration:number)=>void;
  signal:(text:string)=>void;
}

/**
 * Four moves per species. Spells are declared once and accept a side,
 * allowing future players and NPCs to use exactly the same move logic.
 */
export class RockMoves {
  constructor(private readonly scene:Phaser.Scene,readonly fx:RockFx){}

  cast(species:RockSpecies,skill:Skill,side:BattleSide,time:number, hooks:RockSkillHooks){
    const power=skills[species][skill].damage;
    const source=hooks.sourcePosition();
    const target=hooks.targetPosition();
    const direction=new Phaser.Math.Vector2(target.x-source.x,target.y-source.y);
    if(direction.lengthSq()<0.00001)direction.set(1,0);
    direction.normalize();

    const later=(ms:number,fn:()=>void)=>{
      this.scene.time.delayedCall(ms,()=>{
        if(hooks.stillActive())fn();
      });
    };

    if(skill==='q'){
      const fast=species==='onix';
      hooks.signal(fast?'ROCHA AFIADA':'PEDRADA');
      later(fast?145:150,()=>{
        const current=hooks.sourcePosition();
        const x=current.x+direction.x*(fast?34:24);
        const y=current.y-9+direction.y*20;
        this.fx.burst(x,y,fast?18:12,this.scene.time.now,'slam');
        hooks.projectile(x,y,direction,fast?445:390,fast?13:12,
          fast?'shard':'rock',side,power,950,this.scene.time.now);
      });
    }else if(skill==='w'){
      const reach=species==='onix'?121:106;
      const impactX=source.x+direction.x*(species==='onix'?57:38);
      const impactY=source.y+direction.y*28;
      this.fx.warn(impactX,impactY,reach*0.66,time,270,'slam');
      later(280,()=>{
        const position=hooks.sourcePosition();
        const x=position.x+direction.x*(species==='onix'?57:38);
        const y=position.y+direction.y*28;
        this.fx.burst(x,y,reach*0.69,this.scene.time.now,'slam');
        hooks.hitArea(x,y,reach*0.78,power,side);
      });
    }else if(skill==='e'){
      const big=species==='onix';
      const radius=big?65:51;
      const duration=big?650:550;
      hooks.signal(big?'PEDRA TOMBANTE':'DESABAMENTO');
      hooks.charge(big?1.7:1.2,duration);
      this.fx.warn(target.x,target.y,radius,time,duration,'fall');
      later(duration,()=>{
        this.fx.burst(target.x,target.y,radius,this.scene.time.now,'fall');
        hooks.hitArea(target.x,target.y,radius,power,side);
      });
    }else if(species==='geodude'){
      const radius=176,delay=540;
      hooks.signal('TERREMOTO');
      hooks.charge(2.6,delay);
      this.fx.warn(source.x,source.y,radius,time,delay,'quake');
      later(delay,()=>{
        const center=hooks.sourcePosition();
        this.fx.burst(center.x,center.y,radius,this.scene.time.now,'quake');
        hooks.hitArea(center.x,center.y,radius,power,side);
      });
    }else {
      hooks.signal('FISSURA');
      hooks.charge(2.8,650);
      const spots=Array.from({length:3},(_,i)=>{
        const off=(i-1)*47;
        return {
          x:Phaser.Math.Clamp(target.x-direction.y*off+direction.x*i*20,58,902),
          y:Phaser.Math.Clamp(target.y+direction.x*off+direction.y*i*20,78,502)
        };
      });
      for(let i=0;i<spots.length;i++){
        const spot=spots[i],delay=590+i*250;
        this.fx.warn(spot.x,spot.y,55,time,delay,'fissure');
        later(delay,()=>{
          this.fx.burst(spot.x,spot.y,60,this.scene.time.now,'fissure');
          hooks.hitArea(spot.x,spot.y,60,power,side);
        });
      }
    }
  }
}
