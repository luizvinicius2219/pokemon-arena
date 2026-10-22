import Phaser from 'phaser';
import { Action, Bindings, defaults, loadBindings, saveBindings, assignBinding, keyLabel } from './controls';
import { allActions,dodge,skills,type Fighter } from './abilities';
import { getTrainingSetup,setTrainingSetup } from './trainingSetup';
import { pokemonCatalog } from './pokemonCatalog';
import { beginMatch,currentMatch,clearMatch,activeMatchPokemon,selectablePokemon,challenges,arenaNames,type ArenaId } from './battleSetup';
import { loadDifficulty,saveDifficulty } from './gameBalance';
import { ArenaScene } from './arena';
import { WorldScene } from './world';
import {loadCollection,getActivePokemon} from './playerCollection';
import { MobileControls } from './mobileControls';
import type { GameMode } from './story';
import './style.css';

const app = document.querySelector<HTMLDivElement>('#app')!;
let bindings: Bindings = loadBindings();
let capturing: Action | null = null;
let menuOpen = false;
let pauseOpen=false;
let gameMode:GameMode='training';
let battleKind:'quick'|'story'='quick';
let chosenTrainer='brock';
let arenaSelection:ArenaId|'random'='random';
let teamSelection:Fighter[]=[];
let mainMenuOpen=true;

const heldKeys = new Set<string>();

const labels: Record<Action, string> = {
  q: 'Habilidade 1', w: 'Habilidade 2', e: 'Habilidade 3', r: 'Especial', dodge: 'Esquiva'
};

const selectedSpecies = () =>
  currentMatch()?activeMatchPokemon().player:gameMode==='training'?getTrainingSetup().player:
    getActivePokemon(loadCollection()).species;
const cardHTML = (action: Action): string => {
  const skill = action === 'dodge' ? dodge : skills[selectedSpecies()][action];
  return `<div class="skill-card ${action === 'r' ? 'ultimate' : ''}" data-action="${action}" title="${skill.description}">
    <span class="skill-key" data-key>${keyLabel(bindings[action])}</span>
    <span class="skill-icon">${skill.icon}</span>
    <span class="skill-name">${skill.name}</span>
    <span class="skill-timer" data-timer>PRONTO</span>
    <span class="skill-shade" data-shade></span>
  </div>`;
};

