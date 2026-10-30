import {
  SubtitleCue,
  SubtitleStyle,
  SubtitleVerticalAlign,
  SubtitleHorizontalAlign,
  AssStyleDefinition,
} from '../types';
import { cleanToPlainText, htmlToAss } from './htmlSubtitleParser';

export function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const millis = ms % 1000;
  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
}

export function parseTimestamp(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const rawNum = Number(trimmed);
  if (!isNaN(rawNum) && rawNum >= 0) return rawNum;

  const normalized = trimmed.replace(',', '.');
  const parts = normalized.split(':');
  try {
    if (parts.length === 3) {
      const hours = parseInt(parts[0], 10);
      const minutes = parseInt(parts[1], 10);
      const secParts = parts[2].split('.');
      const seconds = parseInt(secParts[0], 10);
      const millis = secParts[1] ? parseInt(secParts[1].padEnd(3, '0').slice(0, 3), 10) : 0;
      return (hours * 3600 + minutes * 60 + seconds) * 1000 + millis;
    }
    if (parts.length === 2) {
      const minutes = parseInt(parts[0], 10);
      const secParts = parts[1].split('.');
      const seconds = parseInt(secParts[0], 10);
      const millis = secParts[1] ? parseInt(secParts[1].padEnd(3, '0').slice(0, 3), 10) : 0;
      return (minutes * 60 + seconds) * 1000 + millis;
    }
    if (parts.length === 1) {
      const secParts = parts[0].split('.');
      const seconds = parseInt(secParts[0], 10);
      const millis = secParts[1] ? parseInt(secParts[1].padEnd(3, '0').slice(0, 3), 10) : 0;
      return seconds * 1000 + millis;
    }
  } catch {
    return null;
  }
  return null;
}

const SRT_TIME_REGEX = /(\d{1,2}):(\d{2}):(\d{2})[,.](\d{1,3})\s*-->\s*(\d{1,2}):(\d{2}):(\d{2})[,.](\d{1,3})/;

function parseSrtTimestamp(h: string, m: string, s: string, ms: string): number {
  const hours = parseInt(h, 10) || 0;
  const minutes = parseInt(m, 10) || 0;
  const seconds = parseInt(s, 10) || 0;
  let millis = 0;
  if (ms) {
    if (ms.length === 1) millis = parseInt(ms, 10) * 100;
    else if (ms.length === 2) millis = parseInt(ms, 10) * 10;
    else millis = parseInt(ms.slice(0, 3), 10);
  }
  return (hours * 3600 + minutes * 60 + seconds) * 1000 + millis;
}

const ASS_TIME_REGEX = /(\d{1,2}):(\d{2}):(\d{2})\.(\d{1,3})/;

function parseAssTimestamp(timestamp: string): number {
  const match = ASS_TIME_REGEX.exec(timestamp.trim());
  if (match) {
    const hours = parseInt(match[1], 10) || 0;
    const minutes = parseInt(match[2], 10) || 0;
    const seconds = parseInt(match[3], 10) || 0;
    const frac = match[4] || '0';
    let millis = 0;
    if (frac.length === 1) millis = parseInt(frac, 10) * 100;
    else if (frac.length === 2) millis = parseInt(frac, 10) * 10;
    else millis = parseInt(frac.slice(0, 3), 10);
    return (hours * 3600 + minutes * 60 + seconds) * 1000 + millis;
  }
  return -1;
}

