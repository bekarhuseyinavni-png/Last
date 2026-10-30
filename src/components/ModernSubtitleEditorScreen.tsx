import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  SubtitleCue,
  SubtitleStyle,
  SubtitleVerticalAlign,
  SubtitleHorizontalAlign,
  EncodeState,
  AssStyleDefinition,
  SubtitleFrameConfig,
} from '../types';
import { SubtitleOverlay } from './SubtitleOverlay';
import { EditSubtitleCueDialog } from './EditSubtitleCueDialog';
import { formatTimestamp, parseTimestamp } from '../utils/subtitleParser';
import { cleanToPlainText } from '../utils/htmlSubtitleParser';
import { updateTag, updatePos, updateAngle, applyBatchTags } from '../utils/assTagManager';
import {
  ArrowLeft,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Plus,
  Type,
  Clock,
  Sparkles,
  MoreVertical,
  Undo2,
  Redo2,
  Download,
  Search,
  Copy,
  Scissors,
  Trash2,
  Edit,
  Video,
  Subtitles,
  Upload,
  Replace,
  Film,
  Layers,
  X,
  Check,
  Palette,
  RotateCw,
  Move,
  Sliders,
  Settings2,
  Tv,
} from 'lucide-react';

interface ModernSubtitleEditorScreenProps {
  videoUrl?: string | null;
  videoTitle?: string | null;
  subtitles: SubtitleCue[];
  activeCues: SubtitleCue[];
  style: SubtitleStyle;
  subtitleFileName?: string | null;
  canUndo: boolean;
  canRedo: boolean;
  styles?: AssStyleDefinition[];
  onUpdateStyles?: (styles: AssStyleDefinition[]) => void;
  subtitleFrame?: SubtitleFrameConfig;
  onUpdateSubtitleFrame?: (frame: SubtitleFrameConfig) => void;
  onNavigateBack: () => void;
  onUpdateSubtitles: (cues: SubtitleCue[]) => void;
  onUpdateStyle: (update: (prev: SubtitleStyle) => SubtitleStyle) => void;
  onSaveCue: (cue: SubtitleCue) => void;
  onAddNewCue: (startTimeMs: number) => void;
  onDeleteCue: (id: number) => void;
  onDuplicateCue: (cue: SubtitleCue) => void;
  onSplitCue: (cue: SubtitleCue) => void;
  onUndo: () => void;
  onRedo: () => void;
  onReplaceAllText: (target: string, replacement: string) => void;
  onOpenExportDialog: () => void;
  onOpenEncodeDialog: () => void;
  onOpenExtractMkvDialog: () => void;
  onLoadCustomVideo: (file: File) => void;
  onLoadCustomSubtitle: (file: File) => void;
  onLoadCustomFont: (file: File) => void;
  encodeState: EncodeState;
}

type ActiveDrawer = 'NONE' | 'TEXT_STYLE' | 'TIMING' | 'TYPESETTING' | 'MORE_TOOLS';