app.innerHTML = `
<header><div><h1>MONSTER <span>ARENA</span></h1><p>Batalhas offline em tempo real</p></div><div class="header-actions"><button id="fullscreen-header" type="button" title="Expandir a área do jogo (F)">⛶ Tela cheia</button><button id="switch-mode" type="button">☰ Menu</button><button id="gym-preview" type="button" hidden title="Atalho para testes">🪨 Testar Brock</button><button id="settings" type="button">⚙ Controles</button></div></header>
<main>
  <div class="arena-column">
    <div id="game-shell">
      <div id="game" aria-label="Área do jogo"></div>
      <button id="ingame-menu-button" class="ingame-menu-button" type="button" aria-label="Abrir menu de pausa">☰ Pausa</button>
      <div id="ingame-pause" class="ingame-pause" hidden role="dialog" aria-modal="true" aria-label="Menu de pausa"><section class="ingame-pause-card"><h2>JOGO PAUSADO</h2><p>Retome, ajuste os controles ou volte ao menu sem sair da tela cheia.</p><button id="pause-resume" type="button">▶ Continuar</button><button id="pause-settings" type="button">⚙ Controles</button><button id="pause-fullscreen" type="button">⛶ Alternar tela cheia</button><button id="pause-quit" type="button">↩ Menu principal</button></section></div>
      <button id="toggle-fullscreen" class="game-fullscreen-button" type="button" aria-label="Entrar em tela cheia" title="Tela cheia (F)">⛶ Tela cheia</button>
      <div id="landing-menu" class="landing-menu" role="dialog" aria-modal="true" aria-label="Menu do jogo">
        <section class="landing-card" data-menu-panel="home">
          <span class="landing-eyebrow">BATALHAS EM TEMPO REAL · OFFLINE</span>
          <h2>MONSTER <em>ARENA</em></h2>
          <p class="landing-lead">Escolha uma modalidade e entre em combate. Sem níveis, evolução, mapas ou captura.</p>
          <div class="landing-modes battle-home-modes">
            <button class="landing-mode" type="button" data-quick-training><span class="mode-icon">⚡</span><strong>TREINAMENTO RÁPIDO</strong><small>Charizard contra Raichu · começar imediatamente</small></button>
            <button class="landing-mode" type="button" data-start-arena><span class="mode-icon">⚔</span><strong>BATALHA LIVRE</strong><small>Selecione 3 Pokémon e escolha a arena</small></button>
            <button class="landing-mode" type="button" data-start-challenges><span class="mode-icon">🏆</span><strong>DESAFIOS DE TREINADORES</strong><small>Equipe de 6 Pokémon · ginásios e personagens</small></button>
            <button class="landing-mode mode-coming-soon" type="button" disabled><span class="mode-icon">🌐</span><strong>MULTIPLAYER ONLINE</strong><small>Em desenvolvimento</small></button>
          </div>
          <p class="landing-note">Todos os Pokémon estão prontos para lutar. Não é necessário ganhar XP.</p>
        </section>
        <section class="landing-card" data-menu-panel="arena" hidden><span class="landing-eyebrow">ARENA OFFLINE · CPU</span><h2>MONTE SUA <em>EQUIPE</em></h2><p class="landing-lead">Escolha Pokémon e lute em arenas clássicas.</p><div class="arena-mode-buttons"><button type="button" data-kind="quick">⚔ BATALHA 3x3</button><button type="button" data-kind="story">🏆 DESAFIOS 6 POKÉMON</button></div><label id="trainer-choice">TREINADOR<select id="arena-trainer"></select></label><p id="team-count"></p><div id="team-grid" class="arena-pokemon-grid"></div><label>ARENA<select id="arena-choice"><option value="random">🎲 Aleatória</option><option value="classic">Arena clássica</option><option value="pewter">Ginásio do Brock</option><option value="safari">Campo Safari</option></select></label><p id="arena-detail" class="landing-note"></p><button id="start-match" type="button" class="landing-primary">⚔ COMEÇAR PARTIDA</button><button type="button" class="landing-secondary" data-menu-back>← MENU PRINCIPAL</button></section>
      </div>
      <div id="battle-summary" class="battle-summary" hidden role="dialog" aria-modal="true" aria-labelledby="battle-summary-title">
        <section class="battle-summary-card">
          <div class="battle-summary-header">
            <h2 id="battle-summary-title" data-battle-title>VITÓRIA!</h2>
            <span class="battle-summary-rank" data-battle-rank>A</span>
          </div>
          <p class="battle-summary-time" data-battle-time>TEMPO 00:00</p>
          <div class="battle-summary-grid">
            <span>Dano causado</span><strong data-battle-dealt>0</strong>
            <span>Dano recebido</span><strong data-battle-taken>0</strong>
            <span>Acertos</span><strong data-battle-hits>0</strong>
            <span>Maior combo</span><strong data-battle-combo>0</strong>
            <span>Esquivas usadas</span><strong data-battle-dodges>0</strong>
            <span>Golpes evitados</span><strong data-battle-evades>0</strong>
          </div>
          <p class="battle-summary-record" data-battle-record></p>
          <button type="button" class="battle-summary-rematch" data-battle-rematch>↻ Jogar novamente</button>
          <button type="button" class="battle-summary-rematch" data-return-story hidden>↩ Voltar à Zona Safari</button>
        </section>
      </div>
      <div id="mobile-controls" aria-label="Controle virtual para celular">
        <div class="touch-joystick">
          <div class="touch-stick" data-touch-stick aria-label="Joystick de movimentação">
            <div class="touch-stick-ring"></div>
            <div class="touch-knob" data-stick-knob><span></span></div>
          </div>
          <span class="touch-move-label">MOVER</span>
        </div>
        <div class="touch-actions" aria-label="Habilidades de combate">
          ${allActions.map(action=>{
            const slot=action==='dodge'?'↗':String(['q','w','e','r'].indexOf(action)+1);
            const label=action==='dodge'?'Esquiva':`Habilidade ${slot}`;
            return `<button type="button" class="touch-skill touch-${action}" data-touch-action="${action}" aria-label="${label}">
              <span class="touch-skill-shade" data-touch-shade></span>
              <span class="touch-skill-number">${slot}</span>
              <span class="touch-skill-caption">${action==='dodge'?'DASH':'SKILL'}</span>
              <span class="touch-skill-timer" data-touch-timer></span>
            </button>`;
          }).join('')}
        </div>
        <button type="button" class="touch-restart" data-touch-restart hidden>↻ Jogar novamente</button>
      </div>
    </div>
    <div id="hud" class="hud" aria-label="Habilidades e tempos de recarga">
      ${allActions.map(cardHTML).join('')}
    </div>
    <div class="arena-hint"><span class="desktop-hint">WASD ou setas para andar · E para conversar · Treinadores iniciam batalhas</span><span class="mobile-hint">Joystick: andar · botão INTERAGIR: conversar ou batalhar</span></div>
  </div>
  <aside>
    <h2>Como jogar</h2>
    <p>🖱️ Clique direito: mover</p><p>🎯 Mire com o cursor</p>
    <p id="player-character-help">🔥 Q W E R: habilidades de Charizard</p><p>💨 Espaço: esquiva</p>
    <h3>Habilidades</h3>
    <div id="player-skill-help">${(['q','w','e','r'] as const).map(a=>`<p class="skill-help"><b>${a.toUpperCase()}</b> — ${skills.charizard[a].name} <small>${(skills.charizard[a].cooldown/1000).toFixed(1)}s</small></p>`).join('')}</div>
    <p class="help-footnote" data-enemy-help>Adversários possuem golpes próprios e são controlados pelo computador.</p>
    <p class="help-footnote">Animações em 8 direções: <a href="https://sprites.pmdcollab.org/" target="_blank" rel="noopener noreferrer">PMD Sprite Repository</a>. Créditos e direitos no <a href="https://github.com/luizvinicius2219/pokemon-arena/blob/main/CREDITS.md" target="_blank" rel="noopener noreferrer">projeto</a>.</p>
  </aside>
</main>
<div id="modal" class="hidden" role="dialog" aria-modal="true" aria-labelledby="settings-title">
  <section><h2 id="settings-title">Configurar controles</h2>
    <p>Escolha a habilidade e pressione uma tecla para remapear.</p>
    <div id="bindings"></div><p id="error" aria-live="polite"></p>
    <div class="modal-actions"><button id="restore" type="button">Restaurar padrões</button><button id="close" type="button">Fechar</button></div>
  </section>
</div>`;

