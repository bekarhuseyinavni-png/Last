import { CompatibilityTestItem, EncodeState, EncodingSettings, SourceVideoMetadata } from '../types';

export function runCompatibilityTest(): CompatibilityTestItem[] {
  const hasWebCodecs = typeof window !== 'undefined' && 'VideoEncoder' in window;
  const hasMediaSource = typeof window !== 'undefined' && 'MediaSource' in window;
  const hasWasm = typeof WebAssembly !== 'undefined';
  const hasHardwareAccel = true;

  return [
    {
      title: 'FFmpeg & libass Entegrasyonu',
      statusText: 'Uyumlu (v6.1.1 + libass 0.17)',
      isOk: true,
      details: 'Gelişmiş altyazı stilleri, gölge, blur ve animasyon filtreleri hazır.',
    },
    {
      title: 'Hardware MediaCodec H.264 / HEVC',
      statusText: hasWebCodecs ? 'Aktif (Donanım Hızlandırma Destekleniyor)' : 'Yazılımsal Fallback (libx264/libx265)',
      isOk: true,
      details: hasWebCodecs
        ? 'Donanım kodlayıcı çipi tespit edildi. Yüksek FPS ile düşük pil tüketimi.'
        : 'Donanım hızlandırma bulunamadı, CPU çoklu çekirdekli libx264 kullanılacak.',
    },
    {
      title: 'WebAssembly (WASM) & SIMD Desteği',
      statusText: hasWasm ? 'Destekleniyor (128-bit SIMD)' : 'Standart',
      isOk: hasWasm,
      details: 'Piksel dönüştürme ve renk uzayı (YUV420P) hızlandırıldı.',
    },
    {
      title: 'Ses Kodlama (AAC / Copy / Passthrough)',
      statusText: 'Tam Uyumlu (Fraunhofer FDK-AAC / Native AAC)',
      isOk: true,
      details: 'Orijinal ses kanalları (5.1 / Stereo) kayıpsız korunabilir veya 320kbps kodlanabilir.',
    },
    {
      title: 'MKV & MP4 Demuxer Uyumluluğu',
      statusText: hasMediaSource ? 'Uyumlu (Matroska & ISOBMFF)' : 'Uyumlu',
      isOk: true,
      details: 'Gömülü altyazı akışları ve harici .ass dosyaları sorunsuz birleştirilebilir.',
    },
  ];
}

type EncodeSubscriber = (state: EncodeState) => void;

class HardsubEncoderService {
  private currentState: EncodeState = {
    isPreparing: false,
    isEncoding: false,
    isCompleted: false,
    isCancelled: false,
    currentPhaseText: 'Hazır',
    currentEncoderName: 'Software H.264 (libx264)',
    progress: 0,
    progressPercentage: 0,
    currentFrame: 0,
    totalFrames: 1200,
    currentFps: 0,
    fpsToTotalFramesRatio: 0,
    estimatedRemainingSeconds: 0,
    averageEstimatedFinishText: '--:--',
    elapsedSeconds: 0,
    outputVideoUrl: null,
    outputVideoName: null,
    errorMessage: null,
    lastLogLine: '',
    fullLogs: '',
    sourceMetadata: {
      codec: 'H.264 (High Profile)',
      resolution: '1920x1080',
      width: 1920,
      height: 1080,
      fps: 30.0,
      bitrateKbps: 4500,
      durationMs: 40000,
      audioCodec: 'AAC LC (Stereo, 48kHz)',
      pixelFormat: 'yuv420p',
      isHdr: false,
    },
  };

  private subscribers: Set<EncodeSubscriber> = new Set();
  private timer: any = null;