export const ModernSubtitleEditorScreen: React.FC<ModernSubtitleEditorScreenProps> = ({
  videoUrl,
  videoTitle,
  subtitles,
  activeCues,
  style,
  subtitleFileName,
  canUndo,
  canRedo,
  styles = [],
  onUpdateStyles,
  subtitleFrame = { playResX: 1920, playResY: 1080 },
  onUpdateSubtitleFrame,
  onNavigateBack,
  onUpdateSubtitles,
  onUpdateStyle,
  onSaveCue,
  onAddNewCue,
  onDeleteCue,
  onDuplicateCue,
  onSplitCue,
  onUndo,
  onRedo,
  onReplaceAllText,
  onOpenExportDialog,
  onOpenEncodeDialog,
  onOpenExtractMkvDialog,
  onLoadCustomVideo,
  onLoadCustomSubtitle,
  onLoadCustomFont,
  encodeState,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [durationMs, setDurationMs] = useState(35000);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);

  // Selected cue & search
  const [selectedCueId, setSelectedCueId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDrawer, setActiveDrawer] = useState<ActiveDrawer>('NONE');

  // Edit Single Cue Dialog (360x640 Interactive Preview)
  const [editingCue, setEditingCue] = useState<SubtitleCue | null>(null);

  // Presets Management in Drawer
  const [selectedPresetIndex, setSelectedPresetIndex] = useState(0);
  const [showAddPresetModal, setShowAddPresetModal] = useState(false);
  const [newPresetNameInput, setNewPresetNameInput] = useState('');

  // Replace modal
  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [replaceTarget, setReplaceTarget] = useState('');
  const [replaceWith, setReplaceWith] = useState('');

  // Batch tag modal
  const [showBatchTagModal, setShowBatchTagModal] = useState(false);
  const [batchFontName, setBatchFontName] = useState('');
  const [batchFontSize, setBatchFontSize] = useState('');
  const [batchColor, setBatchColor] = useState('');

  // Hidden file inputs
  const videoInputRef = useRef<HTMLInputElement>(null);
  const subtitleInputRef = useRef<HTMLInputElement>(null);
  const fontInputRef = useRef<HTMLInputElement>(null);

  // Sync video time
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const ms = Math.round(videoRef.current.currentTime * 1000);
      setCurrentTimeMs(ms);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDurationMs(Math.round(videoRef.current.duration * 1000) || 35000);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const seekTo = (ms: number) => {
    if (!videoRef.current) return;
    const clamped = Math.max(0, Math.min(durationMs, ms));
    videoRef.current.currentTime = clamped / 1000;
    setCurrentTimeMs(clamped);
  };

  const stepFrame = (deltaMs: number) => {
    seekTo(currentTimeMs + deltaMs);
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  // Filtered cues
  const filteredCues = useMemo(() => {
    if (!searchQuery.trim()) return subtitles;
    const q = searchQuery.toLowerCase();
    return subtitles.filter(
      (c) => c.rawText.toLowerCase().includes(q) || c.cleanText.toLowerCase().includes(q)
    );
  }, [subtitles, searchQuery]);

  // Subtitles that are active strictly between startTimeMs and endTimeMs at currentTimeMs
  const visibleCues = useMemo(() => {
    const adjustedTime = currentTimeMs - (style.timeOffsetMs || 0);
    return subtitles.filter(
      (cue) => adjustedTime >= cue.startTimeMs && adjustedTime <= cue.endTimeMs
    );
  }, [subtitles, currentTimeMs, style.timeOffsetMs]);

  // Identify active or selected cue for In-Place Editor
  const currentActiveCue = useMemo(() => {
    if (selectedCueId !== null) {
      const found = subtitles.find((c) => c.id === selectedCueId);
      if (found) return found;
    }
    return visibleCues[0] || subtitles[0] || null;
  }, [subtitles, selectedCueId, visibleCues]);

  // Drag cue \pos(x, y) callback
  const handleCueDragged = (cueId: number, newAssX: number, newAssY: number) => {
    const updated = subtitles.map((cue) => {
      if (cue.id === cueId) {
        const newRaw = updatePos(cue.rawText, newAssX, newAssY);
        return { ...cue, rawText: newRaw, cleanText: cleanToPlainText(newRaw) };
      }
      return cue;
    });
    onUpdateSubtitles(updated);
  };

  // Adjust timing on active cue
  const handleQuickAdjustTiming = (field: 'start' | 'end', delta: number) => {
    if (!currentActiveCue) return;
    const start = field === 'start' ? Math.max(0, currentActiveCue.startTimeMs + delta) : currentActiveCue.startTimeMs;
    const end = field === 'end' ? Math.max(start, currentActiveCue.endTimeMs + delta) : currentActiveCue.endTimeMs;
    const updated: SubtitleCue = {
      ...currentActiveCue,
      startTimeMs: start,
      endTimeMs: end,
    };
    onSaveCue(updated);
  };

  // Quick edit text
  const handleQuickTextChange = (text: string) => {
    if (!currentActiveCue) return;
    const clean = cleanToPlainText(text);
    const updated: SubtitleCue = {
      ...currentActiveCue,
      rawText: text,
      cleanText: clean,
    };
    onSaveCue(updated);
  };

  // Quick change style preset for current cue
  const handleQuickStyleChange = (styleName: string) => {
    if (!currentActiveCue) return;
    onSaveCue({
      ...currentActiveCue,
      styleName,
    });
  };

  // Quick change angle for current cue
  const handleQuickAngleStep = (deltaDeg: number) => {
    if (!currentActiveCue) return;
    const cur = currentActiveCue.customAngle ?? 0;
    const next = cur + deltaDeg;
    const updatedRaw = updateAngle(currentActiveCue.rawText, next);
    onSaveCue({
      ...currentActiveCue,
      customAngle: next,
      rawText: updatedRaw,
      cleanText: cleanToPlainText(updatedRaw),
    });
  };

  // CPS calculation
  const currentCps = useMemo(() => {
    if (!currentActiveCue) return 0;
    const durSec = Math.max(0.1, (currentActiveCue.endTimeMs - currentActiveCue.startTimeMs) / 1000);
    return currentActiveCue.cleanText.length / durSec;
  }, [currentActiveCue]);

  // Current active preset definition in drawer
  const activePresetDef = styles[selectedPresetIndex] || styles[0] || null;

  // Preset updater helper
  const handleUpdateCurrentPreset = (modifier: (prev: AssStyleDefinition) => AssStyleDefinition) => {
    if (!onUpdateStyles || !activePresetDef) return;
    const updatedList = styles.map((s, idx) => {
      if (idx === selectedPresetIndex) {
        return modifier(s);
      }
      return s;
    });
    onUpdateStyles(updatedList);
  };

  // Add new preset handler
  const handleAddNewPreset = () => {
    const name = newPresetNameInput.trim();
    if (!name || !onUpdateStyles) return;
    const exists = styles.some((s) => s.name.toLowerCase() === name.toLowerCase());
    if (exists) {
      alert(`"${name}" adında bir stil zaten mevcut!`);
      return;
    }

    const newDef: AssStyleDefinition = {
      name,
      fontName: 'Arial',
      fontSize: 48,
      primaryColor: '#FFFFFF',
      outlineColor: '#000000',
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
    };

    const nextList = [...styles, newDef];
    onUpdateStyles(nextList);
    setSelectedPresetIndex(nextList.length - 1);
    setNewPresetNameInput('');
    setShowAddPresetModal(false);
  };

  return (
    <div className="min-h-screen bg-[#0C0E14] text-[#F1F5F9] flex flex-col select-none">
      {/* Top App Bar */}
      <header className="bg-[#141721] border-b border-indigo-500/20 px-4 py-2.5 flex items-center justify-between sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onNavigateBack}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Ana Menüye Dön"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-bold text-white truncate max-w-[130px] sm:max-w-xs">
              {subtitleFileName || 'remsubs_altyazi.ass'}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
              {subtitles.length} Satır
            </span>
            <span className="hidden sm:inline-block text-[10px] px-2 py-0.5 rounded-full font-mono bg-slate-800 text-slate-300 border border-slate-700">
              PlayRes: {subtitleFrame.playResX}x{subtitleFrame.playResY}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 transition"
            title="Geri Al (Undo)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 transition"
            title="Yinele (Redo)"
          >
            <Redo2 className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenExportDialog}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Dışa Aktar</span>
          </button>

          <button
            onClick={onOpenEncodeDialog}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-sky-500 hover:from-indigo-600 hover:to-sky-600 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-500/20 transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Hardsub Yap</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden pb-16 lg:pb-0">
        {/* Left Side: Video Preview + Player Controls + Quick Cue Editor */}
        <div className="lg:w-3/5 xl:w-2/3 flex flex-col border-b lg:border-b-0 lg:border-r border-slate-800 bg-[#0C0E14]">
          {/* Video Player Box with Subtitle Overlay */}
          <div className="relative w-full aspect-video bg-black flex items-center justify-center overflow-hidden group">
            <video
              ref={videoRef}
              src={videoUrl || '/sample_demo.mp4'}
              className="w-full h-full object-contain pointer-events-auto"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              playsInline
              onClick={togglePlay}
            />

            {/* Subtitle Overlay strictly positioned over the video */}
            <SubtitleOverlay
              activeCues={visibleCues}
              style={style}
              styleDefinitions={styles}
              sourceVideoWidth={subtitleFrame.playResX}
              sourceVideoHeight={subtitleFrame.playResY}
              currentPositionMs={currentTimeMs}
              onCueDragged={handleCueDragged}
            />

            {/* Center Play Button Overlay on Hover */}
            {!isPlaying && (
              <button
                onClick={togglePlay}
                className="absolute w-14 h-14 rounded-full bg-indigo-600/80 hover:bg-indigo-600 text-white flex items-center justify-center shadow-2xl backdrop-blur-xs transition transform hover:scale-110 pointer-events-auto"
              >
                <Play className="w-7 h-7 fill-current ml-1" />
              </button>
            )}
          </div>

          {/* Player Timeline & Controls Bar */}
          <div className="p-3 bg-[#141721] border-b border-slate-800 flex flex-col gap-2">
            {/* Scrubber Slider */}
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-indigo-400 font-bold shrink-0">
                {formatTimestamp(currentTimeMs)}
              </span>
              <input
                type="range"
                min={0}
                max={durationMs || 35000}
                value={currentTimeMs}
                onChange={(e) => seekTo(parseInt(e.target.value, 10))}
                className="flex-1 accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
              <span className="font-mono text-xs text-slate-400 shrink-0">
                {formatTimestamp(durationMs)}
              </span>
            </div>

            {/* Playback Buttons & Frame Step */}
            <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => stepFrame(-1000)}
                  className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-mono"
                  title="-1 Saniye"
                >
                  -1s
                </button>
                <button
                  onClick={() => stepFrame(-50)}
                  className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-mono"
                  title="-50ms (Kare)"
                >
                  -50ms
                </button>

                <button
                  onClick={togglePlay}
                  className="w-9 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-md transition"
                >
                  {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                </button>

                <button
                  onClick={() => stepFrame(50)}
                  className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-mono"
                  title="+50ms (Kare)"
                >
                  +50ms
                </button>
                <button
                  onClick={() => stepFrame(1000)}
                  className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-mono"
                  title="+1 Saniye"
                >
                  +1s
                </button>
              </div>

              {/* Speed Buttons */}
              <div className="flex items-center gap-1 bg-[#0C0E14] p-1 rounded-xl border border-slate-800 text-[11px]">
                {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => handleSpeedChange(spd)}
                    className={`px-2 py-0.5 rounded font-mono font-semibold transition ${
                      playbackSpeed === spd
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Quick In-Place Cue Editor for selected / active line */}
          {currentActiveCue && (
            <div className="p-4 bg-[#141721]/90 flex-1 flex flex-col justify-between border-b lg:border-b-0 border-slate-800">
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 font-bold flex items-center justify-center">
                      #{currentActiveCue.id}
                    </span>
                    <span className="font-mono text-slate-300">
                      {formatTimestamp(currentActiveCue.startTimeMs)} ➔ {formatTimestamp(currentActiveCue.endTimeMs)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Style Preset Selector for this cue */}
                    <div className="flex items-center gap-1 bg-[#0C0E14] px-2 py-1 rounded-lg border border-slate-700">
                      <span className="text-[10px] text-slate-400 font-semibold">Preset:</span>
                      <select
                        value={currentActiveCue.styleName || 'Default'}
                        onChange={(e) => handleQuickStyleChange(e.target.value)}
                        className="bg-transparent text-xs font-bold text-indigo-300 focus:outline-none cursor-pointer"
                      >
                        {(styles.length > 0 ? styles : [{ name: 'Default' }, { name: 'Main' }]).map((s) => (
                          <option key={s.name} value={s.name} className="bg-[#141721] text-white">
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* CPS Badge */}
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                        currentCps < 15
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : currentCps <= 20
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-rose-500/20 text-rose-400'
                      }`}
                      title="Okuma Hızı (Karakter / Saniye)"
                    >
                      CPS: {currentCps.toFixed(1)}
                    </span>

                    {/* Open 360x640 Interactive Preview Dialog */}
                    <button
                      onClick={() => setEditingCue(currentActiveCue)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/30 font-semibold"
                      title="360x640 Önizleme & Özel Konum & Açı Ayarla"
                    >
                      <Move className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">360x640 Önizle</span>
                    </button>

                    <button
                      onClick={() => onDuplicateCue(currentActiveCue)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                      title="Altyazıyı Çoğalt"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onSplitCue(currentActiveCue)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                      title="Ortadan İkiye Böl"
                    >
                      <Scissors className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteCue(currentActiveCue.id)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-400"
                      title="Satırı Sil"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Instant In-Place Textarea */}
                <textarea
                  rows={2}
                  value={currentActiveCue.rawText}
                  onChange={(e) => handleQuickTextChange(e.target.value)}
                  className="w-full bg-[#0C0E14] border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500 font-sans leading-relaxed resize-none shadow-inner"
                  placeholder="Seçili altyazı metnini düzenleyin..."
                />

                {/* Quick Controls: Angle (\frz) and Timing */}
                <div className="flex items-center justify-between text-xs font-mono text-slate-400 flex-wrap gap-2">
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-slate-500 mr-1">Başlangıç:</span>
                    <button
                      onClick={() => handleQuickAdjustTiming('start', -100)}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                    >
                      -100ms
                    </button>
                    <button
                      onClick={() => handleQuickAdjustTiming('start', 100)}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                    >
                      +100ms
                    </button>
                  </div>

                  {/* Angle Stepper */}
                  <div className="flex items-center gap-1 bg-[#0C0E14] px-2 py-1 rounded-lg border border-slate-800">
                    <RotateCw className="w-3 h-3 text-indigo-400" />
                    <span className="text-[11px] text-slate-400">Açı:</span>
                    <button
                      onClick={() => handleQuickAngleStep(-5)}
                      className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px]"
                    >
                      -5°
                    </button>
                    <span className="text-white font-bold text-xs min-w-[28px] text-center">
                      {currentActiveCue.customAngle ?? 0}°
                    </span>
                    <button
                      onClick={() => handleQuickAngleStep(5)}
                      className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px]"
                    >
                      +5°
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-slate-500 mr-1">Bitiş:</span>
                    <button
                      onClick={() => handleQuickAdjustTiming('end', -100)}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                    >
                      -100ms
                    </button>
                    <button
                      onClick={() => handleQuickAdjustTiming('end', 100)}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                    >
                      +100ms
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Subtitle List & Search */}
        <div className="lg:w-2/5 xl:w-1/3 flex flex-col bg-[#141721] overflow-hidden">
          {/* List Search Header */}
          <div className="p-3 border-b border-slate-800 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Altyazı ara..."
                className="w-full bg-[#0C0E14] border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <button
              onClick={() => onAddNewCue(currentTimeMs)}
              className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shrink-0 shadow-md shadow-indigo-600/20"
            >
              <Plus className="w-3.5 h-3.5" />
              Ekle
            </button>
          </div>

          {/* Subtitle Cue List */}
          <div ref={listRef} className="flex-1 overflow-y-auto p-3 space-y-2">
            {filteredCues.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                Altyazı satırı bulunamadı.
              </div>
            ) : (
              filteredCues.map((cue) => {
                const adjustedTime = currentTimeMs - (style.timeOffsetMs || 0);
                const isActive = adjustedTime >= cue.startTimeMs && adjustedTime <= cue.endTimeMs;
                const isSelected = selectedCueId === cue.id;
                const cueStyle = cue.styleName || 'Default';

                return (
                  <div
                    key={cue.id}
                    onClick={() => {
                      setSelectedCueId(cue.id);
                      seekTo(cue.startTimeMs);
                    }}
                    className={`p-3 rounded-xl border transition cursor-pointer flex items-start gap-3 ${
                      isActive
                        ? 'border-indigo-500 bg-indigo-500/15 shadow-sm'
                        : isSelected
                        ? 'border-slate-600 bg-slate-800/60'
                        : 'border-slate-800/80 bg-[#0C0E14] hover:border-slate-700'
                    }`}
                  >
                    <span className="w-6 h-6 rounded bg-slate-800/80 text-slate-400 text-[10px] font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {cue.id}
                    </span>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
                        <span className={isActive ? 'text-indigo-300 font-bold' : ''}>
                          {formatTimestamp(cue.startTimeMs)} ➔ {formatTimestamp(cue.endTimeMs)}
                        </span>

                        <div className="flex items-center gap-1.5">
                          {/* Style Preset Badge */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (styles.length > 0) {
                                const currentIdx = styles.findIndex(
                                  (s) => s.name.toLowerCase() === cueStyle.toLowerCase()
                                );
                                const nextIdx = (currentIdx + 1) % styles.length;
                                onSaveCue({ ...cue, styleName: styles[nextIdx].name });
                              }
                            }}
                            className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30 transition"
                            title="Tıklayarak Sıradaki Presete Geç"
                          >
                            {cueStyle}
                          </button>

                          {cue.actor && (
                            <span className="text-slate-500 text-[10px]">[{cue.actor}]</span>
                          )}

                          {/* Quick Edit Dialog Trigger */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingCue(cue);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
                            title="360x640 Önizleme & Düzenleme Diyaloğu"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-white leading-relaxed line-clamp-2">{cue.cleanText}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Bottom Tool Bar ([+] [T] [⏱] [ASS] [⋮]) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#141721] border-t border-indigo-500/20 px-4 py-2 z-40 flex items-center justify-around shadow-2xl">
        {/* [+] Yeni Altyazı Ekle */}
        <button
          onClick={() => onAddNewCue(currentTimeMs)}
          className="flex flex-col items-center gap-1 text-slate-400 hover:text-indigo-400 transition"
        >
          <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Plus className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-semibold">Yeni Ekle</span>
        </button>

        {/* [T] Font & Biçim */}
        <button
          onClick={() => setActiveDrawer(activeDrawer === 'TEXT_STYLE' ? 'NONE' : 'TEXT_STYLE')}
          className={`flex flex-col items-center gap-1 transition ${
            activeDrawer === 'TEXT_STYLE' ? 'text-indigo-400' : 'text-slate-400 hover:text-white'
          }`}
        >
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition ${
              activeDrawer === 'TEXT_STYLE' ? 'bg-indigo-600 text-white' : 'bg-slate-800'
            }`}
          >
            <Type className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-semibold">Font & Biçim</span>
        </button>

        {/* [⏱] Senkron & Zaman */}
        <button
          onClick={() => setActiveDrawer(activeDrawer === 'TIMING' ? 'NONE' : 'TIMING')}
          className={`flex flex-col items-center gap-1 transition ${
            activeDrawer === 'TIMING' ? 'text-indigo-400' : 'text-slate-400 hover:text-white'
          }`}
        >
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition ${
              activeDrawer === 'TIMING' ? 'bg-indigo-600 text-white' : 'bg-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-semibold">Senkron</span>
        </button>

        {/* [ASS] Typesetting & Tag */}
        <button
          onClick={() => setActiveDrawer(activeDrawer === 'TYPESETTING' ? 'NONE' : 'TYPESETTING')}
          className={`flex flex-col items-center gap-1 transition ${
            activeDrawer === 'TYPESETTING' ? 'text-indigo-400' : 'text-slate-400 hover:text-white'
          }`}
        >
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition ${
              activeDrawer === 'TYPESETTING' ? 'bg-indigo-600 text-white' : 'bg-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-semibold">ASS Tag</span>
        </button>

        {/* [⋮] Araçlar & Dosyalar */}
        <button
          onClick={() => setActiveDrawer(activeDrawer === 'MORE_TOOLS' ? 'NONE' : 'MORE_TOOLS')}
          className={`flex flex-col items-center gap-1 transition ${
            activeDrawer === 'MORE_TOOLS' ? 'text-indigo-400' : 'text-slate-400 hover:text-white'
          }`}
        >
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition ${
              activeDrawer === 'MORE_TOOLS' ? 'bg-indigo-600 text-white' : 'bg-slate-800'
            }`}
          >
            <MoreVertical className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-semibold">Araçlar</span>
        </button>
      </nav>

      {/* Slide-over Tool Drawers */}
      {activeDrawer !== 'NONE' && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-lg bg-[#141721] border-l border-indigo-500/20 h-full flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#1E2333]/40">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                {activeDrawer === 'TEXT_STYLE' && <Type className="w-4 h-4 text-indigo-400" />}
                {activeDrawer === 'TIMING' && <Clock className="w-4 h-4 text-indigo-400" />}
                {activeDrawer === 'TYPESETTING' && <Sparkles className="w-4 h-4 text-indigo-400" />}
                {activeDrawer === 'MORE_TOOLS' && <MoreVertical className="w-4 h-4 text-indigo-400" />}
                {activeDrawer === 'TEXT_STYLE' && 'Stil Presetleri & Sub Frame Ayarları'}
                {activeDrawer === 'TIMING' && 'Altyazı Senkronizasyon Ayarı'}
                {activeDrawer === 'TYPESETTING' && 'ASS Override Tag ve Typesetting'}
                {activeDrawer === 'MORE_TOOLS' && 'Dosya ve Düzenleme Araçları'}
              </h3>
              <button
                onClick={() => setActiveDrawer('NONE')}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="p-5 flex-1 overflow-y-auto space-y-6 text-xs">
              {/* 1. TEXT_STYLE DRAWER (PRESETS + SUB FRAME PLAYRES) */}
              {activeDrawer === 'TEXT_STYLE' && (
                <div className="space-y-6">
                  {/* SECTION A: ASS STYLE PRESETS ([V4+ Styles]) */}
                  <div className="bg-[#1E2333]/30 p-4 rounded-xl border border-indigo-500/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-indigo-400" />
                        <span className="font-bold text-white text-xs">Stil Presetleri ([V4+ Styles])</span>
                      </div>
                      <button
                        onClick={() => setShowAddPresetModal(true)}
                        className="flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold shadow-sm transition"
                      >
                        <Plus className="w-3 h-3" />
                        Yeni Preset
                      </button>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      ASS dosyasından okunan ve satırlara uygulanan stil presetleridir. Tıklayarak düzenleyin veya yeni preset ekleyin.
                    </p>

                    {/* Preset Tabs */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {styles.map((s, idx) => {
                        const isCurrent = idx === selectedPresetIndex;
                        return (
                          <button
                            key={s.name}
                            onClick={() => setSelectedPresetIndex(idx)}
                            className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition ${
                              isCurrent
                                ? 'bg-indigo-600 text-white border border-indigo-400 shadow-md shadow-indigo-600/20'
                                : 'bg-[#0C0E14] text-slate-300 border border-slate-700 hover:border-slate-600'
                            }`}
                          >
                            <span
                              className="w-2.5 h-2.5 rounded-full inline-block border border-white/20"
                              style={{ backgroundColor: s.primaryColor }}
                            />
                            {s.name}
                          </button>
                        );
                      })}
                    </div>

                    {/* Active Preset Properties Editor */}
                    {activePresetDef && (
                      <div className="mt-3 bg-[#0C0E14] p-3.5 rounded-xl border border-slate-800 space-y-3.5">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                          <span className="text-xs font-bold text-indigo-300">
                            Preset Özellikleri: {activePresetDef.name}
                          </span>
                          <button
                            onClick={() => {
                              if (currentActiveCue) {
                                onSaveCue({ ...currentActiveCue, styleName: activePresetDef.name });
                              }
                            }}
                            className="text-[10px] text-indigo-400 hover:underline"
                          >
                            Seçili Satıra Uygula
                          </button>
                        </div>

                        {/* Font Family Selection */}
                        <div>
                          <label className="text-[11px] text-slate-400 block mb-1">Font Ailesi (Fontname)</label>
                          <div className="grid grid-cols-2 gap-1.5">
                            {['Arial', 'Roboto', 'Montserrat', 'Trebuchet MS'].map((f) => (
                              <button
                                key={f}
                                onClick={() => handleUpdateCurrentPreset((p) => ({ ...p, fontName: f }))}
                                className={`p-1.5 rounded border text-left font-medium text-xs transition ${
                                  activePresetDef.fontName === f
                                    ? 'border-indigo-500 bg-indigo-500/20 text-white'
                                    : 'border-slate-800 bg-[#141721] text-slate-400'
                                }`}
                              >
                                {f}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Font Size Slider */}
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-300">Yazı Boyutu (Fontsize)</span>
                            <span className="font-mono text-indigo-400 font-bold">
                              {Math.round(activePresetDef.fontSize)} pt
                            </span>
                          </div>
                          <input
                            type="range"
                            min={18}
                            max={120}
                            value={activePresetDef.fontSize}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              handleUpdateCurrentPreset((p) => ({ ...p, fontSize: val }));
                            }}
                            className="w-full accent-indigo-500"
                          />
                        </div>

                        {/* Colors */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] text-slate-400 block mb-1">Yazı Rengi (PrimaryColour)</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={
                                  activePresetDef.primaryColor.startsWith('#')
                                    ? activePresetDef.primaryColor.slice(0, 7)
                                    : '#FFFFFF'
                                }
                                onChange={(e) =>
                                  handleUpdateCurrentPreset((p) => ({ ...p, primaryColor: e.target.value }))
                                }
                                className="w-8 h-8 rounded cursor-pointer bg-transparent border-0"
                              />
                              <span className="font-mono text-[10px] text-slate-300 uppercase">
                                {activePresetDef.primaryColor}
                              </span>
                            </div>
                          </div>

                          <div>
                            <label className="text-[11px] text-slate-400 block mb-1">Kenarlık Rengi (OutlineColour)</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={
                                  activePresetDef.outlineColor.startsWith('#')
                                    ? activePresetDef.outlineColor.slice(0, 7)
                                    : '#000000'
                                }
                                onChange={(e) =>
                                  handleUpdateCurrentPreset((p) => ({ ...p, outlineColor: e.target.value }))
                                }
                                className="w-8 h-8 rounded cursor-pointer bg-transparent border-0"
                              />
                              <span className="font-mono text-[10px] text-slate-300 uppercase">
                                {activePresetDef.outlineColor}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Outline Width & Shadow */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <div className="flex justify-between text-[11px] mb-1">
                              <span className="text-slate-400">Kenarlık (Outline)</span>
                              <span className="font-mono text-indigo-400">{activePresetDef.outline} px</span>
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={10}
                              step={0.5}
                              value={activePresetDef.outline}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                handleUpdateCurrentPreset((p) => ({ ...p, outline: val }));
                              }}
                              className="w-full accent-indigo-500"
                            />
                          </div>

                          <div>
                            <div className="flex justify-between text-[11px] mb-1">
                              <span className="text-slate-400">Gölge (Shadow)</span>
                              <span className="font-mono text-indigo-400">{activePresetDef.shadow} px</span>
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={10}
                              step={0.5}
                              value={activePresetDef.shadow}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                handleUpdateCurrentPreset((p) => ({ ...p, shadow: val }));
                              }}
                              className="w-full accent-indigo-500"
                            />
                          </div>
                        </div>

                        {/* Angle in Preset */}
                        <div>
                          <div className="flex justify-between text-[11px] mb-1">
                            <span className="text-slate-400">Döndürme Açısı (Angle)</span>
                            <span className="font-mono text-indigo-400">{activePresetDef.angle || 0}°</span>
                          </div>
                          <input
                            type="range"
                            min={-180}
                            max={180}
                            step={1}
                            value={activePresetDef.angle || 0}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              handleUpdateCurrentPreset((p) => ({ ...p, angle: val }));
                            }}
                            className="w-full accent-indigo-500"
                          />
                        </div>

                        {/* Bold / Italic / Underline */}
                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              handleUpdateCurrentPreset((p) => ({ ...p, bold: !p.bold }))
                            }
                            className={`flex-1 py-1.5 rounded font-bold transition ${
                              activePresetDef.bold
                                ? 'bg-indigo-600 text-white'
                                : 'bg-[#141721] border border-slate-800 text-slate-400'
                            }`}
                          >
                            B (Kalın)
                          </button>
                          <button
                            onClick={() =>
                              handleUpdateCurrentPreset((p) => ({ ...p, italic: !p.italic }))
                            }
                            className={`flex-1 py-1.5 rounded italic transition ${
                              activePresetDef.italic
                                ? 'bg-indigo-600 text-white'
                                : 'bg-[#141721] border border-slate-800 text-slate-400'
                            }`}
                          >
                            I (Eğik)
                          </button>
                          <button
                            onClick={() =>
                              handleUpdateCurrentPreset((p) => ({ ...p, underline: !p.underline }))
                            }
                            className={`flex-1 py-1.5 rounded underline transition ${
                              activePresetDef.underline
                                ? 'bg-indigo-600 text-white'
                                : 'bg-[#141721] border border-slate-800 text-slate-400'
                            }`}
                          >
                            U (Altı Çizili)
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* SECTION B: SUBTITLE FRAME (SUB FRAME - PLAYRESX & PLAYRESY) */}
                  <div className="bg-[#1E2333]/30 p-4 rounded-xl border border-sky-500/20 space-y-3">
                    <div className="flex items-center gap-1.5">
                      <Tv className="w-4 h-4 text-sky-400" />
                      <span className="font-bold text-white text-xs">
                        Altyazı Çerçeve Boyutu / Sub Frame (PlayResX & PlayResY)
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Ana videodaki görüntü üzerine uygulanan altyazı tuvalinin (sub frame) çözünürlüğüdür. ASS çıktısındaki <code>PlayResX:</code> ve <code>PlayResY:</code> alanlarına bu değerler yazılır.
                    </p>

                    {/* Quick Resolution Presets */}
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: '1920 x 1080 (16:9 FHD)', w: 1920, h: 1080 },
                        { label: '1280 x 720 (16:9 HD)', w: 1280, h: 720 },
                        { label: '360 x 640 (9:16 Dikey)', w: 360, h: 640 },
                        { label: '1080 x 1920 (9:16 TikTok)', w: 1080, h: 1920 },
                      ].map((res) => {
                        const isCurrent =
                          subtitleFrame.playResX === res.w && subtitleFrame.playResY === res.h;
                        return (
                          <button
                            key={res.label}
                            onClick={() =>
                              onUpdateSubtitleFrame &&
                              onUpdateSubtitleFrame({ playResX: res.w, playResY: res.h })
                            }
                            className={`p-2 rounded-lg text-left transition ${
                              isCurrent
                                ? 'bg-sky-600 text-white font-bold border border-sky-400 shadow-md'
                                : 'bg-[#0C0E14] text-slate-300 border border-slate-700 hover:border-slate-600'
                            }`}
                          >
                            <span className="block text-[11px]">{res.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Custom Width & Height Inputs */}
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">PlayResX (Genişlik)</label>
                        <input
                          type="number"
                          value={subtitleFrame.playResX}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10) || 1920;
                            if (onUpdateSubtitleFrame) {
                              onUpdateSubtitleFrame({ ...subtitleFrame, playResX: val });
                            }
                          }}
                          className="w-full bg-[#0C0E14] border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">PlayResY (Yükseklik)</label>
                        <input
                          type="number"
                          value={subtitleFrame.playResY}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10) || 1080;
                            if (onUpdateSubtitleFrame) {
                              onUpdateSubtitleFrame({ ...subtitleFrame, playResY: val });
                            }
                          }}
                          className="w-full bg-[#0C0E14] border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* TTF Font Upload */}
                  <button
                    onClick={() => fontInputRef.current?.click()}
                    className="w-full py-2.5 border border-dashed border-slate-700 hover:border-indigo-500/50 rounded-xl text-slate-300 flex items-center justify-center gap-2 transition"
                  >
                    <Upload className="w-3.5 h-3.5 text-indigo-400" />
                    Özel .TTF Font Dosyası Yükle
                  </button>
                </div>
              )}

              {/* 2. TIMING DRAWER */}
              {activeDrawer === 'TIMING' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-slate-800 bg-[#0C0E14] text-center">
                    <span className="text-[11px] text-slate-400 block mb-1">Mevcut Senkron Kayması</span>
                    <span className="text-2xl font-mono font-extrabold text-indigo-400">
                      {style.timeOffsetMs >= 0 ? `+${style.timeOffsetMs}` : style.timeOffsetMs} ms
                    </span>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-2">
                      Tüm Altyazıları İleri / Geri Kaydır
                    </label>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <button
                        onClick={() => onUpdateStyle((s) => ({ ...s, timeOffsetMs: s.timeOffsetMs - 500 }))}
                        className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 font-mono text-slate-300"
                      >
                        -500 ms (Geri)
                      </button>
                      <button
                        onClick={() => onUpdateStyle((s) => ({ ...s, timeOffsetMs: s.timeOffsetMs + 500 }))}
                        className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 font-mono text-slate-300"
                      >
                        +500 ms (İleri)
                      </button>
                      <button
                        onClick={() => onUpdateStyle((s) => ({ ...s, timeOffsetMs: s.timeOffsetMs - 100 }))}
                        className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 font-mono text-slate-300"
                      >
                        -100 ms
                      </button>
                      <button
                        onClick={() => onUpdateStyle((s) => ({ ...s, timeOffsetMs: s.timeOffsetMs + 100 }))}
                        className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 font-mono text-slate-300"
                      >
                        +100 ms
                      </button>
                    </div>

                    <button
                      onClick={() => onUpdateStyle((s) => ({ ...s, timeOffsetMs: 0 }))}
                      className="w-full py-2 bg-slate-800/50 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition"
                    >
                      Senkron Kaymasını Sıfırla (0 ms)
                    </button>
                  </div>
                </div>
              )}

              {/* 3. TYPESETTING & TAG DRAWER */}
              {activeDrawer === 'TYPESETTING' && (
                <div className="space-y-4">
                  <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-xl">
                    <p className="text-xs text-indigo-300 font-medium">
                      Seçili satır (#{currentActiveCue?.id || 1}) için ASS override etiketleri ekleyin ve konum/açı ayarlayın.
                    </p>
                  </div>

                  {currentActiveCue && (
                    <div className="space-y-3">
                      {/* Button to open 360x640 Interactive Preview */}
                      <button
                        onClick={() => setEditingCue(currentActiveCue)}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition"
                      >
                        <Move className="w-4 h-4" />
                        360x640 Özel Konum & Açı Editörünü Aç
                      </button>

                      <div>
                        <label className="text-xs font-semibold text-slate-300 block mb-1">
                          \pos(X, Y) Hızlı Önayarlar
                        </label>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              const newRaw = updatePos(
                                currentActiveCue.rawText,
                                Math.round(subtitleFrame.playResX / 2),
                                Math.round(subtitleFrame.playResY * 0.92)
                              );
                              onSaveCue({ ...currentActiveCue, rawText: newRaw, cleanText: cleanToPlainText(newRaw) });
                            }}
                            className="flex-1 py-1.5 bg-[#0C0E14] border border-slate-800 hover:border-slate-700 rounded text-slate-300 font-mono"
                          >
                            Alt Orta
                          </button>
                          <button
                            onClick={() => {
                              const newRaw = updatePos(
                                currentActiveCue.rawText,
                                Math.round(subtitleFrame.playResX / 2),
                                Math.round(subtitleFrame.playResY * 0.1)
                              );
                              onSaveCue({ ...currentActiveCue, rawText: newRaw, cleanText: cleanToPlainText(newRaw) });
                            }}
                            className="flex-1 py-1.5 bg-[#0C0E14] border border-slate-800 hover:border-slate-700 rounded text-slate-300 font-mono"
                          >
                            Üst Tabela
                          </button>
                          <button
                            onClick={() => {
                              const newRaw = updateTag(currentActiveCue.rawText, 'pos', null);
                              onSaveCue({ ...currentActiveCue, rawText: newRaw, cleanText: cleanToPlainText(newRaw) });
                            }}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-rose-400"
                          >
                            Temizle
                          </button>
                        </div>
                      </div>

                      {/* Common ASS Tags Quick Add */}
                      <div>
                        <label className="text-xs font-semibold text-slate-300 block mb-2">
                          Hızlı Override Etiketi Ekle
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => {
                              const newRaw = updateTag(currentActiveCue.rawText, 'fad', '(300,300)');
                              onSaveCue({ ...currentActiveCue, rawText: newRaw, cleanText: cleanToPlainText(newRaw) });
                            }}
                            className="p-2 bg-[#0C0E14] border border-slate-800 hover:border-slate-700 rounded-lg text-slate-300 font-mono text-left"
                          >
                            \fad(300,300) <span className="text-[10px] text-slate-500 block">Yavaş Belirme/Kaybolma</span>
                          </button>
                          <button
                            onClick={() => {
                              const newRaw = updateTag(currentActiveCue.rawText, 'blur', '2');
                              onSaveCue({ ...currentActiveCue, rawText: newRaw, cleanText: cleanToPlainText(newRaw) });
                            }}
                            className="p-2 bg-[#0C0E14] border border-slate-800 hover:border-slate-700 rounded-lg text-slate-300 font-mono text-left"
                          >
                            \blur2 <span className="text-[10px] text-slate-500 block">Yumuşak Kenarlık</span>
                          </button>
                        </div>
                      </div>

                      {/* Toplu ASS Tag Button */}
                      <button
                        onClick={() => setShowBatchTagModal(true)}
                        className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-xl transition flex items-center justify-center gap-2"
                      >
                        <Layers className="w-4 h-4" />
                        Tüm Satırlara Toplu ASS Tag Uygula
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* 4. MORE_TOOLS DRAWER */}
              {activeDrawer === 'MORE_TOOLS' && (
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      setShowReplaceModal(true);
                      setActiveDrawer('NONE');
                    }}
                    className="w-full p-3 rounded-xl border border-slate-800 bg-[#0C0E14] hover:border-indigo-500/40 text-left flex items-center justify-between transition"
                  >
                    <div className="flex items-center gap-3">
                      <Replace className="w-4 h-4 text-indigo-400" />
                      <div>
                        <div className="font-bold text-white">Bul ve Değiştir</div>
                        <div className="text-[11px] text-slate-400">Tüm altyazılarda kelimeyi otomatik güncelle</div>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => videoInputRef.current?.click()}
                    className="w-full p-3 rounded-xl border border-slate-800 bg-[#0C0E14] hover:border-indigo-500/40 text-left flex items-center justify-between transition"
                  >
                    <div className="flex items-center gap-3">
                      <Video className="w-4 h-4 text-sky-400" />
                      <div>
                        <div className="font-bold text-white">Lokal Video Aç</div>
                        <div className="text-[11px] text-slate-400">Kendi MP4/WebM videonuzu yükleyin</div>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => subtitleInputRef.current?.click()}
                    className="w-full p-3 rounded-xl border border-slate-800 bg-[#0C0E14] hover:border-indigo-500/40 text-left flex items-center justify-between transition"
                  >
                    <div className="flex items-center gap-3">
                      <Subtitles className="w-4 h-4 text-purple-400" />
                      <div>
                        <div className="font-bold text-white">Altyazı Dosyası Aç (.ass / .srt)</div>
                        <div className="text-[11px] text-slate-400">Harici altyazıyı editöre aktarın</div>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      onOpenExtractMkvDialog();
                      setActiveDrawer('NONE');
                    }}
                    className="w-full p-3 rounded-xl border border-slate-800 bg-[#0C0E14] hover:border-indigo-500/40 text-left flex items-center justify-between transition"
                  >
                    <div className="flex items-center gap-3">
                      <Film className="w-4 h-4 text-amber-400" />
                      <div>
                        <div className="font-bold text-white">MKV Softsub Altyazı Ayıkla</div>
                        <div className="text-[11px] text-slate-400">Gömülü altyazıyı çıkartın</div>
                      </div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hidden File Pickers */}
      <input
        type="file"
        ref={videoInputRef}
        accept="video/*"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onLoadCustomVideo(f);
        }}
        className="hidden"
      />
      <input
        type="file"
        ref={subtitleInputRef}
        accept=".ass,.ssa,.srt,text/plain"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onLoadCustomSubtitle(f);
        }}
        className="hidden"
      />
      <input
        type="file"
        ref={fontInputRef}
        accept=".ttf,.otf"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onLoadCustomFont(f);
        }}
        className="hidden"
      />

      {/* Find and Replace Modal */}
      {showReplaceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-[#141721] border border-indigo-500/30 rounded-2xl p-5 w-full max-w-sm space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Replace className="w-4 h-4 text-indigo-400" />
              Tüm Altyazılarda Bul & Değiştir
            </h3>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Aranan Kelime / Metin</label>
              <input
                type="text"
                value={replaceTarget}
                onChange={(e) => setReplaceTarget(e.target.value)}
                placeholder="Örn: Subaru"
                className="w-full bg-[#0C0E14] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Yeni Metin</label>
              <input
                type="text"
                value={replaceWith}
                onChange={(e) => setReplaceWith(e.target.value)}
                placeholder="Örn: Subaru-kun"
                className="w-full bg-[#0C0E14] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowReplaceModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
              >
                İptal
              </button>
              <button
                onClick={() => {
                  if (replaceTarget) {
                    onReplaceAllText(replaceTarget, replaceWith);
                    setShowReplaceModal(false);
                    setReplaceTarget('');
                    setReplaceWith('');
                  }
                }}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg"
              >
                Tümünde Değiştir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Tag Modal */}
      {showBatchTagModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-[#141721] border border-indigo-500/30 rounded-2xl p-5 w-full max-w-sm space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              Toplu ASS Tag Uygula
            </h3>
            <p className="text-xs text-slate-400">
              Bu etiketler altyazı diyaloglarını bozmadan tüm satırlara güvenle eklenecektir.
            </p>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Font Boyutu (\fs)</label>
              <input
                type="number"
                value={batchFontSize}
                onChange={(e) => setBatchFontSize(e.target.value)}
                placeholder="Örn: 52"
                className="w-full bg-[#0C0E14] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Font Adı (\fn)</label>
              <input
                type="text"
                value={batchFontName}
                onChange={(e) => setBatchFontName(e.target.value)}
                placeholder="Örn: Montserrat"
                className="w-full bg-[#0C0E14] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowBatchTagModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
              >
                İptal
              </button>
              <button
                onClick={() => {
                  const tags: Record<string, string | null> = {};
                  if (batchFontSize) tags['fs'] = batchFontSize;
                  if (batchFontName) tags['fn'] = batchFontName;
                  if (Object.keys(tags).length > 0) {
                    const updated = applyBatchTags(subtitles, tags);
                    onUpdateSubtitles(updated);
                  }
                  setShowBatchTagModal(false);
                }}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg"
              >
                Uygula
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Preset Modal */}
      {showAddPresetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-[#141721] border border-indigo-500/30 rounded-2xl p-5 w-full max-w-sm space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-indigo-400" />
              Yeni Stil Preseti Ekle ([V4+ Styles])
            </h3>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Preset Adı</label>
              <input
                type="text"
                value={newPresetNameInput}
                onChange={(e) => setNewPresetNameInput(e.target.value)}
                placeholder="Örn: Tabela, Flashback, OpEd"
                className="w-full bg-[#0C0E14] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowAddPresetModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
              >
                İptal
              </button>
              <button
                onClick={handleAddNewPreset}
                disabled={!newPresetNameInput.trim()}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-bold rounded-lg transition"
              >
                Ekle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Single Cue Dialog (360x640 Interactive Preview with Video Frame Background) */}
      {editingCue && (
        <EditSubtitleCueDialog
          cue={editingCue}
          currentVideoPositionMs={currentTimeMs}
          videoUrl={videoUrl}
          styles={styles}
          subtitleFrame={subtitleFrame}
          onClose={() => setEditingCue(null)}
          onSave={(updated) => {
            onSaveCue(updated);
            setEditingCue(null);
          }}
          onDelete={(id) => {
            onDeleteCue(id);
            setEditingCue(null);
          }}
        />
      )}
    </div>
  );
};