const modal = document.querySelector<HTMLDivElement>('#modal')!;
document.querySelector<HTMLElement>('#game-shell')!.append(modal);
const bindingList = document.querySelector<HTMLDivElement>('#bindings')!;
const error = document.querySelector<HTMLParagraphElement>('#error')!;
const mobile = new MobileControls(document.querySelector<HTMLElement>('#mobile-controls')!);
mobile.setAbilityNames('charizard');

function refreshActivePokemonInfo(){
  const species=selectedSpecies();
  document.querySelector<HTMLElement>('#hud')!.innerHTML=
    allActions.map(cardHTML).join('');
  const heading=document.querySelector<HTMLElement>('#player-character-help');
  if(heading)heading.textContent='Q W E R: habilidades de '+
    pokemonCatalog[species].name;
  const help=document.querySelector<HTMLElement>('#player-skill-help');
  if(help)help.innerHTML=(['q','w','e','r'] as const).map(action=>{
    const move=skills[species][action];
    return '<p class="skill-help"><b>'+action.toUpperCase()+
      '</b> — '+move.name+' <small>'+
      (move.cooldown/1000).toFixed(1)+'s</small></p>';
  }).join('');
  mobile.setAbilityNames(species);
  const rivalHelp=document.querySelector<HTMLElement>('[data-enemy-help]');
  if(rivalHelp)rivalHelp.textContent=gameMode==='training'
    ?'O adversário '+pokemonCatalog[getTrainingSetup().rival].name+
      ' usa ataques e animações próprios.'
    :'Golpes selvagens possuem padrões próprios; Pedra e Solo dominam o ginásio.';
  const world=gameMode==='world';
  document.querySelector<HTMLElement>('#hud')!.hidden=world;
  const touches=document.querySelector<HTMLElement>('.touch-actions');
  if(touches)touches.style.display=world?'none':'';
  const aside=document.querySelector<HTMLElement>('aside');
  if(aside)aside.hidden=world;
  const gym=document.querySelector<HTMLButtonElement>('#gym-preview');
  if(gym)gym.hidden=true;
  const hint=document.querySelector<HTMLElement>('.arena-hint');
  if(hint){
    const desktop=hint.querySelector<HTMLElement>('.desktop-hint');
    const touch=hint.querySelector<HTMLElement>('.mobile-hint');
    if(desktop)desktop.textContent=world
      ?'WASD / setas ou botão direito: andar · E: interagir · F: tela cheia'
      :'Clique direito: mover · Q W E R: habilidades · Espaço: esquiva · F: tela cheia';
    if(touch)touch.textContent=world
      ?'Joystick: explorar · Botão TREINAR no mato alto · Ginásio livre'
      :'Joystick: andar · 1–4: habilidades · ↗: esquiva';
  }
}

