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


/**
 * A nine-blade razor-leaf volley: three narrow lanes and three staggered
 * waves. All blades travel in the manually aimed direction; there is NO
 * enemy tracking and the entire formation shares one damage hitbox.
 */
export const RAZOR_VOLLEY_BLADE_COUNT=9;
export interface RazorVolleyBlade {
  forward:number;
  lateral:number;
  visible:boolean;
  scale:number;
  spin:number;
}
export function razorVolleyBlade(
  index:number,travelled:number,elapsedMs:number
):RazorVolleyBlade {
  const wave=Math.floor(index/3);
  const lane=index%3-1;
  const lag=wave*31+(lane===0?0:9);
  const lateral=lane*(11+wave*2)+
    Math.sin(elapsedMs*0.017+index*1.87)*3.0;
  return {
    forward:-lag,
    lateral,
    visible:travelled+3>=lag,
    scale:wave===0?0.78:wave===1?0.69:0.60,
    spin:elapsedMs*(index%2?0.025:-0.029)+index*1.33
  };
}
