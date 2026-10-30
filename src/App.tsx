import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  AppScreen,
  SubtitleCue,
  SubtitleStyle,
  TorrentDownloadInfo,
  EncodeState,
  EncodeTask,
  EncodingSettings,
  AssStyleDefinition,
  SubtitleFrameConfig,
} from './types';
import {
  getSampleAssContent,
  parse,
  parseAssDefaultStyle,
  parseAllAssStyles,
  parseAssScriptResolution,
  exportToSrt,
} from './utils/subtitleParser';
import { cleanToPlainText } from './utils/htmlSubtitleParser';
import { generateAss } from './utils/assGenerator';
import { torrentDownloadManager } from './services/torrentManager';
import { hardsubEncoderService } from './services/hardsubEncoder';
import { MainMenuScreen } from './components/MainMenuScreen';
import { ModernSubtitleEditorScreen } from './components/ModernSubtitleEditorScreen';
import { AnimeSearchScreen } from './components/AnimeSearchScreen';
import { AssExportDialog } from './components/AssExportDialog';
import { HardsubEncodeDialog } from './components/HardsubEncodeDialog';
import { CompatibilityTestDialog } from './components/CompatibilityTestDialog';
import { MkvSubtitleExtractionDialog } from './components/MkvSubtitleExtractionDialog';
import { EncodeTasksDialog } from './components/EncodeTasksDialog';