window.addEventListener('monster-arena:team-switch',()=>refreshActivePokemonInfo());

function updateBindingLabels() {
  for (const action of allActions) {
    const key = document.querySelector<HTMLElement>(`[data-action="${action}"] [data-key]`);
    if (key) key.textContent = keyLabel(bindings[action]);
  }
}
function renderBindings() {
  bindingList.replaceChildren();
  for (const action of allActions) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = `${labels[action]} — ${capturing === action ? 'Pressione uma tecla...' : keyLabel(bindings[action])}`;
    button.onclick = () => { capturing = action; error.textContent = ''; renderBindings(); };
    bindingList.append(button);
  }
}
function toggleSettings(open: boolean) {
  menuOpen = open;
  capturing = null;
  heldKeys.clear();
  mobile.clear();
  modal.classList.toggle('hidden', !open);
  if(open)document.querySelector<HTMLElement>('#ingame-pause')!.hidden=true;
  else if(pauseOpen)document.querySelector<HTMLElement>('#ingame-pause')!.hidden=false;
  error.textContent = '';
  renderBindings();
}
document.querySelector('#settings')!.addEventListener('click', () => toggleSettings(true));
document.querySelector('#close')!.addEventListener('click', () => toggleSettings(false));
document.querySelector('#restore')!.addEventListener('click', () => {
  bindings = { ...defaults }; saveBindings(bindings); updateBindingLabels();
  error.textContent = 'Controles restaurados.'; renderBindings();
});

