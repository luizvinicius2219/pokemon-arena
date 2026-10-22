import assert from 'node:assert/strict';
import {buildFracturePlan,FRACTURE_PRESETS} from '../src/groundFracturePattern.ts';
const small=buildFracturePlan(123,'small'),heavy=buildFracturePlan(123,'heavy'),ultimate=buildFracturePlan(123,'ultimate');
for(const plan of [small,heavy,ultimate]){
 const config=FRACTURE_PRESETS[plan.preset];
 assert.equal(plan.plates.length,config.plateCount);
 assert.equal(plan.faults.length,config.faultCount);
 assert.equal(plan.chips.length,config.chipCount);
 assert.ok(plan.faults.length<=3,'No radial spiderweb spokes');
 for(const p of [...plan.core,...plan.plates.flatMap(a=>a.points),...plan.faults.flat(),...plan.chips]){
   assert.ok(p.x>=0&&p.x<128&&p.y>=0&&p.y<80);
   assert.equal(p.x%2,0);
   assert.equal(p.y%2,0);
 }
}
assert.deepEqual(buildFracturePlan(321,'ultimate'),buildFracturePlan(321,'ultimate'));
assert.notDeepEqual(buildFracturePlan(322,'ultimate'),buildFracturePlan(321,'ultimate'));
console.log('Pixel-art ground fracture presets: small/heavy/ultimate OK');