export function parseSrt(content: string): SubtitleCue[] {
  const cues: SubtitleCue[] = [];
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  let i = 0;
  let cueIndex = 1;

  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) {
      i++;
      continue;
    }

    let timeMatcher = SRT_TIME_REGEX.exec(line);
    if (timeMatcher) {
      const startMs = parseSrtTimestamp(timeMatcher[1], timeMatcher[2], timeMatcher[3], timeMatcher[4]);
      const endMs = parseSrtTimestamp(timeMatcher[5], timeMatcher[6], timeMatcher[7], timeMatcher[8]);

      i++;
      const textLines: string[] = [];
      while (i < lines.length && lines[i].trim().length > 0) {
        textLines.push(lines[i].trim());
        i++;
      }

      const rawText = textLines.join('\n');
      const assConverted = htmlToAss(rawText);
      const clean = cleanToPlainText(rawText);

      if (clean) {
        cues.push({
          id: cueIndex++,
          startTimeMs: startMs,
          endTimeMs: endMs,
          rawText: assConverted,
          cleanText: clean,
          styleName: 'Default',
          layer: 0,
        });
      }
    } else {
      if (i + 1 < lines.length) {
        timeMatcher = SRT_TIME_REGEX.exec(lines[i + 1].trim());
        if (timeMatcher) {
          const startMs = parseSrtTimestamp(timeMatcher[1], timeMatcher[2], timeMatcher[3], timeMatcher[4]);
          const endMs = parseSrtTimestamp(timeMatcher[5], timeMatcher[6], timeMatcher[7], timeMatcher[8]);

          i += 2;
          const textLines: string[] = [];
          while (i < lines.length && lines[i].trim().length > 0) {
            textLines.push(lines[i].trim());
            i++;
          }

          const rawText = textLines.join('\n');
          const assConverted = htmlToAss(rawText);
          const clean = cleanToPlainText(rawText);

          if (clean) {
            cues.push({
              id: cueIndex++,
              startTimeMs: startMs,
              endTimeMs: endMs,
              rawText: assConverted,
              cleanText: clean,
              styleName: 'Default',
              layer: 0,
            });
          }
          continue;
        }
      }
      i++;
    }
  }

  return cues.sort((a, b) => a.startTimeMs - b.startTimeMs);
}

export function parseAss(content: string): SubtitleCue[] {
  const cues: SubtitleCue[] = [];
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  let isInEvents = false;
  let formatColumns = ['Layer', 'Start', 'End', 'Style', 'Name', 'MarginL', 'MarginR', 'MarginV', 'Effect', 'Text'];
  let cueIndex = 1;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.toLowerCase().startsWith('[events]')) {
      isInEvents = true;
      continue;
    }
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      isInEvents = false;
    }

    if (!isInEvents) {
      if (!trimmed.toLowerCase().startsWith('dialogue:') && !trimmed.toLowerCase().startsWith('format:')) {
        continue;
      }
    }

    if (trimmed.toLowerCase().startsWith('format:')) {
      const formatStr = trimmed.substring(7).trim();
      formatColumns = formatStr.split(',').map((c) => c.trim().toLowerCase());
      continue;
    }

    if (trimmed.toLowerCase().startsWith('dialogue:')) {
      const valueStr = trimmed.substring(9).trim();
      const maxSplits = formatColumns.length;
      const parts = splitAssLine(valueStr, maxSplits);

      const colMap: Record<string, string> = {};
      for (let c = 0; c < formatColumns.length; c++) {
        if (c < parts.length) {
          colMap[formatColumns[c].toLowerCase()] = parts[c].trim();
        }
      }

      const startStr = colMap['start'] || '';
      const endStr = colMap['end'] || '';
      const textStr = colMap['text'] || (parts.length >= maxSplits ? parts[maxSplits - 1] : '');
      const styleStr = colMap['style'] || 'Default';
      const actorStr = colMap['name'] || '';
      const layerStr = colMap['layer'] || '0';
      const marginVStr = colMap['marginv'] || '0';
      const marginLStr = colMap['marginl'] || '0';
      const marginRStr = colMap['marginr'] || '0';
      const effectStr = colMap['effect'] || '';

      const startMs = parseAssTimestamp(startStr);
      const endMs = parseAssTimestamp(endStr);

      if (startMs >= 0 && endMs >= startMs) {
        const clean = cleanToPlainText(textStr);
        if (clean) {
          cues.push({
            id: cueIndex++,
            startTimeMs: startMs,
            endTimeMs: endMs,
            rawText: textStr,
            cleanText: clean,
            styleName: styleStr,
            layer: parseInt(layerStr, 10) || 0,
            marginV: parseInt(marginVStr, 10) || 0,
            marginL: parseInt(marginLStr, 10) || 0,
            marginR: parseInt(marginRStr, 10) || 0,
            actor: actorStr,
            effect: effectStr,
          });
        }
      }
    }
  }

  return cues.sort((a, b) => a.startTimeMs - b.startTimeMs);
}

function splitAssLine(str: string, maxParts: number): string[] {
  const result: string[] = [];
  let cur = '';
  let partsFound = 0;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char === ',' && partsFound < maxParts - 1) {
      result.push(cur);
      cur = '';
      partsFound++;
    } else {
      cur += char;
    }
  }
  result.push(cur);
  return result;
}

