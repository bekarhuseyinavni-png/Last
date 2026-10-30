export type SubtitleVerticalAlign = 'TOP' | 'MIDDLE' | 'BOTTOM';
export type SubtitleHorizontalAlign = 'LEFT' | 'CENTER' | 'RIGHT';

export interface SubtitleCue {
  id: number;
  startTimeMs: number;
  endTimeMs: number;
  rawText: string;
  cleanText: string;
  styleName?: string;
  layer?: number;
  marginV?: number;
  marginL?: number;
  marginR?: number;
  actor?: string;
  effect?: string;
  // Individual single-cue custom positioning & styling
  customPositionEnabled?: boolean;
  customVerticalAlign?: SubtitleVerticalAlign;
  customHorizontalAlign?: SubtitleHorizontalAlign;
  customVerticalOffsetDp?: number;
  customHorizontalOffsetDp?: number;
  customFontSizeSp?: number | null;
  customTextColorArgb?: number | null;
  customOutlineColorArgb?: number | null;
  customIsItalic?: boolean | null;
  customIsBold?: boolean | null;
  customIsUnderline?: boolean | null;
  customAngle?: number | null;
}

export interface AssStyleDefinition {
  name: string;
  fontName: string;
  fontSize: number;
  primaryColor: string; // "#RRGGBB" or "rgba(...)"
  secondaryColor?: string;
  outlineColor: string;
  backColor: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikeOut?: boolean;
  scaleX?: number;
  scaleY?: number;
  spacing?: number;
  angle: number; // 0..360 rotation degrees
  borderStyle: number; // 1: outline + drop shadow, 3: opaque box
  outline: number; // border width
  shadow: number; // shadow depth
  alignment: number; // 1..9
  marginL: number;
  marginR: number;
  marginV: number;
  encoding?: number;
}

export interface SubtitleStyle {
  fontName: string;
  customFontUrl?: string | null;
  fontSizeSp: number;
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
  textColor: string; // Hex color "#FFFFFF"
  outlineColor: string; // Hex color "#000000"
  hasOutline: boolean;
  outlineWidth: number;
  hasBackgroundBox: boolean;
  backgroundColor: string; // Hex color with alpha e.g. "rgba(0,0,0,0.6)" or "#00000099"
  verticalAlign: SubtitleVerticalAlign;
  horizontalAlign: SubtitleHorizontalAlign;
  verticalOffsetDp: number;
  horizontalPaddingDp: number;
  timeOffsetMs: number;
  angle?: number;
}

export interface SubtitleFrameConfig {
  playResX: number;
  playResY: number;
}

export type AppScreen = 'MAIN_MENU' | 'EDITOR' | 'ANIME_SEARCH';

export type AnimeSource = 'SUBSPLEASE' | 'NYAA';
export type VideoQuality = '480p' | '720p' | '1080p';

export interface AnimeSearchResult {
  id: string;
  source: AnimeSource;
  title: string;
  magnetUri: string;
  showName?: string | null;
  episode?: string | null;
  quality?: VideoQuality | null;
  sizeBytes?: number | null;
  sizeText?: string | null;
  seeders?: number | null;
  leechers?: number | null;
  completedDownloads?: number | null;
  publishedAtMillis?: number | null;
  isBatch?: boolean;
  isTrusted?: boolean;
  isRemake?: boolean;
  pageUrl?: string | null;
}

export type TorrentState =
  | 'IDLE'
  | 'CONNECTING_TRACKERS'
  | 'RESOLVING_METADATA'
  | 'DOWNLOADING'
  | 'TRANSFERRING'
  | 'PAUSED'
  | 'COMPLETED'
  | 'ERROR';

export interface TorrentFileEntry {
  index: number;
  path: string;
  sizeBytes: number;
  isVideo: boolean;
}

export interface TorrentDownloadInfo {
  magnetUri: string;
  torrentName: string;
  sourceLabel: string;
  infoHashHex: string;
  state: TorrentState;
  statusMessage: string;
  totalBytes: number;
  downloadedBytes: number;
  progress: number; // 0..1
  progressPercentage: number; // 0..100
  speedText: string;
  etaText: string;
  seeders: number;
  leechers: number;
  connectedPeers: number;
  files: TorrentFileEntry[];
  selectedVideoFileName: string;
  downloadedFileUrl?: string | null;
  errorMessage?: string | null;
  isActive?: boolean;
}

export type EncoderOption =
  | 'auto'
  | 'libx264'
  | 'h264_mediacodec'
  | 'hevc_mediacodec'
  | 'libx265'
  | 'vp9'
  | 'av1'
  | 'AUTO';

export type QualityOption =
  | 'ultra_1080p'
  | 'high_1080p'
  | 'standard_720p'
  | 'fast_720p'
  | 'compact_480p'
  | 'source_original'
  | 'custom'
  | 'ULTRA_1080P'
  | 'HIGH_1080P'
  | 'STANDARD_720P'
  | 'FAST_720P'
  | 'COMPACT_480P'
  | 'SOURCE_ORIGINAL'
  | 'CUSTOM';

export interface EncodingSettings {
  qualityOption: QualityOption;
  resolution: string;
  encoderOption: EncoderOption;
  videoCodec: string;
  crf: number;
  preset: string;
  bitrate: string;
  fps: string;
  audioOption: string;
  pixelFormat: string;
  hardwareAcceleration: string;
}

export interface SourceVideoMetadata {
  codec: string;
  resolution: string;
  width: number;
  height: number;
  fps: number;
  bitrateKbps: number;
  durationMs: number;
  audioCodec: string;
  pixelFormat: string;
  isHdr: boolean;
}

export interface EncodeState {
  isPreparing: boolean;
  isEncoding: boolean;
  isCompleted: boolean;
  isCancelled: boolean;
  currentPhaseText: string;
  currentEncoderName: string;
  progress: number;
  progressPercentage: number;
  currentFrame: number;
  totalFrames: number;
  currentFps: number;
  fpsToTotalFramesRatio: number;
  estimatedRemainingSeconds: number;
  averageEstimatedFinishText: string;
  elapsedSeconds: number;
  outputVideoUrl?: string | null;
  outputVideoName?: string | null;
  errorMessage?: string | null;
  lastLogLine: string;
  fullLogs: string;
  sourceMetadata: SourceVideoMetadata;
}

export interface CompatibilityTestItem {
  title: string;
  statusText: string;
  isOk: boolean;
  details: string;
}

export interface MkvSubtitleTrack {
  id: number;
  title: string;
  language: string;
  format: string; // 'ass' | 'srt'
  isDefault: boolean;
  isForced: boolean;
  sampleText?: string;
  content?: string;
}

export interface EncodeTask {
  id: string;
  title: string;
  status: 'PENDING' | 'ENCODING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  progress: number;
  quality: string;
  resolution: string;
  createdAt: number;
  finishedAt?: number;
  outputVideoUrl?: string;
  outputVideoName?: string;
}
