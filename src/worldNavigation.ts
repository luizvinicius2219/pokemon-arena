/**
 * Short, deterministic pathfinding for mouse-only / hybrid PC movement.
 * Routes around the exact same static collision as WASD. Computes only when
 * clicking (never per animation frame) and creates no Phaser dependencies.
 */
export interface WorldPoint { readonly x:number; readonly y:number }
const STEP=20, COLS=45, ROWS=21, X0=42, Y0=88;
const index=(x:number,y:number)=>y*COLS+x;
const grid=(point:WorldPoint)=>({
  x:Math.max(0,Math.min(COLS-1,Math.round((point.x-X0)/STEP))),
  y:Math.max(0,Math.min(ROWS-1,Math.round((point.y-Y0)/STEP)))
});
const world=(x:number,y:number):WorldPoint=>({
  x:X0+x*STEP,y:Y0+y*STEP
});
/** Clicks on roofs are snapped to the closest reachable floor tile. */
export function findWalkingPath(
  from:WorldPoint,to:WorldPoint,
  blocked:(x:number,y:number)=>boolean
):WorldPoint[]{
  const start=grid(from),goal=grid(to);
  const isOpen=(x:number,y:number)=>x>=0&&x<COLS&&y>=0&&y<ROWS
    &&!blocked(world(x,y).x,world(x,y).y);
  if(!isOpen(start.x,start.y))return[];
  // Find a walkable tile next to a roof, wall or pond.
  if(!isOpen(goal.x,goal.y)){
    let bestX=-1,bestY=-1,best=Infinity;
    for(let radius=1;radius<11&&bestX<0;radius++){
      for(let y=goal.y-radius;y<=goal.y+radius;y++){
        for(let x=goal.x-radius;x<=goal.x+radius;x++){
          if(!isOpen(x,y))continue;
          const distance=Math.hypot(
            world(x,y).x-to.x,world(x,y).y-to.y);
          if(distance<best){
            best=distance;bestX=x;bestY=y;
          }
        }
      }
      if(bestX>=0){goal.x=bestX;goal.y=bestY;}
    }
    if(bestX<0)return[];
  }
  const count=COLS*ROWS;
  const g=new Float64Array(count).fill(Infinity);
  const previous=new Int32Array(count).fill(-1);
  const visited=new Uint8Array(count);
  const first=index(start.x,start.y),last=index(goal.x,goal.y);
  const open:number[]=[first];
  g[first]=0;
  const heuristic=(i:number)=>{
    const x=i%COLS,y=Math.floor(i/COLS);
    return Math.hypot(x-goal.x,y-goal.y);
  };
  while(open.length){
    let best=0,bestValue=Infinity;
    for(let j=0;j<open.length;j++){
      const f=g[open[j]]+heuristic(open[j]);
      if(f<bestValue){bestValue=f;best=j;}
    }
    const current=open.splice(best,1)[0];
    if(current===last)break;
    if(visited[current])continue;
    visited[current]=1;
    const cx=current%COLS,cy=Math.floor(current/COLS);
    for(const [dx,dy] of [[0,-1],[1,0],[0,1],[-1,0]]){
      const nx=cx+dx,ny=cy+dy;
      if(!isOpen(nx,ny))continue;
      const next=index(nx,ny);
      if(visited[next]||g[current]+1>=g[next])continue;
      g[next]=g[current]+1;
      previous[next]=current;
      open.push(next);
    }
  }
  if(first!==last&&previous[last]<0)return[];
  const points:WorldPoint[]=[];
  let step=last;
  while(step!==first){
    points.push(world(step%COLS,Math.floor(step/COLS)));
    step=previous[step];
    if(step<0)return[];
  }
  points.reverse();
  // Combine aligned cells into corner waypoints; characters no longer
  // stop at every tile while moving towards the clicked destination.
  const corners:WorldPoint[]=[];
  let lastDirection='';
  for(let i=0;i<points.length;i++){
    const current=points[i];
    const previousPoint=i===0?from:points[i-1];
    const nextPoint=points[i+1];
    const direction=nextPoint
      ?Math.sign(nextPoint.x-current.x)+','+
        Math.sign(nextPoint.y-current.y):'end';
    if(i===0||direction!==lastDirection||i===points.length-1){
      if(i>0)corners.push(previousPoint);
    }
    lastDirection=direction;
  }
  if(points.length)corners.push(points[points.length-1]);
  return corners.filter((p,i)=>i===0||
    Math.hypot(p.x-corners[i-1].x,p.y-corners[i-1].y)>1);
}
