# RemSubs Playground (React / Vite)

Rem (*Re:Zero - Starting Life in Another World*) temalı video ve `.ass` / `.srt` altyazı önizleme, senkronizasyon, görsel typesetting ve hardsub video kodlama platformu.

## Özellikler

- **Video ve Altyazı Eş Zamanlı Oynatıcı**:
  - Dahili RemSubs demo videosu ve `.ass` altyazısı ile anında önizleme.
  - İstenilen MP4/WebM video dosyasını ve `.ass` / `.srt` altyazısını sürükleyip bırakarak yükleme.
  - Video üzerinde `\pos(X, Y)` konumlandırmasını doğrudan fare/dokunmatik ile tutup sürükleyerek anlık ayarlama.
- **ASS Override Etiketleri ve Typesetting Desteği**:
  - `\an1` - `\an9` hizalama ızgarası.
  - `\fs` (yazı boyutu), `\b` (kalın), `\i` (eğik), `\u` (altı çizili), `\s` (üstü çizili).
  - `\c` (metin rengi), `\3c` (kenarlık rengi), `\4c` (gölge rengi), `\bord`, `\shad`, `\fad` (fade in/out).
  - **Toplu ASS Tag Uygulayıcı**: Altyazı diyaloglarını bozmadan tüm satırlara tek tıkla font ve boyut etiketlerini güvenle uygulama.
- **Hızlı Diyalog Düzenleyici (In-Place Editor)**:
  - Satır metnini anında düzenleme.
  - `+/-100ms` ve `+/-500ms` hızlı zamanlama butonları.
  - **CPS (Karakter / Saniye)** okuma hızı göstergesi (yeşil / sarı / kırmızı eşikler).
  - Altyazı satırı çoğaltma, bölme (split) ve silme.
- **Global Senkron Ayarı**:
  - Tüm altyazıları `+/-100ms` veya `+/-500ms` kaydırarak videoya kusursuz oturtma.
- **Font & Biçimlendirme Paneli**:
  - Özel `.ttf` font dosyası yükleme ve anında önizlemede kullanma.
  - Metin, kenarlık (outline), arka plan kutusu renk seçicileri.
- **Anime Yayınları Arama (SubsPlease & Nyaa)**:
  - 1080p, 720p, 480p kalite filtreleri.
  - Seeder / leecher sayıları, dosya boyutu, doğrudan Magnet link kopyalama ve indirme.
- **Torrent / Magnet İndirici**:
  - Magnet URI ve `.torrent` dosyaları ile canlı eş zamanlı indirme simülasyonu.
  - İndirme tamamlandığında tek tıkla videoyu editöre aktarma.
- **MKV Softsub Altyazı Ayıklayıcı**:
  - Matroska (MKV) konteynerlerindeki gömülü altyazı akışlarını tespit etme ve editöre aktarma veya cihaza kaydetme.
- **Hardsub MP4 Video Kodlama Simülatörü**:
  - libass altyazı yakma (burn-in).
  - Kalite şablonları (1080p Ultra, 1080p Yüksek, 720p Standart, vb.).
  - CRF ve Bitrate ayarları, ses kopyalama (copy/AAC), opsiyonel introlar.
  - Canlı FFmpeg terminal logları ve tamamlanan videoyu indirme.

## Geliştirme

```bash
npm install
npm run dev
```

Dev sunucusu varsayılan olarak `http://0.0.0.0:3000` portunda çalışır.
