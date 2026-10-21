import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';

const source=readFileSync(new URL('../src/pewterCityLayout.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{
  module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022
}}).outputText;
const m=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const {pewterCityBlocked:blocked,inPewterGrass:grass,PEWTER_CITY:p}=m;
assert.equal(blocked(p.spawn.x,p.spawn.y),false,'Spawn on the plaza');
assert.equal(blocked(150,170),true,'Pokémon Center is solid');
assert.equal(blocked(150,237),false,'Pokémon Center entrance is free');
assert.equal(blocked(348,173),true,'House is solid');
assert.equal(blocked(354,238),false,'House entrance is free');
assert.equal(blocked(838,113),true,'Gym is solid');
assert.equal(blocked(838,196),false,'Gym entrance is free');
assert.equal(blocked(110,320),true,'Pond is not walkable');
assert.equal(blocked(180,364),false,'Bridge stays usable');
assert.equal(blocked(600,330),false,'Tall grass remains traversable');
assert.equal(grass(600,330),true);
assert.equal(grass(400,330),false);
assert.equal(blocked(457,250),true,'Grass fence has collision');
assert.equal(blocked(457,376),false,'Grass entrance stays open');
assert.equal(blocked(500,457),true,'Grass bottom fence is solid');
assert.equal(blocked(970,310),true,'Map has walls');
assert.equal(blocked(831,470),false,'Gym front walkway is open');
// Verify major interactions are reachable from the saved spawn through
// free paths (and not trapped by a roof, tree or decorative fence).
const step=10, cols=96, rows=58;
const valid=(cx,cy)=>!blocked(cx*step+5,cy*step+5);
const start=[Math.floor(p.spawn.x/step),Math.floor(p.spawn.y/step)];
const queue=[start], visited=new Set([start.join(',')]);
let at=0;
while(at<queue.length){
 const [x,y]=queue[at++];
 for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
  const a=x+dx,b=y+dy,key=a+','+b;
  if(a<0||a>=cols||b<0||b>=rows||visited.has(key)||!valid(a,b))continue;
  visited.add(key); queue.push([a,b]);
 }
}
for(const [name,x,y] of [['gym',835,235],['healing',149,260],
  ['trainer',347,404],['grass',510,350]]){
 const key=Math.floor(x/step)+','+Math.floor(y/step);
 assert(visited.has(key),name+' must be reachable from spawn');
}
console.log('Pewter map collision and route tests passed.');
