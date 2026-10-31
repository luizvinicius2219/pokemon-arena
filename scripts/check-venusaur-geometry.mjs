/**
 * Pure geometry and integration regressions for Venusaur.
 * Run in Node 22 with --experimental-strip-types: no browser or Phaser needed.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {flowerCenter,flowerMuzzle,vineRoot,aimAtPoint,boomerangWingOffset}
  from '../src/venusaurGeometry.ts';

const epsilon=1e-9;
const vectors=[
  [0,1],[-1,1],[-1,0],[-1,-1],
  [0,-1],[1,-1],[1,0],[1,1]
];
const feet={x:250,y:290};
for(const [x,y] of vectors){
  const magnitude=Math.hypot(x,y);
  const dir={x:x/magnitude,y:y/magnitude};
  const flower=flowerCenter(feet);
  const target={x:flower.x+dir.x*390,y:flower.y+dir.y*390};
  const aim=aimAtPoint(flower,target,{x:1,y:0});
  const muzzle=flowerMuzzle(feet,aim);
  // The cursor, emission nozzle and finite collision ray are collinear.
  const ray={x:target.x-muzzle.x,y:target.y-muzzle.y};
  const cross=ray.x*aim.y-ray.y*aim.x;
  assert.ok(Math.abs(cross)<epsilon,'Solar ray misses cursor for '+x+','+y);
  assert.ok(ray.x*aim.x+ray.y*aim.y>0,'Beam points away from mouse cursor');
  assert.ok(Math.abs(Math.hypot(aim.x,aim.y)-1)<epsilon,'Aim is not normalized');
  const leftRoot=boomerangWingOffset(dir,0,-1,0);
  const rightRoot=boomerangWingOffset(dir,0,1,0);
  const leftTip=boomerangWingOffset(dir,0,-1,1);
  const rightTip=boomerangWingOffset(dir,0,1,1);
  assert.ok(Math.hypot(leftRoot.x-rightRoot.x,leftRoot.y-rightRoot.y)<6,
    'Boomerang arms do not join at the nose');
  assert.ok(Math.hypot(leftTip.x-rightTip.x,leftTip.y-rightTip.y)>40,
    'Boomerang does not have an open V-shaped silhouette');
  const spun=boomerangWingOffset(dir,Math.PI/2,1,1);
  assert.ok(Math.hypot(rightTip.x-spun.x,rightTip.y-spun.y)>15,
    'Boomerang is not spinning');
}
assert.deepEqual(vineRoot(feet),{x:250,y:269},
  'Vine must emerge inside the shoulders of the character');
feet.x+=22;feet.y-=13;
assert.deepEqual(vineRoot(feet),{x:272,y:256},
  'Vine root must move with Venusaur on recoil');
const previous={x:-1,y:0};
assert.deepEqual(aimAtPoint(flowerCenter(feet),flowerCenter(feet),previous),previous,
  'Close cursor should keep the last safe direction');
assert.deepEqual(aimAtPoint(flowerCenter(feet),{x:NaN,y:50},previous),previous,
  'Invalid pointer coordinates should not poison aim');

const arena=readFileSync('src/arena.ts','utf8');
const fx=readFileSync('src/venusaurFx.ts','utf8');
const motion=readFileSync('src/overworld.ts','utf8');
for(const [name,ok] of [
  ['manual mouse aim during both solar phases',arena.includes(
    'nextDir=aimAtPoint(flowerCenter(caster)')],
  ['same direction used for displayed beam and hitbox',
    arena.includes('rayHitsBody(state.origin,state.direction')&&
    fx.includes('const {x:dx,y:dy}=cue.direction')],
  ['no enemy autoaim on player solar',
    arena.includes('pointer.worldX,y:pointer.worldY')],
  ['solar reticle projected on collision ray',
    fx.includes('private drawSolarGuide(')&&
    fx.includes('const projection=(point.x-x)*dx+(point.y-y)*dy')],
  ['live body vine emission',arena.includes('this.venusaurFx.whip(caster,dir,time')&&
    fx.includes('const root=vineRoot(cue.body)')],
  ['same vine origin for damage check',
    arena.includes('const root=vineRoot(caster);')&&
    arena.includes('rayHitsBody(root,dir')],
  ['boomerang-shaped rotating leaves',
    fx.includes('this.boomerang(x,y,dx,dy,spin,1.0)')],
  ['solar charge and shoot resist hurt animation',
    motion.includes('const uninterruptibleSolar=')&&
    motion.includes("this.actionDuration>=700")],
  ['recoil cannot interrupt charge',
    !arena.includes('this.lastHitAt[side]>state.startAt')]
]){
  assert.ok(ok,'VENUSAUR GEOMETRY: '+name);
}
console.log('VENUSAUR GEOMETRY OK: 8 directions, cursor ray, boomerang shape and live vine anchors.');
