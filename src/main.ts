import Phaser from 'phaser';
import { Action, Bindings, defaults, loadBindings, saveBindings, assignBinding, keyLabel } from './controls';
import { allActions,dodge,skills,type Starter,type Fighter } from './abilities';
import { getTrainingSetup,setTrainingSetup } from './trainingSetup';
import { pokemonCatalog } from './pokemonCatalog';
import { loadDifficulty,saveDifficulty } from './gameBalance';
import { ArenaScene } from './arena';
import { WorldScene } from './world';
import {
  awardActiveExperience,loadCollection,saveCollection,
  chooseStarter,chosenStarter,getActivePokemon
} from './playerCollection';
import {
  registerTrainingVictory,resetStoryProgress,trainerCooldownRemaining
} from './storyProgress';
import { MobileControls } from './mobileControls';
import type { GameMode } from './story';
import './style.css';

const app = document.querySelector<HTMLDivElement>('#app')!;
let bindings: Bindings = loadBindings();
let capturing: Action | null = null;
let menuOpen = false;
let gameMode:GameMode='world';
let mainMenuOpen=true;
let candidate:Starter='charmander';
const heldKeys = new Set<string>();

const labels: Record<Action, string> = {
  q: 'Habilidade 1', w: 'Habilidade 2', e: 'Habilidade 3', r: 'Especial', dodge: 'Esquiva'
};

