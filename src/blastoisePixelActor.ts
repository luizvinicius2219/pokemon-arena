import Phaser from 'phaser';

/**
 * Reproduces frames cropped from the reference sprite sheet provided by the
 * project's author. 12 frames in a 4x3 WebP atlas, each 32x32 pixels.
 * The atlas is only loaded for Blastoise: it never replaces another species.
 */
export const BLASTOISE_SHEET='blastoise-pixel-art';
const FRAME={
  front:0, back:1, left:2, right:3,
  idle:4, ready:5, walk:6, run:7,
  water:8, hydro:9, hurt:10, fainted:11
} as const;

export class BlastoisePixelActor {
  readonly image:Phaser.GameObjects.Image;
  private facing=new Phaser.Math.Vector2(1,0);
  private actionUntil=0;
  private actionFrame:number=FRAME.ready;
  private hurtUntil=0;
  private fainted=false;
  private previousFrame=-1;
  private lastX:number;
  private lastY:number;

  constructor(private readonly scene:Phaser.Scene,_pokemon:'blastoise',x:number,y:number){
    this.image=scene.add.image(x,y-17,BLASTOISE_SHEET,FRAME.ready)
      .setDisplaySize(112,112).setOrigin(0.5,0.76).setDepth(3);
    this.lastX=x;this.lastY=y;
  }
  setBurrowDepth(_depth:number):void{/* Blastoise never burrows. */}
  face(direction:Phaser.Math.Vector2):void{
    if(direction.lengthSq()>0.0001)this.facing.copy(direction).normalize();
  }
  trigger(motion:'Shoot'|'Attack'|'Charge'|'Hop',time:number,direction:Phaser.Math.Vector2,duration?:number):void{
    if(this.fainted)return;
    this.face(direction);
    this.actionFrame=motion==='Charge'?FRAME.hydro:
      motion==='Shoot'?FRAME.water:motion==='Attack'?FRAME.ready:FRAME.run;
    this.actionUntil=time+Math.min(950,Math.max(280,duration??540));
  }
  hurt(time:number):void{
    if(this.fainted)return;
    this.hurtUntil=time+420;
  }
  knockOut(x:number,y:number):void{
    if(this.fainted)return;
    this.fainted=true;this.actionUntil=0;this.hurtUntil=0;
    // The authored Fainted (K.O.) pose is already lying down.
    this.image.setFrame(FRAME.fainted).clearTint().setVisible(true).setAlpha(1)
      .setAngle(0).setDisplaySize(121,94).setOrigin(0.5,0.72).setDepth(6);
    this.scene.tweens.add({targets:this.image,x,y:y+12,duration:550,ease:'Cubic.easeOut'});
  }
  update(x:number,y:number,velocity:Phaser.Math.Vector2,time:number):void{
    if(this.fainted)return;
    if(velocity.lengthSq()>0.02)this.face(velocity);
    const moving=velocity.lengthSq()>0.4;
    let frame:number;
    if(time<this.hurtUntil)frame=FRAME.hurt;
    else if(time<this.actionUntil)frame=this.actionFrame;
    else if(moving)frame=Math.floor(time/180)%2===0?FRAME.walk:FRAME.run;
    else if(Math.abs(this.facing.y)>Math.abs(this.facing.x)*1.2)
      frame=this.facing.y<0?FRAME.back:FRAME.front;
    else frame=this.facing.x<0?FRAME.left:FRAME.right;
    if(frame!==this.previousFrame){this.image.setFrame(frame);this.previousFrame=frame;}
    this.image.setPosition(x,y-17);
    this.lastX=x;this.lastY=y;
  }
}
