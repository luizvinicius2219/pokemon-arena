import Phaser from 'phaser';
import { decompressFrames, parseGIF } from 'gifuct-js';

/**
 * Transforma os GIFs animados da geração V em quadros nativos do Phaser.
 * GIFs não são animados automaticamente pelo Phaser; os quadros precisam
 * ser decodificados e recompostos respeitando o método de descarte.
 */
interface Clip {
  endsAt: number[];
  duration: number;
  frames: number;
}

const clips = new Map<string, Clip>();

export function registerGifClip(scene: Phaser.Scene, key: string, data: ArrayBuffer): boolean {
  try {
    const gif = parseGIF(data);
    const frames = decompressFrames(gif, true);
    const { width, height } = gif.lsd;

    if (!frames.length || !width || !height || frames.length > 500) return false;

    const columns = Math.min(8, frames.length);
    const sheet = document.createElement('canvas');
    sheet.width = width * columns;
    sheet.height = height * Math.ceil(frames.length / columns);
    const target = sheet.getContext('2d');
    if (!target) return false;

    const composite = document.createElement('canvas');
    composite.width = width;
    composite.height = height;
    const ctx = composite.getContext('2d', { willReadFrequently: true });
    if (!ctx) return false;

    const patchCanvas = document.createElement('canvas');
    const patchCtx = patchCanvas.getContext('2d');
    if (!patchCtx) return false;

    let previous = frames[0];
    let snapshot: ImageData | null = null;
    const endsAt: number[] = [];
    let duration = 0;

    for (let index = 0; index < frames.length; index++) {
      const frame = frames[index];

      // A limpeza do frame anterior deve acontecer antes do desenho do atual.
      if (index > 0) {
        if (previous.disposalType === 2) {
          ctx.clearRect(previous.dims.left, previous.dims.top, previous.dims.width, previous.dims.height);
        } else if (previous.disposalType === 3 && snapshot) {
          ctx.putImageData(snapshot, 0, 0);
        }
      }

      // GIF disposal 3 restaura a imagem anterior à composição do quadro.
      snapshot = frame.disposalType === 3 ? ctx.getImageData(0, 0, width, height) : null;
      patchCanvas.width = frame.dims.width;
      patchCanvas.height = frame.dims.height;
      patchCtx.putImageData(new ImageData(frame.patch, frame.dims.width, frame.dims.height), 0, 0);

      // drawImage preserva os pixels por baixo das regiões transparentes.
      ctx.drawImage(patchCanvas, frame.dims.left, frame.dims.top);
      target.drawImage(composite, (index % columns) * width, Math.floor(index / columns) * height);

      duration += Math.max(30, frame.delay || 100);
      endsAt.push(duration);
      previous = frame;
    }

    const texture = scene.textures.addSpriteSheet(key, sheet, {
      frameWidth: width,
      frameHeight: height,
      endFrame: frames.length - 1
    });
    if (!texture) return false;

    clips.set(key, { endsAt, duration, frames: frames.length });
    return true;
  } catch (error) {
    console.warn('Falha ao decodificar GIF; mantendo PNG estático:', key, error);
    return false;
  }
}

/** Seleciona o frame real, respeitando o tempo individual definido pelo GIF. */
export function currentGifFrame(key: string, elapsedMs: number): number {
  const clip = clips.get(key);
  if (!clip || !clip.duration) return 0;
  const t = ((elapsedMs % clip.duration) + clip.duration) % clip.duration;
  let lo = 0;
  let hi = clip.frames - 1;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (t < clip.endsAt[mid]) hi = mid;
    else lo = mid + 1;
  }
  return lo;
}

export function hasGifClip(key: string): boolean {
  return clips.has(key);
}