export function parse(content: string, fileName?: string): SubtitleCue[] {
  const cleanContent = content.replace(/^\uFEFF/, '');
  const lowerName = fileName?.toLowerCase() || '';

  if (
    lowerName.endsWith('.ass') ||
    lowerName.endsWith('.ssa') ||
    cleanContent.includes('[Events]') ||
    cleanContent.includes('Dialogue:')
  ) {
    return parseAss(cleanContent);
  }
  return parseSrt(cleanContent);
}

export function extractAssStyles(content: string): string[] {
  const styles: string[] = [];
  let inStyles = false;
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.toLowerCase().startsWith('[v4+ styles]') || trimmed.toLowerCase().startsWith('[v4 styles]')) {
      inStyles = true;
      continue;
    }
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      inStyles = false;
    }
    if (inStyles && trimmed.toLowerCase().startsWith('style:')) {
      styles.push(trimmed);
    }
  }
  return styles;
}

export function extractScriptResolution(content: string): { width: number; height: number } | null {
  let rx: number | null = null;
  let ry: number | null = null;
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.toLowerCase().startsWith('playresx:')) {
      rx = parseInt(trimmed.substring(9).trim(), 10);
    } else if (trimmed.toLowerCase().startsWith('playresy:')) {
      ry = parseInt(trimmed.substring(9).trim(), 10);
    }
    if (trimmed.toLowerCase().startsWith('[events]')) break;
  }
  if (rx || ry) {
    return { width: rx || 1920, height: ry || 1080 };
  }
  return null;
}

