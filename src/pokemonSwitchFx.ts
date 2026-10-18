import Phaser from 'phaser';

interface Point {x:number;y:number}
export interface SwitchSequence {
  outgoing?:Phaser.GameObjects.Image;
  from:Point;
  trainer:Point;
  to:Point;
  nextName:string;
  onReturned:()=>void;
  onSummoned:()=>Phaser.GameObjects.Image|undefined;
  onReady:()=>void;
}

/**
 * Lightweight, reusable Poké Ball recall/send-out choreography.
 * Scripted durations are deliberate: calm pacing, readable red capture
 * beam, returning ball, announcement, throw arc, and red release flash.
 * No core fighter, species or side is hardcoded here.
 */
export class PokemonSwitchFx {
  constructor(private readonly scene:Phaser.Scene){}

  private beam(start:Point,end:Point,duration:number){
    const g=this.scene.add.graphics().setDepth(22);
    const dx=end.x-start.x,dy=end.y-start.y;
    const norm=Math.hypot(dx,dy)||1;
    const px=-dy/norm,py=dx/norm;
    const width=37;
    g.fillStyle(0xff274c,0.22).fillTriangle(
      start.x,start.y,end.x+px*width,end.y+py*width,
      end.x-px*width,end.y-py*width
    );
    g.lineStyle(7,0xff4c69,0.73).lineBetween(start.x,start.y,end.x,end.y);
    g.lineStyle(2,0xffe5dd,0.95).lineBetween(start.x,start.y,end.x,end.y);
    this.scene.tweens.add({targets:g,alpha:0,duration,
      onComplete:()=>g.destroy()});
  }

  private bloom(x:number,y:number,large=false){
    const radius=large?41:27;
    const halo=this.scene.add.circle(x,y,radius,0xff496d,0.61).setDepth(26);
    const ring=this.scene.add.circle(x,y,radius*0.72,0xffeeee,0.08)
      .setStrokeStyle(5,0xffd3d9,0.92).setDepth(27);
    const center=this.scene.add.circle(x,y,13,0xffffff,0.90).setDepth(28);
    this.scene.tweens.add({
      targets:[halo,ring,center],alpha:0,scaleX:2.35,scaleY:2.35,
      duration:390,ease:'Quad.easeOut',
      onComplete:()=>{halo.destroy();ring.destroy();center.destroy();}
    });
  }

  private announce(text:string){
    const label=this.scene.add.text(480,353,text,{
      fontSize:'24px',fontStyle:'bold',color:'#ffe6bb',
      stroke:'#17232e',strokeThickness:6,
      backgroundColor:'#17242dc9',padding:{x:13,y:7}
    }).setOrigin(0.5).setDepth(29).setAlpha(0);
    this.scene.tweens.add({targets:label,alpha:1,duration:180,
      y:label.y-10});
    this.scene.tweens.add({targets:label,alpha:0,duration:400,delay:920,
      onComplete:()=>label.destroy()});
  }

  run(options:SwitchSequence){
    const {outgoing,from,trainer,to,nextName,onReturned,onSummoned,onReady}=options;
    const live=()=>this.scene.sys.isActive();
    this.announce('POKÉMON RECOLHIDO');
    this.beam(trainer,{x:from.x,y:from.y-12},570);
    this.bloom(from.x,from.y-10);
    if(outgoing&&outgoing.active){
      outgoing.setTintFill(0xff5365);
      this.scene.tweens.add({
        targets:outgoing,
        alpha:0,scaleX:0.08,scaleY:0.08,
        duration:580,ease:'Quad.easeIn'
      });
    }
    this.scene.time.delayedCall(590,()=>{
      if(!live())return;
      onReturned();
      const ball=this.scene.add.image(from.x,from.y-19,'pewter-pokeball')
        .setDisplaySize(35,35).setDepth(28);
      this.scene.tweens.add({
        targets:ball,x:trainer.x,y:trainer.y+12,
        scaleX:0.55,scaleY:0.55,angle:-290,duration:440,
        ease:'Quad.easeIn',
        onComplete:()=>ball.destroy()
      });
    });
    this.scene.time.delayedCall(1150,()=>{
      if(live())this.announce('BROCK ENVIA '+nextName.toUpperCase()+'!');
    });
    this.scene.time.delayedCall(1560,()=>{
      if(!live())return;
      const ball=this.scene.add.image(trainer.x,trainer.y+10,'pewter-pokeball')
        .setDisplaySize(34,34).setDepth(29);
      const travelY=to.y-38;
      this.scene.tweens.add({
        targets:ball,
        x:to.x,y:travelY,angle:410,scaleX:1.45,scaleY:1.45,
        duration:680,ease:'Sine.easeInOut',
        onComplete:()=>{
          ball.destroy();
          this.beam(trainer,{x:to.x,y:to.y-30},370);
          this.bloom(to.x,to.y-22,true);
          const incoming=onSummoned();
          if(incoming&&incoming.active){
            const originalX=incoming.scaleX;
            const originalY=incoming.scaleY;
            incoming.setAlpha(0).setScale(0.06).setTintFill(0xff8597);
            this.scene.tweens.add({
              targets:incoming,
              alpha:1,scaleX:originalX,scaleY:originalY,
              duration:490,ease:'Back.easeOut',
              onComplete:()=>{
                incoming.clearTint();
                if(live())onReady();
              }
            });
          } else {
            this.scene.time.delayedCall(490,()=>{
              if(live())onReady();
            });
          }
        }
      });
    });
  }
}