const selectedSpecies = () =>
  gameMode==='training'?getTrainingSetup().player:
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
<header><div><h1>MONSTER <span>ARENA</span></h1><p>Capítulo 1 · Exploração e batalha em tempo real</p></div><div class="header-actions"><button id="fullscreen-header" type="button" title="Expandir a área do jogo (F)">⛶ Tela cheia</button><button id="switch-mode" type="button">☰ Menu</button><button id="gym-preview" type="button" hidden title="Atalho para testes">🪨 Testar Brock</button><button id="settings" type="button">⚙ Controles</button></div></header>
<main>
  <div class="arena-column">
    <div id="game-shell">
      <div id="game" aria-label="Área do jogo"></div>
      <button id="toggle-fullscreen" class="game-fullscreen-button" type="button" aria-label="Entrar em tela cheia" title="Tela cheia (F)">⛶ Tela cheia</button>
      <div id="landing-menu" class="landing-menu" role="dialog" aria-modal="true" aria-label="Menu do jogo">
        <section class="landing-card" data-menu-panel="home">
          <span class="landing-eyebrow">KANTO · AVENTURA DE AÇÃO</span>
          <h2>MONSTER <em>ARENA</em></h2>
          <p class="landing-lead">Explore a zona selvagem, treine seu Pokémon e desafie líderes em combates em tempo real.</p>
          <div class="landing-modes">
            <button class="landing-mode" type="button" data-start-story>
              <span class="mode-icon">🌿</span><strong>MODO HISTÓRIA</strong>
              <small>Escolha um inicial · Explore · Treine · Evolua · Brock</small>
            </button>
            <button class="landing-mode" type="button" data-start-training>
              <span class="mode-icon">⚔</span><strong>MODO TREINAMENTO</strong>
              <small>Escolha Pokémon, adversário e nível · Sem alterar seu save</small>
            </button>
          </div>
          <div class="safari-difficulty">
            <label for="difficulty-home">NÍVEL DO DESAFIO</label>
            <select id="difficulty-home" data-difficulty>
              <option value="relax">CASUAL · Menos dano, +20% XP</option>
              <option value="normal">PADRÃO · Equilibrado</option>
              <option value="challenge">DESAFIO · Mais dano, -10% XP</option>
            </select>
          </div>
          <button class="menu-debug" type="button" data-start-brock>🪨 Testar ginásio diretamente</button>
          <p class="landing-note">Salvamento automático no navegador. As cenas de batalha e o progresso são independentes.</p>
        </section>
        <section class="landing-card" data-menu-panel="choose" hidden>
          <span class="landing-eyebrow">MODO HISTÓRIA · NOVA JORNADA</span>
          <h2>ESCOLHA SEU <em>INICIAL</em></h2>
          <p class="landing-lead">Três estilos de combate. Cada Pokémon começa no nível 5 e pode evoluir com treinamento.</p>
          <div class="starter-grid" role="group" aria-label="Escolha seu Pokémon inicial">
            <button type="button" class="starter-option selected" data-starter="charmander">
              <img alt="Charmander" src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/4.png"/>
              <strong>CHARMANDER</strong><small>🔥 FOGO</small><span>Ataques ágeis · Ginásio mais difícil</span>
            </button>
            <button type="button" class="starter-option" data-starter="squirtle">
              <img alt="Squirtle" src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/7.png"/>
              <strong>SQUIRTLE</strong><small>💧 ÁGUA</small><span>Jato d’Água · Casco resistente</span>
            </button>
            <button type="button" class="starter-option" data-starter="bulbasaur">
              <img alt="Bulbasaur" src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png"/>
              <strong>BULBASAUR</strong><small>🌿 PLANTA</small><span>Chicote de Vinha · Drena HP</span>
            </button>
          </div>
          <p class="starter-warning">Começar uma nova jornada troca o inicial e reinicia o progresso atual.</p>
          <div class="landing-buttons">
            <button type="button" class="landing-secondary" data-menu-back>← VOLTAR</button>
            <button type="button" class="landing-primary" data-confirm-starter>INICIAR AVENTURA →</button>
          </div>
        </section>
        <section class="landing-card" data-menu-panel="resume" hidden>
          <span class="landing-eyebrow">MODO HISTÓRIA · PROGRESSO SALVO</span>
          <h2>SUA <em>JORNADA</em></h2>
          <div class="save-preview" data-save-preview>Seu Pokémon está esperando.</div>
          <div class="safari-difficulty">
            <label for="difficulty-resume">DIFICULDADE DA JORNADA</label>
            <select id="difficulty-resume" data-difficulty>
              <option value="relax">CASUAL · Mais leve</option>
              <option value="normal">PADRÃO · Equilibrado</option>
              <option value="challenge">DESAFIO · Mais difícil</option>
            </select>
          </div>
          <div class="landing-buttons landing-buttons-column">
            <button type="button" class="landing-primary" data-continue-story>▶ CONTINUAR HISTÓRIA</button>
            <button type="button" class="landing-secondary" data-new-story>ESCOLHER OUTRO INICIAL / NOVO JOGO</button>
            <button type="button" class="landing-secondary" data-menu-back>← MENU PRINCIPAL</button>
          </div>
        </section>
        <section class="landing-card" data-menu-panel="testing" hidden>
          <span class="landing-eyebrow">TREINO LIVRE · SEM ALTERAR O SAVE</span>
          <h2>LABORATÓRIO DE <em>BATALHA</em></h2>
          <p class="landing-lead">Teste os ataques, a velocidade e o equilíbrio de cada Pokémon sem ganhar XP nem gastar tempo de treinador.</p>
          <div class="testing-grid">
            <label>SEU POKÉMON
              <select id="testing-player">
                <option value="charmander">Charmander</option>
                <option value="charmeleon">Charmeleon</option>
                <option value="charizard">Charizard</option>
                <option value="bulbasaur">Bulbasaur</option>
                <option value="ivysaur">Ivysaur</option>
                <option value="squirtle">Squirtle</option>
                <option value="wartortle">Wartortle</option>
              </select>
            </label>
            <label>ADVERSÁRIO
              <select id="testing-rival">
                <option value="pikachu">Pikachu</option>
                <option value="rattata">Rattata</option>
                <option value="pidgey">Pidgey</option>
                <option value="spearow">Spearow</option>
                <option value="caterpie">Caterpie</option>
                <option value="weedle">Weedle</option>
                <option value="jigglypuff">Jigglypuff</option>
              </select>
            </label>
          </div>
          <div class="testing-level">
            <label for="testing-level">NÍVEL DE TESTE: <strong data-testing-number>36</strong></label>
            <input id="testing-level" type="range" min="5" max="36" step="1" value="36"/>
            <small>Nível de teste não altera a História.</small>
          </div>
          <div class="landing-buttons">
            <button type="button" class="landing-secondary" data-menu-back>← VOLTAR</button>
            <button type="button" class="landing-primary" data-confirm-testing>⚔ COMEÇAR TESTE</button>
          </div>
        </section>
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
      ?'WASD / setas: explorar · E: treinar no mato alto ou enfrentar Brock'
      :'Clique direito: mover · Teclas Q W E R: habilidades · Enter: reiniciar';
    if(touch)touch.textContent=world
      ?'Joystick: explorar · Botão TREINAR no mato alto · Ginásio livre'
      :'Joystick: andar · 1–4: habilidades · ↗: esquiva';
  }
}

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
function showPanel(panel:'home'|'choose'|'resume'|'testing'){
  panels.forEach(node=>node.hidden=node.dataset.menuPanel!==panel);
  document.querySelectorAll<HTMLSelectElement>('[data-difficulty]')
    .forEach(select=>{select.value=loadDifficulty();});
  if(panel==='testing'){
    const setup=getTrainingSetup();
    document.querySelector<HTMLSelectElement>('#testing-player')!.value=setup.player;
    document.querySelector<HTMLSelectElement>('#testing-rival')!.value=setup.rival;
    document.querySelector<HTMLInputElement>('#testing-level')!.value=String(setup.level);
    document.querySelector<HTMLElement>('[data-testing-number]')!
      .textContent=String(setup.level);
  }
  if(panel==='resume'){
    const pokemon=getActivePokemon(loadCollection());
    const preview=document.querySelector<HTMLElement>('[data-save-preview]')!;
    preview.textContent=pokemon.nickname+' · Nível '+pokemon.level+
      ' · '+pokemon.experience+' XP · Pronto para treinar';
  }
}
function openMainMenu(){
  mainMenuOpen=true;
  landing.hidden=false;
  mobile.clear();
  heldKeys.clear();
  document.querySelector<HTMLElement>('#battle-summary')!.hidden=true;
  if(game.scene.isActive('Arena'))game.scene.pause('Arena');
  showPanel('home');
}
function startGameMode(nextMode:GameMode){
  mainMenuOpen=false;
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
      ()=>mainMenuOpen||menuOpen),
    new ArenaScene(
      ()=>bindings,()=>heldKeys,()=>menuOpen,mobile,()=>gameMode
    )
  ]
});
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
document.querySelector<HTMLButtonElement>('[data-start-training]')!
  .addEventListener('click',()=>showPanel('testing'));