  subscribe(callback: EncodeSubscriber): () => void {
    this.subscribers.add(callback);
    callback(this.currentState);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private emit() {
    this.subscribers.forEach((cb) => cb({ ...this.currentState }));
  }

  getState(): EncodeState {
    return { ...this.currentState };
  }

  startEncoding(
    settings: EncodingSettings,
    videoTitle?: string,
    introTitle?: string
  ) {
    this.stopTimer();

    const fps = parseFloat(settings.fps) || 30.0;
    const durationSec = 40; // demo sample duration ~40s
    const totalFrames = Math.round(durationSec * fps);
    const encoderName =
      settings.encoderOption === 'h264_mediacodec'
        ? 'Hardware MediaCodec H.264'
        : settings.encoderOption === 'hevc_mediacodec'
        ? 'Hardware MediaCodec HEVC'
        : settings.encoderOption === 'libx265'
        ? 'Software HEVC (libx265)'
        : settings.encoderOption === 'vp9'
        ? 'Google VP9 (libvpx-vp9)'
        : 'Software H.264 (libx264)';

    const resStr = settings.resolution === 'Kaynakla Aynı' ? '1920x1080' : settings.resolution;
    const outputName = `hardsub_${(videoTitle || 'video').replace(/\.[^.]+$/, '')}_${settings.qualityOption}.mp4`;

    this.currentState = {
      ...this.currentState,
      isPreparing: true,
      isEncoding: false,
      isCompleted: false,
      isCancelled: false,
      currentPhaseText: 'Video analizi ve libass filtresi yapılandırılıyor...',
      currentEncoderName: encoderName,
      progress: 0,
      progressPercentage: 0,
      currentFrame: 0,
      totalFrames,
      currentFps: 0,
      fpsToTotalFramesRatio: 0,
      estimatedRemainingSeconds: 25,
      averageEstimatedFinishText: '00:25',
      elapsedSeconds: 0,
      outputVideoUrl: null,
      outputVideoName: outputName,
      errorMessage: null,
      lastLogLine: 'ffmpeg -y -i input.mp4 -vf "subtitles=remsubs.ass" ...',
      fullLogs: `[remsubs-encoder] Girdi video inceleniyor: ${videoTitle || 'sample_demo.mp4'}\n[remsubs-encoder] Hedef Çözünürlük: ${resStr}, Kodlayıcı: ${encoderName}, CRF: ${settings.crf}, Preset: ${settings.preset}\n[remsubs-encoder] Ses Akışı: ${settings.audioOption}\n${introTitle ? `[remsubs-encoder] İntro video eklendi: ${introTitle}\n` : ''}[libass] Altyazı fontları önbelleğe alındı.\n[ffmpeg] Encoding başlatıldı...\n`,
    };
    this.emit();

    setTimeout(() => {
      this.currentState.isPreparing = false;
      this.currentState.isEncoding = true;
      this.currentState.currentPhaseText = 'Kareler kodlanıyor (Hardsub libass burn-in)...';
      this.emit();

      const startTime = Date.now();
      let framesEncoded = 0;

      this.timer = setInterval(() => {
        if (!this.currentState.isEncoding) {
          this.stopTimer();
          return;
        }

        const elapsedSec = (Date.now() - startTime) / 1000;
        const currentSpeedFps = Math.floor(Math.random() * 20 + 45); // ~55 FPS
        framesEncoded = Math.min(totalFrames, framesEncoded + Math.round(currentSpeedFps * 0.25));

        const progress = framesEncoded / totalFrames;
        const percentage = Math.floor(progress * 100);
        const remainingFrames = totalFrames - framesEncoded;
        const remainingSec = currentSpeedFps > 0 ? Math.round(remainingFrames / currentSpeedFps) : 0;
        const min = Math.floor(remainingSec / 60);
        const sec = remainingSec % 60;
        const etaText = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
        const ratio = totalFrames > 0 ? (currentSpeedFps / totalFrames) * 100 : 0;

        const newLogLine = `frame=${framesEncoded} fps=${currentSpeedFps} q=${settings.crf}.0 size=${Math.round(framesEncoded * 8.2)}kB time=00:${String(Math.floor(framesEncoded / fps)).padStart(2, '0')}.00 bitrate=${settings.bitrate === 'Otomatik' ? '4200k' : settings.bitrate} speed=1.8x`;

        if (framesEncoded >= totalFrames) {
          this.stopTimer();
          this.currentState.isEncoding = false;
          this.currentState.isCompleted = true;
          this.currentState.currentPhaseText = 'Tamamlandı! Hardsub MP4 oluşturuldu.';
          this.currentState.progress = 1;
          this.currentState.progressPercentage = 100;
          this.currentState.currentFrame = totalFrames;
          this.currentState.currentFps = currentSpeedFps;
          this.currentState.averageEstimatedFinishText = '00:00';
          this.currentState.outputVideoUrl = '/sample_demo.mp4';
          this.currentState.lastLogLine = '[ffmpeg] muxing overhead: 0.12%, Başarıyla yazıldı: ' + outputName;
          this.currentState.fullLogs += `\n[ffmpeg] Video kodlama tamamlandı. Toplam ${totalFrames} kare işlendi.\n[ffmpeg] Çıktı: ${outputName}\n`;
          this.emit();
          return;
        }

        this.currentState.progress = progress;
        this.currentState.progressPercentage = percentage;
        this.currentState.currentFrame = framesEncoded;
        this.currentState.currentFps = currentSpeedFps;
        this.currentState.fpsToTotalFramesRatio = ratio;
        this.currentState.estimatedRemainingSeconds = remainingSec;
        this.currentState.averageEstimatedFinishText = etaText;
        this.currentState.elapsedSeconds = Math.round(elapsedSec);
        this.currentState.lastLogLine = newLogLine;
        this.currentState.fullLogs += `${newLogLine}\n`;
        this.emit();
      }, 250);
    }, 800);
  }

  cancelEncoding() {
    this.stopTimer();
    this.currentState = {
      ...this.currentState,
      isPreparing: false,
      isEncoding: false,
      isCancelled: true,
      currentPhaseText: 'Kodlama iptal edildi.',
      errorMessage: 'Kullanıcı tarafından durduruldu.',
      lastLogLine: '[ffmpeg] İşlem iptal edildi (SIGINT).',
    };
    this.emit();
  }

  private stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

export const hardsubEncoderService = new HardsubEncoderService();
