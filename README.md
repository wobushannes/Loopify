# Video Susi - Nahtloser Video Loop & Audio Mixer

Dies ist eine leistungsstarke, Full-Stack React-Anwendung (Express + Vite) zur automatisierten Medienverarbeitung. Mit diesem Werkzeug kannst du Bildbereiche aus Videos ausschneiden, Audiospuren extrahieren, extrem flüssige Videoschleifen erzeugen sowie präzise Einzelbilder extrahieren, deren exFAT-Metadaten analysieren und das gesamte Paket mit einem Klick gesammelt herunterladen.

---

## 🚀 Hauptfunktionen

Die Anwendung löst im Detail folgende zentrale Medienverarbeitungsschritte:

1. **Räumliches & Zeitliches Zuschneiden (Crop & Trim):**
   * Zeichne interaktiv auf der Weboberfläche eine Begrenzungsbox (`Crop Selection`), um den gewünschten Bildausschnitt millimetergenau festzulegen.
   * Wähle stufenlos Start- und Endzeitpunkte des gewünschten Videoinhalts aus.

2. **Audiospurextraktion:**
   * Lade ein separates Audio oder Video hoch. Die Anwendung extrahiert die Audiospur vollautomatisch im Express-Backend als High-Quality MP3.

3. **Intelligente & Automatische Längenanpassung:**
   * Das Video wird so oft aneinandergereiht (`looped`), bis es exakt die Länge der Hintergrund-Audiospur bedeckt. Das FFmpeg-Backend schneidet die Spur dank der Flags `-shortest` und `-t` punktgenau zum Audioende ab.

4. **Nahtlose Übergänge (Seamless Mirroring):**
   * Damit der Videoschnitt nicht sichtbar ist (keine harten Schnitte oder Sprünge bei der Aneinanderreihung), nutzt die App das **Ping-Pong-Modell**.
   * FFmpeg spiegelt das zugeschnittene Segment und fügt es abwechselnd vorwärts und rückwärts zusammen (`[0:v][1:v]concat=n=2`). Dadurch gleiten Anfang und Ende des Loops nahtlos ineinander über.

5. **Fortgeschrittene Video-in-Frames-Zerlegung (Einzelbildextraktion):**
   * Zerlege das Video vollautomatisch in hochqualitative Einzelbilder (JPEG) basierend auf benutzerdefinierten Intervallen (z.B. jedes 10. Frame).
   * **ZIP-Archiv-Herunterladen:** Lade alle extrahierten Einzelbilder mit einem einzigen Klick als gezipptes Archiv (`.zip`) herunter. Die Anwendung verpackt die Dateien sequentiell mit klarem Fortschrittsstatus direkt im Browser.
   * **exFAT- & EXIF-Metadaten-Panel:** Analysiere hochpräzise Frame-Daten wie Bildgröße, exakter Zeitstempel relativ zum Videoanfang, YUV-Farbraum, exFAT Dateisystem-Ausrichtung und geschätzte Clustergröße.

6. **Professionelle Videokompression & Stapelverarbeitung (Queue):**
   * **Starke Speicherreduktion:** Komprimiere riesige GB-Dateien drastisch via Constant Rate Factor (CRF 20/26/32) und intelligentem Downscaling (1080p Full HD, 720p HD, 480p).
   * **Stapelverarbeitung (Queue-Modus):** Lade mehrere Videos gleichzeitig hoch, die vollautomatisch und nacheinander im Hintergrund sequentiell verarbeitet werden.
   * **Eigene Kompressions-Presets:** Speichere häufig verwendete Einstellungen mit individuellem Namen ab (per `localStorage`), um sie für wiederkehrende Workflows mit nur einem Klick abzurufen.

6. **Echtzeit-Stimm-Extraktor (Vocals & Instrumental Splitter):**
   * **Acapella Isolierung (Reine Stimme):** Filtert Frequenzen außerhalb des Bereichs der menschlichen Stimme (Butterworth-Bandpassfilter von 220Hz bis 3400Hz) heraus, um ein erstaunlich klares Vocals-Isolat zu erzeugen.
   * **Begleitmusik (Instrumental / Karaoke):** Wendet eine Mono-Phasen-Matrix (Subtraktion der L/R-Kanäle) an, um perfekt zentrierten Gesang auszulöschen, während tiefe Bassbereiche (<180Hz) unberührt bleiben, um kraftvolle Trommeln & Bässe beizubehalten.
   * **Integrierter Audio-Player:** Ermöglicht das direkte Vorhören der extrahierten Tonspuren direkt im Browser vor dem eigentlichen Download.

---

## 🛠️ Technische Architektur

