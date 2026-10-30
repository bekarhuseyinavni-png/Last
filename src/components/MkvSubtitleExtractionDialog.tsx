import React, { useState, useEffect } from 'react';
import { MkvSubtitleTrack, SubtitleCue } from '../types';
import { inspectMkvTracks } from '../services/mkvExtractor';
import { parse } from '../utils/subtitleParser';
import { Film, Subtitles, Download, CheckCircle, ArrowRight, X, Loader2 } from 'lucide-react';

interface MkvSubtitleExtractionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  videoFileName?: string;
  onOpenInEditor: (cues: SubtitleCue[], fileName: string, rawContent: string) => void;
}

export const MkvSubtitleExtractionDialog: React.FC<MkvSubtitleExtractionDialogProps> = ({
  isOpen,
  onClose,
  videoFileName = 'ReZero_Bölüm_18.mkv',
  onOpenInEditor,
}) => {
  const [tracks, setTracks] = useState<MkvSubtitleTrack[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<MkvSubtitleTrack | null>(null);
  const [isInspecting, setIsInspecting] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedContent, setExtractedContent] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setIsInspecting(true);
      setExtractedContent(null);
      inspectMkvTracks(videoFileName)
        .then((foundTracks) => {
          setTracks(foundTracks);
          const def = foundTracks.find((t) => t.isDefault) || foundTracks[0] || null;
          setSelectedTrack(def);
        })
        .finally(() => setIsInspecting(false));
    }
  }, [isOpen, videoFileName]);

  if (!isOpen) return null;

  const handleStartExtraction = () => {
    if (!selectedTrack) return;
    setIsExtracting(true);
    setTimeout(() => {
      setExtractedContent(selectedTrack.content || '');
      setIsExtracting(false);
    }, 700);
  };

  const handleOpenEditor = () => {
    if (!selectedTrack || !extractedContent) return;
    const ext = selectedTrack.format;
    const targetName = `${videoFileName.replace(/\.[^.]+$/, '')}.${ext}`;
    const parsedCues = parse(extractedContent, targetName);
    onOpenInEditor(parsedCues, targetName, extractedContent);
    onClose();
  };

  const handleSaveToDevice = () => {
    if (!selectedTrack || !extractedContent) return;
    const ext = selectedTrack.format;
    const fileName = `${videoFileName.replace(/\.[^.]+$/, '')}.${ext}`;
    const blob = new Blob([extractedContent], {
      type: ext === 'ass' ? 'text/x-ssa;charset=utf-8' : 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="bg-[#141721] border border-indigo-500/30 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-indigo-500/20 flex items-center justify-between bg-[#1E2333]/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">MKV Softsub Altyazı Ayıkla</h2>
              <p className="text-xs text-slate-400 truncate max-w-[280px] sm:max-w-md">{videoFileName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          {isInspecting ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-3" />
              <p className="text-sm text-slate-300 font-medium">MKV konteyneri taranıyor...</p>
              <p className="text-xs text-slate-500 mt-1">Gömülü altyazı akışları çözümleniyor</p>
            </div>
          ) : tracks.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              Bu videoda gömülü softsub altyazı akışı bulunamadı.
            </div>
          ) : (
            <>
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                Bulunan Altyazı Akışları ({tracks.length})
              </label>
              <div className="space-y-2.5">
                {tracks.map((track) => {
                  const isSelected = selectedTrack?.id === track.id;
                  return (
                    <div
                      key={track.id}
                      onClick={() => {
                        setSelectedTrack(track);
                        setExtractedContent(null);
                      }}
                      className={`p-3.5 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-500/10 shadow-sm'
                          : 'border-slate-800 bg-[#1E2333]/30 hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        checked={isSelected}
                        onChange={() => {
                          setSelectedTrack(track);
                          setExtractedContent(null);
                        }}
                        className="mt-1 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-white">{track.title}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            {track.format}
                          </span>
                          {track.isDefault && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                              Varsayılan
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">Dil: {track.language}</p>
                        {track.sampleText && (
                          <div className="mt-2 text-xs font-mono bg-[#0C0E14] px-2.5 py-1.5 rounded-lg border border-slate-800/80 text-slate-300 truncate">
                            {track.sampleText}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {extractedContent && (
                <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div className="flex-1 text-xs text-emerald-200">
                    Altyazı başarıyla ayıklandı! Editörde açabilir veya cihazınıza kaydedebilirsiniz.
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between bg-[#1E2333]/20">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-sm font-medium transition"
          >
            İptal
          </button>

          <div className="flex items-center gap-2">
            {!extractedContent ? (
              <button
                onClick={handleStartExtraction}
                disabled={!selectedTrack || isExtracting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-lg shadow-indigo-600/20 transition disabled:opacity-50"
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Ayıklanıyor...
                  </>
                ) : (
                  <>
                    <Subtitles className="w-4 h-4" />
                    Seçili Altyazıyı Ayıkla
                  </>
                )}
              </button>
            ) : (
              <>
                <button
                  onClick={handleSaveToDevice}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition"
                >
                  <Download className="w-4 h-4" />
                  Cihaza Kaydet
                </button>
                <button
                  onClick={handleOpenEditor}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-sky-500 hover:from-indigo-600 hover:to-sky-600 text-white text-sm font-bold shadow-lg shadow-indigo-500/20 transition"
                >
                  Editörde Aç
                  <ArrowRight className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
