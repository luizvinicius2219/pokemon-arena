import Phaser from 'phaser';

/**
 * Story-mode level definitions and environmental interactions.
 * The stage registry is data-driven so future Kanto gyms can reuse the
 * same combat scene, world collision and environmental damage hooks.
 *
 * Brock / Pewter stage is an EARLY PREVIEW; Pikachu remains the test rival.
 */
export type GameMode = 'training' | 'story';
export type ObstacleKind = 'rock' | 'pillar';

export interface StageNpc {
  id: string;
  name: string;
  role: 'leader' | 'trainer' | 'spectator';
  x: number;
  y: number;
  palette: number;
  dialogue?: string;
}
export interface BreakableObstacle {
  id: string;
  kind: ObstacleKind;
  x: number;
  y: number;
  radius: number;
  hp: number;
}
export interface StoryStage {
  id: string;
  region: string;
  city: string;
  title: string;
  leader: string;
  theme: 'rock';
  npc: readonly StageNpc[];
  obstacles: readonly BreakableObstacle[];
  spawnPlayer: {x:number;y:number};
  spawnRival: {x:number;y:number};
  preview: boolean;
}
export const pewterGym: StoryStage = {
  id: 'kanto-pewter',
  region: 'Kanto',
  city: 'Pewter',
  title: 'Ginásio de Pewter',
  leader: 'Brock',
  theme: 'rock',
  preview: true,
  spawnPlayer: {x:215,y:322},
  spawnRival: {x:742,y:310},
  npc: [
    {id:'brock',name:'BROCK',role:'leader',x:480,y:92,palette:0x796455,
      dialogue:'A força da rocha está na resistência!'},
    {id:'guide-west',name:'GUIA',role:'trainer',x:86,y:105,palette:0x65878a},
    {id:'guide-east',name:'TREINADOR',role:'trainer',x:874,y:105,palette:0x7d8c70},
    {id:'spectator-west',name:'TREINADOR',role:'spectator',x:85,y:478,palette:0x9d7d56},
    {id:'spectator-east',name:'TREINADOR',role:'spectator',x:877,y:478,palette:0x877391}
  ],
  obstacles: [
    {id:'pebble-1',kind:'rock',x:312,y:174,radius:25,hp:42},
    {id:'pebble-2',kind:'rock',x:653,y:187,radius:29,hp:42},
    {id:'pebble-3',kind:'rock',x:334,y:426,radius:27,hp:42},
    {id:'pebble-4',kind:'rock',x:645,y:422,radius:26,hp:42},
    {id:'column-left',kind:'pillar',x:480,y:196,radius:24,hp:64},
    {id:'column-right',kind:'pillar',x:480,y:396,radius:24,hp:64}
  ]
};
export const kantoGymOrder = [
  {id:'kanto-pewter',leader:'Brock',city:'Pewter',badge:'Pedra'},
  {id:'kanto-cerulean',leader:'Misty',city:'Cerulean',badge:'Cascata'},
  {id:'kanto-vermilion',leader:'Lt. Surge',city:'Vermilion',badge:'Trovão'},
  {id:'kanto-celadon',leader:'Erika',city:'Celadon',badge:'Arco-Íris'},
  {id:'kanto-fuchsia',leader:'Koga',city:'Fuchsia',badge:'Alma'},
  {id:'kanto-saffron',leader:'Sabrina',city:'Saffron',badge:'Pântano'},
  {id:'kanto-cinnabar',leader:'Blaine',city:'Cinnabar',badge:'Vulcão'},
  {id:'kanto-viridian',leader:'Giovanni',city:'Viridian',badge:'Terra'}
] as const;
interface RockState extends BreakableObstacle {currentHp:number; destroyed:boolean;graphic:Phaser.GameObjects.Container}

export class StoryEnvironment {
  readonly rocks: RockState[] = [];
  private readonly background: Phaser.GameObjects.Graphics;
  private readonly npcSprites: Phaser.GameObjects.Container[] = [];

  constructor(private readonly scene: Phaser.Scene, readonly stage: StoryStage) {
    this.background=scene.add.graphics().setDepth(-20);
    this.drawFloor();
    this.drawNpc();
    for(const data of stage.obstacles){
      const rock: RockState = {...data,currentHp:data.hp,destroyed:false,
        graphic:scene.add.container(data.x,data.y).setDepth(2)};
      this.rocks.push(rock);
      this.paintRock(rock);
    }
    const heading=scene.add.text(480,29,
      'KANTO  /  PEWTER  /  GINÁSIO DE PEDRA  ·  PRÉVIA',{
        color:'#ffdea7',fontSize:'16px',fontStyle:'bold',
        stroke:'#201a16',strokeThickness:3
      }).setOrigin(0.5).setDepth(10);
    heading.setAlpha(0.92);
  }