export function parseAssColor(colorStr: string): string | null {
  const clean = colorStr.trim().replace(/[&Hh]/g, '');
  const hexVal = parseInt(clean, 16);
  if (isNaN(hexVal)) return null;

  if (clean.length > 6) {
    const a = (hexVal >> 24) & 0xff;
    const b = (hexVal >> 16) & 0xff;
    const g = (hexVal >> 8) & 0xff;
    const r = hexVal & 0xff;
    const alpha = Math.max(0, Math.min(255, 255 - a)) / 255;
    return `rgba(${r},${g},${b},${alpha.toFixed(2)})`;
  }
  const b = (hexVal >> 16) & 0xff;
  const g = (hexVal >> 8) & 0xff;
  const r = hexVal & 0xff;
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function parseAllAssStyles(content: string): AssStyleDefinition[] {
  const styles: AssStyleDefinition[] = [];
  let formatCols = [
    'name', 'fontname', 'fontsize', 'primarycolour', 'secondarycolour',
    'outlinecolour', 'backcolour', 'bold', 'italic', 'underline',
    'strikeout', 'scalex', 'scaley', 'spacing', 'angle',
    'borderstyle', 'outline', 'shadow', 'alignment', 'marginl', 'marginr', 'marginv', 'encoding'
  ];

  let inStyles = false;

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.toLowerCase().startsWith('[v4+ styles]') || trimmed.toLowerCase().startsWith('[v4 styles]')) {
      inStyles = true;
      continue;
    }
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      inStyles = false;
    }
    if (inStyles || trimmed.toLowerCase().startsWith('style:')) {
      if (trimmed.toLowerCase().startsWith('format:') && trimmed.toLowerCase().includes('fontname')) {
        formatCols = trimmed.substring(7).split(',').map((c) => c.trim().toLowerCase());
        continue;
      }
      if (trimmed.toLowerCase().startsWith('style:')) {
        try {
          const parts = trimmed.substring(6).split(',').map((p) => p.trim());
          const colMap: Record<string, string> = {};
          for (let c = 0; c < formatCols.length; c++) {
            if (c < parts.length) {
              colMap[formatCols[c]] = parts[c];
            }
          }

          const sName = colMap['name'] || parts[0] || 'Default';
          const fontName = colMap['fontname'] || 'Arial';
          const fontSize = parseFloat(colMap['fontsize'] || '48') || 48;
          const primaryColor = parseAssColor(colMap['primarycolour'] || '&H00FFFFFF') || '#FFFFFF';
          const secondaryColor = parseAssColor(colMap['secondarycolour'] || '&H000000FF') || '#0000FF';
          const outlineColor = parseAssColor(colMap['outlinecolour'] || '&H00000000') || '#000000';
          const backColor = parseAssColor(colMap['backcolour'] || '&H80000000') || 'rgba(0,0,0,0.6)';

          const bold = (parseInt(colMap['bold'] || '0', 10) || 0) !== 0;
          const italic = (parseInt(colMap['italic'] || '0', 10) || 0) !== 0;
          const underline = (parseInt(colMap['underline'] || '0', 10) || 0) !== 0;
          const strikeOut = (parseInt(colMap['strikeout'] || '0', 10) || 0) !== 0;

          const scaleX = parseFloat(colMap['scalex'] || '100') || 100;
          const scaleY = parseFloat(colMap['scaley'] || '100') || 100;
          const spacing = parseFloat(colMap['spacing'] || '0') || 0;
          const angle = parseFloat(colMap['angle'] || '0') || 0;

          const borderStyle = parseInt(colMap['borderstyle'] || '1', 10) || 1;
          const outline = parseFloat(colMap['outline'] || '2.5') || 2.5;
          const shadow = parseFloat(colMap['shadow'] || '2') || 2;
          const alignment = parseInt(colMap['alignment'] || '2', 10) || 2;

          const marginL = parseFloat(colMap['marginl'] || '20') || 20;
          const marginR = parseFloat(colMap['marginr'] || '20') || 20;
          const marginV = parseFloat(colMap['marginv'] || '40') || 40;

          styles.push({
            name: sName,
            fontName,
            fontSize,
            primaryColor,
            secondaryColor,
            outlineColor,
            backColor,
            bold,
            italic,
            underline,
            strikeOut,
            scaleX,
            scaleY,
            spacing,
            angle,
            borderStyle,
            outline,
            shadow,
            alignment,
            marginL,
            marginR,
            marginV,
          });
        } catch {
          // ignore malformed line
        }
      }
    }
  }

  if (styles.length === 0) {
    styles.push(
      {
        name: 'Default',
        fontName: 'Arial',
        fontSize: 50,
        primaryColor: '#FFFFFF',
        outlineColor: '#000000',
        backColor: 'rgba(0,0,0,0.6)',
        bold: true,
        italic: false,
        underline: false,
        angle: 0,
        borderStyle: 1,
        outline: 3,
        shadow: 2,
        alignment: 2,
        marginL: 30,
        marginR: 30,
        marginV: 40,
      },
      {
        name: 'Main',
        fontName: 'Roboto',
        fontSize: 48,
        primaryColor: '#F1F5F9',
        outlineColor: '#141721',
        backColor: 'rgba(0,0,0,0.6)',
        bold: true,
        italic: false,
        underline: false,
        angle: 0,
        borderStyle: 1,
        outline: 2.5,
        shadow: 2,
        alignment: 2,
        marginL: 30,
        marginR: 30,
        marginV: 40,
      }
    );
  }

  return styles;
}

export function assStyleDefinitionToSubtitleStyle(def: AssStyleDefinition): SubtitleStyle {
  let vAlign: SubtitleVerticalAlign = 'BOTTOM';
  let hAlign: SubtitleHorizontalAlign = 'CENTER';

  switch (def.alignment) {
    case 7: vAlign = 'TOP'; hAlign = 'LEFT'; break;
    case 8: vAlign = 'TOP'; hAlign = 'CENTER'; break;
    case 9: vAlign = 'TOP'; hAlign = 'RIGHT'; break;
    case 4: vAlign = 'MIDDLE'; hAlign = 'LEFT'; break;
    case 5: vAlign = 'MIDDLE'; hAlign = 'CENTER'; break;
    case 6: vAlign = 'MIDDLE'; hAlign = 'RIGHT'; break;
    case 1: vAlign = 'BOTTOM'; hAlign = 'LEFT'; break;
    case 3: vAlign = 'BOTTOM'; hAlign = 'RIGHT'; break;
    default: vAlign = 'BOTTOM'; hAlign = 'CENTER'; break;
  }

  return {
    fontName: def.fontName,
    fontSizeSp: def.fontSize,
    isBold: def.bold,
    isItalic: def.italic,
    isUnderline: def.underline,
    textColor: def.primaryColor,
    outlineColor: def.outlineColor,
    hasOutline: def.outline > 0,
    outlineWidth: def.outline,
    hasBackgroundBox: def.borderStyle === 3,
    backgroundColor: def.backColor,
    verticalAlign: vAlign,
    horizontalAlign: hAlign,
    verticalOffsetDp: def.marginV,
    horizontalPaddingDp: def.marginL,
    timeOffsetMs: 0,
    angle: def.angle,
  };
}

