import { MkvSubtitleTrack } from '../types';
import { getSampleAssContent } from '../utils/subtitleParser';

export function inspectMkvTracks(fileName: string): Promise<MkvSubtitleTrack[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const baseName = fileName.replace(/\.[^.]+$/, '');
      const tracks: MkvSubtitleTrack[] = [
        {
          id: 1,
          title: `${baseName} - Türkçe (Tam Diyalog)`,
          language: 'tr (Türkçe)',
          format: 'ass',
          isDefault: true,
          isForced: false,
          sampleText: '{\\b1}Rem{\\b0}: Seni seviyorum Subaru-kun...',
          content: getSampleAssContent(),
        },
        {
          id: 2,
          title: `${baseName} - English (Full Dialogue)`,
          language: 'en (English)',
          format: 'ass',
          isDefault: false,
          isForced: false,
          sampleText: '{\\b1}Rem{\\b0}: From zero... let us begin here.',
          content: getSampleAssContent().replace(/remsubs playground Video ve Altyazı/g, 'RemSubs Subtitle Preview System'),
        },
        {
          id: 3,
          title: `${baseName} - Signs & Songs (Tabela & Şarkılar)`,
          language: 'ja (Japanese / Romaji)',
          format: 'ass',
          isDefault: false,
          isForced: false,
          sampleText: '{\\pos(960,120)\\fs60\\c&H00FFFF&}STYX HELIX - MYTH & ROID',
          content: getSampleAssContent(),
        },
        {
          id: 4,
          title: `${baseName} - Türkçe (Düz Metin SRT)`,
          language: 'tr (Türkçe)',
          format: 'srt',
          isDefault: false,
          isForced: false,
          sampleText: 'Seni her halinle kabul ediyorum.',
          content: `1\n00:00:01,000 --> 00:00:04,500\nRem: Seni seviyorum Subaru-kun.\n\n2\n00:00:05,000 --> 00:00:08,500\nBuradan en baştan başlayalım.\n`,
        },
      ];
      resolve(tracks);
    }, 600);
  });
}