  private drawFloor() {
    const g=this.background;
    g.fillStyle(0x413d35).fillRect(0,0,960,576);
    for(let y=0;y<576;y+=36)for(let x=0;x<960;x+=48){
      const alternate=(Math.floor(y/36)+Math.floor(x/48))%3;
      g.fillStyle([0x5c554a,0x625a4c,0x534d43][alternate]).fillRoundedRect(x+1,y+1,46,34,2);
      g.lineStyle(1,0x292b28,0.36).strokeRoundedRect(x+1,y+1,46,34,2);
      if((x*7+y*11)%9===0){
        g.lineStyle(1,0x383a35,0.55).lineBetween(x+11,y+12,x+22,y+15);
        g.lineBetween(x+22,y+15,x+19,y+22);
      }
    }
    g.fillStyle(0x242b2b,0.86).fillRoundedRect(23,54,914,468,14);
    g.fillStyle(0x766d58).fillRoundedRect(34,64,892,448,9);
    g.lineStyle(6,0xa09071,0.94).strokeRoundedRect(34,64,892,448,9);
    g.lineStyle(2,0x403d33,0.85).strokeRoundedRect(48,77,864,423,9);
    g.fillStyle(0x504c40,0.95).fillEllipse(480,298,334,250);
    g.lineStyle(3,0x9b875e,0.68).strokeEllipse(480,298,334,250);
    g.lineStyle(2,0xb09b77,0.44).strokeEllipse(480,298,210,140);
    // Symbolic mountain-ring markings; no copyrighted artwork embedded.
    g.lineStyle(5,0xb3a078,0.34);
    g.lineBetween(410,310,446,264);
    g.lineBetween(446,264,475,293);
    g.lineBetween(475,293,509,249);
    g.lineBetween(509,249,550,310);
    g.lineBetween(410,310,550,310);
    g.fillStyle(0x211c18,0.75).fillRoundedRect(401,62,158,75,12);
    g.fillStyle(0x8f7b5e).fillRoundedRect(416,73,128,56,8);
    g.lineStyle(3,0xd0b080,0.75).strokeRoundedRect(416,73,128,56,8);
    g.fillStyle(0xb5a17b,0.70).fillEllipse(480,119,89,16);
    // Lit stone torches near the spectators.
    for(const x of [60,900])for(const y of [151,425]){
      g.fillStyle(0x322d24,0.88).fillRect(x-9,y,18,25);
      g.fillStyle(0xeea64f,0.8).fillCircle(x,y-3,7);
      g.fillStyle(0xffe0a3,0.85).fillCircle(x,y-5,3);
    }
  }

  private drawNpc(){
    for(const npc of this.stage.npc) {
      const c=this.scene.add.container(npc.x,npc.y).setDepth(3);
      this.npcSprites.push(c);
      const shadow=this.scene.add.ellipse(0,12,29,8,0x161e1c,0.55);
      const legs=this.scene.add.rectangle(0,7,15,14,0x30343c);
      const body=this.scene.add.rectangle(0,-6,22,23,npc.palette);
      const head=this.scene.add.circle(0,-23,10,0xd1ab86);
      const hair=this.scene.add.arc(0,-28,11,194,347,false,
        npc.role==='leader'?0x322820:0x3f3733);
      const face=this.scene.add.rectangle(3,-22,3,2,0x2b2628);
      c.add([shadow,legs,body,head,hair,face]);
      this.scene.add.text(npc.x,npc.y-51,npc.name,{
        fontSize:npc.role==='leader'?'13px':'11px',
        fontStyle:'bold',color:npc.role==='leader'?'#ffdb9c':'#d4d9cb',
        stroke:'#292c27',strokeThickness:3
      }).setOrigin(0.5).setDepth(8);
      this.scene.tweens.add({targets:body,scaleY:1.035,duration:920+this.npcSprites.length*110,
        repeat:-1,yoyo:true});
    }
  }

  private paintRock(rock:RockState) {
    rock.graphic.removeAll(true);
    if(rock.destroyed)return;
    const r=rock.radius;
    const g=this.scene.add.graphics();
    g.fillStyle(0x1b1b1a,0.48).fillEllipse(0,r*0.48,r*2.1,r*0.72);
    g.fillStyle(0x302e29).fillEllipse(0,3,r*1.95,r*1.68);
    g.fillStyle(rock.kind==='pillar'?0x776c56:0x8f8775);
    if(rock.kind==='pillar') {
      g.fillRoundedRect(-r*0.85,-r*1.05,r*1.7,r*2,6);
      g.fillStyle(0x524b40).fillRect(-r*0.85,-r*0.85,r*0.48,r*1.56);
      g.fillStyle(0xb4a185).fillRect(r*0.44,-r*0.8,r*0.17,r*1.52);
    } else {
      g.fillPoints([
        {x:-r*0.94,y:4},{x:-r*0.60,y:-r*0.77},{x:r*0.12,y:-r*1.02},
        {x:r*0.87,y:-r*0.37},{x:r*0.94,y:r*0.52},{x:r*0.13,y:r*0.83},
        {x:-r*0.75,y:r*0.6}
      ],true);
      g.fillStyle(0xb9ad8f,0.8).fillPoints([
        {x:-r*0.58,y:-r*0.68},{x:r*0.09,y:-r*0.91},{x:r*0.38,y:-r*0.34},{x:-r*0.22,y:-r*0.12}
      ],true);
    }
    const damaged=rock.currentHp/rock.hp <0.55;
    if(damaged){
      g.lineStyle(3,0x332f2a,0.93);
      g.lineBetween(-r*0.15,-r*0.63,r*0.13,-r*0.05);
      g.lineBetween(r*0.13,-r*0.05,-r*0.13,r*0.4);
      g.lineBetween(r*0.13,-r*0.05,r*0.65,r*0.26);
    }
    rock.graphic.add(g);
  }

