/**
 * Battle performance tracking, decoupled from combat balance.
 * Saved personal bests are optional and local to the user's browser.
 */
const RECORD_KEY = 'pokemon-arena-personal-best-v1';
const COMBO_WINDOW = 3300;

export interface BattleSummary {
  victory: boolean;
  durationSeconds: number;
  damageDealt: number;
  damageTaken: number;
  hitsLanded: number;
  bestCombo: number;
  dodgesUsed: number;
  attacksDodged: number;
  rank: string;
  bestComboRecord: number;
  fastestVictorySeconds: number | null;
  newComboRecord: boolean;
  newTimeRecord: boolean;
}

interface SavedRecords {
  bestCombo: number;
  fastestVictorySeconds: number | null;
}

const positiveInt = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.floor(value)) : 0;

function readRecords(): SavedRecords | null {
  try {
    const raw = window.localStorage.getItem(RECORD_KEY);
    if (!raw) return { bestCombo: 0, fastestVictorySeconds: null };
    const object: unknown = JSON.parse(raw);
    if (!object || typeof object !== 'object') return null;
    const o = object as Record<string,unknown>;
    const time = positiveInt(o.fastestVictorySeconds);
    return {
      bestCombo: positiveInt(o.bestCombo),
      fastestVictorySeconds: time > 0 ? time : null
    };
  } catch { return null; }
}

function saveRecords(value: SavedRecords): boolean {
  try {
    window.localStorage.setItem(RECORD_KEY, JSON.stringify(value));
    return true;
  } catch { return false; }
}

export function formatBattleTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return Math.floor(s / 60).toString().padStart(2, '0')
    + ':' + (s % 60).toString().padStart(2, '0');
}

export class BattleStats {
  readonly startedAt: number;
  damageDealt = 0;
  damageTaken = 0;
  hitsLanded = 0;
  currentCombo = 0;
  bestCombo = 0;
  dodgesUsed = 0;
  attacksDodged = 0;
  private comboExpiresAt = -1;
  private lastEvadeAt = -1000;
  private excludedTimeMs=0;

  constructor(startTime: number) { this.startedAt = startTime; }

  /** Non-combat dialogue and Poké Ball animations don't cost speed records. */
  excludeTime(milliseconds:number):void {
    this.excludedTimeMs+=Math.max(0,milliseconds);
  }

  registerHit(amount: number, time: number): number {
    this.damageDealt += Math.max(0, amount);
    this.hitsLanded++;
    if (time > this.comboExpiresAt) this.currentCombo = 0;
    this.currentCombo++;
    this.bestCombo = Math.max(this.bestCombo, this.currentCombo);
    this.comboExpiresAt = time + COMBO_WINDOW;
    return this.currentCombo;
  }

  registerDamage(amount: number): void {
    this.damageTaken += Math.max(0, amount);
    this.currentCombo = 0;
    this.comboExpiresAt = -1;
  }

  registerDodge(): void { this.dodgesUsed++; }

  /** Repeated overlaps while dodging count as one avoided attack, not dozens. */
  registerEvade(time: number): boolean {
    if (time - this.lastEvadeAt < 420) return false;
    this.lastEvadeAt = time;
    this.attacksDodged++;
    return true;
  }

  comboAt(time: number): number {
    if (time > this.comboExpiresAt) this.currentCombo = 0;
    return this.currentCombo;
  }

  comboRemaining(time: number): number {
    return this.comboAt(time) < 2 ? 0
      : Math.max(0, Math.min(1, (this.comboExpiresAt - time) / COMBO_WINDOW));
  }

  elapsedSeconds(time: number): number {
    return Math.max(0, Math.round((time - this.startedAt-this.excludedTimeMs) / 1000));
  }

  finish(time: number, victory: boolean, remainingHp: number): BattleSummary {
    const durationSeconds = this.elapsedSeconds(time);
    const performance = remainingHp * 0.55
      + Math.min(22, this.bestCombo * 1.8)
      + Math.min(18, this.attacksDodged * 6)
      + (durationSeconds <= 50 ? 9 : 0);
    const rank = !victory ? '—'
      : performance >= 83 ? 'S'
      : performance >= 62 ? 'A'
      : performance >= 43 ? 'B' : 'C';

    const previous = readRecords();
    let newComboRecord = false;
    let newTimeRecord = false;
    let bestComboRecord = this.bestCombo;
    let fastestVictorySeconds: number | null = victory ? durationSeconds : null;

    if (previous) {
      bestComboRecord = Math.max(previous.bestCombo, this.bestCombo);
      fastestVictorySeconds = previous.fastestVictorySeconds;
      newComboRecord = this.bestCombo > previous.bestCombo;
      newTimeRecord = victory && (
        previous.fastestVictorySeconds === null
        || durationSeconds < previous.fastestVictorySeconds
      );
      if (newTimeRecord) fastestVictorySeconds = durationSeconds;
      if ((newComboRecord || newTimeRecord) && !saveRecords({
        bestCombo: bestComboRecord,
        fastestVictorySeconds
      })) {
        newComboRecord = false;
        newTimeRecord = false;
      }
    }

    return {
      victory, durationSeconds,
      damageDealt: this.damageDealt,
      damageTaken: this.damageTaken,
      hitsLanded: this.hitsLanded,
      bestCombo: this.bestCombo,
      dodgesUsed: this.dodgesUsed,
      attacksDodged: this.attacksDodged,
      rank,
      bestComboRecord,
      fastestVictorySeconds,
      newComboRecord,
      newTimeRecord
    };
  }
}
