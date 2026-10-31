// Regressions: fullscreen letterbox gutters, browser mouse navigation,
// intentional right-click movement, restored Razor Leaf and thinner Vine Whip.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {insideGameCanvas} from '../src/pointerBounds.ts';
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
    arena.includes('insideGameCanvas(p.x,p.y,mouse.clientX,mouse.clientY')&&
    arena.includes('this.game.canvas.getBoundingClientRect(),W,H')],
  ['world ignores right-click routes beyond canvas',
    world.includes('insideGameCanvas(pointer.x,pointer.y,')&&
    world.includes('this.game.canvas.getBoundingClientRect()')],
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
// The fullscreen gutters are outside the CSS canvas even if Phaser retains
// a stale/clamped world coordinate while the right mouse button is held.
const rect={left:60,top:20,right:1860,bottom:1100};
for(const [x,y,cx,cy,inside] of [
  [480,288,900,560,true],
  [0,0,60,20,true],
  [960,576,1860,1100,true],
  [480,288,59,560,false],
  [480,288,1861,560,false],
  [480,288,900,19,false],
  [480,288,900,1101,false],
  [-1,288,900,560,false],
  [961,288,900,560,false],
  [480,577,900,560,false],
  [480,288,NaN,560,false]
]){
  assert.equal(insideGameCanvas(x,y,cx,cy,rect),inside,
    'Game canvas bounds regression at '+[x,y,cx,cy]);
}
console.log('Fullscreen input, right-click canvas limits, restored Razor Leaf and thin Vine Whip: OK');
