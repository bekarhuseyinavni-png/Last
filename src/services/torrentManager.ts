import { TorrentDownloadInfo, TorrentFileEntry, TorrentState } from '../types';
import { MagnetLinks } from '../utils/magnetLinks';

type Subscriber = (info: TorrentDownloadInfo) => void;

class TorrentManager {
  private currentInfo: TorrentDownloadInfo = {
    magnetUri: '',
    torrentName: 'Torrent İndirmesi',
    sourceLabel: '',
    infoHashHex: '',
    state: 'IDLE',
    statusMessage: '',
    totalBytes: 0,
    downloadedBytes: 0,
    progress: 0,
    progressPercentage: 0,
    speedText: '0 KB/s',
    etaText: '--:--',
    seeders: 0,
    leechers: 0,
    connectedPeers: 0,
    files: [],
    selectedVideoFileName: '',
    downloadedFileUrl: null,
    errorMessage: null,
  };

  private subscribers: Set<Subscriber> = new Set();
  private timer: any = null;

  subscribe(callback: Subscriber): () => void {
    this.subscribers.add(callback);
    callback(this.currentInfo);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private emit() {
    const isActive =
      this.currentInfo.state === 'CONNECTING_TRACKERS' ||
      this.currentInfo.state === 'RESOLVING_METADATA' ||
      this.currentInfo.state === 'DOWNLOADING' ||
      this.currentInfo.state === 'PAUSED' ||
      this.currentInfo.state === 'TRANSFERRING' ||
      this.currentInfo.state === 'COMPLETED';
    this.currentInfo.isActive = isActive;
    this.subscribers.forEach((cb) => cb({ ...this.currentInfo, isActive }));
  }

  getInfo(): TorrentDownloadInfo {
    const isActive =
      this.currentInfo.state === 'CONNECTING_TRACKERS' ||
      this.currentInfo.state === 'RESOLVING_METADATA' ||
      this.currentInfo.state === 'DOWNLOADING' ||
      this.currentInfo.state === 'PAUSED' ||
      this.currentInfo.state === 'TRANSFERRING' ||
      this.currentInfo.state === 'COMPLETED';
    return { ...this.currentInfo, isActive };
  }

  startMagnet(magnetUri: string, customName?: string) {
    this.stopTimer();

    const name = customName || MagnetLinks.displayName(magnetUri) || 'Anime Bölümü (1080p).mkv';
    const hash = MagnetLinks.infoHashHex(magnetUri) || 'e7b1a2f3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9';
    const total = 1420 * 1024 * 1024; // ~1.42 GB

    const files: TorrentFileEntry[] = [
      { index: 0, path: name, sizeBytes: total, isVideo: true },
      { index: 1, path: `${name.replace(/\.[^.]+$/, '')}.ass`, sizeBytes: 145000, isVideo: false },
    ];

    this.currentInfo = {
      ...this.currentInfo,
      magnetUri,
      torrentName: name,
      sourceLabel: 'Magnet Link',
      infoHashHex: hash,
      state: 'CONNECTING_TRACKERS',
      statusMessage: 'İzleyicilere (trackers) bağlanılıyor...',
      totalBytes: total,
      downloadedBytes: 0,
      progress: 0,
      progressPercentage: 0,
      speedText: '0 KB/s',
      etaText: '--:--',
      seeders: 84,
      leechers: 12,
      connectedPeers: 6,
      files,
      selectedVideoFileName: name,
      downloadedFileUrl: null,
      errorMessage: null,
    };
    this.emit();

    setTimeout(() => {
      if (this.currentInfo.state !== 'CONNECTING_TRACKERS') return;
      this.currentInfo.state = 'RESOLVING_METADATA';
      this.currentInfo.statusMessage = 'Magnet meta verisi çözümleniyor...';
      this.emit();

      setTimeout(() => {
        if (this.currentInfo.state !== 'RESOLVING_METADATA') return;
        this.currentInfo.state = 'DOWNLOADING';
        this.currentInfo.statusMessage = 'İndiriliyor';
        this.startDownloadLoop();
      }, 1000);
    }, 800);
  }

  startTorrentFile(file: File) {
    this.stopTimer();
    const name = file.name.replace(/\.torrent$/i, '.mkv');
    const total = 1250 * 1024 * 1024;
    const hash = 'a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9';

    const files: TorrentFileEntry[] = [
      { index: 0, path: name, sizeBytes: total, isVideo: true },
    ];

    this.currentInfo = {
      ...this.currentInfo,
      magnetUri: `magnet:?xt=urn:btih:${hash}&dn=${encodeURIComponent(name)}`,
      torrentName: name,
      sourceLabel: file.name,
      infoHashHex: hash,
      state: 'DOWNLOADING',
      statusMessage: '.torrent dosyası yüklendi, indirme başlatıldı',
      totalBytes: total,
      downloadedBytes: 0,
      progress: 0,
      progressPercentage: 0,
      speedText: '3.8 MB/s',
      etaText: '05:30',
      seeders: 104,
      leechers: 8,
      connectedPeers: 22,
      files,
      selectedVideoFileName: name,
      downloadedFileUrl: null,
      errorMessage: null,
    };
    this.emit();
    this.startDownloadLoop();
  }

  private startDownloadLoop() {
    this.stopTimer();
    const stepMs = 500;

    this.timer = setInterval(() => {
      if (this.currentInfo.state !== 'DOWNLOADING') {
        this.stopTimer();
        return;
      }

      // Increment downloaded bytes rapidly for interactive UX (~6-12 MB/s simulation)
      const chunk = Math.floor((Math.random() * 8 + 8) * 1024 * 1024 * (stepMs / 1000));
      const nextBytes = Math.min(this.currentInfo.totalBytes, this.currentInfo.downloadedBytes + chunk);
      const progress = nextBytes / (this.currentInfo.totalBytes || 1);
      const percentage = Math.floor(progress * 100);

      const speedMB = (chunk / (stepMs / 1000)) / (1024 * 1024);
      const remainingBytes = this.currentInfo.totalBytes - nextBytes;
      const remainingSec = speedMB > 0 ? Math.round(remainingBytes / (speedMB * 1024 * 1024)) : 0;
      const min = Math.floor(remainingSec / 60);
      const sec = remainingSec % 60;
      const eta = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;

      if (nextBytes >= this.currentInfo.totalBytes) {
        this.stopTimer();
        this.currentInfo.state = 'COMPLETED';
        this.currentInfo.statusMessage = 'İndirme tamamlandı! Düzenlemeye hazır.';
        this.currentInfo.downloadedBytes = this.currentInfo.totalBytes;
        this.currentInfo.progress = 1;
        this.currentInfo.progressPercentage = 100;
        this.currentInfo.speedText = '0 KB/s';
        this.currentInfo.etaText = '00:00';
        // Provide demo video URL as the completed media
        this.currentInfo.downloadedFileUrl = '/sample_demo.mp4';
        this.emit();
        return;
      }

      this.currentInfo.downloadedBytes = nextBytes;
      this.currentInfo.progress = progress;
      this.currentInfo.progressPercentage = percentage;
      this.currentInfo.speedText = `${speedMB.toFixed(1)} MB/s`;
      this.currentInfo.etaText = eta;
      this.currentInfo.connectedPeers = Math.floor(Math.random() * 8) + 18;
      this.emit();
    }, stepMs);
  }

  pause() {
    if (this.currentInfo.state === 'DOWNLOADING') {
      this.stopTimer();
      this.currentInfo.state = 'PAUSED';
      this.currentInfo.statusMessage = 'İndirme duraklatıldı';
      this.currentInfo.speedText = '0 KB/s';
      this.emit();
    }
  }

  resume() {
    if (this.currentInfo.state === 'PAUSED') {
      this.currentInfo.state = 'DOWNLOADING';
      this.currentInfo.statusMessage = 'İndiriliyor';
      this.emit();
      this.startDownloadLoop();
    }
  }

  cancel() {
    this.stopTimer();
    this.currentInfo = {
      ...this.currentInfo,
      state: 'IDLE',
      statusMessage: 'İndirme iptal edildi',
      progress: 0,
      progressPercentage: 0,
      speedText: '0 KB/s',
      etaText: '--:--',
      downloadedBytes: 0,
      files: [],
      downloadedFileUrl: null,
    };
    this.emit();
  }

  retry() {
    if (this.currentInfo.magnetUri) {
      this.startMagnet(this.currentInfo.magnetUri, this.currentInfo.torrentName);
    }
  }

  selectFile(fileName: string) {
    this.currentInfo.selectedVideoFileName = fileName;
    this.emit();
  }

  private stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

export const torrentDownloadManager = new TorrentManager();
