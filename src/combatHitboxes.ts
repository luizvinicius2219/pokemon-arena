/** Combat hurtboxes measured from the actor's feet anchor, independent
 * of its small movement/collision circle. Pure geometry, browser-free.
 */
export interface HitPoint {readonly x:number;readonly y:number}
export interface Hurtbox {readonly x:number;readonly y:number;readonly radius:number}
export type CombatSpecies='blastoise'|'venusaur'|'charizard'|'raichu'|'raticate'|'fearow'|'onix'|'geodude'|string;
const BODY:Readonly<Record<string,readonly [number,number,number]>>={
  blastoise:[0,-48,30],venusaur:[0,-35,34],charizard:[0,-43,30],
  raichu:[0,-27,20],raticate:[0,-25,21],fearow:[0,-33,23],
  onix:[0,-57,39],geodude:[0,-23,25]
};
export function combatHurtboxes(species:CombatSpecies,feet:HitPoint,footRadius:number):Hurtbox[]{
  const [offsetX,offsetY,bodyRadius]=BODY[species]??[0,-Math.max(18,footRadius*1.08),Math.max(14,footRadius*0.95)];
  return [
    {x:feet.x+offsetX,y:feet.y+offsetY,radius:bodyRadius},
    {x:feet.x,y:feet.y-Math.min(17,footRadius*0.75),radius:Math.max(12,footRadius*0.9)}
  ];
}
export function circleIntersectsBody(point:HitPoint,attackRadius:number,body:readonly Hurtbox[]):boolean{
  return body.some(b=>Math.hypot(point.x-b.x,point.y-b.y)<=attackRadius+b.radius);
}
export function segmentIntersectsCircle(a:HitPoint,b:HitPoint,c:HitPoint,radius:number):boolean{
  const dx=b.x-a.x,dy=b.y-a.y;
  const len2=dx*dx+dy*dy;
  const t=len2>0?Math.max(0,Math.min(1,((c.x-a.x)*dx+(c.y-a.y)*dy)/len2)):0;
  return Math.hypot(a.x+t*dx-c.x,a.y+t*dy-c.y)<=radius;
}
export function sweptProjectileHitsBody(a:HitPoint,b:HitPoint,attackRadius:number,body:readonly Hurtbox[]):boolean{
  return body.some(hit=>segmentIntersectsCircle(a,b,hit,hit.radius+attackRadius));
}
export function rayHitsBody(origin:HitPoint,direction:HitPoint,reach:number,beamRadius:number,body:readonly Hurtbox[]):boolean{
  const len=Math.hypot(direction.x,direction.y)||1;
  const target={x:origin.x+direction.x/len*reach,y:origin.y+direction.y/len*reach};
  return sweptProjectileHitsBody(origin,target,beamRadius,body);
}
