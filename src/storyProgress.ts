/**
 * Chapter-one progress and story triggers are deliberately separate from
 * battle engine statistics. Replaying the gym is always possible in debug;
 * the journey gates the official challenge on a training encounter.
 */
export interface StoryProgress {
  version:1;
  metProfessor:boolean;
  visitedRoute:boolean;
  defeatedTrainer:boolean;
  enteredGym:boolean;
  trainingsWon:number;
  lastX:number;
  lastY:number;
}
const KEY='monster-arena-chapter-one';
const DEFAULT:StoryProgress={
  version:1,metProfessor:false,visitedRoute:false,
  defeatedTrainer:false,enteredGym:false,trainingsWon:0,
  lastX:190,lastY:425
};
export function loadStoryProgress():StoryProgress{
  try{
    const json=window.localStorage.getItem(KEY);
    if(!json)return{...DEFAULT};
    const parsed=JSON.parse(json) as Partial<StoryProgress>;
    if(parsed.version!==1)return{...DEFAULT};
    return {
      ...DEFAULT,
      metProfessor:parsed.metProfessor===true,
      visitedRoute:parsed.visitedRoute===true,
      defeatedTrainer:parsed.defeatedTrainer===true,
      enteredGym:parsed.enteredGym===true,
      trainingsWon:Number.isFinite(parsed.trainingsWon)
        ?Math.max(0,Math.min(999,Number(parsed.trainingsWon))):0,
      lastX:typeof parsed.lastX==='number'
        ?Math.max(48,Math.min(910,parsed.lastX)):190,
      lastY:typeof parsed.lastY==='number'
        ?Math.max(80,Math.min(500,parsed.lastY)):425
    };
  }catch{return{...DEFAULT};}
}
export function saveStoryProgress(data:StoryProgress):void{
  try{window.localStorage.setItem(KEY,JSON.stringify(data));}catch{
    // Browsers without storage still support a playable preview.
  }
}
export function updateStoryProgress(
  patch:Partial<Omit<StoryProgress,'version'>>
):StoryProgress{
  const state={...loadStoryProgress(),...patch};
  saveStoryProgress(state);
  return state;
}
export function registerTrainingVictory():StoryProgress{
  const state=loadStoryProgress();
  return updateStoryProgress({
    defeatedTrainer:true,
    trainingsWon:state.trainingsWon+1
  });
}
export function nextStoryObjective(p:StoryProgress):string{
  if(!p.metProfessor)return 'Converse com a pesquisadora na vila.';
  if(!p.visitedRoute)return 'Explore a grama alta na rota leste.';
  if(!p.defeatedTrainer)return 'Enfrente o treinador perto da rota.';
  return 'Treine mais ou visite o ginásio de Pewter.';
}
