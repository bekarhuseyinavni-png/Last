/**
 * Universal HTML Subtitle Parser
 * Converts HTML tags (<i>, <b>, <u>, <br>, <font color=... face=... size=...>)
 * to standard ASS override tags ({\i1}, {\b1}, {\u1}, \N, {\c&H...&}, {\fn...}, {\fs...})
 * and strips them to plain text.
 */

const ENTITY_MAP: Record<string, string> = {
  lt: '<',
  gt: '>',
  amp: '&',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

export function decodeHtmlEntities(input: string): string {
  if (!input.includes('&')) return input;
  return input.replace(/&(#?[a-zA-Z0-9]+);/g, (match, entity) => {
    const lower = entity.toLowerCase();
    if (ENTITY_MAP[lower]) return ENTITY_MAP[lower];
    if (lower.startsWith('#x')) {
      try {
        const code = parseInt(lower.slice(2), 16);
        return String.fromCharCode(code);
      } catch {
        return match;
      }
    }
    if (lower.startsWith('#')) {
      try {
        const code = parseInt(lower.slice(1), 10);
        return String.fromCharCode(code);
      } catch {
        return match;
      }
    }
    return match;
  });
}

export function colorNameToAssHex(colorStr: string): string | null {
  const trimmed = colorStr.trim().replace(/^#/, '');
  if (trimmed.length === 6 && /^[0-9a-fA-F]{6}$/.test(trimmed)) {
    const r = trimmed.substring(0, 2);
    const g = trimmed.substring(2, 4);
    const b = trimmed.substring(4, 6);
    // ASS hex color is &HBBGGRR&
    return `&H${b}${g}${r}&`;
  }
  if (trimmed.length === 3 && /^[0-9a-fA-F]{3}$/.test(trimmed)) {
    const r = `${trimmed[0]}${trimmed[0]}`;
    const g = `${trimmed[1]}${trimmed[1]}`;
    const b = `${trimmed[2]}${trimmed[2]}`;
    return `&H${b}${g}${r}&`;
  }

  const namedColors: Record<string, string> = {
    white: '&HFFFFFF&',
    black: '&H000000&',
    red: '&H0000FF&',
    green: '&H008000&',
    lime: '&H00FF00&',
    blue: '&HFF0000&',
    yellow: '&H00FFFF&',
    cyan: '&HFFFF00&',
    magenta: '&HFF00FF&',
    fuchsia: '&HFF00FF&',
    gray: '&H808080&',
    grey: '&H808080&',
    orange: '&H00A5FF&',
    purple: '&H800080&',
  };

  return namedColors[colorStr.toLowerCase()] || null;
}

interface FontState {
  colorAss?: string | null;
  face?: string | null;
  size?: string | null;
}

export function htmlToAss(input: string): string {
  const decoded = decodeHtmlEntities(input);
  if (!decoded.includes('<') && !decoded.includes('&')) {
    return decoded;
  }

  const tagPattern = /<(\/?[a-zA-Z0-9]+)([^>]*)>/g;
  let result = '';
  let lastEnd = 0;

  let italicDepth = 0;
  let boldDepth = 0;
  let underlineDepth = 0;
  const fontStack: FontState[] = [];

  let match: RegExpExecArray | null;
  while ((match = tagPattern.exec(decoded)) !== null) {
    result += decoded.substring(lastEnd, match.index);
    lastEnd = tagPattern.lastIndex;

    const rawTagName = match[1];
    const isClosing = rawTagName.startsWith('/');
    const tagName = (isClosing ? rawTagName.slice(1) : rawTagName).toLowerCase();
    const attributes = match[2] || '';

    switch (tagName) {
      case 'i':
      case 'em':
        if (isClosing) {
          italicDepth = Math.max(0, italicDepth - 1);
          if (italicDepth === 0) result += '{\\i0}';
        } else {
          if (italicDepth === 0) result += '{\\i1}';
          italicDepth++;
        }
        break;

      case 'b':
      case 'strong':
        if (isClosing) {
          boldDepth = Math.max(0, boldDepth - 1);
          if (boldDepth === 0) result += '{\\b0}';
        } else {
          if (boldDepth === 0) result += '{\\b1}';
          boldDepth++;
        }
        break;

      case 'u':
        if (isClosing) {
          underlineDepth = Math.max(0, underlineDepth - 1);
          if (underlineDepth === 0) result += '{\\u0}';
        } else {
          if (underlineDepth === 0) result += '{\\u1}';
          underlineDepth++;
        }
        break;

      case 'br':
        result += '\\N';
        break;

      case 'font':
        if (isClosing) {
          if (fontStack.length > 0) {
            fontStack.pop();
            const parent = fontStack[fontStack.length - 1];
            let restoreTags = '';
            if (parent) {
              restoreTags += parent.colorAss ? `\\c${parent.colorAss}` : '\\c';
              restoreTags += parent.face ? `\\fn${parent.face}` : '\\fn';
              restoreTags += parent.size ? `\\fs${parent.size}` : '\\fs';
            } else {
              restoreTags += '\\c\\fn\\fs';
            }
            if (restoreTags) result += `{${restoreTags}}`;
          }
        } else {
          const colorMatch = /color\s*=\s*["']?([^"'\s>]+)["']?/i.exec(attributes);
          const faceMatch = /face\s*=\s*["']?([^"'\s>]+)["']?/i.exec(attributes);
          const sizeMatch = /size\s*=\s*["']?([^"'\s>]+)["']?/i.exec(attributes);

          const parsedColor = colorMatch ? colorNameToAssHex(colorMatch[1]) : null;
          const parsedFace = faceMatch ? faceMatch[1].trim() : null;
          const parsedSize = sizeMatch ? sizeMatch[1].trim() : null;

          fontStack.push({ colorAss: parsedColor, face: parsedFace, size: parsedSize });

          let fontTags = '';
          if (parsedColor) fontTags += `\\c${parsedColor}`;
          if (parsedFace) fontTags += `\\fn${parsedFace}`;
          if (parsedSize) fontTags += `\\fs${parsedSize}`;

          if (fontTags) result += `{${fontTags}}`;
        }
        break;
    }
  }

  if (lastEnd < decoded.length) {
    result += decoded.substring(lastEnd);
  }

  return result;
}

export function cleanToPlainText(input: string): string {
  return decodeHtmlEntities(
    input
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/\\N/g, '\n')
      .replace(/\\n/g, '\n')
      .replace(/\\h/g, ' ')
      .replace(/<[^>]*>/g, '')
      .replace(/\{[^}]*\}/g, '')
  ).trim();
}
