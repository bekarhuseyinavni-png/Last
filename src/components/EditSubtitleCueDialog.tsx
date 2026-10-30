import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  SubtitleCue,
  SubtitleHorizontalAlign,
  SubtitleVerticalAlign,
  AssStyleDefinition,
  SubtitleFrameConfig,
} from '../types';
import { formatTimestamp, parseTimestamp } from '../utils/subtitleParser';
import { cleanToPlainText } from '../utils/htmlSubtitleParser';
import { parseTags, updateTag, updatePos, updateAngle } from '../utils/assTagManager';
import {
  Clock,
  Trash2,
  Check,
  X,
  Eye,
  RotateCw,
  Move,
  Layers,
  Sparkles,
} from 'lucide-react';

interface EditSubtitleCueDialogProps {
  cue: SubtitleCue;
  currentVideoPositionMs: number;
  videoUrl?: string | null;
  styles?: AssStyleDefinition[];
  subtitleFrame?: SubtitleFrameConfig;
  onClose: () => void;
  onSave: (updated: SubtitleCue) => void;
  onDelete: (id: number) => void;
}

export const EditSubtitleCueDialog: React.FC<EditSubtitleCueDialogProps> = ({
  cue,
  currentVideoPositionMs,
  videoUrl,
  styles = [],
  subtitleFrame = { playResX: 1920, playResY: 1080 },
  onClose,
  onSave,
  onDelete,
}) => {
  // Existing ASS tags parsed from cue rawText
  const initialTags = parseTags(cue.rawText);

  const [startText, setStartText] = useState(formatTimestamp(cue.startTimeMs));
  const [endText, setEndText] = useState(formatTimestamp(cue.endTimeMs));
  const [rawText, setRawText] = useState(cue.rawText);
  const [actor, setActor] = useState(cue.actor || '');
  const [styleName, setStyleName] = useState(cue.styleName || 'Default');
  const [layer, setLayer] = useState(cue.layer || 0);

  // Angle setting: prioritize \frz tag from rawText, or cue.customAngle, or 0
  const initialAngle = initialTags.frz ?? cue.customAngle ?? 0;
  const [angle, setAngle] = useState<number>(initialAngle);

  // Custom positioning & Overrides
  const [customEnabled, setCustomEnabled] = useState(cue.customPositionEnabled || false);
  const [vAlign, setVAlign] = useState<SubtitleVerticalAlign>(cue.customVerticalAlign || 'BOTTOM');
  const [hAlign, setHAlign] = useState<SubtitleHorizontalAlign>(cue.customHorizontalAlign || 'CENTER');
  const [fontSize, setFontSize] = useState<number | undefined>(cue.customFontSizeSp ?? undefined);
  const [isBold, setIsBold] = useState<boolean | undefined>(cue.customIsBold ?? undefined);
  const [isItalic, setIsItalic] = useState<boolean | undefined>(cue.customIsItalic ?? undefined);

  // PlayRes resolution directly governing the preview canvas and coordinate space
  const frameW = subtitleFrame?.playResX && subtitleFrame.playResX > 0 ? subtitleFrame.playResX : 1920;
  const frameH = subtitleFrame?.playResY && subtitleFrame.playResY > 0 ? subtitleFrame.playResY : 1080;
  const frameAspect = frameW / frameH;

  // Position coordinates in 1:1 PlayRes coordinate space
  const initialCoord = initialTags.pos
    ? {
        x: initialTags.pos[0],
        y: initialTags.pos[1],
      }
    : { x: Math.round(frameW / 2), y: Math.round(frameH * 0.85) };

  const [posCoord, setPosCoord] = useState<{ x: number; y: number }>(initialCoord);
  const [hasCustomPos, setHasCustomPos] = useState<boolean>(!!initialTags.pos);

  // Canvas & Video Snapshot
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hiddenVideoRef = useRef<HTMLVideoElement>(null);
  const previewBoxRef = useRef<HTMLDivElement>(null);
  const [previewHeight, setPreviewHeight] = useState<number>(360);
  const [isVideoFrameReady, setIsVideoFrameReady] = useState(false);
  const [isDraggingText, setIsDraggingText] = useState(false);

  useEffect(() => {
    const el = previewBoxRef.current;
    if (!el) return;
    const update = () => {
      if (el.clientHeight > 0) setPreviewHeight(el.clientHeight);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [frameW, frameH]);

  const startMs = parseTimestamp(startText) ?? cue.startTimeMs;
  const endMs = parseTimestamp(endText) ?? cue.endTimeMs;
  const duration = Math.max(0, endMs - startMs);

  // Active style definition for preview styling
  const activePreset = styles.find((s) => s.name.toLowerCase() === styleName.toLowerCase()) || styles[0];

  // Capture video frame at startMs onto canvas matching exact PlayRes resolution
  const drawFrameToCanvas = useCallback(() => {
    const video = hiddenVideoRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (video && video.readyState >= 2 && video.videoWidth > 0) {
      try {
        const vW = video.videoWidth;
        const vH = video.videoHeight;
        const vAspect = vW / vH;
        const targetAspect = frameW / frameH;

        let sWidth = vW;
        let sHeight = vH;
        let sX = 0;
        let sY = 0;

        if (vAspect > targetAspect) {
          sWidth = vH * targetAspect;
          sX = (vW - sWidth) / 2;
        } else {
          sHeight = vW / targetAspect;
          sY = (vH - sHeight) / 2;
        }

        ctx.drawImage(video, sX, sY, sWidth, sHeight, 0, 0, frameW, frameH);
        setIsVideoFrameReady(true);
        return;
      } catch (err) {
        console.warn('Cannot draw video frame (CORS or codec):', err);
      }
    }

    // Fallback: draw stylish dark cinematic background matching PlayRes
    const gradient = ctx.createLinearGradient(0, 0, frameW, frameH);
    gradient.addColorStop(0, '#10141e');
    gradient.addColorStop(0.5, '#1e2436');
    gradient.addColorStop(1, '#0c0e14');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, frameW, frameH);

    // Grid guide lines
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.25)';
    ctx.lineWidth = Math.max(1, Math.round(frameH / 400));
    const padX = Math.round(frameW * 0.05);
    const padY = Math.round(frameH * 0.05);
    ctx.strokeRect(padX, padY, frameW - padX * 2, frameH - padY * 2);
    ctx.beginPath();
    ctx.moveTo(frameW / 2, 0);
    ctx.lineTo(frameW / 2, frameH);
    ctx.moveTo(0, frameH / 2);
    ctx.lineTo(frameW, frameH / 2);
    ctx.stroke();

    // Timecode & PlayRes info text
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = `${Math.max(14, Math.round(frameH * 0.035))}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(`PlayRes: ${frameW}x${frameH}`, frameW / 2, frameH / 2 - 15);
    ctx.fillText(`Giriş Saniyesi: ${formatTimestamp(startMs)}`, frameW / 2, frameH / 2 + 20);
    setIsVideoFrameReady(true);
  }, [startMs, frameW, frameH]);

  // When startMs or videoUrl changes, seek hidden video
  useEffect(() => {
    const video = hiddenVideoRef.current;
    if (video) {
      const seekSec = Math.max(0, startMs / 1000);
      video.currentTime = seekSec;
    } else {
      drawFrameToCanvas();
    }
  }, [startMs, videoUrl, drawFrameToCanvas]);

  const handleAdjustStart = (delta: number) => {
    const next = Math.max(0, startMs + delta);
    setStartText(formatTimestamp(next));
  };

  const handleAdjustEnd = (delta: number) => {
    const next = Math.max(startMs, endMs + delta);
    setEndText(formatTimestamp(next));
  };

  const handleSetStartToCurrent = () => {
    setStartText(formatTimestamp(currentVideoPositionMs));
  };

  const handleSetEndToCurrent = () => {
    setEndText(formatTimestamp(currentVideoPositionMs));
  };

  // Drag text in PlayRes preview
  const handlePreviewMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const box = previewBoxRef.current;
    if (!box) return;
    const rect = box.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    // Scale from rendered element size to exact PlayRes coordinates
    const scaleX = frameW / rect.width;
    const scaleY = frameH / rect.height;

    const newX = Math.round(Math.max(0, Math.min(frameW, clientX * scaleX)));
    const newY = Math.round(Math.max(0, Math.min(frameH, clientY * scaleY)));

    setPosCoord({ x: newX, y: newY });
    setHasCustomPos(true);
    setIsDraggingText(true);
  };

  const handlePreviewMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingText) return;
    const box = previewBoxRef.current;
    if (!box) return;
    const rect = box.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    const scaleX = frameW / rect.width;
    const scaleY = frameH / rect.height;

    const newX = Math.round(Math.max(0, Math.min(frameW, clientX * scaleX)));
    const newY = Math.round(Math.max(0, Math.min(frameH, clientY * scaleY)));

    setPosCoord({ x: newX, y: newY });
  };

  const handlePreviewMouseUp = () => {
    setIsDraggingText(false);
  };

  // Synchronize angle change with rawText ASS tag
  const handleAngleChange = (newAngle: number) => {
    setAngle(newAngle);
    if (newAngle !== 0) {
      setRawText((prev) => updateAngle(prev, newAngle));
    } else {
      setRawText((prev) => updateTag(prev, 'frz', null));
    }
  };

  const handleResetPos = () => {
    setHasCustomPos(false);
    setPosCoord({ x: Math.round(frameW / 2), y: Math.round(frameH * 0.85) });
    setRawText((prev) => updateTag(prev, 'pos', null));
  };

  const handleSave = () => {
    const finalStart = parseTimestamp(startText) ?? cue.startTimeMs;
    const finalEnd = parseTimestamp(endText) ?? cue.endTimeMs;

    let updatedRaw = rawText;

    // Preserve and update \frz if angle is set
    if (angle !== 0) {
      updatedRaw = updateAngle(updatedRaw, angle);
    } else if (initialTags.frz !== undefined) {
      updatedRaw = updateTag(updatedRaw, 'frz', null);
    }

    // Preserve and update \pos() if custom position was moved
    if (hasCustomPos) {
      updatedRaw = updatePos(updatedRaw, posCoord.x, posCoord.y);
    }

    const clean = cleanToPlainText(updatedRaw);

    const updated: SubtitleCue = {
      ...cue,
      startTimeMs: finalStart,
      endTimeMs: Math.max(finalStart, finalEnd),
      rawText: updatedRaw,
      cleanText: clean,
      actor,
      styleName,
      layer,
      customAngle: angle !== 0 ? angle : null,
      customPositionEnabled: customEnabled || hasCustomPos,
      customVerticalAlign: vAlign,
      customHorizontalAlign: hAlign,
      customFontSizeSp: fontSize,
      customIsBold: isBold,
      customIsItalic: isItalic,
    };

    onSave(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      {/* Hidden Video for snapshot capture */}
      <video
        ref={hiddenVideoRef}
        src={videoUrl || '/sample_demo.mp4'}
        crossOrigin="anonymous"
        preload="auto"
        muted
        className="hidden"
        onLoadedData={drawFrameToCanvas}
        onSeeked={drawFrameToCanvas}
      />

      <div className="bg-[#141721] border border-indigo-500/30 rounded-2xl w-full max-w-5xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-indigo-500/20 flex items-center justify-between bg-[#1E2333]/50">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 font-bold text-xs flex items-center justify-center">
              #{cue.id}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white">Diyalog Satırını Düzenle</h2>
                <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Preset: {styleName}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Süre: {(duration / 1000).toFixed(2)}s • Giriş: {formatTimestamp(startMs)} • Sub Frame: PlayRes {frameW}x{frameH}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body: Interactive Preview prominently governed by PlayRes */}
        <div className="p-5 flex-1 overflow-y-auto space-y-5">
          {/* Interactive Preview Section */}
          <div className="bg-[#1E2333]/30 p-4 rounded-2xl border border-indigo-500/30 flex flex-col items-center">
            <div className="w-full flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Move className="w-4 h-4 text-indigo-400" />
                Özel Konum Önizleme (PlayRes: {frameW} x {frameH})
              </span>
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-indigo-300 font-mono">
                  Giriş Karesi: {formatTimestamp(startMs)}
                </span>
                {hasCustomPos && (
                  <button
                    type="button"
                    onClick={handleResetPos}
                    className="text-[11px] text-rose-400 hover:text-rose-300 underline font-medium"
                  >
                    Konumu Sıfırla
                  </button>
                )}
              </div>
            </div>

            {/* Interactive Stage Container directly governed by PlayResX & PlayResY */}
            <div
              ref={previewBoxRef}
              onMouseDown={handlePreviewMouseDown}
              onMouseMove={handlePreviewMouseMove}
              onMouseUp={handlePreviewMouseUp}
              style={{
                aspectRatio: `${frameW} / ${frameH}`,
                maxHeight: '400px',
                maxWidth: frameAspect < 1 ? `calc(400px * ${frameAspect})` : '640px',
              }}
              className="relative w-full mx-auto rounded-xl overflow-hidden border-2 border-indigo-500/40 shadow-2xl bg-black cursor-crosshair select-none group transition-all"
            >
              {/* Canvas Background: captures exact video frame at startMs scaled to PlayRes */}
              <canvas
                ref={canvasRef}
                width={frameW}
                height={frameH}
                className="w-full h-full object-cover block"
              />

              {/* Resolution & Time Badge */}
              <div className="absolute top-2 left-2 bg-black/75 backdrop-blur-xs px-2.5 py-1 rounded text-[11px] font-mono text-indigo-300 border border-indigo-500/30 pointer-events-none">
                PlayRes: {frameW}x{frameH} • {formatTimestamp(startMs)}
              </div>

              {/* Subtitle Draggable Text Element */}
              <div
                style={{
                  left: `${(posCoord.x / frameW) * 100}%`,
                  top: `${(posCoord.y / frameH) * 100}%`,
                  transform: `translate(-50%, -50%) rotate(${angle}deg)`,
                  fontFamily: activePreset?.fontName || 'Arial',
                  color: activePreset?.primaryColor || '#FFFFFF',
                  WebkitTextStroke: `${activePreset?.outline ?? 2.5}px ${activePreset?.outlineColor || '#000000'}`,
                  textShadow: '0 2px 4px rgba(0,0,0,0.85)',
                  fontSize: `${Math.max(12, Math.round((activePreset?.fontSize || 48) * (previewHeight / frameH)))}px`,
                }}
                className={`absolute max-w-[90%] text-center font-bold px-2 py-1 transition-transform pointer-events-none ${
                  isDraggingText ? 'scale-105 opacity-90' : ''
                }`}
              >
                {cleanToPlainText(rawText) || 'Altyazı Önizleme'}
              </div>

              {/* Crosshair on drag */}
              <div
                style={{
                  left: `${(posCoord.x / frameW) * 100}%`,
                  top: `${(posCoord.y / frameH) * 100}%`,
                }}
                className="absolute w-5 h-5 -ml-2.5 -mt-2.5 border-2 border-sky-400 rounded-full pointer-events-none opacity-70"
              />

              {/* Coordinate & Angle Status Footer Overlay */}
              <div className="absolute bottom-2 inset-x-2 text-center bg-black/75 backdrop-blur-xs py-1 rounded text-[11px] text-slate-300 pointer-events-none font-mono">
                Konum: \pos({posCoord.x}, {posCoord.y}) • Döndürme: {angle}°
              </div>
            </div>

            <p className="text-[11px] text-slate-400 mt-2 text-center">
              Video karesi üzerinde yazıyı tıklayıp sürükleyerek serbestçe konumlandırabilirsiniz.
            </p>
          </div>

          {/* Form Controls Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Style Preset Selector */}
            <div className="bg-[#1E2333]/30 p-3.5 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-400" />
                  ASS Stil Preseti ([V4+ Styles])
                </label>
                <span className="text-[10px] text-slate-400 font-mono">
                  {styles.length} Preset
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {styles.map((s) => {
                  const isSelected = s.name.toLowerCase() === styleName.toLowerCase();
                  return (
                    <button
                      key={s.name}
                      type="button"
                      onClick={() => setStyleName(s.name)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 border border-indigo-400'
                          : 'bg-[#0C0E14] text-slate-300 border border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full inline-block border border-white/20"
                        style={{ backgroundColor: s.primaryColor }}
                      />
                      {s.name}
                      {isSelected && <Check className="w-3 h-3 ml-0.5" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Angle Setting (Döndürme Açısı \frz) */}
            <div className="bg-[#1E2333]/30 p-3.5 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <RotateCw className="w-3.5 h-3.5 text-indigo-400" />
                  Yazı Açısı / Döndürme (Angle - \frz)
                </label>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-indigo-400">{angle}°</span>
                  {angle !== 0 && (
                    <button
                      type="button"
                      onClick={() => handleAngleChange(0)}
                      className="text-[10px] text-slate-400 hover:text-white underline"
                    >
                      Sıfırla
                    </button>
                  )}
                </div>
              </div>
              <input
                type="range"
                min={-180}
                max={180}
                step={1}
                value={angle}
                onChange={(e) => handleAngleChange(parseInt(e.target.value, 10))}
                className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>-180°</span>
                <span>-90°</span>
                <span>0° (Düz)</span>
                <span>+90°</span>
                <span>+180°</span>
              </div>
            </div>
          </div>

          {/* Subtitle Text */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Altyazı Metni (ASS Override veya Düz Metin)
              </label>
              {rawText.includes('{') && (
                <span className="text-[10px] text-amber-400 flex items-center gap-1 font-mono">
                  <Sparkles className="w-3 h-3" />
                  ASS Override Etiketleri Korunuyor
                </span>
              )}
            </div>
            <textarea
              rows={3}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              className="w-full bg-[#0C0E14] border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500 leading-relaxed font-sans"
              placeholder="Altyazı satırını yazın..."
            />
            <div className="mt-1 text-xs text-slate-400 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span className="truncate">Temiz metin: {cleanToPlainText(rawText)}</span>
            </div>
          </div>

          {/* Timing Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Start Time */}
            <div className="bg-[#1E2333]/30 p-3 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-slate-300">Başlangıç Zamanı</label>
                <button
                  type="button"
                  onClick={handleSetStartToCurrent}
                  className="text-[10px] text-indigo-400 hover:text-indigo-300 hover:underline"
                >
                  Şu Ana Al
                </button>
              </div>
              <input
                type="text"
                value={startText}
                onChange={(e) => setStartText(e.target.value)}
                className="w-full bg-[#0C0E14] border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
              />
              <div className="flex gap-1 mt-1.5">
                {[-500, -100, 100, 500].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => handleAdjustStart(d)}
                    className="flex-1 py-0.5 text-[10px] font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
                  >
                    {d > 0 ? `+${d}` : d}
                  </button>
                ))}
              </div>
            </div>

            {/* End Time */}
            <div className="bg-[#1E2333]/30 p-3 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-slate-300">Bitiş Zamanı</label>
                <button
                  type="button"
                  onClick={handleSetEndToCurrent}
                  className="text-[10px] text-indigo-400 hover:text-indigo-300 hover:underline"
                >
                  Şu Ana Al
                </button>
              </div>
              <input
                type="text"
                value={endText}
                onChange={(e) => setEndText(e.target.value)}
                className="w-full bg-[#0C0E14] border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
              />
              <div className="flex gap-1 mt-1.5">
                {[-500, -100, 100, 500].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => handleAdjustEnd(d)}
                    className="flex-1 py-0.5 text-[10px] font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
                  >
                    {d > 0 ? `+${d}` : d}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Actor and Layer */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">Aktör / Karakter</label>
              <input
                type="text"
                value={actor}
                onChange={(e) => setActor(e.target.value)}
                placeholder="Örn: Rem"
                className="w-full bg-[#0C0E14] border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">Katman (Layer)</label>
              <input
                type="number"
                value={layer}
                onChange={(e) => setLayer(parseInt(e.target.value, 10) || 0)}
                className="w-full bg-[#0C0E14] border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-800 flex items-center justify-between bg-[#1E2333]/30">
          <button
            onClick={() => {
              if (confirm(`Altyazı #${cue.id} silinsin mi?`)) {
                onDelete(cue.id);
                onClose();
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 text-xs font-medium transition"
          >
            <Trash2 className="w-4 h-4" />
            Satırı Sil
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-medium transition"
            >
              İptal
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition"
            >
              <Check className="w-4 h-4" />
              Kaydet
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