export function parseAssDefaultStyle(content: string): SubtitleStyle | null {
  const all = parseAllAssStyles(content);
  const def = all.find((s) => s.name.toLowerCase() === 'default') || all[0];
  return def ? assStyleDefinitionToSubtitleStyle(def) : null;
}

export function parseAssScriptResolution(content: string): { playResX: number; playResY: number } {
  let playResX = 1920;
  let playResY = 1080;
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.toLowerCase().startsWith('playresx:')) {
      const val = parseInt(trimmed.substring(9).trim(), 10);
      if (!isNaN(val) && val > 0) playResX = val;
    } else if (trimmed.toLowerCase().startsWith('playresy:')) {
      const val = parseInt(trimmed.substring(9).trim(), 10);
      if (!isNaN(val) && val > 0) playResY = val;
    }
  }
  return { playResX, playResY };
}

export function exportToSrt(cues: SubtitleCue[]): string {
  const sorted = [...cues].sort((a, b) => a.startTimeMs - b.startTimeMs);
  return (
    sorted
      .map((cue, index) => {
        const start = formatSrtTimestamp(cue.startTimeMs);
        const end = formatSrtTimestamp(cue.endTimeMs);
        return `${index + 1}\n${start} --> ${end}\n${cue.cleanText}`;
      })
      .join('\n\n') + '\n'
  );
}

export function formatSrtTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const millis = ms % 1000;
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(millis).padStart(3, '0')}`;
}

export function getSampleAssContent(): string {
  return `[Script Info]
Title: remsubs playground Sample Demo
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
PlayResX: 1920
PlayResY: 1080

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,50,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,3,2,2,30,30,40,1
Style: Main,Roboto,46,&H00F1F5F9,&H000000FF,&H00141721,&H80000000,-1,0,0,0,100,100,0,0,1,2.5,2,2,30,30,40,1
Style: Sign,Montserrat,40,&H0038BDF8,&H000000FF,&H000C0E14,&H90000000,-1,0,0,0,100,100,0,0,1,2,0,8,20,20,30,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:01.00,0:00:04.50,Default,,0,0,0,,{\\b1}remsubs playground{\\b0}\\NVideo ve Altyazı Önizleme Sistemi 💙
Dialogue: 0,0:00:05.00,0:00:08.50,Main,,0,0,0,,Bu bir {\\i1}Advanced SubStation Alpha (.ass){\\i0} altyazı örneğidir.
Dialogue: 0,0:00:09.00,0:00:13.00,Sign,,0,0,0,,{\\pos(960,140)}Re:Zero Kara Hajimeru Isekai Seikatsu
Dialogue: 0,0:00:13.50,0:00:18.00,Main,,0,0,0,,İstediğiniz {\\b1}.TTF font dosyasını{\\b0} yükleyip anında uygulayabilirsiniz!
Dialogue: 0,0:00:18.50,0:00:23.50,Default,,0,0,0,,Altyazının font boyutunu, konumunu ve rengini kolayca ayarlayın.
Dialogue: 0,0:00:24.00,0:00:29.00,Main,,0,0,0,,Diyalog listesinden satırlara tıklayarak videoda gezinebilirsiniz.
Dialogue: 0,0:00:30.00,0:00:35.00,Default,,0,0,0,,remsubs playground ile kusursuz senkronizasyon ve altyazı tasarımı!
`;
}

export function getSampleSrtContent(): string {
  return `1
00:00:01,000 --> 00:00:04,500
remsubs playground - SRT Altyazı Desteği

2
00:00:05,000 --> 00:00:08,500
Seçtiğiniz video lokalden önizlenir.

3
00:00:09,000 --> 00:00:13,000
Özel TTF font yükleyebilir ve yerleşimini değiştirebilirsiniz.

4
00:00:13,500 --> 00:00:18,000
Eş zamanlı altyazı önizlemesi ve zamanlama ayarı!
`;
}
