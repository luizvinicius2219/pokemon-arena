import Phaser from 'phaser';
import { Action, Bindings, defaults, loadBindings, saveBindings, assignBinding, keyLabel } from './controls';
import { allActions, dodge, skills } from './abilities';
import { ArenaScene } from './arena';
import { MobileControls } from './mobileControls';
import './style.css';

const app = document.querySelector<HTMLDivElement>('#app')!;
let bindings: Bindings = loadBindings();
let capturing: Action | null = null;
let menuOpen = false;
const heldKeys = new Set<string>();

const labels: Record<Action, string> = {
  q: 'Habilidade 1', w: 'Habilidade 2', e: 'Habilidade 3', r: 'Especial', dodge: 'Esquiva'
};

const cardHTML = (action: Action): string => {
  const skill = action === 'dodge' ? dodge : skills.charizard[action];
  return `<div class="skill-card ${action === 'r' ? 'ultimate' : ''}" data-action="${action}" title="${skill.description}">
    <span class="skill-key" data-key>${keyLabel(bindings[action])}</span>
    <span class="skill-icon">${skill.icon}</span>
    <span class="skill-name">${skill.name}</span>
    <span class="skill-timer" data-timer>PRONTO</span>
    <span class="skill-shade" data-shade></span>
  </div>`;
};

app.innerHTML = `
<header><div><h1>MONSTER <span>ARENA</span></h1><p>Arena 2D · Batalha em tempo real</p></div><button id="settings" type="button">⚙ Controles</button></header>
<main>
  <div class="arena-column">
    <div id="game-shell">
      <div id="game" aria-label="Arena de batalha"></div>
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
    <div class="arena-hint"><span class="desktop-hint">Clique direito para se mover · Aponte o cursor para atacar · Pressione Enter para reiniciar</span><span class="mobile-hint">Joystick: andar · 1–4: habilidades · ↗: esquiva · Mira automática</span></div>
  </div>
  <aside>
    <h2>Como jogar</h2>
    <p>🖱️ Clique direito: mover</p><p>🎯 Mire com o cursor</p>
    <p>🔥 Q W E R: habilidades de Charizard</p><p>💨 Espaço: esquiva</p>
    <h3>Habilidades</h3>
    ${(['q','w','e','r'] as const).map(a=>`<p class="skill-help"><b>${a.toUpperCase()}</b> — ${skills.charizard[a].name} <small>${(skills.charizard[a].cooldown/1000).toFixed(1)}s</small></p>`).join('')}
    <p class="help-footnote">Pikachu usa técnicas elétricas próprias e é controlado pelo computador.</p>
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
  if (Object.values(bindings).includes(event.code)) {
    event.preventDefault();
    heldKeys.add(event.code);
  }
}, true);
window.addEventListener('keyup', event => heldKeys.delete(event.code));
window.addEventListener('blur', () => heldKeys.clear());

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 960, height: 576,
  backgroundColor: '#142e31',
  render: { pixelArt: true },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [new ArenaScene(() => bindings, () => heldKeys, () => menuOpen, mobile)]
});
