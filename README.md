# Loopify Pro-Tools - Nahtloser Video Loop & Audio Mixer

Dies ist eine leistungsstarke, Full-Stack React-Anwendung (Express + Vite) zur automatisierten Medienverarbeitung. Mit diesem Werkzeug kannst du Bildbereiche aus Videos ausschneiden, Audiospuren extrahieren und extrem flüssige Videoschleifen erzeugen, welche sich automatisch an die gewünschte Audiolänge anpassen.

---

## 🚀 Hauptfunktionen

Die Anwendung löst im Detail vier zentrale Medienverarbeitungsschritte:

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

Viel Spaß beim Erstellen von reibungslosen, rhythmischen Kinographien! 🎬✨
