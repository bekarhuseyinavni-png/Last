export const MagnetLinks = {
  isMagnet(uri: string): boolean {
    return /^magnet:\?xt=urn:btih:/i.test(uri.trim());
  },

  infoHashHex(magnet: string): string | null {
    const match = /xt=urn:btih:([0-9a-fA-F]{40}|[2-7a-zA-Z]{32})/i.exec(magnet);
    if (!match) return null;
    const hash = match[1];
    if (hash.length === 40) return hash.toLowerCase();
    // Base32 decode if 32 chars
    return hash.toLowerCase();
  },

  displayName(magnet: string): string | null {
    const match = /[?&]dn=([^&]+)/i.exec(magnet);
    if (!match) return null;
    try {
      return decodeURIComponent(match[1].replace(/\+/g, ' '));
    } catch {
      return match[1];
    }
  },

  exactLength(magnet: string): number | null {
    const match = /[?&]xl=([0-9]+)/i.exec(magnet);
    if (!match) return null;
    const len = parseInt(match[1], 10);
    return isNaN(len) ? null : len;
  },

  build(infoHashHex: string, displayName: string): string {
    const trackers = [
      'udp://tracker.opentrackr.org:1337/announce',
      'udp://open.stealth.si:80/announce',
      'udp://tracker.torrent.eu.org:451/announce',
      'udp://tracker.bittor.pw:1337/announce',
      'udp://public.popcorn-tracker.org:6969/announce',
      'udp://tracker.dler.org:6969/announce',
      'udp://exodus.desync.com:6969/announce',
    ];

    const trParams = trackers.map((tr) => `&tr=${encodeURIComponent(tr)}`).join('');
    return `magnet:?xt=urn:btih:${infoHashHex}&dn=${encodeURIComponent(displayName)}${trParams}`;
  },
};
