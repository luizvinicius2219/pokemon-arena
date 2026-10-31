/**
 * Shared pure geometry for Venusaur's flower-anchored attacks.
 *
 * Combat and pixel artwork must use the same origins and directions:
 * this prevents a ray from looking aligned while its hurtbox misses.
 */
export interface PlantPoint { x:number; y:number }
const SQRT_EPSILON=1e-6;

export function flowerCenter(body:PlantPoint):PlantPoint {
  return {x:body.x,y:body.y-34};
}

/** Muzzle is on the exact line from the flower center toward the cursor. */
export function flowerMuzzle(body:PlantPoint,dir:PlantPoint):PlantPoint {
  const flower=flowerCenter(body);
  return {x:flower.x+dir.x*13,y:flower.y+dir.y*13};
}

/** Vine starts INSIDE the broad plant shoulders, not out in the arena. */
export function vineRoot(body:PlantPoint):PlantPoint {
  return {x:body.x,y:body.y-21};
}

export function aimAtPoint(
  origin:PlantPoint,target:PlantPoint,fallback:PlantPoint,deadZone=23
):PlantPoint {
  const dx=target.x-origin.x,dy=target.y-origin.y;
  const length=Math.hypot(dx,dy);
  if(Number.isFinite(length)&&length>Math.max(SQRT_EPSILON,deadZone))
    return {x:dx/length,y:dy/length};
  const oldLength=Math.hypot(fallback.x,fallback.y);
  return oldLength>SQRT_EPSILON&&Number.isFinite(oldLength)
    ?{x:fallback.x/oldLength,y:fallback.y/oldLength}:{x:1,y:0};
}

/** Curved paired arms make the spinning leaf read as a sharp V-boomerang. */
export function boomerangWingOffset(
  dir:PlantPoint,rotation:number,wing:-1|1,progress:number,scale=1
):PlantPoint {
  const t=Math.max(0,Math.min(1,progress));
  const a=Math.atan2(dir.y,dir.x)+rotation;
  const ca=Math.cos(a),sa=Math.sin(a);
  const forward=(13-28*t+Math.sin(t*Math.PI)*3)*scale;
  const side=wing*(2+25*t-2*t*t)*scale;
  return {x:ca*forward-sa*side,y:sa*forward+ca*side};
}
