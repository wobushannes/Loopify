import { useState, useRef } from "react";
import { 
  Infinity as InfinityIcon, 
  Sparkles, 
  Download, 
  AlertCircle, 
  Wand2, 
  FileVideo, 
  RefreshCw, 
  Sliders, 
  HelpCircle,
  FileCheck2,
  ListRestart,
  Percent,
  Cpu,
  Tv,
  Scale,
  ArrowDownLeft,
  ChevronRight,
  Menu,
  FileBadge
} from "lucide-react";
import { UploadedFile, CropSelection, TrimSelection, LoopMode } from "./types";
import MediaUploader from "./components/MediaUploader";
import VideoCropTrim from "./components/VideoCropTrim";

export default function App() {
  // Navigation: Active main Workspace tab
  const [activeTab, setActiveTab] = useState<"mixer" | "compressor">("mixer");

  // State: Uploaded media files
  const [videoFile, setVideoFile] = useState<UploadedFile | undefined>(undefined);
  const [audioFile, setAudioFile] = useState<UploadedFile | undefined>(undefined);

  // Mixer parameters
  const [cropConfig, setCropConfig] = useState<CropSelection>({ x: 0, y: 0, width: 200, height: 200 });
  const [trimConfig, setTrimConfig] = useState<TrimSelection>({ startTime: 0, endTime: 5 });
  const [loopType, setLoopType] = useState<LoopMode>("ping-pong");

  // Compressor parameters
  const [compressVideoFile, setCompressVideoFile] = useState<UploadedFile | undefined>(undefined);
  const [crfPreset, setCrfPreset] = useState<"low" | "medium" | "high">("medium");
  const [resolutionPreset, setResolutionPreset] = useState<"original" | "1080p" | "720p" | "480p">("original");

  // Processing indicators (Shared)
  const [isProcessing, setIsProcessing] = useState(false);
  const [processError, setProcessError] = useState("");
  const [processStatus, setProcessStatus] = useState("");
  const [processingTimeSec, setProcessingTimeSec] = useState(0);

  // Output outputs (Mixer)
  const [resultPath, setResultPath] = useState("");
  const [resultMeta, setResultMeta] = useState<{
    duration: number;
    loops: number;
  } | null>(null);

  // Output outputs (Compressor)
  const [compressResult, setCompressResult] = useState<{
    url: string;
    originalSize: number;
    compressedSize: number;
    savingPercent: number;
  } | null>(null);

  const compressInputRef = useRef<HTMLInputElement>(null);
  const [isCompressUploading, setIsCompressUploading] = useState(false);

  // Calculated values
  const clipDuration = trimConfig.endTime - trimConfig.startTime;
  const audioDuration = audioFile ? audioFile.duration : (videoFile ? videoFile.duration : 10);
  const loopUnitDuration = loopType === "ping-pong" ? clipDuration * 2 : clipDuration;
  const computedLoops = Math.ceil(audioDuration / loopUnitDuration);

  // Size formatter helper
  const formatBytes = (bytes: number, decimals = 2) => {
    if (!bytes) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  // Launch blending pipeline
  const handleStartBlending = async () => {
    if (!videoFile) return;

    setIsProcessing(true);
    setProcessError("");
    setResultPath("");
    setResultMeta(null);
    setProcessStatus("Initialisiere FFmpeg-Verarbeitung...");

    const statusSequence = [
      { text: "Lese Medien-Dateien auf dem Server..." , delay: 500 },
      { text: "Extrahiere Audiospur (2) aus der Quelle..." , delay: 1800 },
      { text: "Satz-Schnitt u. Ausschnitt-Filter (1) anwenden..." , delay: 3500 },
      { text: loopType === "ping-pong" ? "Erzeuge fließende Spiegelung (Vor- & Zurückspulen) für nahtlosen Übergang (4)..." : "Erstelle direkte Videoschleifen...", delay: 5500 },
      { text: "Schleife anpassen u. Tonspur dahinterlegen (Synthesizer)..." , delay: 7800 },
      { text: "Mische fertiges Loop-Video mit H.264 Codec zusammen..." , delay: 11000 },
    ];

    const timerId = setInterval(() => {
      setProcessingTimeSec(prev => prev + 1);
    }, 1000);

    const statusTimers = statusSequence.map(seq => {
      return setTimeout(() => {
        setProcessStatus(seq.text);
      }, seq.delay);
    });

    try {
      const response = await fetch("/api/blend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoFullPath: videoFile.fullPath,
          audioFullPath: audioFile?.fullPath,
          startTime: trimConfig.startTime,
          endTime: trimConfig.endTime,
          cropX: cropConfig.x,
          cropY: cropConfig.y,
          cropW: cropConfig.width,
          cropH: cropConfig.height,
          loopType,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResultPath(data.resultUrl);
        setResultMeta({ duration: data.duration, loops: data.loops });
      } else {
        setProcessError(data.error || "Es gab ein Problem bei der Videokompilierung.");
      }
    } catch (err) {
      setProcessError("Netzwerkfehler: Es konnte keine Verbindung zum Videoprozessor aufgebaut werden.");
    } finally {
      clearInterval(timerId);
      statusTimers.forEach(clearTimeout);
      setIsProcessing(false);
      setProcessingTimeSec(0);
    }
  };

  // Launch compression pipeline
  const handleStartCompression = async () => {
    if (!compressVideoFile) return;

    setIsProcessing(true);
    setProcessError("");
    setCompressResult(null);
    setProcessStatus("Initialisiere CPU-Videokompressor...");

    const compressionStatuses = [
      { text: "Lese Quelldatei auf dem Server ein (dies kann bei GB-Dateien einen Moment dauern)...", delay: 300 },
      { text: "Konfiguriere libx264 Codec mit benutzerdefiniertem CRF-Wert...", delay: 2000 },
      { text: `Wende Skalierungsfilter an: ${resolutionPreset === "original" ? "Originalauflösung" : resolutionPreset}...`, delay: 4500 },
      { text: "Führe Fast-Preset Kompression durch...", delay: 7000 },
      { text: "Kompiliere AAC Audiospur mit 128kbps...", delay: 11000 },
      { text: "Speichere komprimiertes Endergebnis...", delay: 15500 }
    ];

    const timerId = setInterval(() => {
      setProcessingTimeSec(prev => prev + 1);
    }, 1000);

    const statusTimers = compressionStatuses.map(seq => {
      return setTimeout(() => {
        setProcessStatus(seq.text);
      }, seq.delay);
    });

    try {
      const response = await fetch("/api/compress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoFullPath: compressVideoFile.fullPath,
          crfPreset,
          resolutionPreset,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setCompressResult({
          url: data.resultUrl,
          originalSize: data.originalSize,
          compressedSize: data.compressedSize,
          savingPercent: data.savingPercent
        });
      } else {
        setProcessError(data.error || "Videokompression ist fehlgeschlagen.");
      }
    } catch (err) {
      setProcessError("Netzwerkfehler: Der Server hat die schwere Videokompression unterbrochen.");
    } finally {
      clearInterval(timerId);
      statusTimers.forEach(clearTimeout);
      setIsProcessing(false);
      setProcessingTimeSec(0);
    }
  };

  // Compress page dedicated upload
  const handleCompressFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressUploading(true);
    setProcessError("");
    setCompressResult(null);

    const formData = new FormData();
    formData.append("videoFile", file);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (data.success && data.files.video) {
        setCompressVideoFile(data.files.video);
      } else {
        setProcessError(data.error || "Fehler beim Hochladen des großen Videos.");
      }
    } catch (err) {
      setProcessError("Upload-Verbindung abgebrochen.");
    } finally {
      setIsCompressUploading(false);
    }
  };

  // Reset helper
  const handleFullReset = () => {
    setVideoFile(undefined);
    setAudioFile(undefined);
    setCompressVideoFile(undefined);
    setResultPath("");
    setResultMeta(null);
    setCompressResult(null);
    setProcessError("");
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 selection:bg-blue-100 pb-16">
      
      {/* HEADER BANNER */}
      <header className="bg-white border-b border-gray-150/80 shadow-2xs py-4 px-6 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          
          {/* Logo Brand Brand */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-2xl shadow-sm shadow-blue-500/20 active:scale-95 transition-transform flex items-center justify-center">
              <InfinityIcon className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="font-display font-bold text-xl tracking-tight text-gray-900 flex items-center gap-1.5">
                Loopify
                <span className="text-[10px] uppercase tracking-widest font-mono bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md border border-blue-100">
                  Pro-Tools
                </span>
              </h1>
              <p className="text-xs text-gray-500">
                Nahtlose Videoschleifen & Sound-Mischpult
              </p>
            </div>
          </div>

          {/* Tab Controller & Extra Settings */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-center">
            
            {/* Dynamic tabs */}
            <div className="bg-gray-100 p-1 rounded-xl flex items-center border border-gray-200/50">
              <button
                onClick={() => {
                  setActiveTab("mixer");
                  setProcessError("");
                }}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                  activeTab === "mixer"
                    ? "bg-white text-gray-900 shadow-xs"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                🔄 Loop & Mixer
              </button>
              <button
                onClick={() => {
                  setActiveTab("compressor");
                  setProcessError("");
                }}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                  activeTab === "compressor"
                    ? "bg-white text-gray-900 shadow-xs"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                🗜️ Video-Kompressor
              </button>
            </div>

            <button
              onClick={handleFullReset}
              className="px-3 py-1.5 hover:bg-gray-100 text-xs font-semibold text-gray-500 hover:text-gray-900 rounded-xl transition border border-transparent flex items-center gap-1"
              title="Kompletten Workspace zurücksetzen"
            >
              <ListRestart className="w-4 h-4" />
            </button>
          </div>

        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 mt-8 space-y-8 animate-fade-in">
        
        {/* MIXER WORKSPACE */}
        {activeTab === "mixer" && (
          <>
            {/* INTRO BLURB */}
            <section className="bg-linear-to-r from-blue-900 to-indigo-950 rounded-2xl text-white p-7 md:p-8 shadow-sm relative overflow-hidden">
              <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-15 pointer-events-none flex items-center justify-center">
                <Sparkles className="w-44 h-44 text-white" />
              </div>
              <div className="relative max-w-2xl space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-200 bg-blue-800/45 px-3 py-1 rounded-sm">
                  Spezifikation (FFmpeg-Backend-Renderer)
                </span>
                <h2 className="font-display font-semibold text-2xl tracking-tight md:text-3xl text-white mt-1">
                  Kinderleichte Erstellung von nahtlosen Video-Loops
                </h2>
                <p className="text-sm text-blue-100 leading-relaxed max-w-xl">
                  Lade ein Video ein und schneide es räumlich aus. Extrahiere die Audiospur eines anderen Videos, und lasse deine ausgeschnittene Videoschleife vollautomatisch im Ping-Pong-Modell loopen – vollkommen fließend und ohne jeden harten Schnitt.
                </p>
              </div>
            </section>

            {/* TWO COLUMNS PIPELINE */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Left Column: Input fields & Editing Screen */}
              <div className="lg:col-span-8 space-y-8">
                
                {/* 1. Upload */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                    <span className="bg-gray-200 text-gray-700 w-5 h-5 rounded-full flex items-center justify-center text-[10px]">1</span>
                    Medien Hochladen
                  </div>
                  <MediaUploader
                    onVideoUploaded={(file) => {
                      setVideoFile(file);
                      setTrimConfig({ startTime: 0, endTime: Math.min(file.duration, 5) });
                    }}
                    onAudioUploaded={(file) => setAudioFile(file)}
                    videoFile={videoFile}
                    audioFile={audioFile}
                    onReset={handleFullReset}
                  />
                </div>

                {/* 2. Crop & Trim visual tools */}
                {videoFile && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                      <span className="bg-gray-200 text-gray-700 w-5 h-5 rounded-full flex items-center justify-center text-[10px]">2</span>
                      Ausschnitt & Zeiten Anpassen
                    </div>
                    <VideoCropTrim
                      videoFile={videoFile}
                      onConfigChange={setCropConfig && setTrimConfig ? handleConfigChange : () => {}}
                    />
                  </div>
                )}
              </div>

              {/* Right Column: Settings, Calculations & Action Button */}
              <div className="lg:col-span-4 space-y-8">
                
                {/* Core Settings Card */}
                <div className="bg-white rounded-2xl border border-gray-150 p-6 shadow-xs space-y-6">
                  <div className="flex items-center gap-2.5 pb-4 border-b border-gray-50">
                    <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                      <Sliders className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-display font-semibold text-sm text-gray-900">3. Loop-Einstellungen</h3>
                      <p className="text-xs text-gray-400">Übergangstyp & Rechenparameter</p>
                    </div>
                  </div>

                  {/* Loop type selection */}
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block">
                      Looping-Methoden (Übergänge)
                    </label>
                    
                    <div className="grid grid-cols-1 gap-2.5">
                      <div 
                        onClick={() => setLoopType("ping-pong")}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition ${
                          loopType === "ping-pong"
                            ? "border-blue-500 bg-blue-50/20"
                            : "border-gray-100 bg-gray-50/50 hover:bg-gray-100/50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-900 flex items-center gap-2">
                            <InfinityIcon className="w-3.5 h-3.5 text-blue-500" /> Ping-Pong (Fließend)
                          </span>
                          <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-sm uppercase tracking-wide">
                            Nahtlos
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-1 leading-normal">
                          Das ausgeschnittene Video wird vorwärts und anschließend rückwärts abgespielt. Das eliminiert sichtbare Schnitte komplett.
                        </p>
                      </div>

                      <div 
                        onClick={() => setLoopType("normal")}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition ${
                          loopType === "normal"
                            ? "border-blue-500 bg-blue-50/20"
                            : "border-gray-100 bg-gray-50/50 hover:bg-gray-100/50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-900 flex items-center gap-2">
                            <RefreshCw className="w-3.5 h-3.5 text-gray-500" /> Normaler Loop (Sequentiell)
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-1 leading-normal">
                          Die Abschnitte werden einfach nacheinander gereiht. Gut für Videos, die bereits perfekt loopen.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Dynamic calculation stats preview */}
                  <div className="pt-4 border-t border-gray-50 space-y-3">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-widest block">
                      Berechnungsvorschau
                    </span>
                    
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-2.5 text-xs font-medium">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Gewählte Trim-Länge:</span>
                        <span className="font-mono text-gray-900">{clipDuration.toFixed(2)}s</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Kinetische Loop-Einheit:</span>
                        <span className="font-mono text-gray-900">{loopUnitDuration.toFixed(2)}s</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Audiospur-Dauer:</span>
                        <span className="font-mono text-blue-600 font-semibold">{audioDuration.toFixed(2)}s</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-dashed border-gray-200">
                        <span className="text-gray-500 flex items-center gap-1">
                          Schleifen-Anzahl: <HelpCircle className="w-3 h-3 text-gray-400" title="Wie oft die Schleife wiederholt wird, um die Audiospur zu decken." />
                        </span>
                        <span className="font-bold text-purple-600 font-mono">
                          {videoFile ? computedLoops : 0} Wiederholungen
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Launch processing */}
                  <button
                    disabled={!videoFile || isProcessing}
                    onClick={handleStartBlending}
                    className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm tracking-wide shadow-md flex items-center justify-center gap-2 transition active:scale-98 ${
                      videoFile && !isProcessing
                        ? "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/10 cursor-pointer"
                        : "bg-gray-100 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    <Wand2 className="w-4 h-4 shrink-0" />
                    Mischung starten (FFmpeg)
                  </button>
                </div>

                {/* Progress / Status Indicators */}
                {(isProcessing || processError) && (
                  <div className="space-y-4">
                    {isProcessing && (
                      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs space-y-4 text-center">
                        <div className="relative w-12 h-12 mx-auto flex items-center justify-center">
                          <div className="absolute inset-0 rounded-full border-4 border-gray-100 border-t-blue-600 animate-spin" />
                          <Sparkles className="w-5 h-5 text-blue-500 animate-pulse" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-display font-semibold text-sm text-gray-900">Rendering läuft...</h4>
                          <p className="text-[11px] text-gray-400 font-mono">Dauer: {processingTimeSec}s</p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-xl text-left border border-gray-100">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 font-sans">
                            Konsolen-Protokoll:
                          </p>
                          <div className="text-[11px] font-mono text-gray-600 leading-relaxed flex items-start gap-1">
                            <span className="text-blue-500 font-bold animate-pulse">&gt;</span> 
                            <span>{processStatus}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {processError && (
                      <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-start gap-3 text-red-800">
                        <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        <div>
                          <div className="text-sm font-semibold">Render-Fehler</div>
                          <div className="text-xs mt-0.5 leading-relaxed opacity-90">{processError}</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Final render output display */}
                {resultPath && resultMeta && (
                  <div className="bg-white rounded-2xl border border-green-150 p-6 shadow-sm space-y-5">
                    <div className="flex items-center gap-2.5 pb-3 border-b border-gray-50">
                      <div className="p-2 bg-green-50 text-green-600 rounded-xl">
                        <FileCheck2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-display font-semibold text-sm text-gray-900">Mischung abgeschlossen!</h3>
                        <p className="text-xs text-green-600 font-medium font-sans">Deine Enddatei ist bereit.</p>
                      </div>
                    </div>

                    <div className="rounded-xl overflow-hidden bg-black aspect-square max-h-[300px] flex items-center justify-center shadow-xs">
                      <video 
                        src={resultPath}
                        controls
                        autoPlay
                        loop
                        className="w-full h-full object-contain"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-center text-xs">
                      <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                        <span className="text-gray-400 block text-[10px] font-bold uppercase tracking-wider">Loops</span>
                        <span className="font-bold text-gray-800 text-sm">{resultMeta.loops}x</span>
                      </div>
                      <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                        <span className="text-gray-400 block text-[10px] font-bold uppercase tracking-wider">Dauer</span>
                        <span className="font-bold text-gray-800 text-sm font-mono">{resultMeta.duration.toFixed(2)}s</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <a
                        href={resultPath}
                        download={`loop-mix-${Date.now()}.mp4`}
                        className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold tracking-wide transition flex items-center justify-center gap-2 shadow-md shadow-green-500/10 cursor-pointer"
                      >
                        <Download className="w-4 h-4" /> Loop-Video herunterladen
                      </a>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </>
        )}

        {/* COMPRESSER WORKSPACE */}
        {activeTab === "compressor" && (
          <>
            {/* COMPRESSER INTRO BANNER */}
            <section className="bg-linear-to-r from-teal-900 to-emerald-950 rounded-2xl text-white p-7 md:p-8 shadow-sm relative overflow-hidden">
              <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-15 pointer-events-none flex items-center justify-center">
                <Scale className="w-44 h-44 text-white" />
              </div>
              <div className="relative max-w-2xl space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-teal-200 bg-teal-800/45 px-3 py-1 rounded-sm">
                  Pro-Werkzeug • FFmpeg Kräftige Reduktion
                </span>
                <h2 className="font-display font-semibold text-2xl tracking-tight md:text-3xl text-white mt-1">
                  Video-Kompression für riesige GB-Dateien
                </h2>
                <p className="text-sm text-teal-100 leading-relaxed max-w-xl">
                  Reduziere die Dateigröße deiner Gigabyte-Videos drastisch. Nutze intelligentes CRF (Constant Rate Factor) H.264 Encoding und optionale räumliche Herabskalierung (720p/480p), um Dateien auf einen Bruchteil ihrer Größe zu bringen – ideal für unkomplizierten Webexport.
                </p>
              </div>
            </section>

            {/* DUAL WORKSPACE FOR COMPRESSION */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Left Compressor Column: Upload & Video analysis */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* File Upload zone */}
                <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-xs space-y-4">
                  <div className="flex items-center gap-3 border-b border-gray-50 pb-3">
                    <div className="p-2.5 bg-teal-50 text-teal-600 rounded-xl">
                      <FileVideo className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-display font-semibold text-sm text-gray-900">1. Quelldatei einladen</h3>
                      <p className="text-xs text-gray-400">Das große, speicherfressende Video hochladen</p>
                    </div>
                  </div>

                  {compressVideoFile ? (
                    <div className="space-y-4">
                      <div className="bg-teal-50/60 p-4 rounded-xl border border-teal-100 flex items-start gap-3">
                        <FileCheck2 className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <label className="text-xs font-bold text-teal-700 uppercase tracking-wider">Aktives Video zur Kompression</label>
                          <div className="text-sm font-semibold text-teal-950 truncate mt-0.5">
                            {compressVideoFile.originalName}
                          </div>
                          <div className="text-xs text-teal-900/80 font-mono mt-1.5 space-y-0.5">
                            <div>Org. Auflösung: {compressVideoFile.width}x{compressVideoFile.height}px</div>
                            <div>Dauer: {compressVideoFile.duration.toFixed(2)}s</div>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => compressInputRef.current?.click()}
                          className="flex-1 py-2 bg-gray-50 hover:bg-gray-100 text-xs font-semibold text-gray-600 rounded-xl transition border border-gray-150"
                        >
                          Anderes Großvideo wählen
                        </button>
                        <button
                          onClick={() => setCompressVideoFile(undefined)}
                          className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-semibold text-xs rounded-xl transition border border-red-100"
                        >
                          Entfernen
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div 
                      onClick={() => compressInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-200 hover:border-teal-500 rounded-xl p-10 text-center cursor-pointer transition bg-gray-50/40 hover:bg-teal-50/10 group flex flex-col items-center justify-center min-h-[190px]"
                    >
                      <Cpu className="w-10 h-10 text-gray-400 group-hover:text-teal-600 transition mb-3" />
                      <span className="text-xs font-bold text-gray-700">Riesiges Video hier hochladen...</span>
                      <span className="text-[10px] text-gray-400 mt-1 max-w-xs leading-normal">
                        Spitzenmäßig geeignet für Dateien bis maximal 2 Gigabyte. Unser Server verarbeitet alle standardmäßigen Container wie MP4, AVI, MOV oder MKV.
                      </span>
                    </div>
                  )}

                  <input
                    ref={compressInputRef}
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={handleCompressFileUpload}
                    disabled={isCompressUploading || isProcessing}
                  />
                </div>

                {/* Upload indicator */}
                {isCompressUploading && (
                  <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs text-center flex flex-col items-center justify-center gap-3">
                    <div className="relative w-8 h-8">
                      <div className="absolute inset-0 rounded-full border-2 border-gray-100 border-t-teal-600 animate-spin" />
                    </div>
                    <div className="text-xs text-gray-600">
                      <strong>Lese & Analysiere Videostruktur...</strong><br />
                      Das Video wird für den Konverter vorbereitet. Bitte lade die Seite nicht neu.
                    </div>
                  </div>
                )}
              </div>

              {/* Right Compressor Column: Settings, Actions & Dashboard outputs */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* Compressor parameter modifiers */}
                <div className="bg-white rounded-2xl border border-gray-150 p-6 shadow-xs space-y-6">
                  
                  <div className="flex items-center gap-2 border-b border-gray-50 pb-3">
                    <Sliders className="w-4 h-4 text-teal-600" />
                    <h4 className="font-display font-semibold text-xs text-gray-800 uppercase tracking-wider">
                      2. Kompressionseinstellungen
                    </h4>
                  </div>

                  {/* Preset modifier */}
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block">
                      Qualitätsprofil & CRF
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => setCrfPreset("low")}
                        className={`p-2.5 rounded-xl border text-center transition ${
                          crfPreset === "low"
                            ? "border-teal-600 bg-teal-50 text-teal-950 font-bold"
                            : "border-gray-100 hover:bg-gray-50 text-gray-600 text-xs font-medium"
                        }`}
                      >
                        <div className="text-xs">20 CRF</div>
                        <div className="text-[9px] mt-0.5 opacity-80">Beste Qualität</div>
                      </button>
                      <button
                        onClick={() => setCrfPreset("medium")}
                        className={`p-2.5 rounded-xl border text-center transition ${
                          crfPreset === "medium"
                            ? "border-teal-600 bg-teal-50 text-teal-950 font-bold"
                            : "border-gray-100 hover:bg-gray-50 text-gray-600 text-xs font-medium"
                        }`}
                      >
                        <div className="text-xs">26 CRF</div>
                        <div className="text-[9px] mt-0.5 opacity-80">Empfohlen</div>
                      </button>
                      <button
                        onClick={() => setCrfPreset("high")}
                        className={`p-2.5 rounded-xl border text-center transition ${
                          crfPreset === "high"
                            ? "border-teal-600 bg-teal-50 text-teal-950 font-bold"
                            : "border-gray-100 hover:bg-gray-50 text-gray-600 text-xs font-medium"
                        }`}
                      >
                        <div className="text-xs">32 CRF</div>
                        <div className="text-[9px] mt-0.5 opacity-80">Max. Ersparnis</div>
                      </button>
                    </div>
                  </div>

                  {/* Spatial reduction / resolution option */}
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block">
                      Auflösungs-Skalierung (Downscaling)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setResolutionPreset("original")}
                        className={`p-2.5 rounded-xl border text-left transition ${
                          resolutionPreset === "original"
                            ? "border-teal-600 bg-teal-50 text-teal-950 font-bold"
                            : "border-gray-100 hover:bg-gray-50 text-gray-600 text-xs font-medium"
                        }`}
                      >
                        <div className="text-xs">Original</div>
                        <div className="text-[9px] mt-0.5 opacity-70">Nicht verändern</div>
                      </button>
                      <button
                        onClick={() => setResolutionPreset("1080p")}
                        className={`p-2.5 rounded-xl border text-left transition ${
                          resolutionPreset === "1080p"
                            ? "border-teal-600 bg-teal-50 text-teal-950 font-bold"
                            : "border-gray-100 hover:bg-gray-50 text-gray-600 text-xs font-medium"
                        }`}
                      >
                        <div className="text-xs">1080p Full HD</div>
                        <div className="text-[9px] mt-0.5 opacity-70">Max. 1920 Breit</div>
                      </button>
                      <button
                        onClick={() => setResolutionPreset("720p")}
                        className={`p-2.5 rounded-xl border text-left transition ${
                          resolutionPreset === "720p"
                            ? "border-teal-600 bg-teal-50 text-teal-950 font-bold"
                            : "border-gray-100 hover:bg-gray-50 text-gray-600 text-xs font-medium"
                        }`}
                      >
                        <div className="text-xs">720p HD</div>
                        <div className="text-[9px] mt-0.5 opacity-70">Sehr platzsparend</div>
                      </button>
                      <button
                        onClick={() => setResolutionPreset("480p")}
                        className={`p-2.5 rounded-xl border text-left transition ${
                          resolutionPreset === "480p"
                            ? "border-teal-600 bg-teal-50 text-teal-950 font-bold"
                            : "border-gray-100 hover:bg-gray-50 text-gray-600 text-xs font-medium"
                        }`}
                      >
                        <div className="text-xs">480p Mobiltauglich</div>
                        <div className="text-[9px] mt-0.5 opacity-70">Extrem kleine Datei</div>
                      </button>
                    </div>
                  </div>

                  {/* Compress processing button */}
                  <button
                    disabled={!compressVideoFile || isProcessing}
                    onClick={handleStartCompression}
                    className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm tracking-wide shadow-md flex items-center justify-center gap-2 transition active:scale-98 ${
                      compressVideoFile && !isProcessing
                        ? "bg-teal-600 hover:bg-teal-700 text-white shadow-teal-500/10 cursor-pointer"
                        : "bg-gray-100 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    <Scale className="w-4 h-4 shrink-0" />
                    Videokompression starten
                  </button>
                </div>

                {/* Compressor active progress */}
                {isProcessing && (
                  <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs space-y-4 text-center">
                    <div className="relative w-12 h-12 mx-auto flex items-center justify-center animate-spin">
                      <div className="absolute inset-0 rounded-full border-4 border-gray-100 border-t-teal-600" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-display font-semibold text-sm text-gray-900">Videokompression läuft am Server...</h4>
                      <p className="text-[11px] text-gray-400 font-mono">Verstrichene Zeit: {processingTimeSec}s</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl text-left border border-gray-100">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 font-sans">
                        Konsolen-Protokoll:
                      </p>
                      <div className="text-[11px] font-mono text-gray-600 leading-relaxed flex items-start gap-1">
                        <span className="text-teal-600 font-bold animate-pulse">&gt;</span> 
                        <span>{processStatus}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Processing errors */}
                {processError && (
                  <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-start gap-3 text-red-800">
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-sm font-semibold">Render-Fehler</div>
                      <div className="text-xs mt-0.5 leading-relaxed opacity-90">{processError}</div>
                    </div>
                  </div>
                )}

                {/* COMPRESSION COMPARATIVE DASHBOARD */}
                {compressResult && (
                  <div className="bg-white rounded-2xl border border-teal-150 p-6 shadow-sm space-y-5 animate-fade-in">
                    
                    <div className="flex items-center gap-2.5 pb-3 border-b border-gray-50">
                      <div className="p-2 bg-teal-50 text-teal-600 rounded-xl">
                        <FileCheck2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-display font-semibold text-sm text-gray-900">Kompression erfolgreich!</h3>
                        <p className="text-xs text-teal-600 font-medium">Analyse der Speicherreduktion:</p>
                      </div>
                    </div>

                    {/* Size progression indicators */}
                    <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-500 font-semibold">Original-Größe:</span>
                        <span className="font-mono text-gray-700 font-bold">{formatBytes(compressResult.originalSize)}</span>
                      </div>
                      
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-500 font-semibold">Komprimierte Größe:</span>
                        <span className="font-mono text-teal-700 font-bold text-sm bg-teal-50 px-2 py-0.5 rounded-md border border-teal-100">
                          {formatBytes(compressResult.compressedSize)}
                        </span>
                      </div>

                      <div className="pt-2 border-t border-dashed border-gray-200 flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-800 flex items-center gap-1">
                          Größeneinsparung:
                        </span>
                        <span className="font-bold text-teal-600 font-mono text-sm flex items-center gap-1">
                          <ArrowDownLeft className="w-4 h-4" /> -{compressResult.savingPercent}%
                        </span>
                      </div>
                    </div>

                    {/* Integrated mini video player */}
                    <div className="rounded-xl overflow-hidden bg-black aspect-video max-h-[220px] flex items-center justify-center">
                      <video 
                        src={compressResult.url}
                        controls
                        className="w-full h-full object-contain"
                      />
                    </div>

                    {/* Download links */}
                    <a
                      href={compressResult.url}
                      download={`compressed-${Date.now()}.mp4`}
                      className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold tracking-wide transition flex items-center justify-center gap-2 shadow-md shadow-teal-500/10 cursor-pointer"
                    >
                      <Download className="w-4 h-4" /> Komprimiertes Video herunterladen
                    </a>

                  </div>
                )}

              </div>

            </div>
          </>
        )}

      </main>

      <footer className="max-w-6xl mx-auto px-6 mt-16 pt-8 border-t border-gray-150/60 text-center text-xs text-gray-400 space-y-1">
        <div>Loopify Pro-Tools • Angetrieben von FFmpeg im Node.js Server</div>
        <div className="font-mono text-[10px] text-gray-300">Port 3000 Ingress Routing Active.</div>
      </footer>
    </div>
  );
}
