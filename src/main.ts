import Phaser from 'phaser';
import { Action, Bindings, defaults, loadBindings, saveBindings, assignBinding, keyLabel } from './controls';
import { allActions, dodge, skills } from './abilities';
import { ArenaScene } from './arena';
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
    <div id="game" aria-label="Arena de batalha"></div>
    <div id="hud" class="hud" aria-label="Habilidades e tempos de recarga">
      ${allActions.map(cardHTML).join('')}
    </div>
    <div class="arena-hint">Clique direito para se mover · Aponte o cursor para atacar · Pressione Enter para reiniciar</div>
  </div>
  <aside>
    <h2>Como jogar</h2>
    <p>🖱️ Clique direito: mover</p><p>🎯 Mire com o cursor</p>
    <p>🔥 Q W E R: habilidades de Charizard</p><p>💨 Espaço: esquiva</p>
    <h3>Habilidades</h3>
    ${(['q','w','e','r'] as const).map(a=>`<p class="skill-help"><b>${a.toUpperCase()}</b> — ${skills.charizard[a].name} <small>${(skills.charizard[a].cooldown/1000).toFixed(1)}s</small></p>`).join('')}
    <p class="help-footnote">Pikachu usa técnicas elétricas próprias e é controlado pelo computador.</p>
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
  scene: [new ArenaScene(() => bindings, () => heldKeys, () => menuOpen)]
});
