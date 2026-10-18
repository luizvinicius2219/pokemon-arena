import Phaser from 'phaser';
import {Action,Bindings,defaults,loadBindings,saveBindings,assignBinding,keyLabel} from './controls';
import './style.css';
const app=document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML='<header><h1>MONSTER <span>ARENA</span></h1><p>Arena 2D • Batalha em tempo real</p><button id="settings">⚙ Controles</button></header><main><div id="game"></div><aside><h2>Como jogar</h2><p>🖱 Clique direito: mover</p><p>🎯 Mire com o cursor</p><p>⚡ Q W E R: habilidades</p><p>💨 Espaço: esquiva</p><p>Derrote o adversário para vencer. Pressione ENTER para reiniciar.</p><div id="status"></div></aside></main><div id="modal" class="hidden"><section><h2>Configurar controles</h2><p>Clique em uma ação e pressione a nova tecla.</p><div id="bindings"></div><p id="error"></p><button id="restore">Restaurar padrões</button><button id="close">Fechar</button></section></div>';
let bindings=loadBindings(); let capturing:Action|null=null;let menuOpen=false;
const heldKeys=new Set<string>();
window.addEventListener('keyup',e=>heldKeys.delete(e.code));
window.addEventListener('blur',()=>heldKeys.clear());
const modal=document.querySelector<HTMLDivElement>('#modal')!,bindingList=document.querySelector<HTMLDivElement>('#bindings')!,error=document.querySelector<HTMLParagraphElement>('#error')!;
const actions:Action[]=['q','w','e','r','dodge'];const labels:Record<Action,string>={q:'Habilidade Q',w:'Habilidade W',e:'Habilidade E',r:'Especial R',dodge:'Esquiva'};
function renderBindings(){bindingList.replaceChildren();for(const action of actions){const button=document.createElement('button');button.textContent=labels[action]+' — '+(capturing===action?'Pressione uma tecla...':keyLabel(bindings[action]));button.onclick=()=>{capturing=action;error.textContent='';renderBindings();};bindingList.append(button);}}
function toggle(open:boolean){menuOpen=open;capturing=null;heldKeys.clear();modal.classList.toggle('hidden',!open);error.textContent='';renderBindings();}
document.querySelector('#settings')!.addEventListener('click',()=>toggle(true));document.querySelector('#close')!.addEventListener('click',()=>toggle(false));document.querySelector('#restore')!.addEventListener('click',()=>{bindings={...defaults};saveBindings(bindings);error.textContent='Controles restaurados.';renderBindings();});
window.addEventListener('keydown',e=>{
  if(capturing){
    e.preventDefault();
    if(['Escape','Tab','ControlLeft','ControlRight','AltLeft','AltRight','MetaLeft','MetaRight'].includes(e.code)){
      capturing=null;renderBindings();return;
    }
    const result=assignBinding(bindings,capturing,e.code);
    if(result.error){error.textContent=result.error;}
    else{bindings=result.value;saveBindings(bindings);capturing=null;error.textContent='Tecla salva!';}
    renderBindings();return;
  }
  if(menuOpen)return;
  if(Object.values(bindings).includes(e.code)){
    e.preventDefault();
    heldKeys.add(e.code);
  }
},true);
class Battle extends Phaser.Scene{
  player!:Phaser.GameObjects.Arc;enemy!:Phaser.GameObjects.Arc;playerArt?:Phaser.GameObjects.Image;enemyArt?:Phaser.GameObjects.Image;playerShadow?:Phaser.GameObjects.Ellipse;enemyShadow?:Phaser.GameObjects.Ellipse;playerFacing=new Phaser.Math.Vector2(1,0);enemyFacing=new Phaser.Math.Vector2(-1,0);playerAttackAt=-1000;enemyAttackAt=-1000;playerHurtAt=-1000;enemyHurtAt=-1000;playerLabel!:Phaser.GameObjects.Text;enemyLabel!:Phaser.GameObjects.Text;destination!:Phaser.Math.Vector2;hp=100;enemyHp=100;lastCast:Record<Action,number>={q:0,w:0,e:0,r:0,dodge:0};enemyLast=0;ended=false;lastFacing=new Phaser.Math.Vector2(1,0);projectiles:{shape:Phaser.GameObjects.Arc;velocity:Phaser.Math.Vector2;enemy:boolean;damage:number;expires:number}[]=[];hpText!:Phaser.GameObjects.Text;enemyText!:Phaser.GameObjects.Text;
  constructor(){super('Battle');}
  preload(){
    // Sprites mantidos remotamente: não são incluídos no repositório público.
    const base='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/';
    this.load.image('charizard',base+'6.png');
    this.load.image('charizard-back',base+'back/6.png');
    this.load.image('pikachu',base+'25.png');
    this.load.image('pikachu-back',base+'back/25.png');
  }
  create(){this.hp=100;this.enemyHp=100;this.ended=false;this.projectiles=[];this.lastCast={q:-350,w:-1000,e:-1700,r:-4500,dodge:-1900};this.enemyLast=0;this.playerFacing.set(1,0);this.enemyFacing.set(-1,0);this.playerAttackAt=-1000;this.enemyAttackAt=-1000;this.playerHurtAt=-1000;this.enemyHurtAt=-1000;this.cameras.main.setBackgroundColor('#142e31');const g=this.add.graphics();g.lineStyle(2,0x315b59);for(let x=0;x<960;x+=48)g.lineBetween(x,0,x,576);for(let y=0;y<576;y+=48)g.lineBetween(0,y,960,y);g.lineStyle(5,0x6fa296);g.strokeRoundedRect(20,20,920,536,18);
    this.player=this.add.circle(210,288,19,0x60d1ff).setStrokeStyle(4,0xffffff);
    this.enemy=this.add.circle(750,288,19,0xff8b69).setStrokeStyle(4,0xffffff);
    this.playerShadow=this.add.ellipse(210,303,48,14,0x06181c,0.55).setDepth(1);
    this.enemyShadow=this.add.ellipse(750,303,42,13,0x06181c,0.55).setDepth(1);
    if(this.textures.exists('charizard')){
      this.playerArt=this.add.image(210,280,'charizard').setDisplaySize(88,88).setDepth(2);
      this.player.setVisible(false);
    }
    if(this.textures.exists('pikachu')){
      this.enemyArt=this.add.image(750,280,'pikachu').setDisplaySize(74,74).setDepth(2);
      this.enemy.setVisible(false);
    }
    this.playerLabel=this.add.text(210,233,'CHARIZARD',{color:'#d5f8ff',fontSize:'14px',fontStyle:'bold'}).setOrigin(0.5);
    this.enemyLabel=this.add.text(750,233,'PIKACHU',{color:'#ffe2d8',fontSize:'14px',fontStyle:'bold'}).setOrigin(0.5);
    this.destination=new Phaser.Math.Vector2(this.player.x,this.player.y);this.hpText=this.add.text(30,28,'Charizard: 100 HP',{fontSize:'20px',color:'#a5eeff'}).setDepth(10);this.enemyText=this.add.text(740,28,'Pikachu: 100 HP',{fontSize:'20px',color:'#ffc0ae'}).setDepth(10);
    this.input.mouse?.disableContextMenu();this.input.on('pointerdown',(p:Phaser.Input.Pointer)=>{if(p.rightButtonDown()&&!menuOpen&&!this.ended)this.destination.set(Phaser.Math.Clamp(p.x,40,920),Phaser.Math.Clamp(p.y,40,536));});
    this.input.keyboard?.on('keydown-ENTER',()=>{if(this.ended){heldKeys.clear();this.scene.restart();}});
  }
  cast(action:Action,time:number){const cooldown:Record<Action,number>={q:350,w:1000,e:1700,r:4500,dodge:1900};if(time-this.lastCast[action]<cooldown[action])return;this.lastCast[action]=time;const pointer=this.input.activePointer;const dir=new Phaser.Math.Vector2(pointer.worldX-this.player.x,pointer.worldY-this.player.y);if(dir.lengthSq()<0.1)dir.copy(this.lastFacing);else{dir.normalize();this.lastFacing.copy(dir);}
    if(action==='dodge'){if(this.playerArt){const ghost=this.add.image(this.player.x,this.player.y-8,this.playerArt.texture.key).setDisplaySize(88,88).setAlpha(0.45).setTint(0x8bdcff).setDepth(1);ghost.setFlipX(this.playerArt.flipX);this.tweens.add({targets:ghost,alpha:0,duration:220,onComplete:()=>ghost.destroy()});}this.player.x=Phaser.Math.Clamp(this.player.x+dir.x*100,40,920);this.player.y=Phaser.Math.Clamp(this.player.y+dir.y*100,40,536);this.destination.set(this.player.x,this.player.y);return;}
    this.playerAttackAt=time;this.playerFacing.copy(dir);const speed=action==='r'?520:action==='w'?320:420;const damage=action==='r'?30:action==='e'?16:action==='w'?12:8;const radius=action==='r'?19:action==='e'?14:action==='w'?12:8;this.spawn(this.player.x,this.player.y,dir,speed,damage,radius,false,time);
  }
  spawn(x:number,y:number,dir:Phaser.Math.Vector2,speed:number,damage:number,radius:number,enemy:boolean,time:number){const shape=this.add.circle(x,y,radius,enemy?0xffb85b:0xb8f66b).setStrokeStyle(2,0xffffff);this.projectiles.push({shape,velocity:dir.clone().scale(speed),enemy,damage,expires:time+2100});}
  // Mantém a hitbox imóvel em tamanho e anima somente o desenho do Pokémon.
  // Alterna front/back quando sobe ou desce, espelha ao virar de lado.
  animateMonster(
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
  ){
    if(!image)return;
    const walking=velocity.lengthSq()>0.05;
    if(walking)facing.copy(velocity).normalize();
    const lookingUp=facing.y< -0.3 && Math.abs(facing.y)>Math.abs(facing.x)*0.75;
    const nextTexture=lookingUp && this.textures.exists(back)?back:front;
    if(image.texture.key!==nextTexture)image.setTexture(nextTexture);
    image.setFlipX(facing.x < -0.25);
    const footstep=walking?Math.abs(Math.sin(time*0.017))*5:0;
    const breathing=Math.sin(time*0.003)*0.018;
    const sway=walking?Math.sin(time*0.014)*0.065:Math.sin(time*0.002)*0.012;
    const attack=Math.max(0,1-(time-attackAt)/190);
    image.setDisplaySize(size*(1+breathing+attack*0.14),size*(1-breathing*0.5-attack*0.09));
    image.setPosition(entity.x,entity.y-8-footstep-attack*7);
    image.setRotation(sway);
    if(time-hurtAt<220 && Math.floor(time/55)%2===0)image.setTint(0xff7575);
    else image.clearTint();
    shadow?.setPosition(entity.x,entity.y+15);
    shadow?.setScale(1-footstep*0.025,1-footstep*0.025);
  }
  update(time:number,delta:number){if(menuOpen||this.ended)return;const dt=Math.min(delta/1000,0.05);const oldPlayer=new Phaser.Math.Vector2(this.player.x,this.player.y);const oldEnemy=new Phaser.Math.Vector2(this.enemy.x,this.enemy.y);const to=this.destination.clone().subtract(new Phaser.Math.Vector2(this.player.x,this.player.y));const distanceToTarget=to.length();if(distanceToTarget>3){const step=to.normalize().scale(Math.min(215*dt,distanceToTarget));this.player.x+=step.x;this.player.y+=step.y;}
    for(const action of actions){if(heldKeys.has(bindings[action]))this.cast(action,time);}
    const toward=new Phaser.Math.Vector2(this.player.x-this.enemy.x,this.player.y-this.enemy.y);const distance=toward.length();if(distance>190){toward.normalize();this.enemy.x=Phaser.Math.Clamp(this.enemy.x+toward.x*115*dt,40,920);this.enemy.y=Phaser.Math.Clamp(this.enemy.y+toward.y*115*dt,40,536);}else if(distance<130){toward.normalize();this.enemy.x=Phaser.Math.Clamp(this.enemy.x-toward.x*90*dt,40,920);this.enemy.y=Phaser.Math.Clamp(this.enemy.y-toward.y*90*dt,40,536);}
    if(time-this.enemyLast>950){this.enemyLast=time;this.enemyAttackAt=time;const aim=new Phaser.Math.Vector2(this.player.x-this.enemy.x,this.player.y-this.enemy.y).normalize();this.spawn(this.enemy.x,this.enemy.y,aim,260,9,9,true,time);}
    for(let i=this.projectiles.length-1;i>=0;i--){const p=this.projectiles[i];p.shape.x+=p.velocity.x*dt;p.shape.y+=p.velocity.y*dt;const target=p.enemy?this.player:this.enemy;const hit=Phaser.Math.Distance.Between(p.shape.x,p.shape.y,target.x,target.y)<p.shape.radius+target.radius;if(hit){if(p.enemy){this.hp=Math.max(0,this.hp-p.damage);this.playerHurtAt=time;}else{this.enemyHp=Math.max(0,this.enemyHp-p.damage);this.enemyHurtAt=time;}}if(hit||time>p.expires||p.shape.x<0||p.shape.x>960||p.shape.y<0||p.shape.y>576){p.shape.destroy();this.projectiles.splice(i,1);}}
    this.animateMonster(this.playerArt,this.playerShadow,this.player,this.playerFacing,
      new Phaser.Math.Vector2(this.player.x-oldPlayer.x,this.player.y-oldPlayer.y),
      'charizard','charizard-back',88,time,this.playerAttackAt,this.playerHurtAt);
    this.animateMonster(this.enemyArt,this.enemyShadow,this.enemy,this.enemyFacing,
      new Phaser.Math.Vector2(this.enemy.x-oldEnemy.x,this.enemy.y-oldEnemy.y),
      'pikachu','pikachu-back',74,time,this.enemyAttackAt,this.enemyHurtAt);
    this.playerLabel.setPosition(this.player.x,this.player.y-55);
    this.enemyLabel.setPosition(this.enemy.x,this.enemy.y-55);
    this.hpText.setText('Charizard: '+this.hp+' HP');this.enemyText.setText('Pikachu: '+this.enemyHp+' HP');if(this.hp<=0||this.enemyHp<=0){this.ended=true;this.add.rectangle(480,288,590,130,0x0b1c21,0.9).setDepth(20);this.add.text(480,288,(this.hp<=0?'DERROTA':'VITÓRIA')+'\nENTER para reiniciar',{fontSize:'30px',align:'center',color:'#ffffff'}).setOrigin(0.5).setDepth(21);}
  }
}
new Phaser.Game({type:Phaser.AUTO,parent:'game',width:960,height:576,backgroundColor:'#142e31',render:{pixelArt:true},scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},scene:[Battle]});
