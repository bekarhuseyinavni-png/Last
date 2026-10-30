import React, { useState } from 'react';
import { AnimeSearchResult, AnimeSource, TorrentDownloadInfo, VideoQuality } from '../types';
import { searchAnime } from '../services/animeSearch';
import { ArrowLeft, Search, Download, Copy, Check, ExternalLink, ShieldCheck, Layers, Loader2, Sparkles, Magnet } from 'lucide-react';

interface AnimeSearchScreenProps {
  onBack: () => void;
  torrentDownloadInfo: TorrentDownloadInfo;
  onDownloadMagnet: (magnetUri: string, title?: string) => void;
  onOpenDownloadedVideo: (videoUrl: string) => void;
}

export const AnimeSearchScreen: React.FC<AnimeSearchScreenProps> = ({
  onBack,
  torrentDownloadInfo,
  onDownloadMagnet,
  onOpenDownloadedVideo,
}) => {
  const [query, setQuery] = useState('Re:Zero');
  const [source, setSource] = useState<AnimeSource>('SUBSPLEASE');
  const [quality, setQuality] = useState<VideoQuality>('1080p');
  const [sortBySeeders, setSortBySeeders] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<AnimeSearchResult[]>([]);
  const [lastQuery, setLastQuery] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;
    setIsLoading(true);
    try {
      const data = await searchAnime(query, source, quality);
      setResults(data);
      setLastQuery(query);
    } finally {
      setIsLoading(false);
    }
  };

  // Perform initial search on mount
  React.useEffect(() => {
    handleSearch();
  }, [source, quality]);

  const displayedResults = React.useMemo(() => {
    if (!sortBySeeders) return results;
    return [...results].sort((a, b) => (b.seeders || 0) - (a.seeders || 0));
  }, [results, sortBySeeders]);

  const handleCopyMagnet = (magnet: string, id: string) => {
    navigator.clipboard.writeText(magnet);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[#0C0E14] text-[#F1F5F9] flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-[#141721]/90 backdrop-blur-md border-b border-indigo-500/20 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Ana Menüye Dön"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <form onSubmit={handleSearch} className="flex-1 relative flex items-center">
            <Search className="w-4 h-4 absolute left-3.5 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Anime veya bölüm ara (örn: Re:Zero, Frieren, Kimetsu)..."
              className="w-full bg-[#1E2333]/60 border border-slate-700/80 rounded-xl pl-10 pr-24 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="absolute right-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5"
            >
              {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Ara'}
            </button>
          </form>
        </div>
      </header>

      {/* Filter and Source Controls */}
      <div className="border-b border-slate-800/80 bg-[#141721]/50 px-4 py-3">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Source Switcher */}
          <div className="flex bg-[#0C0E14] p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setSource('SUBSPLEASE')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                source === 'SUBSPLEASE'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              SubsPlease
            </button>
            <button
              onClick={() => setSource('NYAA')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                source === 'NYAA'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Nyaa Torrents
            </button>
          </div>

          {/* Quality Chips */}
          <div className="flex items-center gap-1.5 bg-[#0C0E14] p-1 rounded-xl border border-slate-800">
            {(['1080p', '720p', '480p'] as VideoQuality[]).map((q) => (
              <button
                key={q}
                onClick={() => setQuality(q)}
                className={`px-3 py-1 rounded-lg font-semibold transition ${
                  quality === q
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {q}
              </button>
            ))}
          </div>

          {/* Sort By Seeders Toggle */}
          <label className="flex items-center gap-2 cursor-pointer text-slate-300 font-medium">
            <input
              type="checkbox"
              checked={sortBySeeders}
              onChange={(e) => setSortBySeeders(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            Seeder Sayısına Göre Sırala
          </label>
        </div>
      </div>

      {/* Active Torrent Download Bar if downloading */}
      {torrentDownloadInfo.isActive && (
        <div className="bg-indigo-950/60 border-b border-indigo-500/30 px-4 py-2.5">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
              <span className="font-semibold text-white truncate">{torrentDownloadInfo.torrentName}</span>
              <span className="text-slate-400 font-mono">
                {torrentDownloadInfo.speedText} • {torrentDownloadInfo.progressPercentage}%
              </span>
            </div>
            {torrentDownloadInfo.state === 'COMPLETED' && (
              <button
                onClick={() => onOpenDownloadedVideo('/sample_demo.mp4')}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition"
              >
                Editörde Aç
              </button>
            )}
          </div>
        </div>
      )}

      {/* Results Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 space-y-3">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-center">
            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-3" />
            <p className="text-sm font-semibold text-white">{source} taranıyor...</p>
            <p className="text-xs text-slate-500 mt-1">Magnet linkleri ve tohumlayıcılar listeleniyor</p>
          </div>
        ) : displayedResults.length === 0 ? (
          <div className="py-20 text-center text-slate-400">
            <p className="text-sm">"{lastQuery}" için sonuç bulunamadı.</p>
            <p className="text-xs text-slate-500 mt-1">Farklı bir başlık veya kaynak (Nyaa / SubsPlease) deneyin.</p>
          </div>
        ) : (
          displayedResults.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-xl border border-slate-800 bg-[#141721] hover:border-indigo-500/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  {item.quality && (
                    <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                      {item.quality}
                    </span>
                  )}
                  {item.isBatch && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-amber-500/20 text-amber-300 flex items-center gap-1">
                      <Layers className="w-3 h-3" /> Batch
                    </span>
                  )}
                  {item.isTrusted && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> Güvenilir
                    </span>
                  )}
                  <span className="text-[10px] text-slate-500">
                    {item.source === 'SUBSPLEASE' ? 'SubsPlease' : 'Nyaa'}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-white line-clamp-2 leading-snug">{item.title}</h3>

                <div className="flex items-center gap-3 text-xs text-slate-400 mt-2 font-mono flex-wrap">
                  {item.sizeText && <span>Boyut: <strong className="text-slate-200">{item.sizeText}</strong></span>}
                  {item.seeders !== undefined && item.seeders !== null && (
                    <span className="text-emerald-400 font-semibold">▲ {item.seeders} seed</span>
                  )}
                  {item.leechers !== undefined && item.leechers !== null && (
                    <span className="text-rose-400">▼ {item.leechers} leech</span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/80">
                <button
                  onClick={() => handleCopyMagnet(item.magnetUri, item.id)}
                  className="p-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                  title="Magnet Linkini Kopyala"
                >
                  {copiedId === item.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>

                <button
                  onClick={() => onDownloadMagnet(item.magnetUri, item.title)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-sky-500 hover:from-indigo-600 hover:to-sky-600 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition"
                >
                  <Download className="w-4 h-4" />
                  İndir & Önizle
                </button>
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
};