window.addEventListener('keydown', event => {
  if (capturing) {
    event.preventDefault();
    if (['Escape','Tab','ControlLeft','ControlRight','AltLeft','AltRight','MetaLeft','MetaRight'].includes(event.code)) {
      capturing = null; renderBindings(); return;
    }
    const result = assignBinding(bindings, capturing, event.code);
    if (result.error) error.textContent = result.error;
    else {
      bindings = result.value; saveBindings(bindings); updateBindingLabels();
      capturing = null; error.textContent = 'Tecla salva!';
    }
    renderBindings(); return;
  }
  if (menuOpen) { if (event.code === 'Escape') toggleSettings(false); return; }
  if(event.code==='Escape'&&!mainMenuOpen){event.preventDefault();setPaused(!pauseOpen);return;}
  if(pauseOpen)return;
  if(mainMenuOpen)return;
  // In the overworld W is WALK UP, not battle ability #2. Phaser handles
  // WASD and the arrow keys; this listener only prevents page scrolling.
  if(gameMode==='world'){
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(event.code))
      event.preventDefault();
    return;
  }
  if (Object.values(bindings).includes(event.code)) {
    event.preventDefault();
    heldKeys.add(event.code);
  }
}, true);
window.addEventListener('keyup', event => heldKeys.delete(event.code));
window.addEventListener('blur', () => heldKeys.clear());

const landing=document.querySelector<HTMLElement>('#landing-menu')!;
const panels=Array.from(document.querySelectorAll<HTMLElement>('[data-menu-panel]'));
function showPanel(panel:'home'|'arena'){
  panels.forEach(node=>node.hidden=node.dataset.menuPanel!==panel);
} // only battle first panels
function openMainMenu(){
  mainMenuOpen=true;
  setPaused(false);
  landing.hidden=false;
  mobile.clear();
  heldKeys.clear();
  document.querySelector<HTMLElement>('#battle-summary')!.hidden=true;
  if(game.scene.isActive('Arena'))game.scene.pause('Arena');
  renderBattleMenu();
  showPanel('home');
}
function startGameMode(nextMode:GameMode){
  mainMenuOpen=false;
  setPaused(false);
  landing.hidden=true;
  gameMode=nextMode;
  heldKeys.clear();
  mobile.clear();
  if(menuOpen)toggleSettings(false);
  document.querySelector<HTMLElement>('#battle-summary')!.hidden=true;
  const back=document.querySelector<HTMLButtonElement>('[data-return-story]');
  if(back)back.hidden=true;
  refreshActivePokemonInfo();
  game.scene.stop('World');
  game.scene.stop('Arena');
  game.scene.start(nextMode==='world'?'World':'Arena');
}

const game=new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 960,height:576,
  backgroundColor:'#142e31',
  render:{pixelArt:true,antialias:false,roundPixels:true},
  scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},
  scene:[
    new WorldScene(mobile,mode=>startGameMode(mode),
      ()=>mainMenuOpen||menuOpen||pauseOpen),
    new ArenaScene(
      ()=>bindings,()=>heldKeys,()=>menuOpen||pauseOpen,mobile,()=>gameMode
    )
  ]
});
function setPaused(open:boolean){
  pauseOpen=open&&!mainMenuOpen;
  document.querySelector<HTMLElement>('#ingame-pause')!.hidden=!pauseOpen;
  heldKeys.clear();mobile.clear();
  if(pauseOpen){
    if(game.scene.isActive('Arena'))game.scene.pause('Arena');
    if(game.scene.isActive('World'))game.scene.pause('World');
  }else if(!mainMenuOpen){
    if(game.scene.isPaused('Arena'))game.scene.resume('Arena');
    if(game.scene.isPaused('World'))game.scene.resume('World');
  }
}
document.querySelector<HTMLButtonElement>('#ingame-menu-button')!.addEventListener('click',()=>setPaused(!pauseOpen));
document.querySelector<HTMLButtonElement>('#pause-resume')!.addEventListener('click',()=>setPaused(false));
document.querySelector<HTMLButtonElement>('#pause-settings')!.addEventListener('click',()=>toggleSettings(true));
document.querySelector<HTMLButtonElement>('#pause-quit')!.addEventListener('click',()=>{clearMatch();openMainMenu();});
document.querySelector<HTMLButtonElement>('#pause-fullscreen')!.addEventListener('click',()=>{void toggleFullscreen();});
refreshActivePokemonInfo();
showPanel('home');

