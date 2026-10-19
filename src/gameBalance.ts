/** Difficulty affects real combat numbers and encounter XP, not starter levels. */
export type Difficulty='relax'|'normal'|'challenge';
export interface DifficultyRules{
  name:string;
  enemyHp:number;
  enemyDamage:number;
  enemySpeed:number;
  experience:number;
  wildLevelBias:number;
}
const rules:Record<Difficulty,DifficultyRules>={
  relax:{name:'Casual',enemyHp:0.86,enemyDamage:0.78,enemySpeed:0.91,experience:1.20,wildLevelBias:-1},
  normal:{name:'Padrão',enemyHp:1,enemyDamage:1,enemySpeed:1,experience:1,wildLevelBias:0},
  challenge:{name:'Desafio',enemyHp:1.21,enemyDamage:1.25,enemySpeed:1.13,experience:0.90,wildLevelBias:1}
};
const KEY='monster-arena-difficulty-v1';
export function loadDifficulty():Difficulty{
  try{
    const saved=window.localStorage.getItem(KEY);
    if(saved==='relax'||saved==='normal'||saved==='challenge')return saved;
  }catch{}
  return 'normal';
}
export function saveDifficulty(difficulty:Difficulty):void{
  try{window.localStorage.setItem(KEY,difficulty);}catch{}
}
export function difficultyRules(difficulty:Difficulty=loadDifficulty()):DifficultyRules{
  return rules[difficulty];
}
