import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';

const source=readFileSync(new URL('../src/combatMovement.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{
  compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}
}).outputText;
const m=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const circle={x:480,y:328,radius:153};
const r=17;
assert.deepEqual(m.insideBattleCircle(480,455,r,circle),{x:480,y:455});
let p=m.insideBattleCircle(480,0,21,circle);
assert(Math.abs(Math.hypot(p.x-480,p.y-328)-(153-21-2))<1e-8);
p=m.insideBattleCircle(990,990,38,circle);
assert(Math.hypot(p.x-480,p.y-328)<=153-38-2+1e-9);
assert.deepEqual(m.insideBattleCircle(480,328,500,circle),{x:480,y:328});
assert.equal(m.tackleDistance(900,17,21),36);
assert.equal(m.tackleDistance(17+21+5,17,21),0);
assert.equal(m.tackleDistance(17+21+23,17,21),18);
assert(m.tacklePosition(0.1)<0,'windup moves back only a few pixels');
assert(Math.abs(m.tacklePosition(0.62)-1)<1e-8,'contact at short peak');
assert(m.tacklePosition(1)<0.1,'no long-distance forward teleport');
assert.equal(m.dodgePosition(0),0);
assert.equal(m.dodgePosition(1),1);
for(let n=0;n<100;n++){
 const t=n/100;
 assert(m.dodgePosition(t+0.01)>=m.dodgePosition(t),'dash moves continuously');
 const u=m.tacklePosition(t);
 assert(u>=-0.11&&u<=1.001,'headbutt stays inside small lunge');
}
assert.equal(m.DODGE_DISTANCE,66);
console.log('Boundary, headbutt and dodge checks passed.');
