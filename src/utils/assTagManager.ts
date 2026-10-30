import { SubtitleCue } from '../types';
import { cleanToPlainText } from './htmlSubtitleParser';

export interface AssParsedTags {
  pos?: [number, number] | null;
  move?: number[] | null;
  an?: number | null;
  fs?: number | null;
  fn?: string | null;
  b?: number | null;
  i?: boolean | null;
  u?: boolean | null;
  s?: boolean | null;
  c?: string | null;
  c1?: string | null;
  c2?: string | null;
  c3?: string | null;
  c4?: string | null;
  alpha?: string | null;
  bord?: number | null;
  shad?: number | null;
  blur?: number | null;
  fscx?: number | null;
  fscy?: number | null;
  frz?: number | null;
  fad?: [number, number] | null;
  q?: number | null;
}

export function parseTags(rawText: string): AssParsedTags {
  if (!rawText.includes('{')) {
    return {};
  }

  const tags: AssParsedTags = {};
  const blockPattern = /\{([^}]*)\}/g;
  let blockMatch: RegExpExecArray | null;

  while ((blockMatch = blockPattern.exec(rawText)) !== null) {
    const content = blockMatch[1];

    // \pos(x, y)
    const posMatch = /\\pos\s*\(\s*([0-9.-]+)\s*,\s*([0-9.-]+)\s*\)/.exec(content);
    if (posMatch) {
      const x = parseFloat(posMatch[1]);
      const y = parseFloat(posMatch[2]);
      if (!isNaN(x) && !isNaN(y)) tags.pos = [x, y];
    }

    // \an1..\an9
    const anMatch = /\\an([1-9])/.exec(content);
    if (anMatch) tags.an = parseInt(anMatch[1], 10);

    // \fs (font size)
    const fsMatch = /\\fs([0-9.]+)/.exec(content);
    if (fsMatch) tags.fs = parseFloat(fsMatch[1]);

    // \fn (font name)
    const fnMatch = /\\fn([^\\}]+)/.exec(content);
    if (fnMatch) tags.fn = fnMatch[1].trim();

    // \b (bold)
    const bMatch = /\\b([0-9]+)/.exec(content);
    if (bMatch) tags.b = parseInt(bMatch[1], 10);

    // \i (italic)
    const iMatch = /\\i([01])/.exec(content);
    if (iMatch) tags.i = iMatch[1] === '1';

    // \u (underline)
    const uMatch = /\\u([01])/.exec(content);
    if (uMatch) tags.u = uMatch[1] === '1';

    // \s (strikeout)
    const sMatch = /\\s([01])/.exec(content);
    if (sMatch) tags.s = sMatch[1] === '1';

    // Colors
    const c1Match = /\\1c(&?H?[0-9a-fA-F]+&?)/.exec(content);
    if (c1Match) tags.c1 = c1Match[1];
    const c3Match = /\\3c(&?H?[0-9a-fA-F]+&?)/.exec(content);
    if (c3Match) tags.c3 = c3Match[1];
    const c4Match = /\\4c(&?H?[0-9a-fA-F]+&?)/.exec(content);
    if (c4Match) tags.c4 = c4Match[1];
    const cMatch = /(?<![1-4])\\c(&?H?[0-9a-fA-F]+&?)/.exec(content);
    if (cMatch) tags.c = cMatch[1];

    // \bord
    const bordMatch = /\\bord([0-9.]+)/.exec(content);
    if (bordMatch) tags.bord = parseFloat(bordMatch[1]);

    // \shad
    const shadMatch = /\\shad([0-9.-]+)/.exec(content);
    if (shadMatch) tags.shad = parseFloat(shadMatch[1]);

    // \blur
    const blurMatch = /\\blur([0-9.]+)/.exec(content);
    if (blurMatch) tags.blur = parseFloat(blurMatch[1]);

    // \fscx, \fscy
    const fscxMatch = /\\fscx([0-9.]+)/.exec(content);
    if (fscxMatch) tags.fscx = parseFloat(fscxMatch[1]);
    const fscyMatch = /\\fscy([0-9.]+)/.exec(content);
    if (fscyMatch) tags.fscy = parseFloat(fscyMatch[1]);

    // \frz
    const frzMatch = /\\frz([0-9.-]+)/.exec(content);
    if (frzMatch) tags.frz = parseFloat(frzMatch[1]);

    // \fad(fadeIn, fadeOut)
    const fadMatch = /\\fad\s*\(\s*([0-9]+)\s*,\s*([0-9]+)\s*\)/.exec(content);
    if (fadMatch) {
      const fIn = parseInt(fadMatch[1], 10);
      const fOut = parseInt(fadMatch[2], 10);
      if (!isNaN(fIn) && !isNaN(fOut)) tags.fad = [fIn, fOut];
    }
  }

  if (!tags.c && tags.c1) tags.c = tags.c1;
  return tags;
}

