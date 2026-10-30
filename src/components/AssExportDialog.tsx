import React, { useState } from 'react';
import { SubtitleCue, SubtitleStyle, AssStyleDefinition, SubtitleFrameConfig } from '../types';
import { generateAss } from '../utils/assGenerator';
import { exportToSrt } from '../utils/subtitleParser';
import { Copy, Download, FileText, X, Check, Tv, Layers } from 'lucide-react';

interface AssExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  subtitles: SubtitleCue[];
  style: SubtitleStyle;
  subtitleFileName?: string | null;
  videoWidth?: number;
  videoHeight?: number;
  styles?: AssStyleDefinition[];
  subtitleFrame?: SubtitleFrameConfig;
}

export const AssExportDialog: React.FC<AssExportDialogProps> = ({
  isOpen,
  onClose,
  subtitles,
  style,
  subtitleFileName,
  videoWidth = 1920,
  videoHeight = 1080,
  styles = [],
  subtitleFrame = { playResX: 1920, playResY: 1080 },
}) => {
  const [activeFormat, setActiveFormat] = useState<'ASS' | 'SRT'>('ASS');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const playResX = subtitleFrame?.playResX || videoWidth || 1920;
  const playResY = subtitleFrame?.playResY || videoHeight || 1080;

  const baseFileName = (subtitleFileName || 'remsubs_altyazi.ass').replace(/\.[^.]+$/, '');
  const assContent = generateAss(
    `${baseFileName}.ass`,
    subtitles,
    style,
    true,
    playResX,
    playResY,
    [],
    0,
    styles
  );
  const srtContent = exportToSrt(subtitles);
  const currentContent = activeFormat === 'ASS' ? assContent : srtContent;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const ext = activeFormat === 'ASS' ? 'ass' : 'srt';
    const mime = activeFormat === 'ASS' ? 'text/x-ssa;charset=utf-8' : 'text/plain;charset=utf-8';
    const blob = new Blob([currentContent], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${baseFileName}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="bg-[#141721] border border-indigo-500/30 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-indigo-500/20 flex items-center justify-between bg-[#1E2333]/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Altyazıyı Dışa Aktar</h2>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                <span>{subtitles.length} satır diyalog</span>
                <span>•</span>
                <span className="flex items-center gap-1 font-mono text-indigo-300">
                  <Tv className="w-3 h-3 text-sky-400" />
                  PlayRes: {playResX}x{playResY}
                </span>
                {styles.length > 0 && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1 font-mono text-purple-300">
                      <Layers className="w-3 h-3 text-purple-400" />
                      {styles.length} Stil Preseti
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Format Selector Tabs */}
        <div className="px-6 pt-4 flex gap-2">
          <button
            onClick={() => setActiveFormat('ASS')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
              activeFormat === 'ASS'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            Advanced SubStation Alpha (.ass)
          </button>
          <button
            onClick={() => setActiveFormat('SRT')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
              activeFormat === 'SRT'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            SubRip Metin (.srt)
          </button>
        </div>

        {/* Content Preview */}
        <div className="p-6 flex-1 overflow-hidden flex flex-col">
          <div className="bg-[#0C0E14] border border-slate-800 rounded-xl p-3 flex-1 overflow-auto font-mono text-xs text-slate-300 select-text leading-relaxed">
            <pre className="whitespace-pre-wrap">{currentContent}</pre>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between bg-[#1E2333]/20">
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-200 text-sm font-medium transition"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Kopyalandı' : 'Panoya Kopyala'}
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-sm font-medium transition"
            >
              Kapat
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-sky-500 hover:from-indigo-600 hover:to-sky-600 text-white text-sm font-bold shadow-lg shadow-indigo-500/20 transition"
            >
              <Download className="w-4 h-4" />
              .{activeFormat.toLowerCase()} Dosyasını İndir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
