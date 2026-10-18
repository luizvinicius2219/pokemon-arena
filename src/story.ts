import Phaser from 'phaser';
import { pokemonCatalog, gymTeams } from './pokemonCatalog';
import type { Fighter } from './abilities';

/**
 * Story-mode level definitions and environmental interactions.
 * The stage registry is data-driven so future Kanto gyms can reuse the
 * same combat scene, world collision and environmental damage hooks.
 *
 * Brock / Pewter stage is a two-Pokémon challenge: Geodude then Onix.
 */
export type GameMode = 'training' | 'story' | 'practice' | 'world';
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
  for(const name of ['rock','rock-cracked','pillar','pillar-cracked']){
    scene.load.svg('pewter-'+name,root+name+'.svg',{width:64,height:64});
  }
  // Exploration overworld sheets are from FireRed/LeafGreen. They are 16x32
  // tiles showing front, rear and walk frames, as in a real Pokemon gym.
  for(const name of ['brock','red','hiker','camper']){
    scene.load.spritesheet('pewter-'+name+'-overworld',
      root+name+'-overworld.png',{frameWidth:16,frameHeight:32});
  }
  // Full-size battle portraits are shown only on the pre-battle VS card.
  for(const name of ['brock','red']){
    scene.load.image('pewter-'+name+'-game',root+name+'-game.png');
  }
  scene.load.image('pewter-pokeball',root+'pokeball.png');
}

interface RockState extends BreakableObstacle {
  currentHp:number;
  destroyed:boolean;
  image:Phaser.GameObjects.Image;
  lastDamage:number;
}

export class StoryEnvironment {
  readonly rocks:RockState[]=[];
  constructor(private readonly scene:Phaser.Scene,readonly stage:StoryStage,
    private readonly playerSpecies:Fighter='charizard'){
    scene.add.image(480,288,'pewter-floor').setDepth(-20).setOrigin(0.5);
    for(const npc of stage.npc){
      const leader=npc.role==='leader';
      const texture=leader?'pewter-brock-overworld':
        npc.id==='guide-west'||npc.id==='spectator-west'
          ?'pewter-hiker-overworld':'pewter-camper-overworld';
      // Native GBA overworld perspective with crisp, unsmoothed pixels:
      // only 1 GameObject per trainer (no perpetual tween or procedural art).
      const size=leader?3.25:2.95;
      scene.add.ellipse(npc.x,npc.y+18,leader?39:32,10,0x132831,0.34).setDepth(1);
      scene.add.image(npc.x,npc.y-15,texture,0)
        .setDisplaySize(16*size,32*size).setDepth(2).setOrigin(0.5);
    }
    const leader=stage.npc.find(npc=>npc.role==='leader');
    if(leader){
      scene.add.text(leader.x,leader.y-53,leader.name,{
        fontSize:'12px',fontStyle:'bold',color:'#ffe2a6',
        stroke:'#20303a',strokeThickness:4
      }).setOrigin(0.5).setDepth(10);
    }

    if(stage.hero){
      const hero=stage.hero;
      scene.add.ellipse(hero.x,hero.y+18,36,10,0x182d35,0.45).setDepth(1);
      // Frame 3 is the rear-facing Red from FireRed/LeafGreen: he watches
      // Charizard fight from the bottom of the court, like the game.
      scene.add.image(hero.x,hero.y-18,'pewter-red-overworld',3)
        .setDisplaySize(55,110).setOrigin(0.5).setDepth(2);
      scene.add.text(hero.x,hero.y+31,hero.name,{
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
    // Battle portraits and Pokemon in this VS screen are loaded from the
    // SAME team roster used by ArenaScene; no manual text/asset duplication.
    const scene=this.scene;
    const challenger=pokemonCatalog[this.playerSpecies];
    const defenders=(gymTeams[this.stage.id]??[])
      .map(encounter=>pokemonCatalog[encounter.species]);
    const overlay=scene.add.container(480,288).setDepth(40).setAlpha(0);
    const darkness=scene.add.rectangle(0,0,960,576,0x0a1620,0.94);
    const left=scene.add.rectangle(-233,-10,404,400,0x1e3540)
      .setStrokeStyle(5,0x9ed4c9);
    const right=scene.add.rectangle(233,-10,404,400,0x302b30)
      .setStrokeStyle(5,0xe8b77b);
    const line=scene.add.rectangle(0,-10,4,412,0xdcc18e,0.87);
    const title=scene.add.text(0,-252,'DESAFIO DO GINÁSIO DE PEWTER',{
      fontSize:'25px',fontStyle:'bold',color:'#ffe3ae',
      stroke:'#17262c',strokeThickness:5
    }).setOrigin(0.5);
    const red=scene.add.image(-234,-111,'pewter-red-game')
      .setDisplaySize(142,142);
    const brock=scene.add.image(234,-111,'pewter-brock-game')
      .setDisplaySize(157,157);
    const portrait=(id:Fighter,x:number,y:number,size:number)=>{
      const texture=scene.textures.exists(id)?id:
        scene.textures.exists(id+'-Idle')?id+'-Idle':null;
      if(texture)return scene.add.image(x,y,texture,0)
        .setDisplaySize(size,size).setOrigin(0.5);
      return scene.add.text(x,y,pokemonCatalog[id].name.toUpperCase(),{
        fontSize:'18px',fontStyle:'bold',color:'#ffe0a5'
      }).setOrigin(0.5);
    };
    const fighters:Phaser.GameObjects.GameObject[]=[
      portrait(challenger.id,-233,89,122)
    ];
    if(defenders.length===1){
      fighters.push(portrait(defenders[0].id,233,88,130));
    }else{
      const spread=Math.min(116,220/Math.max(1,defenders.length-1));
      defenders.forEach((pokemon,i)=>{
        const x=233+(i-(defenders.length-1)/2)*spread;
        fighters.push(portrait(pokemon.id,x,88,
          pokemon.id==='onix'?122:105));
      });
    }
    const text=(x:number,y:number,label:string,size:number,color:string)=>
      scene.add.text(x,y,label,{
        fontSize:size+'px',fontStyle:'bold',color,
        stroke:'#182630',strokeThickness:4
      }).setOrigin(0.5);
    const labels=[
      text(-233,-23,'RED',27,'#c5f9ff'),
      text(233,-23,this.stage.leader.toUpperCase(),27,'#ffe0a3'),
      text(0,-16,'VS',45,'#fff1c5'),
      text(-233,178,challenger.name.toUpperCase(),21,'#c4f8f4'),
      text(233,178,defenders.map(p=>p.name.toUpperCase()).join(' / '),18,'#f5dbb0'),
      text(0,225,
        challenger.name.toUpperCase()+'  ×  '+
        (defenders.map(p=>p.name.toUpperCase()).join(' / ')||'???'),
        19,'#fce2b1'),
      text(0,256,
        defenders.length+' POKÉMON · A FORÇA DA ROCHA ESTÁ NA RESISTÊNCIA',
        13,'#d4e1d8')
    ];
    overlay.add([darkness,left,right,line,red,brock,title,...fighters,...labels]);
    scene.tweens.add({targets:overlay,alpha:1,duration:220});
    scene.time.delayedCall(2540,()=>{
      if(!overlay.active)return;
      scene.tweens.add({targets:overlay,alpha:0,duration:570,
        onComplete:()=>overlay.destroy()});
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
