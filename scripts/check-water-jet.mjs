import assert from 'node:assert/strict';
import {beginMatch,advanceMatch,clearMatch,currentMatch,activeMatchPokemon} from '../src/battleSetup.ts';
import {JET_SPECS,jetCollisionDistance,normalizedJetDirection,visibleJetLength} from '../src/waterJet.ts';

function checkJets(){
  assert.equal(JET_SPECS.gun.durationMs>1100,true);
  assert.equal(JET_SPECS.hydro.radius>JET_SPECS.gun.radius,true);
  assert.equal(JET_SPECS.gun.endDamage,0);
  assert.deepEqual(normalizedJetDirection({x:0,y:0}),{x:1,y:0});
  assert.equal(jetCollisionDistance({x:0,y:0},{x:1,y:0},{x:160,y:0},400,25),135);
  assert.equal(jetCollisionDistance({x:0,y:0},{x:1,y:0},{x:-160,y:0},400,25),null);
  assert.equal(jetCollisionDistance({x:0,y:0},{x:1,y:0},{x:160,y:100},400,25),null);
  assert.equal(jetCollisionDistance({x:0,y:0},{x:1,y:0},{x:500,y:0},400,25),null);
  assert.equal(jetCollisionDistance({x:0,y:0},{x:1,y:0},{x:0,y:0},400,25),0);
  assert.equal(visibleJetLength(410,135),149);
  assert.equal(visibleJetLength(410,null),410);
}
function checkRounds(){
  clearMatch();
  const player=['charizard','blastoise','venusaur'];
  const session=beginMatch(player,'pewter','quick');
  assert.equal(session.playerIndex,0);
  assert.equal(session.enemyIndex,0);
  assert.equal(advanceMatch('enemy'),'next');
  assert.equal(currentMatch().enemyIndex,1);
  assert.equal(activeMatchPokemon().player,'charizard');
  assert.equal(advanceMatch('player'),'next');
  assert.equal(currentMatch().playerIndex,1);
  assert.equal(activeMatchPokemon().player,'blastoise');
  assert.equal(advanceMatch('enemy'),'next');
  assert.equal(advanceMatch('enemy'),'victory');
  assert.equal(currentMatch().enemyIndex,3);
  clearMatch();
  beginMatch(player,'classic','quick');
  assert.equal(advanceMatch('player'),'next');
  assert.equal(advanceMatch('player'),'next');
  assert.equal(advanceMatch('player'),'defeat');
  clearMatch();
  const story=beginMatch(['charizard','blastoise','venusaur','raichu','fearow','raticate'],'classic','story','brock');
  assert.equal(story.enemy.length,2);
  assert.equal(advanceMatch('enemy'),'next');
  assert.equal(advanceMatch('enemy'),'victory');
  clearMatch();
}
checkJets();
checkRounds();
console.log('Water jet geometry and 3x3/6-Pokemon KO transitions passed.');