export function updateTag(rawText: string, tagKey: string, tagValue: string | null): string {
  const cleanValue = tagValue?.trim();
  const formattedNewTag = cleanValue ? `\\${tagKey}${cleanValue}` : null;

  const tagRegexMap: Record<string, RegExp> = {
    pos: /\\pos\s*\([^)]*\)/,
    move: /\\move\s*\([^)]*\)/,
    fad: /\\fad\s*\([^)]*\)/,
    c: /(?<![1-4])\\c(&H[0-9a-fA-F]+&|&?[0-9a-fA-F]+&?)/,
    '1c': /\\1c(&H[0-9a-fA-F]+&|&?[0-9a-fA-F]+&?)/,
    '3c': /\\3c(&H[0-9a-fA-F]+&|&?[0-9a-fA-F]+&?)/,
    '4c': /\\4c(&H[0-9a-fA-F]+&|&?[0-9a-fA-F]+&?)/,
    bord: /(?<![xy])\\bord[0-9.]+/,
    shad: /(?<![xy])\\shad[0-9.-]+/,
    fscx: /\\fscx[0-9.]+/,
    fscy: /\\fscy[0-9.]+/,
    frz: /\\frz[0-9.-]+/,
    fs: /\\fs[0-9.]+/,
    fn: /\\fn[^\\}]+/,
    an: /\\an[1-9]/,
    b: /\\b[0-9]+/,
    i: /\\i[01]/,
    u: /\\u[01]/,
    s: /\\s[01]/,
    blur: /\\blur[0-9.]+/,
    q: /\\q[0-3]/,
  };

  const tagRegex = tagRegexMap[tagKey] || new RegExp(`\\\\${tagKey}[^\\\\}]+`);

  const firstBlockMatch = /^\{([^}]*)\}/.exec(rawText);
  if (firstBlockMatch) {
    const oldBlockContent = firstBlockMatch[1];
    const remainder = rawText.substring(firstBlockMatch[0].length);

    let updatedBlockContent: string;
    if (formattedNewTag) {
      if (tagRegex.test(oldBlockContent)) {
        updatedBlockContent = oldBlockContent.replace(tagRegex, formattedNewTag);
      } else {
        updatedBlockContent = oldBlockContent + formattedNewTag;
      }
    } else {
      updatedBlockContent = oldBlockContent.replace(tagRegex, '');
    }

    const cleaned = updatedBlockContent.trim();
    return cleaned.length === 0 ? remainder : `{${cleaned}}${remainder}`;
  }

  if (formattedNewTag) {
    return `{${formattedNewTag}}${rawText}`;
  }
  return rawText;
}

export function updatePos(rawText: string, posX: number, posY: number): string {
  const xRounded = Math.round(posX);
  const yRounded = Math.round(posY);
  return updateTag(rawText, 'pos', `(${xRounded},${yRounded})`);
}

export function updateAngle(rawText: string, angle: number): string {
  const rounded = Math.round(angle);
  return updateTag(rawText, 'frz', String(rounded));
}

/**
 * Converts ASS BGR hex (e.g. "&H00FFFF&" or "&H0000FF") to web hex "#RRGGBB".
 */
export function assColorToHex(assHex: string | null | undefined): string | null {
  if (!assHex) return null;
  const clean = assHex.replace(/[&Hh]/g, '').trim();
  const hex = clean.padStart(6, '0').slice(-6);
  if (hex.length >= 6) {
    const b = hex.substring(0, 2);
    const g = hex.substring(2, 4);
    const r = hex.substring(4, 6);
    return `#${r}${g}${b}`;
  }
  return null;
}

/**
 * Converts standard web hex ("#RRGGBB") to ASS BGR inline hex string ("&HBBGGRR&").
 */
export function hexToAssColor(hex: string): string {
  const clean = hex.replace('#', '').trim();
  if (clean.length === 6) {
    const r = clean.substring(0, 2);
    const g = clean.substring(2, 4);
    const b = clean.substring(4, 6);
    return `&H${b.toUpperCase()}${g.toUpperCase()}${r.toUpperCase()}&`;
  }
  return '&HFFFFFF&';
}

export const SAFE_BATCH_TAG_KEYS = new Set([
  'b', 'i', 'u', 's',
  'an', 'fs', 'fn',
  'bord', 'shad',
  'c', '1c', '3c', '4c',
  'fscx', 'fscy', 'frz', 'blur', 'q'
]);

export function applyBatchTags(
  cues: SubtitleCue[],
  tagsToApply: Record<string, string | null>
): SubtitleCue[] {
  const entries = Object.entries(tagsToApply).filter(([key]) => SAFE_BATCH_TAG_KEYS.has(key));
  if (entries.length === 0) return cues;

  return cues.map((cue) => {
    let updatedRaw = cue.rawText;
    for (const [key, val] of entries) {
      updatedRaw = updateTag(updatedRaw, key, val);
    }
    const clean = cleanToPlainText(updatedRaw);
    return { ...cue, rawText: updatedRaw, cleanText: clean };
  });
}
