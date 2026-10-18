export type Action = 'q'|'w'|'e'|'r'|'dodge';
export type Bindings = Record<Action,string>;
export const defaults: Bindings = {q:'KeyQ',w:'KeyW',e:'KeyE',r:'KeyR',dodge:'Space'};
const storageKey='monster-arena-controls-v1';
export function loadBindings(): Bindings {
  try {const data=JSON.parse(localStorage.getItem(storageKey)||'null');if(data && Object.keys(defaults).every(k=>typeof data[k]==='string') && new Set(Object.values(data)).size===5) return data as Bindings;}catch{}
  return {...defaults};
}
export function saveBindings(value:Bindings){localStorage.setItem(storageKey,JSON.stringify(value));}
export function assignBinding(current:Bindings,action:Action,key:string):{value:Bindings;error:string|null}{
  const duplicate=(Object.keys(current) as Action[]).find(a=>a!==action&&current[a]===key);
  if(duplicate)return {value:current,error:'Esta tecla já está atribuída a '+duplicate.toUpperCase()+'.'};
  return {value:{...current,[action]:key},error:null};
}
export function keyLabel(code:string){return code==='Space'?'Espaço':code.replace(/^Key/,'').replace(/^Digit/,'');}