// Fullscreen applies to the entire game shell, so the scene, encounter menus
// and touch controls all remain visible. The canvas keeps its 5:3 aspect ratio.
const gameShell=document.querySelector<HTMLElement>('#game-shell')!;
const fullscreenButtons=[
  document.querySelector<HTMLButtonElement>('#toggle-fullscreen')!,
  document.querySelector<HTMLButtonElement>('#fullscreen-header')!
];
async function toggleFullscreen(){
  try{
    if(document.fullscreenElement)await document.exitFullscreen();
    else await gameShell.requestFullscreen();
  }catch(error){
    console.warn('Tela cheia indisponível neste navegador:',error);
  }
}
fullscreenButtons.forEach(button=>button.addEventListener('click',toggleFullscreen));
document.addEventListener('fullscreenchange',()=>{
  const active=document.fullscreenElement===gameShell;
  fullscreenButtons.forEach(button=>{
    button.textContent=active?'⤢ Sair da tela cheia':'⛶ Tela cheia';
    button.setAttribute('aria-label',active?'Sair da tela cheia':'Entrar em tela cheia');
    button.setAttribute('aria-pressed',String(active));
  });
  game.scale.refresh();
});
window.addEventListener('keydown',event=>{
  if(event.code==='KeyF'&&!event.repeat&&!capturing&&!menuOpen
    &&!['INPUT','SELECT','TEXTAREA'].includes(
      (document.activeElement?.tagName||'').toUpperCase())){
    event.preventDefault();
    void toggleFullscreen();
  }
});

document.querySelectorAll<HTMLSelectElement>('[data-difficulty]')
  .forEach(select=>select.addEventListener('change',()=>{
    const value=select.value;
    if(value==='relax'||value==='normal'||value==='challenge'){
      saveDifficulty(value);
      document.querySelectorAll<HTMLSelectElement>('[data-difficulty]')
        .forEach(other=>{other.value=value;});
    }
  }));

document.querySelector<HTMLButtonElement>('#switch-mode')!
  .addEventListener('click',()=>openMainMenu());
document.querySelector<HTMLButtonElement>('#gym-preview')!
  .addEventListener('click',()=>startGameMode('story'));
document.querySelectorAll<HTMLButtonElement>('[data-menu-back]')
  .forEach(button=>button.addEventListener('click',()=>showPanel('home')));
window.addEventListener('monster-arena:return-world',()=>{clearMatch();openMainMenu();});

