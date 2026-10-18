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
  role: 'leader' | 'trainer' | 'spectator' | 'player';
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
  hero?: StageNpc;
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
  spawnPlayer: {x:480,y:455},
  spawnRival: {x:480,y:185},
  hero: {id:'red',name:'RED',role:'player',x:480,y:527,palette:0xb32f32},
  npc: [
    {id:'brock',name:'BROCK',role:'leader',x:480,y:94,palette:0x796455,
      dialogue:'A força da rocha está na resistência!'},
    {id:'guide-west',name:'GUIA',role:'trainer',x:86,y:150,palette:0x65878a},
    {id:'guide-east',name:'TREINADOR',role:'trainer',x:874,y:150,palette:0x7d8c70},
    {id:'spectator-west',name:'TREINADOR',role:'spectator',x:86,y:452,palette:0x9d7d56},
    {id:'spectator-east',name:'TREINADOR',role:'spectator',x:874,y:452,palette:0x877391}
  ],
  obstacles: [
    {id:'pebble-1',kind:'rock',x:300,y:248,radius:23,hp:42},
    {id:'pebble-2',kind:'rock',x:660,y:248,radius:23,hp:42},
    {id:'pebble-3',kind:'rock',x:300,y:408,radius:23,hp:42},
    {id:'pebble-4',kind:'rock',x:660,y:408,radius:23,hp:42}
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

/** Pre-rendered pixel art; no per-frame floor drawing or NPC tweens. */
export function preloadPewter(scene:Phaser.Scene) {
  const root='/assets/story/pewter/';
  scene.load.svg('pewter-floor',root+'gym.svg',{width:960,height:576});
  for(const name of ['brock','red','trainer-a','trainer-b','rock','rock-cracked','pillar','pillar-cracked']){
    scene.load.svg('pewter-'+name,root+name+'.svg',{width:64,height:64});
  }
  // Genuine retro trainer portraits (unaltered), with local original pixel-art
  // fallbacks if the external host is unavailable or CORS blocks the image.
  const portraits='https://play.pokemonshowdown.com/sprites/trainers/';
  scene.load.image('pewter-brock-classic',portraits+'brock-gen3.png');
  scene.load.image('pewter-red-classic',portraits+'red-gen3.png');
}

interface RockState extends BreakableObstacle {
  currentHp:number;
  destroyed:boolean;
  image:Phaser.GameObjects.Image;
  lastDamage:number;
}

export class StoryEnvironment {
  readonly rocks:RockState[]=[];
  constructor(private readonly scene:Phaser.Scene,readonly stage:StoryStage){
    scene.add.image(480,288,'pewter-floor').setDepth(-20).setOrigin(0.5);
    for(const npc of stage.npc){
      const leader=npc.role==='leader';
      const fallback=leader?'pewter-brock':
        npc.id==='guide-west'||npc.id==='spectator-west'?'pewter-trainer-a':'pewter-trainer-b';
      const texture=leader&&scene.textures.exists('pewter-brock-classic')
        ?'pewter-brock-classic':fallback;
      const width=leader?118:43,height=leader?118:57;
      const image=scene.add.image(npc.x,npc.y-(leader?10:13),texture)
        .setDisplaySize(width,height).setDepth(2).setOrigin(0.5);
      // Retro portraits are supplied on a square transparent canvas; fallback
      // overworld art is taller, so their dimensions differ by design.
      if(leader && texture===fallback)image.setDisplaySize(56,70);
    }
    const leader=stage.npc.find(npc=>npc.role==='leader');
    if(leader){
      scene.add.text(leader.x,leader.y-55,leader.name,{
        fontSize:'13px',fontStyle:'bold',color:'#ffe2a6',
        stroke:'#20303a',strokeThickness:4
      }).setOrigin(0.5).setDepth(10);
    }

    if(stage.hero){
      const hero=stage.hero;
      const texture=scene.textures.exists('pewter-red-classic')
        ?'pewter-red-classic':'pewter-red';
      scene.add.ellipse(hero.x,hero.y+18,44,12,0x182d35,0.5).setDepth(1);
      const player=scene.add.image(hero.x,hero.y-13,texture)
        .setDisplaySize(109,109).setOrigin(0.5).setDepth(2);
      if(texture==='pewter-red')player.setDisplaySize(55,76);
      scene.add.text(hero.x,hero.y+32,hero.name,{
        fontSize:'12px',fontStyle:'bold',color:'#fff0d2',
        stroke:'#21343c',strokeThickness:3
      }).setOrigin(0.5).setDepth(10);
    }
    this.showStageIntroduction();

    for(const data of stage.obstacles){
      const texture=data.kind==='pillar'?'pewter-pillar':'pewter-rock';
      const image=scene.add.image(data.x,data.y,texture)
        .setDisplaySize(data.radius*2.1,data.radius*2.1).setDepth(3).setOrigin(0.5);
      this.rocks.push({...data,currentHp:data.hp,destroyed:false,image,lastDamage:-1000});
    }
  }

  private showStageIntroduction(){
    // One inexpensive introductory panel, then the scene remains entirely
    // static. The battle continues underneath; no mandatory cutscene or pause.
    const panel=this.scene.add.container(230,517).setDepth(16).setAlpha(0);
    const plate=this.scene.add.rectangle(0,0,395,59,0x102632,0.91)
      .setStrokeStyle(2,0xbda274);
    const title=this.scene.add.text(-178,-23,
      'GINÁSIO DE PEWTER  ·  BROCK',{
        fontSize:'14px',fontStyle:'bold',color:'#ffe4ae'
      });
    const quote=this.scene.add.text(-178,-3,
      'A força da rocha está na resistência!',{
        fontSize:'13px',color:'#f1f5e9'
      });
    const hint=this.scene.add.text(-178,15,
      'PRÉVIA  ·  PIKACHU É O RIVAL DE TESTE',{
        fontSize:'11px',color:'#a9c4c8'
      });
    panel.add([plate,title,quote,hint]);
    this.scene.tweens.add({targets:panel,alpha:1,duration:230,ease:'Quad.easeOut'});
    this.scene.time.delayedCall(2550,()=>{
      if(!panel.active)return;
      this.scene.tweens.add({targets:panel,alpha:0,duration:370,
        onComplete:()=>panel.destroy()});
    });
  }

  resolve(x:number,y:number,radius:number):{x:number;y:number}{
    let px=Phaser.Math.Clamp(x,47,913),py=Phaser.Math.Clamp(y,73,503);
    for(let i=0;i<2;i++)for(const rock of this.rocks){
      if(rock.destroyed)continue;
      const dx=px-rock.x,dy=py-rock.y,min=radius+rock.radius+3,d=Math.hypot(dx,dy);
      if(d>=min)continue;
      const nx=d<0.001?1:dx/d,ny=d<0.001?0:dy/d;
      px=Phaser.Math.Clamp(rock.x+nx*min,47,913);
      py=Phaser.Math.Clamp(rock.y+ny*min,73,503);
    }
    return{x:px,y:py};
  }

  intercept(x:number,y:number,radius:number,damage:number):boolean{
    for(const rock of this.rocks){
      if(rock.destroyed)continue;
      if(Math.hypot(x-rock.x,y-rock.y)>rock.radius+radius)continue;
      this.hit(rock,damage);
      return true;
    }
    return false;
  }

  private hit(rock:RockState,damage:number){
    // A stationary flame beam deals damage at most once per 120ms.
    const now=this.scene.time.now;
    if(now-rock.lastDamage<115)return;
    rock.lastDamage=now;
    rock.currentHp=Math.max(0,rock.currentHp-damage);
    if(rock.currentHp<=0){
      rock.destroyed=true;
      rock.image.destroy();
      return;
    }
    if(rock.currentHp<=rock.hp*0.5)rock.image.setTexture(
      rock.kind==='pillar'?'pewter-pillar-cracked':'pewter-rock-cracked'
    );
  }

  beam(x:number,y:number,dx:number,dy:number,reach:number,damage:number):number{
    let distance=reach;
    let target:RockState|undefined;
    for(const rock of this.rocks){
      if(rock.destroyed)continue;
      const rx=rock.x-x,ry=rock.y-y;
      const along=rx*dx+ry*dy,perp=Math.abs(rx*dy-ry*dx);
      if(along<0||along>reach+rock.radius||perp>rock.radius+8)continue;
      const entry=Math.max(0,along-Math.sqrt(Math.max(0,(rock.radius+8)**2-perp**2)));
      if(entry<distance){distance=entry;target=rock;}
    }
    if(target&&damage>0)this.hit(target,damage);
    return distance;
  }
}
