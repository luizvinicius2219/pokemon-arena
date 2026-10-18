import type { Action } from './controls';

/**
 * Multi-touch gamepad independent of Phaser pointer input.
 * One finger steers the left stick while other fingers may press skills.
 * Short taps are queued until the next game frame to avoid missing inputs.
 */
export class MobileControls {
  readonly active: boolean;
  readonly axis = { x: 0, y: 0 };

  private stickPointer: number | null = null;
  private readonly held = new Set<Action>();
  private readonly taps = new Set<Action>();
  private readonly buttonPointers = new Map<Action, number>();
  private wantsRestart = false;
  private readonly stick: HTMLElement;
  private readonly knob: HTMLElement;
  private readonly buttons: Map<Action, HTMLButtonElement> = new Map();
  private readonly restart: HTMLButtonElement;

  constructor(root: HTMLElement) {
    this.active = window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
    document.documentElement.classList.toggle('touch-enabled', this.active);

    this.stick = root.querySelector<HTMLElement>('[data-touch-stick]')!;
    this.knob = root.querySelector<HTMLElement>('[data-stick-knob]')!;
    this.restart = root.querySelector<HTMLButtonElement>('[data-touch-restart]')!;

    this.stick.addEventListener('pointerdown', event => {
      if (!this.active || this.stickPointer !== null || event.pointerType === 'mouse') return;
      event.preventDefault();
      this.stickPointer = event.pointerId;
      this.stick.setPointerCapture(event.pointerId);
      this.moveStick(event);
    });
    this.stick.addEventListener('pointermove', event => {
      if (event.pointerId === this.stickPointer) {
        event.preventDefault();
        this.moveStick(event);
      }
    });
    const stopStick = (event: PointerEvent) => {
      if (event.pointerId !== this.stickPointer) return;
      this.stickPointer = null;
      this.axis.x = this.axis.y = 0;
      this.knob.style.transform = 'translate(-50%, -50%)';
      this.stick.classList.remove('engaged');
    };
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) {
      this.stick.addEventListener(type, stopStick);
    }

    for (const button of root.querySelectorAll<HTMLButtonElement>('[data-touch-action]')) {
      const action = button.dataset.touchAction as Action;
      this.buttons.set(action, button);
      button.addEventListener('pointerdown', event => {
        if (!this.active || event.pointerType === 'mouse') return;
        event.preventDefault();
        if (this.buttonPointers.has(action)) return;
        this.buttonPointers.set(action, event.pointerId);
        button.setPointerCapture(event.pointerId);
        this.held.add(action);
        this.taps.add(action);
        button.classList.add('pressed');
      });
      const stopPress = (event: PointerEvent) => {
        if (this.buttonPointers.get(action) !== event.pointerId) return;
        this.buttonPointers.delete(action);
        this.held.delete(action);
        button.classList.remove('pressed');
      };
      for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) {
        button.addEventListener(type, stopPress);
      }
      // Also works with accessibility switch/keyboard activation of the button.
      button.addEventListener('click', event => {
        if (!this.active || event.detail !== 0) return;
        this.taps.add(action);
      });
    }

    this.restart.addEventListener('click', () => { this.wantsRestart = true; });
    window.addEventListener('blur', () => this.clear());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.clear();
    });
  }

  private moveStick(event: PointerEvent) {
    const rect = this.stick.getBoundingClientRect();
    const radius = Math.min(rect.width, rect.height) * 0.34;
    const x = (event.clientX - (rect.left + rect.width / 2)) / radius;
    const y = (event.clientY - (rect.top + rect.height / 2)) / radius;
    const distance = Math.hypot(x, y);
    const size = Math.min(distance, 1);
    const deadZone = 0.13;
    const factor = distance > 0 ? size / distance : 0;
    this.axis.x = size > deadZone ? x * factor : 0;
    this.axis.y = size > deadZone ? y * factor : 0;
    this.knob.style.transform = 'translate(calc(-50% + ' + (this.axis.x * radius).toFixed(1) + 'px), calc(-50% + ' + (this.axis.y * radius).toFixed(1) + 'px))';
    this.stick.classList.toggle('engaged', size > deadZone);
  }

  /** Consume tap once; holding is supported, just like desktop keyboard. */
  isPressed(action: Action): boolean {
    const tapped = this.taps.delete(action);
    return tapped || this.held.has(action);
  }

  consumeRestart(): boolean {
    if (!this.wantsRestart) return false;
    this.wantsRestart = false;
    return true;
  }

  setCooldown(action: Action, remaining: number, duration: number) {
    const button = this.buttons.get(action);
    if (!button) return;
    const overlay = button.querySelector<HTMLElement>('[data-touch-shade]');
    const label = button.querySelector<HTMLElement>('[data-touch-timer]');
    const cooling = remaining > 0;
    button.classList.toggle('cooling', cooling);
    if (overlay) overlay.style.height = (Math.min(1, remaining / duration) * 100).toFixed(1) + '%';
    if (label) label.textContent = cooling ? (remaining / 1000).toFixed(1) + 's' : '';
  }

  setFinished(finished: boolean) {
    this.restart.hidden = !finished;
    if (finished) this.clear();
  }

  clear() {
    this.stickPointer = null;
    this.axis.x = this.axis.y = 0;
    this.knob.style.transform = 'translate(-50%, -50%)';
    this.stick.classList.remove('engaged');
    this.buttonPointers.clear();
    this.held.clear();
    this.taps.clear();
    for (const button of this.buttons.values()) button.classList.remove('pressed');
  }
}
