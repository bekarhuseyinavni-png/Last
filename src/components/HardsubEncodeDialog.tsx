import React, { useState } from 'react';
import { EncodeState, EncodingSettings, QualityOption, EncoderOption, SourceVideoMetadata } from '../types';
import { Play, Download, Terminal, X, Settings2, Sparkles, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface HardsubEncodeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  encodeState: EncodeState;
  videoTitle?: string;
  sourceMetadata?: SourceVideoMetadata;
  onStartEncode: (settings: EncodingSettings, introTitle?: string) => void;
  onCancelEncode: () => void;
  onOpenCompatibilityTest: () => void;
  onPlayEncodedVideo?: (url: string) => void;
}

export const HardsubEncodeDialog: React.FC<HardsubEncodeDialogProps> = ({
  isOpen,
  onClose,
  encodeState,
  videoTitle,
  sourceMetadata,
  onStartEncode,
  onCancelEncode,
  onOpenCompatibilityTest,
  onPlayEncodedVideo,
}) => {
  const [activeTab, setActiveTab] = useState<'SETTINGS' | 'LOGS'>('SETTINGS');
  const [qualityOption, setQualityOption] = useState<QualityOption>('HIGH_1080P');
  const [encoderOption, setEncoderOption] = useState<EncoderOption>('AUTO');
  const [resolution, setResolution] = useState('1080p');
  const [crf, setCrf] = useState(18);
  const [preset, setPreset] = useState('medium');
  const [bitrate, setBitrate] = useState('5000k');
  const [fps, setFps] = useState('Kaynakla Aynı');
  const [audioOption, setAudioOption] = useState('AAC 192 kbps (Standart)');
  const [introVideoTitle, setIntroVideoTitle] = useState<string | undefined>(undefined);
  const [introKeepAudio, setIntroKeepAudio] = useState(false);

  if (!isOpen) return null;

  const handlePresetSelect = (opt: QualityOption) => {
    setQualityOption(opt);
    switch (opt) {
      case 'ULTRA_1080P':
        setResolution('1080p');
        setCrf(16);
        setPreset('slow');
        setBitrate('8000k');
        setAudioOption('AAC 320 kbps (Yüksek)');
        break;
      case 'HIGH_1080P':
        setResolution('1080p');
        setCrf(18);
        setPreset('medium');
        setBitrate('5000k');
        setAudioOption('AAC 192 kbps (Standart)');
        break;
      case 'STANDARD_720P':
        setResolution('720p');
        setCrf(20);
        setPreset('medium');
        setBitrate('3200k');
        setAudioOption('AAC 192 kbps (Standart)');
        break;
      case 'FAST_720P':
        setResolution('720p');
        setCrf(23);
        setPreset('veryfast');
        setBitrate('2200k');
        setAudioOption('AAC 128 kbps (Kompakt)');
        break;
      case 'COMPACT_480P':
        setResolution('480p');
        setCrf(25);
        setPreset('veryfast');
        setBitrate('1200k');
        setAudioOption('AAC 128 kbps (Kompakt)');
        break;
      case 'SOURCE_ORIGINAL':
        setResolution('Kaynakla Aynı');
        setCrf(18);
        setPreset('veryfast');
        setBitrate('Otomatik');
        setAudioOption('Orijinal (Mümkünse Copy)');
        break;
    }
  };

  const handleStart = () => {
    const settings: EncodingSettings = {
      qualityOption,
      resolution,
      encoderOption,
      videoCodec: encoderOption,
      crf,
      preset,
      bitrate,
      fps,
      audioOption,
      pixelFormat: 'yuv420p',
      hardwareAcceleration: 'Otomatik',
    };
    onStartEncode(settings, introVideoTitle);
    setActiveTab('LOGS');
  };

  const handleDownloadOutput = () => {
    if (!encodeState.outputVideoUrl) return;
    const a = document.createElement('a');
    a.href = encodeState.outputVideoUrl;
    a.download = encodeState.outputVideoName || 'hardsub_video.mp4';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="bg-[#141721] border border-indigo-500/30 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-indigo-500/20 flex items-center justify-between bg-[#1E2333]/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Hardsub Video Kodlama</h2>
              <p className="text-xs text-slate-400">
                libass ile altyazıyı videoya kalıcı işleme (Burn-in MP4)
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="px-6 pt-3 flex items-center justify-between border-b border-slate-800">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('SETTINGS')}
              className={`px-4 py-2 border-b-2 text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'SETTINGS'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Settings2 className="w-3.5 h-3.5" />
              Kodlama Ayarları
            </button>
            <button
              onClick={() => setActiveTab('LOGS')}
              className={`px-4 py-2 border-b-2 text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'LOGS'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              FFmpeg Canlı Çıktı & Durum {encodeState.isEncoding && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
            </button>
          </div>

          <button
            onClick={onOpenCompatibilityTest}
            className="text-xs text-sky-400 hover:text-sky-300 font-medium py-1 px-2.5 rounded-lg hover:bg-sky-500/10 transition"
          >
            Uyumluluk Testi →
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-5">
          {activeTab === 'SETTINGS' ? (
            <>
              {/* Source Video Info Badge */}
              <div className="bg-[#1E2333]/40 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between flex-wrap gap-2 text-xs">
                <div>
                  <span className="text-slate-400">Kaynak Video: </span>
                  <span className="font-semibold text-white">{videoTitle || 'sample_demo.mp4'}</span>
                </div>
                <div className="flex gap-3 text-slate-300 font-mono">
                  <span>1080p</span>
                  <span>•</span>
                  <span>30 FPS</span>
                  <span>•</span>
                  <span>AAC 48kHz</span>
                </div>
              </div>

              {/* Quality Presets */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-2 uppercase tracking-wider">
                  Kalite ve Çözünürlük Şablonu
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'HIGH_1080P', label: '1080p Yüksek', sub: 'En İdeal Denge (Önerilen)' },
                    { id: 'ULTRA_1080P', label: '1080p Ultra', sub: 'Maksimum Keskinlik' },
                    { id: 'STANDARD_720P', label: '720p Standart', sub: 'Sosyal Medya / Hızlı' },
                    { id: 'FAST_720P', label: '720p Hızlı', sub: 'Ultra Hızlı Render' },
                    { id: 'SOURCE_ORIGINAL', label: 'Kaynakla Aynı', sub: 'Orijinal Parametreler' },
                    { id: 'CUSTOM', label: 'Özel Ayarlar', sub: 'Manuel CRF / Bitrate' },
                  ].map((presetItem) => {
                    const isSelected = qualityOption === presetItem.id;
                    return (
                      <button
                        key={presetItem.id}
                        type="button"
                        onClick={() => handlePresetSelect(presetItem.id as QualityOption)}
                        className={`p-2.5 rounded-xl border text-left transition ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-500/15 shadow-sm'
                            : 'border-slate-800 bg-[#1E2333]/20 hover:border-slate-700'
                        }`}
                      >
                        <div className="text-xs font-bold text-white">{presetItem.label}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{presetItem.sub}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Detailed Encoding Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#1E2333]/20 p-4 rounded-xl border border-slate-800">
                {/* Encoder */}
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">Video Kodlayıcı (Codec)</label>
                  <select
                    value={encoderOption}
                    onChange={(e) => setEncoderOption(e.target.value as EncoderOption)}
                    className="w-full bg-[#0C0E14] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                  >
                    <option value="AUTO">Otomatik (En Hızlı Donanım / CPU)</option>
                    <option value="libx264">Software H.264 (libx264 - Evrensel)</option>
                    <option value="h264_mediacodec">Hardware H.264 (MediaCodec Hızlandırma)</option>
                    <option value="hevc_mediacodec">Hardware HEVC (H.265 MediaCodec)</option>
                    <option value="libx265">Software HEVC (libx265 - Yüksek Sıkıştırma)</option>
                    <option value="vp9">Google VP9 (WebM / YouTube)</option>
                    <option value="av1">AOMedia AV1 (Gelecek Nesil)</option>
                  </select>
                </div>

                {/* Audio Option */}
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">Ses Akışı</label>
                  <select
                    value={audioOption}
                    onChange={(e) => setAudioOption(e.target.value)}
                    className="w-full bg-[#0C0E14] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                  >
                    <option value="Orijinal (Mümkünse Copy)">Orijinal Ses (Kayıpsız Passthrough Copy)</option>
                    <option value="AAC 192 kbps (Standart)">AAC 192 kbps (Standart Yüksek Kalite)</option>
                    <option value="AAC 320 kbps (Yüksek)">AAC 320 kbps (Stüdyo Kalitesi)</option>
                    <option value="AAC 128 kbps (Kompakt)">AAC 128 kbps (Kompakt Dosya)</option>
                    <option value="Sessiz / Ses Yok">Sessiz (Mute Audio)</option>
                  </select>
                </div>

                {/* CRF Slider */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300 font-medium">CRF Kalite Faktörü (14 - 28)</span>
                    <span className="font-mono text-indigo-400 font-bold">{crf}</span>
                  </div>
                  <input
                    type="range"
                    min={14}
                    max={28}
                    value={crf}
                    onChange={(e) => setCrf(parseInt(e.target.value, 10))}
                    className="w-full accent-indigo-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                    <span>14 (Kayıpsız)</span>
                    <span>18 (Önerilen)</span>
                    <span>28 (Kompakt)</span>
                  </div>
                </div>

                {/* Preset */}
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">CPU Sıkıştırma Hızı (Preset)</label>
                  <select
                    value={preset}
                    onChange={(e) => setPreset(e.target.value)}
                    className="w-full bg-[#0C0E14] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                  >
                    <option value="ultrafast">ultrafast (En Hızlı Render)</option>
                    <option value="veryfast">veryfast (Hızlı & Dengeli)</option>
                    <option value="medium">medium (Standart)</option>
                    <option value="slow">slow (Yüksek Sıkıştırma)</option>
                    <option value="veryslow">veryslow (Maksimum Verim)</option>
                  </select>
                </div>
              </div>

              {/* Intro Video Attachment (Optional) */}
              <div className="p-3.5 bg-[#1E2333]/20 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-300">İntro Video Ekle (Opsiyonel)</span>
                  {introVideoTitle ? (
                    <button
                      type="button"
                      onClick={() => setIntroVideoTitle(undefined)}
                      className="text-[10px] text-rose-400 hover:underline"
                    >
                      Kaldır
                    </button>
                  ) : null}
                </div>
                {introVideoTitle ? (
                  <div className="flex items-center justify-between bg-[#0C0E14] p-2.5 rounded-lg border border-slate-800 text-xs">
                    <span className="text-emerald-400 font-medium">✓ {introVideoTitle}</span>
                    <label className="flex items-center gap-1.5 text-slate-400 text-[11px] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={introKeepAudio}
                        onChange={(e) => setIntroKeepAudio(e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      İntro Sesini Koru
                    </label>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIntroVideoTitle('Fansub_Intro_Logo.mp4')}
                    className="w-full py-2 border border-dashed border-slate-700 hover:border-indigo-500/50 rounded-lg text-xs text-slate-400 hover:text-white transition flex items-center justify-center gap-2"
                  >
                    <span>+ Başlangıç İntro Videosu Seç</span>
                  </button>
                )}
              </div>
            </>
          ) : (
            /* Live Logs / Terminal View */
            <div className="space-y-4">
              {/* Progress Summary Card */}
              <div className="p-4 rounded-xl border border-slate-800 bg-[#0C0E14]">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-semibold text-white">{encodeState.currentPhaseText}</span>
                  <span className="font-mono font-bold text-indigo-400">{encodeState.progressPercentage}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden mb-3">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 via-sky-400 to-indigo-600 rounded-full transition-all duration-300"
                    style={{ width: `${encodeState.progressPercentage}%` }}
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono text-slate-400">
                  <div>
                    <span className="block text-[10px] text-slate-500">İşlenen Kare:</span>
                    <span className="text-slate-200">
                      {encodeState.currentFrame} / {encodeState.totalFrames}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-500">Kodlama Hızı:</span>
                    <span className="text-slate-200">{encodeState.currentFps.toFixed(1)} FPS</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-500">Kalan Süre:</span>
                    <span className="text-slate-200">{encodeState.averageEstimatedFinishText}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-500">Geçen Süre:</span>
                    <span className="text-slate-200">{encodeState.elapsedSeconds}s</span>
                  </div>
                </div>
              </div>

              {/* Logs Console */}
              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1.5 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                  FFmpeg / libass Terminal Akışı
                </label>
                <div className="h-56 bg-[#0C0E14] border border-slate-800 rounded-xl p-3 overflow-y-auto font-mono text-[11px] text-emerald-400/90 leading-relaxed select-text flex flex-col-reverse">
                  <pre className="whitespace-pre-wrap">{encodeState.fullLogs || 'İşlem bekleniyor...'}</pre>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between bg-[#1E2333]/20">
          <div>
            {encodeState.isEncoding ? (
              <button
                onClick={onCancelEncode}
                className="px-4 py-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 text-xs font-semibold transition"
              >
                İşlemi İptal Et
              </button>
            ) : (
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-medium transition"
              >
                Kapat
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {encodeState.isCompleted ? (
              <>
                <button
                  onClick={() => encodeState.outputVideoUrl && onPlayEncodedVideo?.(encodeState.outputVideoUrl)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition"
                >
                  <Play className="w-3.5 h-3.5 fill-current text-indigo-400" />
                  Videoyu Oynat
                </button>
                <button
                  onClick={handleDownloadOutput}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  Hardsub MP4 İndir
                </button>
              </>
            ) : encodeState.isEncoding ? (
              <div className="flex items-center gap-2 text-indigo-400 text-xs font-medium">
                <Loader2 className="w-4 h-4 animate-spin" />
                Kodlanıyor ({encodeState.progressPercentage}%)
              </div>
            ) : (
              <button
                onClick={handleStart}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-sky-500 hover:from-indigo-600 hover:to-sky-600 text-white text-xs font-bold shadow-lg shadow-indigo-500/20 transition"
              >
                <Sparkles className="w-4 h-4" />
                Hardsub Kodlamayı Başlat
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
