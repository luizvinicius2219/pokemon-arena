import Phaser from 'phaser';
import { GroundCracks } from './groundCracks';
type Element='fire'|'water'|'electric'|'grass'|'rock'|'normal';
export class UltimateFx {
 private readonly cracks:GroundCracks;
 private readonly reduceMotion:boolean;
 constructor(private scene:Phaser.Scene){
   this.cracks=new GroundCracks(scene);
   this.reduceMotion=typeof window!=='undefined'&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 }
 charge(x:number,y:number,element:Element):void{
   const tint=this.color(element);
   const ring=this.scene.add.graphics().setDepth(12);
   ring.lineStyle(4,tint,0.85).strokeCircle(x,y-20,44);
   ring.lineStyle(2,0xffffff,0.65).strokeCircle(x,y-20,58);
   for(let i=0;i<12;i++){
     const angle=i*Math.PI/6;
     ring.fillStyle(i%2?tint:0xffffff,0.84).fillRect(
       Math.round(x+Math.cos(angle)*58)-3,
       Math.round(y-20+Math.sin(angle)*49)-3,6,6);
   }
   this.scene.tweens.add({targets:ring,alpha:0,scaleX:0.72,scaleY:0.72,
     duration:630,ease:'Cubic.easeIn',onComplete:()=>ring.destroy()});
 }
 terrainImpact(x:number,y:number,force=0.55):void{
   this.cracks.stamp(x,y,65,force,force>=0.7?'heavy':'small');
 }
 impact(x:number,y:number,element:Element,force=1):void{
   const tint=this.color(element);
   this.cracks.stamp(x,y,115,force,'ultimate');
   const g=this.scene.add.graphics().setDepth(14);
   for(let i=0;i<3;i++){
     const r=(24+i*25)*force;
     g.lineStyle(i===0?6:3,i===1?0xffffff:tint,0.86-i*0.17)
       .strokeEllipse(x,y+6,r*2,r);
   }
   for(let i=0;i<14;i++){
     const a=i*Math.PI*2/14;
     const r=(32+i%4*12)*force;
     g.fillStyle(i%3===0?0xffffff:tint,0.9)
       .fillRect(Math.round(x+Math.cos(a)*r),Math.round(y+Math.sin(a)*r*0.62),7,7);
   }
   this.scene.tweens.add({targets:g,alpha:0,scaleX:1.38,scaleY:1.22,
     duration:470,onComplete:()=>g.destroy()});
   if(!this.reduceMotion){
     this.scene.cameras.main.shake(190,0.0048);
     const flash=this.scene.add.rectangle(480,288,960,576,tint,0.16)
       .setScrollFactor(0).setDepth(18);
     this.scene.tweens.add({targets:flash,alpha:0,duration:250,
       onComplete:()=>flash.destroy()});
   }
 }
 private color(element:Element):number{
   return ({fire:0xffa450,water:0x6dd4f4,electric:0xffe178,grass:0xa4e98d,rock:0xcbb48c,normal:0xebd7bd})[element];
 }
}
