/** Pure geometry and timing for readable, non-teleporting pixel Pokémon combat. */
export interface BattleCircle { readonly x:number; readonly y:number; readonly radius:number; }

/** Keeps the complete collision body inside the visible battle circle. */
export function insideBattleCircle(
  x:number,y:number,bodyRadius:number,circle:BattleCircle
):{x:number;y:number}{
  const margin=2;
  const allowed=Math.max(0,circle.radius-Math.max(0,bodyRadius)-margin);
  const dx=x-circle.x,dy=y-circle.y;
  const distance=Math.hypot(dx,dy);
  if(distance<=allowed)return{x,y};
  if(distance<0.0001)return{x:circle.x,y:circle.y};
  const factor=allowed/distance;
  return {x:circle.x+dx*factor,y:circle.y+dy*factor};
}

export const TACKLE_MAX_DISTANCE=36;
export const TACKLE_DURATION_MS=355;
export const DODGE_DISTANCE=66;
export const DODGE_DURATION_MS=270;

/** The attack has only a short grounded lean forward; no map-wide dash. */
export function tackleDistance(
  distanceToEnemy:number,attackerRadius:number,defenderRadius:number
):number {
  const contactDistance=attackerRadius+defenderRadius+5;
  return Math.min(TACKLE_MAX_DISTANCE,Math.max(0,distanceToEnemy-contactDistance));
}

/** A brief anticipation, headbutt and recoil; final pose barely advances. */
export function tacklePosition(progress:number):number{
  const t=Math.max(0,Math.min(1,progress));
  if(t<0.20)return -0.10*Math.sin(t/0.20*Math.PI/2);
  if(t<0.62){
    const u=(t-0.20)/0.42;
    return 1-Math.pow(1-u,3);
  }
  const u=(t-0.62)/0.38;
  return 1-0.94*(u*u*(3-2*u));
}

/** Continuous, ease-out step: each intermediate point remains on the path. */
export function dodgePosition(progress:number):number{
  const t=Math.max(0,Math.min(1,progress));
  return 1-Math.pow(1-t,3);
}