* **Frontend:** React 19 (TypeScript), Vite, Tailwind CSS v4, Lucide Icons für feine UI-Akzente.
* **Backend:** Express Server (auf Port `3000`).
* **Verarbeitungskernel:** Native Integration von `FFmpeg` über das Paket `@ffmpeg-installer/ffmpeg` für maximale Portabilität in Docker-/Cloudausführungen.
* **Dateitransfer:** `multer` für sichere Server-Uploads temporärer Quelldateien.

---

## 📦 Installation & Lokal Starten

### 1. Repository vorbereiten
Stelle sicher, dass du Node.js (v18+) installiert hast.

### 2. Abhängigkeiten installieren
```bash
npm install
```

### 3. Umgebungsvariablen einrichten
Erstelle eine `.env` Datei im Stammverzeichnis basierend auf der `.env.example`:
```env
# Optional für Integrationen
GEMINI_API_KEY="DEIN_API_KEY"
APP_URL="http://localhost:3000"
```

### 4. Anwendung im Entwicklungsmodus starten
Der Befehl startet ein synchrones Zusammenspiel von Express Server und Vite in Echtzeit auf Port `3000`:
```bash
npm run dev
```

### 5. Für Produktion paketieren & bauen
```bash
npm run build
npm start
```

---

## 🧪 Pipeline-Ablauf im FFmpeg-Backend

Wenn du im Dashboard auf **"Mischung starten"** drückst, laufen im Hintergrund folgende Schritte ab:

1. **Audioextraktion (Extrahiere Soundtrack):**
   ```bash
   ffmpeg -y -i "audio_quelle.mp4" -vn -acodec libmp3lame -q:a 2 "output_audio.mp3"
   ```
2. **Crop & Trim (Ausschneiden & Deaktivieren des alten Tons):**
   ```bash
   ffmpeg -y -ss START -to END -i "video_quelle.mp4" -vf "crop=W:H:X:Y" -an -c:v libx264 -pix_fmt yuv420p "temp_crop.mp4"
   ```
3. **Ping-Pong Generierung (Rückwärts-Segment erzeugen):**
   ```bash
   ffmpeg -y -i "temp_crop.mp4" -vf "reverse" -c:v libx264 -pix_fmt yuv420p "temp_reversed.mp4"
   ```
4. **Zusammenfügen der Übergangs-Einheit:**
   ```bash
   ffmpeg -y -i "temp_crop.mp4" -i "temp_reversed.mp4" -filter_complex "[0:v][1:v]concat=n=2:v=1:a=0[v]" -map "[v]" -c:v libx264 -pix_fmt yuv420p "einheit.mp4"
   ```
5. **Multi-Looping und Audio Overlay:**
   ```bash
   ffmpeg -y -stream_loop LOOPS_NEEDED -i "einheit.mp4" -i "output_audio.mp3" -map 0:v -map 1:a -c:v libx264 -pix_fmt yuv420p -shortest -t AUDIO_DURATION "endergebnis.mp4"
   ```

6. **Video-Kompression (mit optionalem Downscaling und CRF):**
   ```bash
   # Crf presets: low = 20, medium = 26, high = 32
   # Scale filters: 1080p -> -vf "scale=1920:trunc(ih*1920/iw/2)*2"
   ffmpeg -y -i "eingabe.mp4" -c:v libx264 -crf CRF_WERT -vf "scale=BREITE:-2" -c:a aac -b:a 128k "ausgabe.mp4"
   ```

7. **Lied-Spurseparation (Gesangs- und Instrumentalextraktion):**
   ```bash
   # 7.1 Extrahiere Instrumental (Mono-Stimmunterdrückung & Bass-Bypass):
   ffmpeg -y -i "lied.mp3" -filter_complex "[0:a]asplit=2[low][high];[low]lowpass=f=180[low_mono];[high]highpass=f=180,pan=mono|c0=c0-c1[high_cancel];[low_mono][high_cancel]amix=inputs=2:weights=1.2 1.5" -c:a libmp3lame -q:a 2 "instrumental.mp3"

   # 7.2 Extrahiere Gesang / Vocals (Standard-Kombinationsfilter, Präsenz-EQ & Gate):
   ffmpeg -y -i "lied.mp3" -filter_complex "[0:a]pan=mono|c0=0.5*c0+0.5*c1,highpass=f=200,lowpass=f=3000,equalizer=f=1000:width_type=q:width=1.0:g=4,equalizer=f=2500:width_type=q:width=1.0:g=3.5,agate=threshold=0.05:ratio=5.0:attack=15:release=150:makeup=1.2" -c:a libmp3lame -q:a 2 "vocals.mp3"
   ```

Viel Spaß beim Erstellen von reibungslosen, rhythmischen Kinographien! 🎬✨
