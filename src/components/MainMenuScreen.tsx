import React, { useState, useRef } from 'react';
import { TorrentDownloadInfo, EncodeState } from '../types';
import {
  Film,
  Plus,
  Subtitles,
  Download,
  Search,
  Play,
  Pause,
  X,
  RefreshCw,
  FolderOpen,
  Sparkles,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface MainMenuScreenProps {
  torrentDownloadInfo: TorrentDownloadInfo;
  encodeState: EncodeState;
  onOpenEditor: () => void;
  onStartBlankProject: () => void;
  onOpenAnimeSearch: () => void;
  onOpenExtractMkvDialog: () => void;
  onOpenEncodeTasks: () => void;
  onStartMagnetDownload: (magnetUri: string) => void;
  onPickTorrentFile: (file: File) => void;
  onPauseTorrent: () => void;
  onResumeTorrent: () => void;
  onCancelTorrent: () => void;
  onRetryTorrent: () => void;
  onOpenDownloadedVideo: (videoUrl: string) => void;
  onLoadDemo: () => void;
}

export const MainMenuScreen: React.FC<MainMenuScreenProps> = ({
  torrentDownloadInfo,
  encodeState,
  onOpenEditor,
  onStartBlankProject,
  onOpenAnimeSearch,
  onOpenExtractMkvDialog,
  onOpenEncodeTasks,
  onStartMagnetDownload,
  onPickTorrentFile,
  onPauseTorrent,
  onResumeTorrent,
  onCancelTorrent,
  onRetryTorrent,
  onOpenDownloadedVideo,
  onLoadDemo,
}) => {
  const [magnetInput, setMagnetInput] = useState('');
  const torrentFileInputRef = useRef<HTMLInputElement>(null);

  const handleStartMagnet = (e: React.FormEvent) => {
    e.preventDefault();
    if (magnetInput.trim()) {
      onStartMagnetDownload(magnetInput.trim());
      setMagnetInput('');
    }
  };

  const handleTorrentFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onPickTorrentFile(file);
    }
  };

  return (
    <div className="min-h-screen bg-[#0C0E14] text-[#F1F5F9] flex flex-col items-center">
      {/* Top App Bar */}
      <header className="w-full bg-[#141721] border-b border-indigo-500/20 px-6 py-3.5 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <img
            src="/ic_rem_logo.jpg"
            alt="Rem Logo"
            className="w-9 h-9 rounded-full object-cover ring-2 ring-indigo-500/40 shadow-md"
            onError={(e) => {
              // fallback if image not loaded
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <div className="flex flex-col">
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
              remsubs playground
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                1.3
              </span>
            </h1>
            <span className="text-[11px] text-slate-400">Re:Zero Temalı Video & Altyazı Düzenleyici</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onLoadDemo}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-xs font-semibold transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            Örnek Demo Yükle
          </button>

          <button
            onClick={onOpenEncodeTasks}
            className="p-2 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-300 transition relative"
            title="Encode Görevleri"
          >
            <Film className="w-4 h-4 text-indigo-400" />
            {encodeState.isEncoding && (
              <span className="w-2 h-2 rounded-full bg-rose-500 absolute top-1.5 right-1.5 animate-ping" />
            )}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="w-full max-w-xl px-4 py-6 space-y-5">
        {/* Real-time Encode Status Strip if encoding */}
        {encodeState.isEncoding && (
          <div
            onClick={onOpenEncodeTasks}
            className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-950/80 to-purple-950/60 border border-indigo-500/40 cursor-pointer shadow-lg hover:border-indigo-400 transition"
          >
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-bold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                Hardsub Video Kodlanıyor...
              </span>
              <span className="font-mono font-bold text-indigo-300">{encodeState.progressPercentage}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-sky-400 rounded-full transition-all duration-300"
                style={{ width: `${encodeState.progressPercentage}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
              <span>{encodeState.currentFps.toFixed(0)} FPS</span>
              <span>Kalan: {encodeState.averageEstimatedFinishText}</span>
            </div>
          </div>
        )}

        {/* 0. MAGNET / TORRENT DOWNLOADER SECTION (Placed directly above "video ile altyazı düzenleme") */}
        <div className="p-5 rounded-2xl border border-indigo-500/30 bg-[#141721] shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                <Download className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Magnet / Torrent İndir</h2>
                <p className="text-[11px] text-slate-400">Anime videosu indirin veya doğrudan yayınlarda arayın</p>
              </div>
            </div>

            <button
              onClick={onOpenAnimeSearch}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-bold rounded-xl transition"
            >
              <Search className="w-3.5 h-3.5" />
              Anime Ara
            </button>
          </div>

          {/* Magnet Input Form */}
          <form onSubmit={handleStartMagnet} className="flex gap-2 mb-3">
            <input
              type="text"
              value={magnetInput}
              onChange={(e) => setMagnetInput(e.target.value)}
              placeholder="magnet:?xt=urn:btih:... linki yapıştırın"
              className="flex-1 bg-[#0C0E14] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
            />
            <button
              type="submit"
              disabled={!magnetInput.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition shadow-md shadow-indigo-600/20 shrink-0"
            >
              İndir
            </button>
          </form>

          {/* .torrent File Upload */}
          <div className="flex items-center justify-between text-xs pt-1">
            <input
              type="file"
              ref={torrentFileInputRef}
              accept=".torrent"
              onChange={handleTorrentFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => torrentFileInputRef.current?.click()}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition"
            >
              <FolderOpen className="w-3.5 h-3.5 text-indigo-400" />
              Veya .torrent Dosyası Seç
            </button>

            {torrentDownloadInfo.isActive && (
              <span className="text-[11px] font-mono text-emerald-400 font-semibold">
                {torrentDownloadInfo.statusMessage}
              </span>
            )}
          </div>

          {/* Active Download Progress Card */}
          {torrentDownloadInfo.isActive && (
            <div className="mt-4 p-3.5 bg-[#0C0E14] rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-white truncate max-w-[240px]">
                  {torrentDownloadInfo.torrentName}
                </span>
                <span className="font-mono font-bold text-sky-400">{torrentDownloadInfo.progressPercentage}%</span>
              </div>

              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 rounded-full transition-all duration-300"
                  style={{ width: `${torrentDownloadInfo.progressPercentage}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono flex-wrap gap-2 pt-1">
                <span>{torrentDownloadInfo.speedText}</span>
                <span>Kalan: {torrentDownloadInfo.etaText}</span>
                <span>▲ {torrentDownloadInfo.seeders} seed</span>

                <div className="flex items-center gap-1">
                  {torrentDownloadInfo.state === 'DOWNLOADING' ? (
                    <button
                      onClick={onPauseTorrent}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                      title="Duraklat"
                    >
                      <Pause className="w-3 h-3" />
                    </button>
                  ) : (
                    <button
                      onClick={onResumeTorrent}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                      title="Devam Et"
                    >
                      <Play className="w-3 h-3" />
                    </button>
                  )}
                  <button
                    onClick={onCancelTorrent}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-rose-400"
                    title="İptal"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {torrentDownloadInfo.state === 'COMPLETED' && (
                <div className="pt-2">
                  <button
                    onClick={() => onOpenDownloadedVideo(torrentDownloadInfo.downloadedFileUrl || '/sample_demo.mp4')}
                    className="w-full py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    İndirilen Videoyu Editörde Aç
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 1. DÜZ BİR DİKDÖRTGEN: "video ile altyazı düzenleme" */}
        <button
          onClick={onOpenEditor}
          className="w-full h-24 rounded-2xl bg-gradient-to-r from-indigo-900/60 via-indigo-800/40 to-slate-900 border-2 border-indigo-500/80 hover:border-indigo-400 shadow-xl shadow-indigo-950/40 p-5 flex items-center justify-between group transition transform active:scale-[0.99]"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-300 group-hover:scale-105 transition">
              <Film className="w-6 h-6" />
            </div>
            <div className="text-left">
              <h3 className="text-base font-extrabold text-white group-hover:text-indigo-200 transition">
                video ile altyazı düzenleme
              </h3>
              <p className="text-xs text-indigo-200/70">
                Görsel video önizleme, anlık zamanlama ve .ass senkronizasyonu
              </p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-indigo-400 group-hover:translate-x-1 transition shrink-0" />
        </button>

        {/* 2. KARE: "yeni altyazı" */}
        <div className="flex justify-center">
          <button
            onClick={onStartBlankProject}
            className="w-40 h-40 rounded-2xl bg-[#141721] border-2 border-slate-700/80 hover:border-indigo-400/80 shadow-lg p-4 flex flex-col items-center justify-center group transition transform active:scale-[0.98]"
          >
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500/20 group-hover:scale-110 transition mb-3">
              <Plus className="w-7 h-7" />
            </div>
            <span className="text-sm font-bold text-white group-hover:text-indigo-300 transition">
              yeni altyazı
            </span>
            <span className="text-[10px] text-slate-500 mt-1">Sıfırdan proje</span>
          </button>
        </div>

        {/* 3. VİDEODAN ALTYAZI AYIKLA ("yeni altyazı" ALTINDA) */}
        <button
          onClick={onOpenExtractMkvDialog}
          className="w-full h-20 rounded-2xl bg-[#141721] border border-slate-800 hover:border-indigo-500/50 shadow-md p-4 flex items-center justify-between group transition active:scale-[0.99]"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-105 transition">
              <Subtitles className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h3 className="text-sm font-bold text-white group-hover:text-purple-200 transition">
                Videodan Altyazı Ayıkla
              </h3>
              <p className="text-xs text-slate-400">
                MKV softsub akışını ayıklar (.ass / .srt)
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-500 group-hover:translate-x-1 group-hover:text-purple-400 transition" />
        </button>

        {/* Version Footer */}
        <div className="text-center pt-2">
          <span className="text-[11px] text-slate-500 font-mono">
            Sürüm 1.3-web • remsubs playground
          </span>
        </div>
      </main>
    </div>
  );
};
