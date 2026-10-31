/**
 * Guard against right mouse drags leaking into 5:3 fullscreen letterbox bars.
 * Pure geometry: Phaser canvas, world and browser coordinates must all agree.
 */
export interface CanvasBounds {
  left:number;right:number;top:number;bottom:number;
}
export function insideGameCanvas(
  x:number,y:number,clientX:number,clientY:number,
  bounds:CanvasBounds,width=960,height=576
):boolean{
  if(![x,y,clientX,clientY,bounds.left,bounds.right,
    bounds.top,bounds.bottom].every(Number.isFinite))return false;
  return x>=0&&x<=width&&y>=0&&y<=height&&
    clientX>=bounds.left&&clientX<=bounds.right&&
    clientY>=bounds.top&&clientY<=bounds.bottom;
}