document.querySelector<HTMLInputElement>('#testing-level')!
  .addEventListener('input',()=>{
    document.querySelector<HTMLElement>('[data-testing-number]')!
      .textContent=document.querySelector<HTMLInputElement>('#testing-level')!.value;
  });
document.querySelector<HTMLButtonElement>('[data-confirm-testing]')!
  .addEventListener('click',()=>{
    const player=document.querySelector<HTMLSelectElement>('#testing-player')!.value as Fighter;
    const rival=document.querySelector<HTMLSelectElement>('#testing-rival')!.value as Fighter;
    const level=Number(document.querySelector<HTMLInputElement>('#testing-level')!.value);
    setTrainingSetup(player,rival,level);
    startGameMode('training');
  });
document.querySelector<HTMLButtonElement>('[data-start-brock]')!
  .addEventListener('click',()=>startGameMode('story'));
document.querySelector<HTMLButtonElement>('[data-start-story]')!
  .addEventListener('click',()=>showPanel(chosenStarter()?'resume':'choose'));
document.querySelector<HTMLButtonElement>('[data-continue-story]')!
  .addEventListener('click',()=>startGameMode('world'));
document.querySelector<HTMLButtonElement>('[data-new-story]')!
  .addEventListener('click',()=>showPanel('choose'));
document.querySelectorAll<HTMLButtonElement>('[data-menu-back]')
  .forEach(button=>button.addEventListener('click',()=>showPanel('home')));
document.querySelectorAll<HTMLButtonElement>('[data-starter]')
  .forEach(button=>button.addEventListener('click',()=>{
    const value=button.dataset.starter;
    if(value==='charmander'||value==='bulbasaur'||value==='squirtle')
      candidate=value;
    document.querySelectorAll<HTMLButtonElement>('[data-starter]')
      .forEach(option=>{
        const chosen=option.dataset.starter===candidate;
        option.classList.toggle('selected',chosen);
        option.setAttribute('aria-pressed',String(chosen));
      });
  }));
document.querySelector<HTMLButtonElement>('[data-confirm-starter]')!
  .addEventListener('click',()=>{
    if(chosenStarter()&& !window.confirm(
      'Começar outra jornada? O nível e a equipe salvos serão reiniciados.'
    ))return;
    chooseStarter(candidate);
    resetStoryProgress();
    startGameMode('world');
  });
document.querySelector<HTMLButtonElement>('[data-return-story]')!
  .addEventListener('click',()=>startGameMode('world'));
window.addEventListener('monster-arena:return-world',
  ()=>startGameMode('world'));

window.addEventListener('monster-arena:practice-result',event=>{
  const detail=(event as CustomEvent<{
    victory:boolean;experience:number;species?:string;level?:number;
    mode?:'practice'|'wild'
  }>).detail;
  if(!detail)return;
  const back=document.querySelector<HTMLButtonElement>('[data-return-story]');
  if(back)back.hidden=false;
  if(!detail.victory)return;
  // Restarting a battle or returning from a stale result never bypasses
  // the 20-minute trainer rest enforced on the overworld.
  if(detail.mode==='practice'&&trainerCooldownRemaining()>0)return;
  const before=getActivePokemon(loadCollection());
  const award=awardActiveExperience(loadCollection(),detail.experience);
  const after=getActivePokemon(award.collection);
  if(detail.mode==='practice')registerTrainingVictory();
  const returnButton=document.querySelector<HTMLButtonElement>(
    '[data-return-story]');
  if(returnButton)returnButton.hidden=false;
  if(before.species!==after.species){
    try{window.sessionStorage.setItem('monster-arena-evolution',
      pokemonCatalog[after.species].name);}catch{}
    const info=document.querySelector<HTMLElement>('[data-battle-record]');
    if(info)info.textContent='EVOLUÇÃO! '+
      pokemonCatalog[after.species].name+' · Nv '+after.level;
  }
});
window.addEventListener('monster-arena:gym-victory',()=>{
  const back=document.querySelector<HTMLButtonElement>('[data-return-story]');
  if(back)back.hidden=false;
  const saved=loadCollection();
  if(saved.badges.includes('pedra'))return;
  saveCollection({...saved,badges:[...saved.badges,'pedra']});
});
