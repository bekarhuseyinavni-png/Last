import React, { useRef, useState, useEffect } from 'react';
import { AssStyleDefinition, SubtitleCue, SubtitleStyle } from '../types';
import { parseTags, updatePos } from '../utils/assTagManager';
import { getAssAlignment } from '../utils/assGenerator';
import { htmlToAss } from '../utils/htmlSubtitleParser';
import { assStyleDefinitionToSubtitleStyle } from '../utils/subtitleParser';

interface SubtitleOverlayProps {
  activeCues: SubtitleCue[];
  style: SubtitleStyle;
  styleDefinitions?: AssStyleDefinition[];
  sourceVideoWidth?: number;
  sourceVideoHeight?: number;
  currentPositionMs: number;
  onCueDragged?: (cueId: number, newAssX: number, newAssY: number) => void;
  onCueDragEnded?: (cueId: number) => void;
  className?: string;
}

export const SubtitleOverlay: React.FC<SubtitleOverlayProps> = ({
  activeCues,
  style,
  styleDefinitions,
  sourceVideoWidth = 1920,
  sourceVideoHeight = 1080,
  currentPositionMs,
  onCueDragged,
  onCueDragEnded,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateDims = () => {
      setDimensions({ width: el.clientWidth, height: el.clientHeight });
    };

    updateDims();
    const observer = new ResizeObserver(updateDims);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Strictly filter only cues that should be visible at currentPositionMs (between startTimeMs and endTimeMs)
  const cuesToRender = activeCues.filter((cue) => {
    const adjustedTime = currentPositionMs - (style.timeOffsetMs || 0);
    return adjustedTime >= cue.startTimeMs && adjustedTime <= cue.endTimeMs;
  });

  if (cuesToRender.length === 0) return null;

  const playResX = sourceVideoWidth > 0 ? sourceVideoWidth : 1920;
  const playResY = sourceVideoHeight > 0 ? sourceVideoHeight : 1080;
  const videoAspect = playResX / playResY;

  const containerW = dimensions.width || 800;
  const containerH = dimensions.height || 450;
  const containerAspect = containerW / (containerH || 1);

  let contentW = containerW;
  let contentH = containerH;
  let contentOffsetX = 0;
  let contentOffsetY = 0;

  if (containerAspect > videoAspect) {
    // Pillarbox
    contentH = containerH;
    contentW = contentH * videoAspect;
    contentOffsetX = (containerW - contentW) / 2;
  } else {
    // Letterbox
    contentW = containerW;
    contentH = contentW / videoAspect;
    contentOffsetY = (containerH - contentH) / 2;
  }

  const assScale = contentH / playResY;

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 pointer-events-none select-none overflow-hidden ${className}`}
    >
      <div
        className="absolute"
        style={{
          left: `${contentOffsetX}px`,
          top: `${contentOffsetY}px`,
          width: `${contentW}px`,
          height: `${contentH}px`,
        }}
      >
        {cuesToRender.map((cue) => {
          const matchedDef = styleDefinitions?.find(
            (s) => s.name.toLowerCase() === (cue.styleName || 'default').toLowerCase()
          );
          const effectiveCueStyle = matchedDef ? assStyleDefinitionToSubtitleStyle(matchedDef) : style;

          return (
            <AegisubSubtitleItem
              key={cue.id}
              cue={cue}
              style={effectiveCueStyle}
              playResX={playResX}
              playResY={playResY}
              assScale={assScale}
              currentPositionMs={currentPositionMs}
              onCueDragged={onCueDragged}
              onCueDragEnded={onCueDragEnded}
            />
          );
        })}
      </div>
    </div>
  );
};

interface ItemProps {
  cue: SubtitleCue;
  style: SubtitleStyle;
  playResX: number;
  playResY: number;
  assScale: number;
  currentPositionMs: number;
  onCueDragged?: (cueId: number, newAssX: number, newAssY: number) => void;
  onCueDragEnded?: (cueId: number) => void;
}

const AegisubSubtitleItem: React.FC<ItemProps> = ({
  cue,
  style,
  playResX,
  playResY,
  assScale,
  currentPositionMs,
  onCueDragged,
  onCueDragEnded,
}) => {
  const tags = parseTags(cue.rawText);
  const itemRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Alignment \an1..\an9
  const alignmentAn = tags.an ?? getAssAlignment(style.verticalAlign, style.horizontalAlign);

  // Font size
  const fsAss = tags.fs ?? (cue.customPositionEnabled && cue.customFontSizeSp ? cue.customFontSizeSp : style.fontSizeSp);
  const fontSizePx = fsAss * assScale;

  // Colors
  const primaryColor = tags.c || tags.c1 ? parseAssHexColor(tags.c || tags.c1!) : style.textColor;
  const outlineColor = tags.c3 ? parseAssHexColor(tags.c3) : style.outlineColor;
  const shadowColor = tags.c4 ? parseAssHexColor(tags.c4) : 'rgba(0,0,0,0.75)';

  const bordAss = tags.bord ?? (style.hasOutline ? style.outlineWidth : 0);
  const effectiveOutlinePx = bordAss * assScale;

  const shadAss = tags.shad ?? (style.hasOutline ? 2 : 0);
  const shadowOffsetPx = shadAss * assScale;

  // Styles
  const isBold = tags.b !== undefined && tags.b !== null ? tags.b !== 0 : (cue.customIsBold ?? style.isBold);
  const isItalic = tags.i ?? (cue.customIsItalic ?? style.isItalic);
  const isUnderline = tags.u ?? (cue.customIsUnderline ?? style.isUnderline);
  const isStrike = tags.s ?? false;

  const fscx = (tags.fscx ?? 100) / 100;
  const fscy = (tags.fscy ?? 100) / 100;
  const frz = tags.frz ?? cue.customAngle ?? (style.angle || 0);

  // Fade alpha \fad(fadeIn, fadeOut)
  let fadeAlpha = 1;
  if (tags.fad && currentPositionMs > 0) {
    const [fadeInMs, fadeOutMs] = tags.fad;
    const elapsed = Math.max(0, currentPositionMs - cue.startTimeMs);
    const remaining = Math.max(0, cue.endTimeMs - currentPositionMs);
    if (fadeInMs > 0 && elapsed < fadeInMs) {
      fadeAlpha = Math.max(0, Math.min(1, elapsed / fadeInMs));
    } else if (fadeOutMs > 0 && remaining < fadeOutMs) {
      fadeAlpha = Math.max(0, Math.min(1, remaining / fadeOutMs));
    }
  }

  // Position calculation
  let anchorAssX = playResX / 2;
  let anchorAssY = playResY - style.verticalOffsetDp;

  if (tags.pos) {
    anchorAssX = tags.pos[0];
    anchorAssY = tags.pos[1];
  } else {
    const marginV = cue.marginV && cue.marginV > 0 ? cue.marginV : style.verticalOffsetDp;
    const marginH = style.horizontalPaddingDp;

    if ([1, 4, 7].includes(alignmentAn)) anchorAssX = marginH;
    else if ([3, 6, 9].includes(alignmentAn)) anchorAssX = playResX - marginH;
    else anchorAssX = playResX / 2;

    if ([7, 8, 9].includes(alignmentAn)) anchorAssY = marginV;
    else if ([4, 5, 6].includes(alignmentAn)) anchorAssY = playResY / 2;
    else anchorAssY = playResY - marginV;
  }

  const screenAnchorX = anchorAssX * assScale;
  const screenAnchorY = anchorAssY * assScale;

  // Text anchor transform
  let translateX = '-50%';
  if ([1, 4, 7].includes(alignmentAn)) translateX = '0%';
  else if ([3, 6, 9].includes(alignmentAn)) translateX = '-100%';

  let translateY = '-100%';
  if ([7, 8, 9].includes(alignmentAn)) translateY = '0%';
  else if ([4, 5, 6].includes(alignmentAn)) translateY = '-50%';

  let textAlign: 'left' | 'center' | 'right' = 'center';
  if ([1, 4, 7].includes(alignmentAn)) textAlign = 'left';
  else if ([3, 6, 9].includes(alignmentAn)) textAlign = 'right';

  // Handle Dragging
  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);

    let startClientX = e.clientX;
    let startClientY = e.clientY;
    let curAssX = anchorAssX;
    let curAssY = anchorAssY;

    const onPointerMove = (moveEvt: PointerEvent) => {
      const deltaScreenX = moveEvt.clientX - startClientX;
      const deltaScreenY = moveEvt.clientY - startClientY;
      startClientX = moveEvt.clientX;
      startClientY = moveEvt.clientY;

      const deltaAssX = deltaScreenX / (assScale || 1);
      const deltaAssY = deltaScreenY / (assScale || 1);

      curAssX = Math.max(0, Math.min(playResX, curAssX + deltaAssX));
      curAssY = Math.max(0, Math.min(playResY, curAssY + deltaAssY));

      onCueDragged?.(cue.id, curAssX, curAssY);
    };

    const onPointerUp = () => {
      setIsDragging(false);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      onCueDragEnded?.(cue.id);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  // Render tokens
  const renderedText = renderStyledSubtitleText(cue.rawText, cue.cleanText, assScale);

  const textShadowParts: string[] = [];
  if (effectiveOutlinePx > 0 && !style.hasBackgroundBox) {
    const stroke = effectiveOutlinePx;
    // Multi-angle text shadow for crisp subtitle outline border
    for (let angle = 0; angle < 360; angle += 30) {
      const rad = (angle * Math.PI) / 180;
      const ox = (Math.cos(rad) * stroke).toFixed(1);
      const oy = (Math.sin(rad) * stroke).toFixed(1);
      textShadowParts.push(`${ox}px ${oy}px 0 ${outlineColor}`);
    }
  }
  if (shadowOffsetPx > 0) {
    textShadowParts.push(`${shadowOffsetPx.toFixed(1)}px ${shadowOffsetPx.toFixed(1)}px 2px ${shadowColor}`);
  }

  return (
    <div
      ref={itemRef}
      onPointerDown={handlePointerDown}
      className={`absolute pointer-events-auto cursor-move transition-shadow ${
        isDragging ? 'ring-2 ring-indigo-400 ring-offset-2 ring-offset-black/50' : ''
      }`}
      style={{
        left: `${screenAnchorX}px`,
        top: `${screenAnchorY}px`,
        transform: `translate(${translateX}, ${translateY}) scale(${fscx}, ${fscy}) rotate(${frz}deg)`,
        transformOrigin: `${translateX === '0%' ? 'left' : translateX === '-100%' ? 'right' : 'center'} ${
          translateY === '0%' ? 'top' : translateY === '-100%' ? 'bottom' : 'center'
        }`,
        opacity: fadeAlpha,
        fontSize: `${fontSizePx}px`,
        fontFamily: style.fontName || 'Arial, sans-serif',
        fontWeight: isBold ? 'bold' : 'normal',
        fontStyle: isItalic ? 'italic' : 'normal',
        textDecoration: isUnderline && isStrike ? 'underline line-through' : isUnderline ? 'underline' : isStrike ? 'line-through' : 'none',
        color: primaryColor,
        textAlign,
        whiteSpace: 'pre-wrap',
        textShadow: textShadowParts.length > 0 ? textShadowParts.join(', ') : undefined,
        backgroundColor: style.hasBackgroundBox ? style.backgroundColor : undefined,
        padding: style.hasBackgroundBox ? `${Math.round(4 * assScale)}px ${Math.round(8 * assScale)}px` : undefined,
        borderRadius: style.hasBackgroundBox ? `${Math.round(6 * assScale)}px` : undefined,
        lineHeight: 1.25,
      }}
      title={`Altyazı #${cue.id} (${cue.cleanText}) - Sürükleyerek konumu ayarlayın`}
    >
      {renderedText}
    </div>
  );
};

