import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source=readFileSync(new URL('../src/statStages.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{
  compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}
}).outputText;
const {makeStatStages,changeStatStage,stageMultiplier,accuracyChance,
  physicalDamageMultiplier}=await import(
    'data:text/javascript;base64,'+Buffer.from(js).toString('base64'));

const player=makeStatStages(),enemy=makeStatStages();
assert.equal(physicalDamageMultiplier(player,enemy),1);
assert.equal(changeStatStage(enemy,'attack',-1),-1,'Rosnar diminui o Ataque do rival');
assert.equal(physicalDamageMultiplier(enemy,player),2/3,
  'Rosnar reduz dano fisico causado pelo rival');
assert.equal(changeStatStage(enemy,'defense',-1),-1,'Abanar de Cauda reduz Defesa');
assert.equal(physicalDamageMultiplier(player,enemy),1.5,
  'Abanar de Cauda aumenta dano fisico recebido pelo rival');
assert.equal(changeStatStage(player,'defense',1),1,'Retirada aumenta Defesa');
assert.equal(physicalDamageMultiplier(enemy,player),4/9,
  'Retirada protege de ataques fisicos apos Rosnar');
assert.equal(changeStatStage(player,'accuracy',-1),-1);
assert.equal(accuracyChance(player),0.75,'Ataque de Areia reduz chance de acerto');
assert.equal(changeStatStage(player,'speed',-1),-1);
assert.equal(stageMultiplier(player.speed),2/3,
  'Tiro de Seda diminui velocidade de deslocamento');
assert.equal(changeStatStage(enemy,'attack',-99),-5);
assert.equal(enemy.attack,-6,'Estagios nao descem abaixo de -6');
assert.equal(changeStatStage(enemy,'attack',-1),0,'Sem modificacao alem do limite');
assert.equal(changeStatStage(enemy,'defense',100),7);
assert.equal(enemy.defense,6,'Estagios nao sobem acima de +6');
assert.deepEqual(makeStatStages(),{attack:0,defense:0,accuracy:0,speed:0});
console.log('Status moves: 14 assertions passed.');
