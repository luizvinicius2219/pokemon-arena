// Regressions: fullscreen letterbox gutters, browser mouse navigation,
// intentional right-click movement, restored Razor Leaf and thinner Vine Whip.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(path,'utf8');
const main=read('src/main.ts');
const css=read('src/style.css');
const arena=read('src/arena.ts');
const world=read('src/world.ts');
const fx=read('src/venusaurFx.ts');
const moves=read('src/abilities.ts');
for(const [name,condition] of [
  ['browser context menu blocked on entire game shell',
    main.includes("gameShell.addEventListener('contextmenu',event=>")&&
    main.includes("event.preventDefault();\n},{capture:true});")],
  ['auxiliary mouse clicks cancelled',
    main.includes("gameShell.addEventListener('auxclick',event=>")&&
    main.includes('event.button!==0')],
  ['browser back-forward mouse buttons intercepted',
    main.includes('event.button===3||event.button===4')&&
    main.includes('event.stopPropagation()')],
  ['trackpad scroll blocked only in fullscreen',
    main.includes("gameShell.addEventListener('wheel',event=>")&&
    main.includes("if(document.fullscreenElement===gameShell)event.preventDefault()")],
  ['fullscreen resize recalculates canvas scale',
    main.includes("window.addEventListener('resize',()=>")&&
    main.includes('game.scale.refresh()')],
  ['letterbox gutters constrained to viewport',
    css.includes('width:min(100vw, calc(100dvh * 5 / 3))!important')&&
    css.includes('overflow:hidden;overscroll-behavior:none')],
  ['fullscreen exit button hidden only while playing',
    css.includes('#game-shell:fullscreen:has(#landing-menu[hidden]):has(#ingame-pause[hidden])')&&
    css.includes('visibility:hidden;pointer-events:none')],
  ['keyboard F remains a deliberate fullscreen shortcut',
    main.includes("event.code==='KeyF'")],
  ['pause menu retains fullscreen control',
    main.includes("'#pause-fullscreen'")&&main.includes('toggleFullscreen()')],
  ['arena ignores right-click moves beyond canvas',
    arena.includes('!p.rightButtonDown()||!p.withinGame')&&
    arena.includes('p.x<0||p.x>W||p.y<0||p.y>H')],
  ['world ignores right-click routes beyond canvas',
    world.includes('!pointer.withinGame')&&
    world.includes('pointer.x<0||pointer.x>960')&&
    world.includes('pointer.y<0||pointer.y>576')],
  ['Razor Leaf restored to the prior three-boomerang version',
    fx.includes('this.boomerang(x,y,dx,dy,spin,1.0)')&&
    fx.includes('this.boomerang(x-dx*21+nx*(11+sway)')&&
    !fx.includes('RAZOR_VOLLEY_BLADE_COUNT')&&
    !moves.includes('rajada de nove')],
  ['Vine Whip slightly slimmer, still anchored on Venusaur',
    fx.includes('const root=vineRoot(cue.body)')&&
    fx.includes('t<0.16?9:7')&&
    fx.includes('LEAF_LIGHT:LEAF,4')],
  ['no combat balance change to Razor Leaf',
    moves.includes("cooldown:880,damage:14,element:'grass'")]
]){
  assert.ok(condition,'Regression failed: '+name);
}
console.log('Fullscreen input, right-click limits, restored Razor Leaf and thin Vine Whip: OK');
