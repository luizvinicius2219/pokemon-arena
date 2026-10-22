import assert from 'node:assert/strict';
import {combatHurtboxes,circleIntersectsBody,sweptProjectileHitsBody,rayHitsBody} from '../src/combatHitboxes.ts';
const enemy=combatHurtboxes('blastoise',{x:750,y:288},25);
assert.equal(circleIntersectsBody({x:750,y:240},6,enemy),true,'Chest hits');
assert.equal(circleIntersectsBody({x:750,y:320},4,enemy),false,'Below feet misses');
assert.equal(circleIntersectsBody({x:750,y:140},8,enemy),false,'Above head misses');
assert.equal(rayHitsBody({x:250,y:238},{x:1,y:0},540,8,enemy),true,'Water at chest level');
assert.equal(rayHitsBody({x:250,y:110},{x:1,y:0},540,8,enemy),false,'Water above target');
assert.equal(sweptProjectileHitsBody({x:600,y:239},{x:850,y:239},5,enemy),true,'Fast projectile crossing sprite hits');
assert.equal(sweptProjectileHitsBody({x:600,y:140},{x:850,y:140},5,enemy),false,'Fast projectile misses outside sprite');
for(const species of ['raichu','raticate','fearow','charizard','venusaur','onix']){
 const boxes=combatHurtboxes(species,{x:420,y:330},20);
 assert.ok(boxes.length>=2);
 assert.ok(boxes[0].y<330);
}
console.log('Visual hurtbox and swept collision checks passed.');