function renderBattleMenu(){
 const limit=battleKind==='quick'?3:6;
 const c=challenges.find(c=>c.id===chosenTrainer);
 const remaining=limit-teamSelection.length;
 const tr=document.querySelector<HTMLSelectElement>('#arena-trainer')!;
 tr.innerHTML=challenges.map(c=>'<option value="'+c.id+'">'+c.name+' · '+c.city+'</option>').join('');
 tr.value=chosenTrainer;
 document.querySelector<HTMLElement>('#trainer-choice')!.hidden=battleKind==='quick';
 const arena=document.querySelector<HTMLSelectElement>('#arena-choice')!;
 arena.disabled=battleKind==='story';
 arena.value=battleKind==='story'?(c?.arena??'classic'):arenaSelection;
 document.querySelector<HTMLElement>('#team-count')!.textContent=
  'SUA EQUIPE: '+teamSelection.length+' / '+limit+(remaining>0?' • Escolha mais '+remaining:' • Pronto para lutar!');
 document.querySelector<HTMLElement>('#team-grid')!.innerHTML=selectablePokemon.map(id=>{
   const p=pokemonCatalog[id],number=teamSelection.indexOf(id)+1;
   const portrait=id==='blastoise'
     ?'<span class="arena-pokemon-thumb blastoise-pixel-thumb" aria-hidden="true"></span>'
     :'<img class="arena-pokemon-thumb" src="'+p.portrait+'" alt="" loading="lazy"/>';
   const slot=number?'<span class="arena-slot">'+number+'</span>':'';
   return '<button class="arena-pokemon-option '+(number?'selected':'')+
      '" type="button" data-select-pokemon="'+id+'" aria-pressed="'+Boolean(number)+'" aria-label="'+
      (number?'Remover ':'Selecionar ')+p.name+' da equipe">'+portrait+
      '<b>'+p.name+'</b><small>'+(number?'✓ Selecionado':'Toque para escolher')+
      '</small>'+slot+'</button>';
 }).join('');
 document.querySelector<HTMLButtonElement>('#start-match')!.disabled=teamSelection.length!==limit;
 document.querySelector<HTMLElement>('#arena-detail')!.textContent=battleKind==='story'
   ?'DESAFIO: '+(c?.name??'')+' · '+(c?.team.length??0)+' Pokémon · '+arenaNames[c?.arena??'classic']
   :'CPU escolhe três Pokémon aleatórios. Selecione Charizard, Venusaur ou Blastoise e outros Pokémon.';
 document.querySelectorAll<HTMLButtonElement>('[data-kind]').forEach(b=>b.classList.toggle('selected',b.dataset.kind===battleKind));
}
document.querySelector<HTMLButtonElement>('[data-quick-training]')!.addEventListener('click',()=>{
 clearMatch();setTrainingSetup('charizard','raichu',36);startGameMode('training');
});
document.querySelector<HTMLButtonElement>('[data-start-arena]')!.addEventListener('click',()=>{
 battleKind='quick';teamSelection=[];
 renderBattleMenu();showPanel('arena');
});
document.querySelector<HTMLButtonElement>('[data-start-challenges]')!.addEventListener('click',()=>{
 battleKind='story';teamSelection=[];
 renderBattleMenu();showPanel('arena');
});
document.querySelectorAll<HTMLButtonElement>('[data-kind]').forEach(b=>b.addEventListener('click',()=>{
 battleKind=b.dataset.kind==='story'?'story':'quick';
 teamSelection=teamSelection.slice(0,battleKind==='quick'?3:6);
 renderBattleMenu();
}));
document.querySelector<HTMLElement>('#team-grid')!.addEventListener('click',e=>{
 const b=(e.target as HTMLElement).closest<HTMLButtonElement>('[data-select-pokemon]');
 const pokemon=b?.dataset.selectPokemon as Fighter|undefined;
 if(!pokemon)return;
 if(teamSelection.includes(pokemon))teamSelection=teamSelection.filter(x=>x!==pokemon);
 else if(teamSelection.length<(battleKind==='quick'?3:6))teamSelection=[...teamSelection,pokemon];
 renderBattleMenu();
});
document.querySelector<HTMLSelectElement>('#arena-trainer')!.addEventListener('change',e=>{
 chosenTrainer=(e.target as HTMLSelectElement).value;renderBattleMenu();
});
document.querySelector<HTMLSelectElement>('#arena-choice')!.addEventListener('change',e=>{
 arenaSelection=(e.target as HTMLSelectElement).value as ArenaId|'random';renderBattleMenu();
});
document.querySelector<HTMLButtonElement>('#start-match')!.addEventListener('click',()=>{
 if(teamSelection.length!==(battleKind==='quick'?3:6))return;
 beginMatch(teamSelection,arenaSelection,battleKind,battleKind==='story'?chosenTrainer:undefined);
 setTrainingSetup(teamSelection[0],'raichu',36);
 startGameMode('training');
});
window.addEventListener('monster-arena:return-menu',()=>{clearMatch();openMainMenu();});
renderBattleMenu();