function parseAssHexColor(assColor: string): string {
  const clean = assColor.replace(/[&Hh]/g, '').trim();
  const hex = clean.padStart(6, '0').slice(-6);
  if (hex.length >= 6) {
    const b = hex.substring(0, 2);
    const g = hex.substring(2, 4);
    const r = hex.substring(4, 6);
    return `#${r}${g}${b}`;
  }
  return '#FFFFFF';
}

function renderStyledSubtitleText(rawText: string, cleanText: string, assScale: number): React.ReactNode {
  const source = rawText?.trim() ? rawText : cleanText;
  const assText = htmlToAss(source);

  const tokenPattern = /(\{[^}]*\}|\\N|\\n|\\h)/g;
  const tokens = assText.split(tokenPattern);

  let activeBold = false;
  let activeItalic = false;
  let activeUnderline = false;
  let activeStrike = false;
  let activeColor: string | null = null;
  let activeFontSize: number | null = null;

  const elements: React.ReactNode[] = [];

  tokens.forEach((token, idx) => {
    if (!token) return;

    if (token === '\\N' || token === '\\n') {
      elements.push(<br key={`br-${idx}`} />);
      return;
    }
    if (token === '\\h') {
      elements.push(' ');
      return;
    }

    if (token.startsWith('{') && token.endsWith('}')) {
      const inner = token.slice(1, -1);
      if (inner.includes('\\i1')) activeItalic = true;
      if (inner.includes('\\i0')) activeItalic = false;
      if (inner.includes('\\b1') || inner.includes('\\b700')) activeBold = true;
      if (inner.includes('\\b0')) activeBold = false;
      if (inner.includes('\\u1')) activeUnderline = true;
      if (inner.includes('\\u0')) activeUnderline = false;
      if (inner.includes('\\s1')) activeStrike = true;
      if (inner.includes('\\s0')) activeStrike = false;

      const colMatch = /\\(?:1c|c)(&?H?[0-9a-fA-F]{6}&?)/.exec(inner);
      if (colMatch) {
        activeColor = parseAssHexColor(colMatch[1]);
      }

      const fsMatch = /\\fs([0-9.]+)/.exec(inner);
      if (fsMatch) {
        activeFontSize = parseFloat(fsMatch[1]) * assScale;
      }
      return;
    }

    const spanStyle: React.CSSProperties = {};
    if (activeBold) spanStyle.fontWeight = 'bold';
    if (activeItalic) spanStyle.fontStyle = 'italic';
    if (activeUnderline) spanStyle.textDecoration = 'underline';
    if (activeStrike) spanStyle.textDecoration = 'line-through';
    if (activeColor) spanStyle.color = activeColor;
    if (activeFontSize) spanStyle.fontSize = `${activeFontSize}px`;

    elements.push(
      <span key={`text-${idx}`} style={spanStyle}>
        {token}
      </span>
    );
  });

  return elements.length > 0 ? elements : cleanText;
}