  /** Slide a point to the closest non-intersecting location; no teleport. */
  resolve(x:number,y:number,radius:number): {x:number;y:number} {
    let px=Phaser.Math.Clamp(x,47,913);
    let py=Phaser.Math.Clamp(y,73,503);
    for(let iteration=0;iteration<3;iteration++){
      for(const rock of this.rocks){
        if(rock.destroyed)continue;
        const dx=px-rock.x,dy=py-rock.y;
        const min=radius+rock.radius+4;
        const d=Math.hypot(dx,dy);
        if(d>=min)continue;
        const nx=d<0.001?1:dx/d,ny=d<0.001?0:dy/d;
        px=Phaser.Math.Clamp(rock.x+nx*min,47,913);
        py=Phaser.Math.Clamp(rock.y+ny*min,73,503);
      }
    }
    return {x:px,y:py};
  }

  /** Returns true if a projectile hits stone first. */
  intercept(x:number,y:number,radius:number,damage:number):boolean {
    for(const rock of this.rocks){
      if(rock.destroyed)continue;
      if(Phaser.Math.Distance.Between(x,y,rock.x,rock.y)>rock.radius+radius)continue;
      this.damageRock(rock,damage);
      return true;
    }
    return false;
  }

  private damageRock(rock:RockState,damage:number) {
    rock.currentHp=Math.max(0,rock.currentHp-damage);
    const hit=this.scene.add.circle(rock.x,rock.y,rock.radius*0.7,0xffe2ad,0.38).setDepth(7);
    this.scene.tweens.add({targets:hit,alpha:0,scaleX:1.5,scaleY:1.5,duration:130,
      onComplete:()=>hit.destroy()});
    if(rock.currentHp>0) {
      this.paintRock(rock);
      this.scene.tweens.add({targets:rock.graphic,x:rock.x+3,
        duration:45,yoyo:true,repeat:1,onComplete:()=>rock.graphic.setX(rock.x)});
      return;
    }
    rock.destroyed=true;
    rock.graphic.destroy();
    for(let i=0;i<9;i++){
      const angle=i*Math.PI*2/9;
      const distance=18+Math.random()*34;
      const chip=this.scene.add.rectangle(rock.x,rock.y,5+Math.random()*6,
        4+Math.random()*6,i%2?0xa4987d:0x675e52).setDepth(7)
        .setRotation(angle);
      this.scene.tweens.add({targets:chip,x:rock.x+Math.cos(angle)*distance,
        y:rock.y+Math.sin(angle)*distance,alpha:0,
        rotation:angle+2,duration:340,
        onComplete:()=>chip.destroy()});
    }
    const dust=this.scene.add.ellipse(rock.x,rock.y,rock.radius*2,rock.radius,0xc1b395,0.35).setDepth(7);
    this.scene.tweens.add({targets:dust,scaleX:2,scaleY:1.4,alpha:0,duration:420,
      onComplete:()=>dust.destroy()});
  }

  /**
   * A clear ray test for beam/rocks. Damage only the closest blocking rock,
   * and stop the fire beam there, preventing hits through cover.
   */
  beam(x:number,y:number,dx:number,dy:number,reach:number,damage:number):number {
    let closest=reach;
    let target:RockState|undefined;
    for(const rock of this.rocks){
      if(rock.destroyed)continue;
      const rx=rock.x-x,ry=rock.y-y;
      const forward=rx*dx+ry*dy;
      if(forward<0||forward>reach+rock.radius)continue;
      const lateral=Math.abs(rx*dy-ry*dx);
      if(lateral>rock.radius+10)continue;
      const entry=Math.max(0,forward-Math.sqrt(Math.max(0,Math.pow(rock.radius+10,2)-lateral*lateral)));
      if(entry<closest){closest=entry;target=rock;}
    }
    if(target && damage>0)this.damageRock(target,damage);
    return closest;
  }
}
