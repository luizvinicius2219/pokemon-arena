/** World-space geometry and timing for continuous water attacks.
 * No Phaser dependency: these rules are shared by visual playback and hit tests.
 */
export interface JetPoint {readonly x:number;readonly y:number}
export type JetType='gun'|'hydro';

export interface JetSpec {
  readonly durationMs:number;
  readonly reach:number;
  readonly radius:number;
  readonly hitEveryMs:number;
  readonly tickDamage:number;
  readonly endDamage:number;
}

export const JET_SPECS:Readonly<Record<JetType,JetSpec>>={
  gun:{
    durationMs:1400,
    reach:410,
    radius:13,
    hitEveryMs:240,
    tickDamage:4,
    endDamage:0
  },
  hydro:{
    durationMs:1550,
    reach:520,
    radius:30,
    hitEveryMs:280,
    tickDamage:6,
    endDamage:8
  }
};

export function normalizedJetDirection(direction:JetPoint):JetPoint{
  const length=Math.hypot(direction.x,direction.y);
  return length>0.00001
    ?{x:direction.x/length,y:direction.y/length}
    :{x:1,y:0};
}

/** Distance from nozzle to the near edge of the target circle, or null.
 * Exact ray/circle collision prevents a continuous jet from hitting targets
 * behind the nozzle or off the beam axis.
 */
export function jetCollisionDistance(
  nozzle:JetPoint,direction:JetPoint,target:JetPoint,
  reach:number,targetRadius:number
):number|null{
  const dir=normalizedJetDirection(direction);
  const vx=nozzle.x-target.x,vy=nozzle.y-target.y;
  const b=2*(vx*dir.x+vy*dir.y);
  const c=vx*vx+vy*vy-targetRadius*targetRadius;
  const discriminant=b*b-4*c;
  if(discriminant<0)return null;
  const root=Math.sqrt(discriminant);
  const near=(-b-root)*0.5;
  const far=(-b+root)*0.5;
  if(far<0)return null;
  const contact=Math.max(0,near);
  return contact<=reach?contact:null;
}

export function visibleJetLength(reach:number,collisionDistance:number|null):number{
  return collisionDistance===null?reach:Math.min(reach,Math.max(38,collisionDistance+14));
}