export const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('MAIN_MENU');

  // Video State
  const [videoUrl, setVideoUrl] = useState<string | null>('/sample_demo.mp4');
  const [videoTitle, setVideoTitle] = useState<string | null>('Örnek Video (sample_demo.mp4)');

  // Subtitles State
  const [subtitleFileName, setSubtitleFileName] = useState<string | null>('ornek_demo.ass');
  const [subtitles, setSubtitles] = useState<SubtitleCue[]>(() => {
    const demo = getSampleAssContent();
    return parse(demo, 'ornek_demo.ass');
  });

  // Style State
  const [subtitleStyle, setSubtitleStyle] = useState<SubtitleStyle>(() => {
    const demo = getSampleAssContent();
    return (
      parseAssDefaultStyle(demo) || {
        fontName: 'Arial',
        fontSizeSp: 50,
        isBold: true,
        isItalic: false,
        isUnderline: false,
        textColor: '#FFFFFF',
        outlineColor: '#000000',
        hasOutline: true,
        outlineWidth: 2.5,
        hasBackgroundBox: false,
        backgroundColor: '#00000099',
        verticalAlign: 'BOTTOM',
        horizontalAlign: 'CENTER',
        verticalOffsetDp: 40,
        horizontalPaddingDp: 30,
        timeOffsetMs: 0,
      }
    );
  });

  // ASS Style Definitions ([V4+ Styles] Presets)
  const [assStyles, setAssStyles] = useState<AssStyleDefinition[]>(() => {
    const demo = getSampleAssContent();
    return parseAllAssStyles(demo);
  });

  // Subtitle Frame Configuration (PlayResX & PlayResY)
  const [subtitleFrame, setSubtitleFrame] = useState<SubtitleFrameConfig>(() => {
    const demo = getSampleAssContent();
    return parseAssScriptResolution(demo);
  });

  // Undo / Redo Stacks
  const [undoStack, setUndoStack] = useState<SubtitleCue[][]>([]);
  const [redoStack, setRedoStack] = useState<SubtitleCue[][]>([]);

  const pushUndoState = useCallback((current: SubtitleCue[]) => {
    setUndoStack((prev) => [...prev.slice(-49), current]);
    setRedoStack([]);
  }, []);

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, subtitles]);
    setSubtitles(previous);
  }, [undoStack, subtitles]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setUndoStack((prev) => [...prev, subtitles]);
    setSubtitles(next);
  }, [redoStack, subtitles]);

  // Dialogs
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showEncodeDialog, setShowEncodeDialog] = useState(false);
  const [showCompatibilityDialog, setShowCompatibilityDialog] = useState(false);
  const [showExtractMkvDialog, setShowExtractMkvDialog] = useState(false);
  const [showEncodeTasksDialog, setShowEncodeTasksDialog] = useState(false);

  // Encode Tasks List
  const [encodeTasks, setEncodeTasks] = useState<EncodeTask[]>(() => [
    {
      id: 'task-1',
      title: 'hardsub_sample_demo_HIGH_1080P.mp4',
      status: 'COMPLETED',
      progress: 1,
      quality: '1080p Yüksek',
      resolution: '1920x1080',
      createdAt: Date.now() - 3600000,
      outputVideoUrl: '/sample_demo.mp4',
    },
  ]);

  // Torrent Manager Subscription
  const [torrentInfo, setTorrentInfo] = useState<TorrentDownloadInfo>(() =>
    torrentDownloadManager.getInfo()
  );

  useEffect(() => {
    const unsubscribe = torrentDownloadManager.subscribe((info) => {
      setTorrentInfo(info);
    });
    return unsubscribe;
  }, []);

  // Hardsub Encoder Subscription
  const [encodeState, setEncodeState] = useState<EncodeState>(() =>
    hardsubEncoderService.getState()
  );

  useEffect(() => {
    const unsubscribe = hardsubEncoderService.subscribe((state) => {
      setEncodeState(state);
      if (state.isCompleted && state.outputVideoUrl) {
        setEncodeTasks((prev) => [
          {
            id: `task-${Date.now()}`,
            title: state.outputVideoName || 'hardsub_video.mp4',
            status: 'COMPLETED',
            progress: 1,
            quality: state.currentEncoderName,
            resolution: '1920x1080',
            createdAt: Date.now(),
            outputVideoUrl: state.outputVideoUrl!,
          },
          ...prev,
        ]);
      }
    });
    return unsubscribe;
  }, []);

  // Active cues based on current playback timestamp
  const activeCues = useMemo(() => {
    return subtitles.filter((cue) => {
      const adjustedTime = 0 - (subtitleStyle.timeOffsetMs || 0);
      return adjustedTime >= cue.startTimeMs && adjustedTime <= cue.endTimeMs;
    });
  }, [subtitles, subtitleStyle.timeOffsetMs]);

  // Handlers
  const handleUpdateSubtitles = (newCues: SubtitleCue[]) => {
    pushUndoState(subtitles);
    setSubtitles(newCues);
  };

  const handleSaveCue = (updatedCue: SubtitleCue) => {
    pushUndoState(subtitles);
    const updated = subtitles
      .map((c) => (c.id === updatedCue.id ? updatedCue : c))
      .sort((a, b) => a.startTimeMs - b.startTimeMs);
    setSubtitles(updated);
  };

  const handleAddNewCue = (startTimeMs: number) => {
    pushUndoState(subtitles);
    const maxId = subtitles.reduce((max, c) => Math.max(max, c.id), 0);
    const newCue: SubtitleCue = {
      id: maxId + 1,
      startTimeMs,
      endTimeMs: startTimeMs + 3000,
      rawText: 'Yeni Altyazı Satırı',
      cleanText: 'Yeni Altyazı Satırı',
      styleName: 'Default',
    };
    const updated = [...subtitles, newCue].sort((a, b) => a.startTimeMs - b.startTimeMs);
    setSubtitles(updated);
  };

  const handleDeleteCue = (id: number) => {
    pushUndoState(subtitles);
    setSubtitles(subtitles.filter((c) => c.id !== id));
  };

  const handleDuplicateCue = (cue: SubtitleCue) => {
    pushUndoState(subtitles);
    const maxId = subtitles.reduce((max, c) => Math.max(max, c.id), 0);
    const newCue: SubtitleCue = {
      ...cue,
      id: maxId + 1,
      startTimeMs: cue.endTimeMs + 50,
      endTimeMs: cue.endTimeMs + 50 + (cue.endTimeMs - cue.startTimeMs),
    };
    const updated = [...subtitles, newCue].sort((a, b) => a.startTimeMs - b.startTimeMs);
    setSubtitles(updated);
  };

  const handleSplitCue = (cue: SubtitleCue) => {
    const dur = cue.endTimeMs - cue.startTimeMs;
    if (dur < 500) return;
    pushUndoState(subtitles);
    const mid = cue.startTimeMs + Math.floor(dur / 2);
    const maxId = subtitles.reduce((max, c) => Math.max(max, c.id), 0);

    const words = cue.rawText.split(' ');
    const half = Math.max(1, Math.floor(words.length / 2));
    const firstPart = words.slice(0, half).join(' ');
    const secondPart = words.slice(half).join(' ') || firstPart;

    const firstCue: SubtitleCue = {
      ...cue,
      endTimeMs: mid,
      rawText: firstPart,
      cleanText: cleanToPlainText(firstPart),
    };

    const secondCue: SubtitleCue = {
      ...cue,
      id: maxId + 1,
      startTimeMs: mid + 50,
      rawText: secondPart,
      cleanText: cleanToPlainText(secondPart),
    };

    const updated = subtitles.map((c) => (c.id === cue.id ? firstCue : c)).concat(secondCue);
    setSubtitles(updated.sort((a, b) => a.startTimeMs - b.startTimeMs));
  };

  const handleReplaceAllText = (target: string, replacement: string) => {
    if (!target) return;
    pushUndoState(subtitles);
    const updated = subtitles.map((cue) => {
      if (cue.rawText.includes(target)) {
        const newRaw = cue.rawText.split(target).join(replacement);
        return { ...cue, rawText: newRaw, cleanText: cleanToPlainText(newRaw) };
      }
      return cue;
    });
    setSubtitles(updated);
  };

  const handleStartBlankProject = () => {
    pushUndoState(subtitles);
    setSubtitles([]);
    setSubtitleFileName('yeni_proje.ass');
    setCurrentScreen('EDITOR');
  };

  const handleLoadDemo = () => {
    const demo = getSampleAssContent();
    const cues = parse(demo, 'ornek_demo.ass');
    const parsedStyle = parseAssDefaultStyle(demo);
    const parsedStyles = parseAllAssStyles(demo);
    const parsedRes = parseAssScriptResolution(demo);
    setSubtitles(cues);
    setSubtitleFileName('ornek_demo.ass');
    setVideoUrl('/sample_demo.mp4');
    setVideoTitle('Örnek Video (sample_demo.mp4)');
    if (parsedStyle) setSubtitleStyle(parsedStyle);
    if (parsedStyles.length > 0) setAssStyles(parsedStyles);
    setSubtitleFrame(parsedRes);
    setCurrentScreen('EDITOR');
  };

  const handleLoadCustomVideo = (file: File) => {
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    setVideoTitle(file.name);
  };

  const handleLoadCustomSubtitle = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        pushUndoState(subtitles);
        const cues = parse(content, file.name);
        setSubtitles(cues);
        setSubtitleFileName(file.name);
        const parsedStyle = parseAssDefaultStyle(content);
        const parsedStyles = parseAllAssStyles(content);
        const parsedRes = parseAssScriptResolution(content);
        if (parsedStyle) setSubtitleStyle(parsedStyle);
        if (parsedStyles.length > 0) setAssStyles(parsedStyles);
        setSubtitleFrame(parsedRes);
      }
    };
    reader.readAsText(file);
  };

  const handleLoadCustomFont = (file: File) => {
    const fontName = file.name.replace(/\.[^.]+$/, '');
    const url = URL.createObjectURL(file);
    const fontFace = new FontFace(fontName, `url(${url})`);
    fontFace.load().then((loaded) => {
      document.fonts.add(loaded);
      setSubtitleStyle((s) => ({ ...s, fontName }));
    });
  };

  const handleStartMagnetDownload = (magnetUri: string, customName?: string) => {
    torrentDownloadManager.startMagnet(magnetUri, customName);
  };

  const handleOpenDownloadedVideo = (url: string) => {
    setVideoUrl(url);
    setVideoTitle(torrentInfo.torrentName || 'İndirilen Anime Videosu.mkv');
    setCurrentScreen('EDITOR');
  };

  const handleExtractedMkvSubtitle = (
    cues: SubtitleCue[],
    fileName: string,
    rawContent: string
  ) => {
    pushUndoState(subtitles);
    setSubtitles(cues);
    setSubtitleFileName(fileName);
    const parsedStyle = parseAssDefaultStyle(rawContent);
    const parsedStyles = parseAllAssStyles(rawContent);
    const parsedRes = parseAssScriptResolution(rawContent);
    if (parsedStyle) setSubtitleStyle(parsedStyle);
    if (parsedStyles.length > 0) setAssStyles(parsedStyles);
    setSubtitleFrame(parsedRes);
    setCurrentScreen('EDITOR');
  };

  const handleStartEncode = (settings: EncodingSettings, introTitle?: string) => {
    hardsubEncoderService.startEncoding(settings, videoTitle || undefined, introTitle);
  };

  return (
    <div className="w-full min-h-screen bg-[#0C0E14] text-[#F1F5F9]">
      {currentScreen === 'MAIN_MENU' && (
        <MainMenuScreen
          torrentDownloadInfo={torrentInfo}
          encodeState={encodeState}
          onOpenEditor={() => setCurrentScreen('EDITOR')}
          onStartBlankProject={handleStartBlankProject}
          onOpenAnimeSearch={() => setCurrentScreen('ANIME_SEARCH')}
          onOpenExtractMkvDialog={() => setShowExtractMkvDialog(true)}
          onOpenEncodeTasks={() => setShowEncodeTasksDialog(true)}
          onStartMagnetDownload={handleStartMagnetDownload}
          onPickTorrentFile={(file) => torrentDownloadManager.startTorrentFile(file)}
          onPauseTorrent={() => torrentDownloadManager.pause()}
          onResumeTorrent={() => torrentDownloadManager.resume()}
          onCancelTorrent={() => torrentDownloadManager.cancel()}
          onRetryTorrent={() => torrentDownloadManager.retry()}
          onOpenDownloadedVideo={handleOpenDownloadedVideo}
          onLoadDemo={handleLoadDemo}
        />
      )}

      {currentScreen === 'ANIME_SEARCH' && (
        <AnimeSearchScreen
          onBack={() => setCurrentScreen('MAIN_MENU')}
          torrentDownloadInfo={torrentInfo}
          onDownloadMagnet={(magnet, title) => {
            handleStartMagnetDownload(magnet, title);
            setCurrentScreen('MAIN_MENU');
          }}
          onOpenDownloadedVideo={handleOpenDownloadedVideo}
        />
      )}

      {currentScreen === 'EDITOR' && (
        <ModernSubtitleEditorScreen
          videoUrl={videoUrl}
          videoTitle={videoTitle}
          subtitles={subtitles}
          activeCues={activeCues}
          style={subtitleStyle}
          subtitleFileName={subtitleFileName}
          canUndo={undoStack.length > 0}
          canRedo={redoStack.length > 0}
          styles={assStyles}
          onUpdateStyles={setAssStyles}
          subtitleFrame={subtitleFrame}
          onUpdateSubtitleFrame={setSubtitleFrame}
          onNavigateBack={() => setCurrentScreen('MAIN_MENU')}
          onUpdateSubtitles={handleUpdateSubtitles}
          onUpdateStyle={setSubtitleStyle}
          onSaveCue={handleSaveCue}
          onAddNewCue={handleAddNewCue}
          onDeleteCue={handleDeleteCue}
          onDuplicateCue={handleDuplicateCue}
          onSplitCue={handleSplitCue}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onReplaceAllText={handleReplaceAllText}
          onOpenExportDialog={() => setShowExportDialog(true)}
          onOpenEncodeDialog={() => setShowEncodeDialog(true)}
          onOpenExtractMkvDialog={() => setShowExtractMkvDialog(true)}
          onLoadCustomVideo={handleLoadCustomVideo}
          onLoadCustomSubtitle={handleLoadCustomSubtitle}
          onLoadCustomFont={handleLoadCustomFont}
          encodeState={encodeState}
        />
      )}

      {/* Dialogs */}
      <AssExportDialog
        isOpen={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        subtitles={subtitles}
        style={subtitleStyle}
        subtitleFileName={subtitleFileName}
        styles={assStyles}
        subtitleFrame={subtitleFrame}
      />

      <HardsubEncodeDialog
        isOpen={showEncodeDialog}
        onClose={() => setShowEncodeDialog(false)}
        encodeState={encodeState}
        videoTitle={videoTitle || undefined}
        onStartEncode={handleStartEncode}
        onCancelEncode={() => hardsubEncoderService.cancelEncoding()}
        onOpenCompatibilityTest={() => setShowCompatibilityDialog(true)}
        onPlayEncodedVideo={(url) => {
          setVideoUrl(url);
          setShowEncodeDialog(false);
          setCurrentScreen('EDITOR');
        }}
      />

      <CompatibilityTestDialog
        isOpen={showCompatibilityDialog}
        onClose={() => setShowCompatibilityDialog(false)}
      />

      <MkvSubtitleExtractionDialog
        isOpen={showExtractMkvDialog}
        onClose={() => setShowExtractMkvDialog(false)}
        videoFileName={videoTitle || 'ReZero_Demo.mkv'}
        onOpenInEditor={handleExtractedMkvSubtitle}
      />

      <EncodeTasksDialog
        isOpen={showEncodeTasksDialog}
        onClose={() => setShowEncodeTasksDialog(false)}
        tasks={encodeTasks}
        onPlayTask={(url) => {
          setVideoUrl(url);
          setShowEncodeTasksDialog(false);
          setCurrentScreen('EDITOR');
        }}
        onDeleteTask={(id) => setEncodeTasks((prev) => prev.filter((t) => t.id !== id))}
      />
    </div>
  );
};
