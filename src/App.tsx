import React, { useState, useRef, useEffect } from "react";
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
  FileBadge,
  Plus,
  Trash2,
  Save,
  Play,
  CheckCircle2,
  Clock,
  Loader2,
  ArrowUp,
  ArrowDown
} from "lucide-react";
import { UploadedFile, CropSelection, TrimSelection, LoopMode, QueueItem, CompressionPreset } from "./types";
import MediaUploader from "./components/MediaUploader";
import VideoCropTrim from "./components/VideoCropTrim";

export default function App() {
  // Navigation: Active main Workspace tab
  const [activeTab, setActiveTab] = useState<"mixer" | "compressor" | "splitter" | "concat">("mixer");

  // State: Uploaded media files
  const [videoFile, setVideoFile] = useState<UploadedFile | undefined>(undefined);
  const [audioFile, setAudioFile] = useState<UploadedFile | undefined>(undefined);

  // State: Audio Splitter parameters & files
  const [splitterAudioFile, setSplitterAudioFile] = useState<UploadedFile | undefined>(undefined);
  const [isSplitterUploading, setIsSplitterUploading] = useState(false);
  const splitterInputRef = useRef<HTMLInputElement>(null);
  const [isSplitting, setIsSplitting] = useState(false);
  const [splitterResult, setSplitterResult] = useState<{
    vocalUrl: string;
    instrumentalUrl: string;
  } | null>(null);
  const [splitterTrim, setSplitterTrim] = useState<{ startTime: number; endTime: number }>({ startTime: 0, endTime: 30 });
  const [enableSplitterTrim, setEnableSplitterTrim] = useState(false);

  // State: Video Concatenation (Merger)
  const [concatVideos, setConcatVideos] = useState<UploadedFile[]>([]);
  const [isConcatUploading, setIsConcatUploading] = useState(false);
  const [isConcating, setIsConcating] = useState(false);
  const [concatResultUrl, setConcatResultUrl] = useState<string>("");
  const [concatResultMeta, setConcatResultMeta] = useState<any | null>(null);
  const concatInputRef = useRef<HTMLInputElement>(null);

  // Mixer parameters
  const [cropConfig, setCropConfig] = useState<CropSelection>({ x: 0, y: 0, width: 200, height: 200 });
  const [trimConfig, setTrimConfig] = useState<TrimSelection>({ startTime: 0, endTime: 5 });
  const [loopType, setLoopType] = useState<LoopMode>("ping-pong");

  // Compressor parameters
  const [compressMode, setCompressMode] = useState<"single" | "queue">("single");
  const [compressVideoFile, setCompressVideoFile] = useState<UploadedFile | undefined>(undefined);
  const [crfPreset, setCrfPreset] = useState<"low" | "medium" | "high">("medium");
  const [resolutionPreset, setResolutionPreset] = useState<"original" | "1080p" | "720p" | "480p">("original");

  // Compressor Queue State
  const [compressQueue, setCompressQueue] = useState<QueueItem[]>([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const queueInputRef = useRef<HTMLInputElement>(null);

  // Compressor Presets State
  const [customPresets, setCustomPresets] = useState<CompressionPreset[]>([]);
  const [newPresetName, setNewPresetName] = useState("");

  const DEFAULT_PRESETS: CompressionPreset[] = [
    { id: "def-high", name: "Hohe Qualität (20 CRF, Original)", crfPreset: "low", resolutionPreset: "original", isCustom: false },
    { id: "def-med", name: "Ausgewogen (26 CRF, 1080p)", crfPreset: "medium", resolutionPreset: "1080p", isCustom: false },
    { id: "def-low", name: "Maximale Ersparnis (32 CRF, 720p)", crfPreset: "high", resolutionPreset: "720p", isCustom: false },
    { id: "def-mobile", name: "Sehr klein für Mobilgeräte (32 CRF, 480p)", crfPreset: "high", resolutionPreset: "480p", isCustom: false },
  ];

  // Load custom presets on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("loopify_compress_presets");
      if (saved) {
        setCustomPresets(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Fehler beim Laden der Presets:", e);
    }
  }, []);

  const handleSavePreset = () => {
    if (!newPresetName.trim()) return;
    const newPreset: CompressionPreset = {
      id: "custom-" + Date.now(),
      name: newPresetName.trim(),
      crfPreset,
      resolutionPreset,
      isCustom: true,
    };
    const updated = [...customPresets, newPreset];
    setCustomPresets(updated);
    localStorage.setItem("loopify_compress_presets", JSON.stringify(updated));
    setNewPresetName("");
  };

  const handleDeletePreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = customPresets.filter(p => p.id !== id);
    setCustomPresets(updated);
    localStorage.setItem("loopify_compress_presets", JSON.stringify(updated));
  };

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

  // Crop / Trim config change callback
  const handleConfigChange = (crop: CropSelection, trim: TrimSelection) => {
    setCropConfig(crop);
    setTrimConfig(trim);
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

  // Queue mode: Upload multiple files sequentially
  const handleQueueFilesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    const filesArray = Array.from(selectedFiles) as File[];

    const newItems: QueueItem[] = filesArray.map((file, idx) => ({
      id: `queue-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 5)}`,
      name: file.name,
      originalSize: file.size,
      status: "uploading"
    }));

    setCompressQueue(prev => [...prev, ...newItems]);

    // Reset native input so the user can re-trigger file pick
    if (e.target) e.target.value = "";

    // Process local uploads sequentially
    for (let i = 0; i < newItems.length; i++) {
      const item = newItems[i];
      const nativeFileObj = filesArray[i];

      const formData = new FormData();
      formData.append("videoFile", nativeFileObj);

      try {
        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const data = await response.json();

        if (data.success && data.files.video) {
          setCompressQueue(prev => 
            prev.map(q => q.id === item.id ? { ...q, status: "pending", file: data.files.video } : q)
          );
        } else {
          setCompressQueue(prev => 
            prev.map(q => q.id === item.id ? { ...q, status: "failed", error: data.error || "Upload-Fehler" } : q)
          );
        }
      } catch (err) {
        setCompressQueue(prev => 
          prev.map(q => q.id === item.id ? { ...q, status: "failed", error: "Upload-Abbruch" } : q)
        );
      }
    }
  };

  // Process all pending items in the compressor queue sequentially
  const handleProcessQueue = async () => {
    const pendingItems = compressQueue.filter(item => item.status === "pending" && item.file);
    if (pendingItems.length === 0) return;

    setIsProcessingQueue(true);
    setProcessError("");
    setProcessStatus("Initialisiere Warteschlangen-Sitzung...");

    const timerId = setInterval(() => {
      setProcessingTimeSec(prev => prev + 1);
    }, 1000);

    try {
      for (let i = 0; i < compressQueue.length; i++) {
        const item = compressQueue[i];
        if (item.status !== "pending" || !item.file) continue;

        // Mark as processing
        setCompressQueue(prev => 
          prev.map(q => q.id === item.id ? { ...q, status: "processing" } : q)
        );
        setProcessStatus(`Kompression gestartet [${i + 1}/${compressQueue.length}]: ${item.name}...`);

        try {
          const response = await fetch("/api/compress", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              videoFullPath: item.file.fullPath,
              crfPreset,
              resolutionPreset,
            }),
          });
          const data = await response.json();

          if (data.success) {
            setCompressQueue(prev => 
              prev.map(q => q.id === item.id ? { 
                ...q, 
                status: "done", 
                compressResult: {
                  url: data.resultUrl,
                  originalSize: data.originalSize,
                  compressedSize: data.compressedSize,
                  savingPercent: data.savingPercent
                } 
              } : q)
            );
          } else {
            setCompressQueue(prev => 
              prev.map(q => q.id === item.id ? { ...q, status: "failed", error: data.error || "Fehler" } : q)
            );
          }
        } catch (err: any) {
          setCompressQueue(prev => 
            prev.map(q => q.id === item.id ? { ...q, status: "failed", error: err.message || "Verbindungsfehler" } : q)
          );
        }
      }
    } catch (globalErr) {
      setProcessError("Unerwarteter Abbruch der Warteschlange.");
    } finally {
      setIsProcessingQueue(false);
      clearInterval(timerId);
      setProcessingTimeSec(0);
      setProcessStatus("");
    }
  };

  // Audio Separation Handlers (Stimm-Extraktor)
  const handleSplitterAudioUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsSplitterUploading(true);
    setProcessError("");
    setSplitterResult(null);

    const formData = new FormData();
    formData.append("audioFile", file);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (data.success && data.files.audio) {
        setSplitterAudioFile(data.files.audio);
        const duration = data.files.audio.duration || 60;
        setSplitterTrim({ startTime: 0, endTime: Math.round(duration) });
        setEnableSplitterTrim(false);
      } else {
        setProcessError(data.error || "Unerwarteter Fehler beim Hochladen der Audiodatei.");
      }
    } catch (err: any) {
      console.error(err);
      setProcessError("Verbindung zum Server fehlgeschlagen. Bitte versuche es erneut.");
    } finally {
      setIsSplitterUploading(false);
    }
  };

  const handleTriggerSeparation = async () => {
    if (!splitterAudioFile) return;

    setIsSplitting(true);
    setProcessError("");
    setSplitterResult(null);
    setProcessingTimeSec(0);

    const timerId = setInterval(() => {
      setProcessingTimeSec(prev => prev + 1);
    }, 1000);

    const statusSequence = [
      { text: "Lese Audio-Daten in den RAM-Speicher ein...", delay: 100 },
      { text: "Bereite Phase-Schnittpunkt-Analyse vor...", delay: 1500 },
      { text: "Entkopple Stereokanäle (L & R)...", delay: 3000 },
      { text: "Subtrahiere Mono-Komponenten (Gesangsbereich)...", delay: 5000 },
      { text: "Füge Basspass-Filter (<180Hz) für sattes Instrumental hinzu...", delay: 7000 },
      { text: "Filtere Gesangsfrequenzen im Bandpass (~220Hz-3.4kHz)...", delay: 9000 },
      { text: "Glätte Audiopeaks und rendere fertige Begleitmusik...", delay: 11000 },
      { text: "Rendere Stimme als separate MP3-Audiospur...", delay: 13000 },
    ];

    setProcessStatus(statusSequence[0].text);

    const statusTimers = statusSequence.map(seq => {
      return setTimeout(() => {
        setProcessStatus(seq.text);
      }, seq.delay);
    });

    try {
      const response = await fetch("/api/split-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audioFullPath: splitterAudioFile.fullPath,
          startTime: enableSplitterTrim ? splitterTrim.startTime : undefined,
          endTime: enableSplitterTrim ? splitterTrim.endTime : undefined,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setSplitterResult({
          vocalUrl: data.vocalUrl,
          instrumentalUrl: data.instrumentalUrl,
        });
      } else {
        setProcessError(data.error || "Fehler beim Trennen der Tonspuren.");
      }
    } catch (err: any) {
      console.error(err);
      setProcessError("Unerwarteter Verbindungsausfall.");
    } finally {
      setIsSplitting(false);
      clearInterval(timerId);
      statusTimers.forEach(clearTimeout);
      setProcessingTimeSec(0);
      setProcessStatus("");
    }
  };

  // Video Concatenation Handlers (Video-Verkettung)
  const handleConcatVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsConcatUploading(true);
    setProcessError("");

    const uploadedFilesList: UploadedFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append("videoFile", file);

      try {
        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const data = await response.json();
        if (data.success && data.files.video) {
          uploadedFilesList.push(data.files.video);
        } else {
          setProcessError(prev => prev || (data.error || `Fehler beim Hochladen von: ${file.name}`));
        }
      } catch (err: any) {
        console.error(err);
        setProcessError("Verbindung zum Server fehlgeschlagen beim Hochladen.");
      }
    }

    if (uploadedFilesList.length > 0) {
      setConcatVideos(prev => [...prev, ...uploadedFilesList]);
    }
    setIsConcatUploading(false);
    if (concatInputRef.current) {
      concatInputRef.current.value = "";
    }
  };

  const handleTriggerConcatenation = async () => {
    if (concatVideos.length < 2) {
      setProcessError("Bitte füge mindestens zwei Videos hinzu, um sie zu verketten.");
      return;
    }

    setIsConcating(true);
    setProcessError("");
    setConcatResultUrl("");
    setConcatResultMeta(null);
    setProcessingTimeSec(0);

    const timerId = setInterval(() => {
      setProcessingTimeSec(prev => prev + 1);
    }, 1000);

    const statusSequence = [
      { text: "Lese Video-Clips ein...", delay: 100 },
      { text: "Analysiere Auflösungen und Tonspuren...", delay: 1500 },
      { text: "Starte Normalisierung auf einheitliche Spezifikationen (1280x720, 30fps)...", delay: 3000 },
      { text: "Rendere Briefkasten-Ränder (Letterboxing) für abweichende Formate...", delay: 5000 },
      { text: "Erstelle stumme Tonspuren für stumme Videoclips...", delay: 7500 },
      { text: "Füge normalisierte Clips in die Verkettungs-Matrix ein...", delay: 10000 },
      { text: "Führe Frame-Genaue Zusammenfügung (Concat Demuxer) aus...", delay: 13000 },
      { text: "Schreibe fertiges Zielvideo in den Speicher...", delay: 16000 },
    ];

    setProcessStatus(statusSequence[0].text);

    const statusTimers = statusSequence.map(seq => {
      return setTimeout(() => {
        setProcessStatus(seq.text);
      }, seq.delay);
    });

    try {
      const response = await fetch("/api/concat-videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoPaths: concatVideos.map(v => v.fullPath)
        }),
      });

      const data = await response.json();
      if (data.success) {
        setConcatResultUrl(data.videoUrl);
        setConcatResultMeta(data.meta);
      } else {
        setProcessError(data.error || "Fehler beim Verketten der Videos.");
      }
    } catch (err: any) {
      console.error(err);
      setProcessError("Unerwarteter Verbindungsausfall.");
    } finally {
      setIsConcating(false);
      clearInterval(timerId);
      statusTimers.forEach(clearTimeout);
      setProcessingTimeSec(0);
      setProcessStatus("");
    }
  };

  const moveClipUp = (index: number) => {
    if (index === 0) return;
    setConcatVideos(prev => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[index - 1];
      next[index - 1] = temp;
      return next;
    });
  };

  const moveClipDown = (index: number) => {
    if (index === concatVideos.length - 1) return;
    setConcatVideos(prev => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[index + 1];
      next[index + 1] = temp;
      return next;
    });
  };

  const removeClip = (index: number) => {
    setConcatVideos(prev => prev.filter((_, i) => i !== index));
  };

  // Reset helper
  const handleFullReset = () => {
    setVideoFile(undefined);
    setAudioFile(undefined);
    setCompressVideoFile(undefined);
    setCompressQueue([]);
    setIsProcessingQueue(false);
    setResultPath("");
    setResultMeta(null);
    setCompressResult(null);
    setSplitterAudioFile(undefined);
    setSplitterResult(null);
    setIsSplitting(false);
    setIsSplitterUploading(false);
    setSplitterTrim({ startTime: 0, endTime: 30 });
    setEnableSplitterTrim(false);
    setConcatVideos([]);
    setConcatResultUrl("");
    setConcatResultMeta(null);
    setIsConcating(false);
    setIsConcatUploading(false);
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
              <button
                onClick={() => {
                  setActiveTab("splitter");
                  setProcessError("");
                }}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                  activeTab === "splitter"
                    ? "bg-white text-gray-900 shadow-xs"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                🎤 Stimm-Extraktor
              </button>
              <button
                onClick={() => {
                  setActiveTab("concat");
                  setProcessError("");
                }}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                  activeTab === "concat"
                    ? "bg-white text-gray-900 shadow-xs"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                🔗 Video-Verkettung
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

            {/* Mode selection toggle */}
            <div className="flex justify-start gap-2 bg-gray-100 p-1.5 rounded-2xl max-w-xs border border-gray-200/50">
              <button
                type="button"
                onClick={() => setCompressMode("single")}
                className={`flex-1 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-150 flex items-center justify-center gap-1.5 ${
                  compressMode === "single"
                    ? "bg-white text-teal-950 shadow-xs border border-teal-55/10"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                <FileVideo className="w-4 h-4" /> Einzeldatei
              </button>
              <button
                type="button"
                onClick={() => setCompressMode("queue")}
                className={`flex-1 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-150 flex items-center justify-center gap-1.5 ${
                  compressMode === "queue"
                    ? "bg-white text-teal-955 shadow-xs border border-teal-55/10"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                <Plus className="w-4 h-4" /> Warteschlange
              </button>
            </div>

            {/* DUAL WORKSPACE FOR COMPRESSION */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Left Compressor Column: Upload & Video analysis */}
              <div className="lg:col-span-7 space-y-6">
                
                {compressMode === "single" ? (
                  <>
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
                              <div className="text-sm font-semibold text-teal-955 truncate mt-0.5">
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
                              type="button"
                              onClick={() => compressInputRef.current?.click()}
                              className="flex-1 py-2 bg-gray-50 hover:bg-gray-100 text-xs font-semibold text-gray-600 rounded-xl transition border border-gray-150 cursor-pointer"
                            >
                              Anderes Großvideo wählen
                            </button>
                            <button
                              type="button"
                              onClick={() => setCompressVideoFile(undefined)}
                              className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-semibold text-xs rounded-xl transition border border-red-100 cursor-pointer"
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
                  </>
                ) : (
                  <>
                    {/* Queue file upload zone */}
                    <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-xs space-y-4">
                      <div className="flex items-center justify-between border-b border-gray-50 pb-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                            <Plus className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-display font-semibold text-sm text-gray-900">1. Warteschlange befüllen</h3>
                            <p className="text-xs text-gray-400">Mehrere Videos zur nacheinander-Verarbeitung</p>
                          </div>
                        </div>
                        
                        {compressQueue.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setCompressQueue([])}
                            className="px-2.5 py-1 text-red-655 border border-red-100 hover:bg-red-50 text-[10px] font-bold rounded-lg uppercase tracking-wide transition cursor-pointer"
                          >
                            Queue leeren
                          </button>
                        )}
                      </div>

                      <div 
                        onClick={() => queueInputRef.current?.click()}
                        className="border-2 border-dashed border-gray-200 hover:border-indigo-500 rounded-xl p-8 text-center cursor-pointer transition bg-gray-50/40 hover:bg-indigo-50/10 group flex flex-col items-center justify-center min-h-[150px]"
                      >
                        <Plus className="w-8 h-8 text-gray-400 group-hover:text-indigo-600 transition mb-2" />
                        <span className="text-xs font-bold text-gray-700">Videos zur Queue hinzufügen...</span>
                        <span className="text-[10px] text-gray-400 mt-1 max-w-xs leading-normal">
                          Mehrfachauswahl möglich. Videos laden hoch und stehen direkt in der Compression-Warteschlange zur Verfügung.
                        </span>
                      </div>

                      <input
                        ref={queueInputRef}
                        type="file"
                        accept="video/*"
                        multiple
                        className="hidden"
                        onChange={handleQueueFilesUpload}
                        disabled={isProcessingQueue}
                      />
                    </div>

                    {/* Queue UI list view */}
                    {compressQueue.length > 0 && (
                      <div className="space-y-3 font-sans">
                        <h4 className="text-xs font-bold text-gray-505 uppercase tracking-widest pl-1">
                          Aktuelle Warteschlange ({compressQueue.length} Videos)
                        </h4>
                        
                        <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                          {compressQueue.map((item) => (
                            <div 
                              key={item.id} 
                              className={`p-3.5 rounded-xl border transition flex items-center justify-between gap-4 ${
                                item.status === "processing"
                                  ? "border-teal-555 bg-teal-50/15"
                                  : item.status === "done"
                                  ? "border-green-150 bg-green-50/10"
                                  : item.status === "failed"
                                  ? "border-red-150 bg-red-50/10"
                                  : "border-gray-150 bg-white"
                              }`}
                            >
                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex items-center gap-2">
                                  <FileVideo className="w-4 h-4 text-gray-400 shrink-0" />
                                  <span className="text-xs font-semibold text-gray-900 truncate block">
                                    {item.name}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 text-[10px] text-gray-500 font-mono">
                                  <span className="font-bold">{formatBytes(item.originalSize)}</span>
                                  {item.file && (
                                    <>
                                      <span>•</span>
                                      <span>{item.file.width}x{item.file.height}px</span>
                                      <span>•</span>
                                      <span>{item.file.duration.toFixed(0)}s</span>
                                    </>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2.5 shrink-0">
                                {item.status === "uploading" && (
                                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md flex items-center gap-1 font-sans">
                                    <Loader2 className="w-3 h-3 animate-spin text-indigo-500" /> Uploading...
                                  </span>
                                )}
                                {item.status === "pending" && (
                                  <span className="text-[10px] font-bold text-gray-600 bg-gray-50 px-2 py-1 rounded-md border border-gray-200/60 flex items-center gap-1 font-sans">
                                    <Clock className="w-3 h-3 text-gray-450" /> Ausstehend
                                  </span>
                                )}
                                {item.status === "processing" && (
                                  <span className="text-[10px] font-bold text-teal-655 bg-teal-50 px-2 py-1 rounded-md flex items-center gap-1 font-mono animate-pulse">
                                    <Loader2 className="w-3 h-3 animate-spin text-teal-600 animate-pulse" /> Kodierung...
                                  </span>
                                )}
                                {item.status === "done" && item.compressResult && (
                                  <div className="text-right flex flex-col items-end">
                                    <span className="text-[10px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-md flex items-center gap-1 mb-1 border border-green-200/60">
                                      <CheckCircle2 className="w-3 h-3 text-green-600" /> -{item.compressResult.savingPercent}%
                                    </span>
                                    <a 
                                      href={item.compressResult.url}
                                      download={`comp-${item.name}`}
                                      className="text-[10px] text-blue-600 font-bold hover:underline flex items-center gap-0.5 font-sans"
                                    >
                                      <Download className="w-2.5 h-2.5" /> Herunterladen
                                    </a>
                                  </div>
                                )}
                                {item.status === "failed" && (
                                  <span className="text-[10px] font-bold text-red-655 bg-red-50/50 px-2 py-1 rounded-md border border-red-200/60 flex items-center gap-1 font-sans" title={item.error}>
                                    <AlertCircle className="w-3 h-3 text-red-500" /> Fehler
                                  </span>
                                )}

                                {!isProcessingQueue && (
                                  <button
                                    type="button"
                                    onClick={() => setCompressQueue(prev => prev.filter(q => q.id !== item.id))}
                                    className="p-1.5 hover:bg-gray-50 text-gray-400 hover:text-red-500 rounded-lg transition"
                                    title="Entfernen"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Right Compressor Column: Settings, Actions & Dashboard outputs */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* 1. COMPRESSION PRESETS SECTION */}
                <div className="bg-white rounded-2xl border border-gray-150 p-6 shadow-xs space-y-4">
                  <div className="flex items-center gap-2.5 pb-3 border-b border-gray-50">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-display font-semibold text-xs text-gray-800 uppercase tracking-wider">
                        Kompression Presets
                      </h4>
                      <p className="text-[11px] text-gray-400 font-sans">Einstellen mit nur einem Klick</p>
                    </div>
                  </div>

                  <div className="space-y-1.5 max-h-[185px] overflow-y-auto pr-1">
                    {/* Default Presets */}
                    {DEFAULT_PRESETS.map((preset) => (
                      <div
                        key={preset.id}
                        onClick={() => {
                          setCrfPreset(preset.crfPreset);
                          setResolutionPreset(preset.resolutionPreset);
                        }}
                        className={`p-2.5 rounded-xl border text-left cursor-pointer transition text-xs flex justify-between items-center ${
                          crfPreset === preset.crfPreset && resolutionPreset === preset.resolutionPreset
                            ? "border-teal-500 bg-teal-50/20 font-bold"
                            : "border-gray-100 bg-gray-50/60 hover:bg-gray-150/40 text-gray-600 text-xs font-medium"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-gray-800 truncate">{preset.name}</div>
                          <div className="text-[9px] text-gray-450 uppercase tracking-wider font-sans mt-0.5">System-Vorgabe</div>
                        </div>
                        <span className="text-[9px] font-mono font-bold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-sm shrink-0">
                          {preset.crfPreset === "low" ? "Low CRF" : preset.crfPreset === "high" ? "High CRF" : "Med CRF"}
                        </span>
                      </div>
                    ))}

                    {/* Custom User Presets */}
                    {customPresets.map((preset) => (
                      <div
                        key={preset.id}
                        onClick={() => {
                          setCrfPreset(preset.crfPreset);
                          setResolutionPreset(preset.resolutionPreset);
                        }}
                        className={`p-2.5 rounded-xl border text-left cursor-pointer transition text-xs flex justify-between items-center relative group ${
                          crfPreset === preset.crfPreset && resolutionPreset === preset.resolutionPreset
                            ? "border-teal-600 bg-teal-50/30 font-bold"
                            : "border-gray-100 bg-gray-50/60 hover:bg-gray-150/40 text-gray-600 text-xs font-medium"
                        }`}
                      >
                        <div className="min-w-0 flex-1 pr-6">
                          <div className="font-semibold text-teal-950 truncate">{preset.name}</div>
                          <div className="text-[9px] text-teal-600 font-medium font-sans mt-0.5">
                            CRF: {preset.crfPreset === "low" ? "20" : preset.crfPreset === "high" ? "32" : "26"} • Resol: {preset.resolutionPreset}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleDeletePreset(preset.id, e)}
                          className="p-1 hover:bg-red-55 text-gray-400 hover:text-red-500 rounded-lg transition shrink-0 absolute right-1.5 top-2.5"
                          title="Preset löschen"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Save custom preset form */}
                  <div className="pt-3.5 border-t border-gray-100 space-y-2 font-sans">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block font-sans">
                      Aktuelle Werte als Preset sichern
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Z.B. Social Media Export..."
                        value={newPresetName}
                        onChange={(e) => setNewPresetName(e.target.value)}
                        className="flex-1 bg-gray-50 hover:bg-gray-100 focus:bg-white text-xs px-3 py-2 rounded-xl border border-gray-150 outline-hidden focus:border-teal-500 transition-all font-sans"
                      />
                      <button
                        type="button"
                        onClick={handleSavePreset}
                        disabled={!newPresetName.trim()}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                          newPresetName.trim()
                            ? "bg-teal-600 hover:bg-teal-700 text-white shadow-xs cursor-pointer"
                            : "bg-gray-100 text-gray-400 cursor-not-allowed"
                        }`}
                      >
                        <Save className="w-3.5 h-3.5" /> Sichern
                      </button>
                    </div>
                  </div>
                </div>

                {/* 2. MANUAL COMPRESSOR CRITERIA MODIFICATION */}
                <div className="bg-white rounded-2xl border border-gray-150 p-6 shadow-xs space-y-6">
                  
                  <div className="flex items-center gap-2 border-b border-gray-50 pb-3">
                    <Sliders className="w-4 h-4 text-teal-600" />
                    <h4 className="font-display font-semibold text-xs text-gray-800 uppercase tracking-wider">
                      2. Parameter feinjustieren
                    </h4>
                  </div>

                  {/* Preset modifier */}
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block">
                      Qualitätsprofil (Constant Rate Factor / CRF)
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
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
                        type="button"
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
                        type="button"
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
                        type="button"
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
                        type="button"
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
                        type="button"
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
                        type="button"
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

                  {/* Processing triggers */}
                  {compressMode === "single" ? (
                    <button
                      type="button"
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
                  ) : (
                    <button
                      type="button"
                      disabled={compressQueue.filter(q => q.status === "pending" && q.file).length === 0 || isProcessingQueue}
                      onClick={handleProcessQueue}
                      className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm tracking-wide shadow-md flex items-center justify-center gap-2 transition active:scale-98 ${
                        compressQueue.filter(q => q.status === "pending" && q.file).length > 0 && !isProcessingQueue
                          ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/10 cursor-pointer"
                          : "bg-gray-100 text-gray-400 cursor-not-allowed"
                      }`}
                    >
                      <Play className="w-4 h-4 shrink-0" />
                      Warteschlange abarbeiten ({compressQueue.filter(q => q.status === "pending" && q.file).length} bereit)
                    </button>
                  )}
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

                {/* Queue active progress */}
                {isProcessingQueue && (
                  <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs space-y-4 text-center">
                    <div className="relative w-12 h-12 mx-auto flex items-center justify-center">
                      <div className="absolute inset-0 rounded-full border-4 border-gray-100 border-t-indigo-600 animate-spin" />
                      <Loader2 className="absolute w-5 h-5 text-indigo-500 animate-spin" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-display font-semibold text-sm text-gray-900">Serielle Warteschlangen-Abarbeitung...</h4>
                      <p className="text-[11px] text-gray-400 font-mono">Verstrichene Zeit: {processingTimeSec}s</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl text-left border border-gray-100">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 font-sans">
                        Sitzungs-Protokoll:
                      </p>
                      <div className="text-[11px] font-mono text-gray-600 leading-relaxed flex items-start gap-1">
                        <span className="text-indigo-600 font-bold animate-pulse">&gt;</span> 
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
                {compressMode === "single" && compressResult && (
                  <div className="bg-white rounded-2xl border border-teal-150 p-6 shadow-sm space-y-5">
                    
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

        {/* STIMM-EXTRAKTOR WORKSPACE */}
        {activeTab === "splitter" && (
          <>
            {/* INTRO BANNER */}
            <section className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-2xl text-white p-7 md:p-8 shadow-sm relative overflow-hidden">
              <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-15 pointer-events-none flex items-center justify-center">
                <Sparkles className="w-44 h-44 text-indigo-400" />
              </div>
              <div className="relative max-w-2xl space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-200 bg-indigo-800/45 px-3 py-1 rounded-sm">
                  Phasen-Auslöschung & Frequenzband-Separation
                </span>
                <h2 className="font-display font-semibold text-2xl tracking-tight md:text-3xl text-white mt-1">
                  Gesang & Musik vollautomatisch trennen
                </h2>
                <p className="text-sm text-indigo-200 leading-relaxed max-w-xl">
                  Lade ein beliebiges Lied (MP3) hoch. Unser Server isoliert mithilfe modernster FFmpeg-Frequenzmatrizen den Gesang (Acapella) von der Hintergrundmusik (Instrumental / Karaoke), damit du beide Tonspuren einzeln herunterladen kannst.
                </p>
              </div>
            </section>

            {/* ERROR DISPLAY */}
            {processError && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-800 text-xs flex items-center gap-2.5 animate-bounce">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                <div className="font-medium">{processError}</div>
              </div>
            )}

            {/* SPLITTER PIPELINE COLUMNS */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Left Column: Upload and Param Panel */}
              <div className="lg:col-span-8 space-y-8">
                
                {/* 1. Upload Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                    <span className="bg-gray-200 text-gray-700 w-5 h-5 rounded-full flex items-center justify-center text-[10px]">1</span>
                    Audiodatei bereitstellen
                  </div>
                  
                  <div className={`p-6 rounded-2xl border bg-white shadow-3xs transition-all ${
                    splitterAudioFile ? "border-indigo-100" : "border-gray-150"
                  }`}>
                    
                    {splitterAudioFile ? (
                      <div className="space-y-4">
                        <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100/60 flex items-start gap-3">
                          <CheckCircle2 className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold text-indigo-950 truncate">
                              {splitterAudioFile.originalName}
                            </div>
                            <div className="text-xs text-indigo-700 font-mono mt-1.5 space-y-0.5">
                              <div>Dauer: {splitterAudioFile.duration.toFixed(2)} Sekunden</div>
                              <div>Frequenz-Spektrum: Stereo (L/R) Matrix-Trennbar</div>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => splitterInputRef.current?.click()}
                          className="w-full py-2.5 bg-gray-50 hover:bg-gray-100 text-xs font-semibold text-gray-600 rounded-xl transition border border-gray-150"
                        >
                          Andere Musikdatei auswählen
                        </button>
                      </div>
                    ) : (
                      <div 
                        onClick={() => splitterInputRef.current?.click()}
                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const file = e.dataTransfer.files?.[0];
                          if (file && file.type.startsWith("audio/")) {
                            const event = { target: { files: e.dataTransfer.files } } as any;
                            handleSplitterAudioUpload(event);
                          }
                        }}
                        className="border-2 border-dashed border-gray-200 hover:border-indigo-500 rounded-xl p-9 text-center cursor-pointer transition bg-gray-50/40 hover:bg-indigo-50/10 group flex flex-col items-center justify-center min-h-[170px]"
                      >
                        <RefreshCw className={`w-9 h-9 text-gray-400 group-hover:text-indigo-500 transition mb-3 ${isSplitterUploading ? 'animate-spin' : ''}`} />
                        <span className="text-xs font-semibold text-gray-700">
                          {isSplitterUploading ? "Dateiparameter werden analysiert..." : "Song hochladen oder hierher ziehen..."}
                        </span>
                        <span className="text-[10px] text-gray-400 mt-1">
                          Unterstützt MP3, WAV, M4A, FLAC oder AIFF bis 100MB
                        </span>
                      </div>
                    )}
                    
                    <input
                      ref={splitterInputRef}
                      type="file"
                      accept="audio/*"
                      className="hidden"
                      onChange={handleSplitterAudioUpload}
                      disabled={isSplitterUploading || isSplitting}
                    />

                  </div>
                </div>

                {/* 1.5. Trimming Section */}
                {splitterAudioFile && (
                  <div className="space-y-3 animate-fade-in">
                    <div className="flex items-center justify-between text-xs font-bold text-gray-400 uppercase tracking-wider">
                      <span className="flex items-center gap-2">
                        <span className="bg-gray-200 text-gray-700 w-5 h-5 rounded-full flex items-center justify-center text-[10px]">1.5</span>
                        Ausschnitt trimmen (Optional)
                      </span>
                      <label className="flex items-center gap-2 cursor-pointer select-none normal-case text-gray-500 font-semibold hover:text-gray-900 transition-colors">
                        <input
                          type="checkbox"
                          checked={enableSplitterTrim}
                          onChange={(e) => setEnableSplitterTrim(e.target.checked)}
                          className="rounded text-indigo-600 focus:ring-indigo-500 border-gray-300 w-4 h-4 cursor-pointer"
                        />
                        Trimmen aktivieren
                      </label>
                    </div>

                    <div className={`p-6 rounded-2xl border bg-white shadow-3xs transition-all ${
                      enableSplitterTrim ? "border-indigo-150 ring-1 ring-indigo-50" : "border-gray-150 opacity-60"
                    }`}>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                          <div>
                            <span className="font-semibold text-gray-500 block">Startzeit:</span>
                            <span className="font-mono text-gray-900 text-sm font-bold">{splitterTrim.startTime} Sek.</span>
                          </div>
                          <div>
                            <span className="font-semibold text-gray-500 block">Endzeit:</span>
                            <span className="font-mono text-gray-900 text-sm font-bold">{splitterTrim.endTime} Sek.</span>
                          </div>
                          <div className="col-span-2 md:col-span-1 flex flex-col justify-between md:items-end">
                            <span className="font-semibold text-gray-500 block">Gewählte Dauer:</span>
                            <span className="font-mono text-indigo-600 text-sm font-bold">
                              {enableSplitterTrim 
                                ? `${(splitterTrim.endTime - splitterTrim.startTime).toFixed(0)} Sek.` 
                                : `${(splitterAudioFile.duration || 0).toFixed(0)} Sek. (Vollständig)`
                              }
                            </span>
                          </div>
                        </div>

                        <div className="space-y-4 pt-2">
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px] text-gray-400">
                              <span>Startpunkt</span>
                              <span>{splitterTrim.startTime}s</span>
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={Math.max(0, Math.floor(splitterAudioFile.duration || 60) - 1)}
                              value={splitterTrim.startTime}
                              disabled={!enableSplitterTrim}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                setSplitterTrim(prev => {
                                  let nextEnd = prev.endTime;
                                  if (val >= nextEnd) {
                                    nextEnd = val + 1;
                                  }
                                  return { startTime: val, endTime: nextEnd };
                                });
                              }}
                              className="w-full accent-indigo-600 cursor-pointer disabled:opacity-50"
                            />
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px] text-gray-400">
                              <span>Endpunkt</span>
                              <span>{splitterTrim.endTime}s</span>
                            </div>
                            <input
                              type="range"
                              min={1}
                              max={Math.floor(splitterAudioFile.duration || 60)}
                              value={splitterTrim.endTime}
                              disabled={!enableSplitterTrim}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                setSplitterTrim(prev => {
                                  let nextStart = prev.startTime;
                                  if (val <= nextStart) {
                                    nextStart = Math.max(0, val - 1);
                                  }
                                  return { startTime: nextStart, endTime: val };
                                });
                              }}
                              className="w-full accent-indigo-600 cursor-pointer disabled:opacity-50"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Separation Process Indicator */}
                {isSplitting && (
                  <div className="bg-indigo-950 p-6 rounded-2xl text-white shadow-md relative overflow-hidden flex flex-col items-center justify-center gap-4 py-8 animate-fade-in">
                    <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
                    <div className="text-center space-y-1">
                      <h4 className="font-semibold text-sm">Audiospektrum-Trennung läuft...</h4>
                      <p className="text-xs text-indigo-200 font-mono">{processStatus}</p>
                    </div>
                  </div>
                )}

                {/* 2. Audio results block if separates successfully */}
                {splitterResult && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                      <span className="bg-gray-200 text-gray-700 w-5 h-5 rounded-full flex items-center justify-center text-[10px]">2</span>
                      Extrahierte Audiokanäle
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* INSTRUMENTAL (BEGLEITMUSIK) */}
                      <div className="bg-white rounded-2xl border border-gray-150 p-5 shadow-xs flex flex-col justify-between gap-5 transition hover:shadow-xs">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-md border border-emerald-150/45">
                              Instrumental
                            </span>
                            <span className="text-[10px] font-mono text-gray-400">Preserved Bass (180Hz)</span>
                          </div>
                          <h4 className="font-display font-semibold text-sm text-gray-900 truncate">
                            Begleitmusik • Karaoke Version
                          </h4>
                          <p className="text-xs text-gray-450 leading-relaxed">
                            Mittelkanal-Dämpfung und Mono-Phase cancellation. Perfekt geeignet als Karaoke- oder Backingtrack.
                          </p>
                        </div>
                        
                        <div className="space-y-3 pt-3 border-t border-gray-50">
                          {/* HTML5 audio player */}
                          <audio
                            src={splitterResult.instrumentalUrl}
                            controls
                            className="w-full h-10 rounded-sm"
                          />
                          
                          <a
                            href={splitterResult.instrumentalUrl}
                            download={`instrumental-${Date.now()}.mp3`}
                            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                          >
                            <Download className="w-4 h-4" /> Instrumental herunterladen
                          </a>
                        </div>
                      </div>

                      {/* VOCALS (GESANG) */}
                      <div className="bg-white rounded-2xl border border-gray-150 p-5 shadow-xs flex flex-col justify-between gap-5 transition hover:shadow-xs">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-violet-50 text-violet-700 px-2.5 py-0.5 rounded-md border border-violet-150/45">
                              Vocals Isolate
                            </span>
                            <span className="text-[10px] font-mono text-gray-400">Bandpass: 220Hz - 3.4kHz</span>
                          </div>
                          <h4 className="font-display font-semibold text-sm text-gray-900 truncate">
                            Acapella • Reine Stimme
                          </h4>
                          <p className="text-xs text-gray-450 leading-relaxed">
                            Filtert Frequenzen außerhalb des Stimmbereichs heraus und isoliert den zentrierten Monogesang.
                          </p>
                        </div>

                        <div className="space-y-3 pt-3 border-t border-gray-50">
                          {/* HTML5 audio player */}
                          <audio
                            src={splitterResult.vocalUrl}
                            controls
                            className="w-full h-10 rounded-sm"
                          />

                          <a
                            href={splitterResult.vocalUrl}
                            download={`vocals-${Date.now()}.mp3`}
                            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                          >
                            <Download className="w-4 h-4" /> Gesang herunterladen
                          </a>
                        </div>
                      </div>

                    </div>
                  </div>
                )}

              </div>

              {/* Right Column: Execution Information & Triggers */}
              <div className="lg:col-span-4 space-y-6">
                
                {/* Information Card */}
                <div className="bg-white rounded-2xl border border-gray-150 p-6 shadow-xs space-y-5">
                  <div className="flex items-center gap-2.5 pb-4 border-b border-gray-50">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                      <Sliders className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-display font-semibold text-sm text-gray-900">Technische Parameter</h3>
                      <p className="text-[11px] text-gray-400">Echtzeit Frequenztrennung</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1">
                      <div className="text-xs font-semibold text-gray-800">1. Stimmunterdrückung (Instrumental)</div>
                      <p className="text-xs text-gray-500 leading-normal">
                        Entfernt das Mono-Zentrum per Subtraktion der Stereokanäle und leitet Frequenzen unter 180Hz direkt weiter, um Bässe und Trommeln kraftvoll zu erhalten.
                      </p>
                    </div>

                    <div className="space-y-1">
                      <div className="text-xs font-semibold text-gray-800">2. Stimmbandpass (Reiner Gesang)</div>
                      <p className="text-xs text-gray-500 leading-normal">
                        Führt beide Stereokanäle zu einem Monokanal zusammen und wendet einen Butterworth-Bandpassfilter (220 Hz bis 3400 Hz) an, um restliches Rauschen zu entfernen.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleTriggerSeparation}
                    disabled={!splitterAudioFile || isSplitting}
                    className={`w-full py-3.5 rounded-xl text-xs font-bold tracking-wide transition flex items-center justify-center gap-2 shadow-sm shrink-0 ${
                      !splitterAudioFile || isSplitting
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer active:scale-[0.99]"
                    }`}
                  >
                    {isSplitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Trennung wird ausgeführt...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4" /> Gesang & Begleitstimm trennen
                      </>
                    )}
                  </button>

                </div>

              </div>

            </div>
          </>
        )}

        {/* VIDEO-VERKETTUNG WORKSPACE */}
        {activeTab === "concat" && (
          <>
            {/* INTRO BANNER */}
            <section className="bg-gradient-to-r from-slate-900 to-emerald-950 rounded-2xl text-white p-7 md:p-8 shadow-sm relative overflow-hidden">
              <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-15 pointer-events-none flex items-center justify-center">
                <Sparkles className="w-44 h-44 text-emerald-400" />
              </div>
              <div className="relative max-w-2xl space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-200 bg-emerald-800/45 px-3 py-1 rounded-sm">
                  Präzisions-Zusammenfügung & Normalisierung
                </span>
                <h2 className="font-display font-semibold text-2xl tracking-tight md:text-3xl text-white mt-1">
                  Videos nahtlos verketten
                </h2>
                <p className="text-sm text-emerald-200 leading-relaxed max-w-xl">
                  Lade mehrere Video-Clips hoch, ordne sie in deiner gewünschten Reihenfolge an und verkettere sie zu einem einzigen, perfekt normalisierten Zielvideo. Abweichende Formate werden automatisch ausgeglichen.
                </p>
              </div>
            </section>

            {/* ERROR DISPLAY */}
            {processError && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-800 text-xs flex items-center gap-2.5 animate-bounce">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                <div className="font-medium">{processError}</div>
              </div>
            )}

            {/* CONCAT PIPELINE COLUMNS */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Left Column: Upload and Playlist Panel */}
              <div className="lg:col-span-8 space-y-8">
                
                {/* 1. Upload Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                    <span className="bg-gray-200 text-gray-700 w-5 h-5 rounded-full flex items-center justify-center text-[10px]">1</span>
                    Video-Clips hinzufügen
                  </div>
                  
                  <div className="p-6 rounded-2xl border border-gray-150 bg-white shadow-3xs">
                    <div 
                      onClick={() => concatInputRef.current?.click()}
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const files = e.dataTransfer.files;
                        if (files && files.length > 0) {
                          const event = { target: { files } } as any;
                          handleConcatVideoUpload(event);
                        }
                      }}
                      className="border-2 border-dashed border-gray-200 hover:border-emerald-500 rounded-xl p-9 text-center cursor-pointer transition bg-gray-50/40 hover:bg-emerald-50/10 group flex flex-col items-center justify-center min-h-[150px]"
                    >
                      <RefreshCw className={`w-9 h-9 text-gray-400 group-hover:text-emerald-500 transition mb-3 ${isConcatUploading ? 'animate-spin' : ''}`} />
                      <span className="text-xs font-semibold text-gray-700">
                        {isConcatUploading ? "Clips werden analysiert und hochgeladen..." : "Video-Clips hochladen oder hierher ziehen..."}
                      </span>
                      <span className="text-[10px] text-gray-400 mt-1">
                        Unterstützt MP4, MOV, WEBM, AVI bis zu 2GB (Mehrfachauswahl möglich)
                      </span>
                    </div>
                    
                    <input
                      ref={concatInputRef}
                      type="file"
                      accept="video/*"
                      multiple
                      className="hidden"
                      onChange={handleConcatVideoUpload}
                      disabled={isConcatUploading || isConcating}
                    />
                  </div>
                </div>

                {/* 2. Playlist Queue Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-gray-400 uppercase tracking-wider">
                    <span className="flex items-center gap-2">
                      <span className="bg-gray-200 text-gray-700 w-5 h-5 rounded-full flex items-center justify-center text-[10px]">2</span>
                      Reihenfolge der Clips ({concatVideos.length})
                    </span>
                    {concatVideos.length > 0 && (
                      <button 
                        onClick={() => setConcatVideos([])}
                        className="text-red-500 hover:text-red-700 font-semibold transition-colors normal-case cursor-pointer"
                      >
                        Alle entfernen
                      </button>
                    )}
                  </div>

                  {concatVideos.length === 0 ? (
                    <div className="border border-gray-150 rounded-2xl bg-white p-12 text-center text-sm text-gray-400">
                      Keine Videos hinzugefügt. Lade oben Clips hoch, um deine Verkettung zu planen.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {concatVideos.map((video, idx) => (
                        <div 
                          key={idx} 
                          className="bg-white rounded-xl border border-gray-150 p-4 shadow-3xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition hover:border-gray-200"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="bg-emerald-50 text-emerald-600 font-mono text-xs w-6 h-6 rounded-full flex items-center justify-center font-bold shrink-0">
                              {idx + 1}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-gray-900 truncate">
                                {video.originalName}
                              </div>
                              <div className="text-xs text-gray-400 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                                <span className="font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-[10px]">
                                  {video.width}x{video.height}
                                </span>
                                <span>•</span>
                                <span>Dauer: <strong className="text-gray-700">{video.duration.toFixed(1)}s</strong></span>
                                <span>•</span>
                                <span>Tonspur: {video.hasAudio ? <span className="text-emerald-600 font-medium">Ja</span> : <span className="text-gray-400">Nein (Stummschaltung)</span>}</span>
                              </div>
                            </div>
                          </div>

                          {/* Order Controls & Actions */}
                          <div className="flex items-center gap-1 shrink-0 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-2 sm:pt-0">
                            <button
                              onClick={() => moveClipUp(idx)}
                              disabled={idx === 0}
                              className="p-1.5 hover:bg-gray-50 rounded-lg text-gray-500 hover:text-gray-900 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
                              title="Nach oben verschieben"
                            >
                              <ArrowUp className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => moveClipDown(idx)}
                              disabled={idx === concatVideos.length - 1}
                              className="p-1.5 hover:bg-gray-50 rounded-lg text-gray-500 hover:text-gray-900 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
                              title="Nach unten verschieben"
                            >
                              <ArrowDown className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => removeClip(idx)}
                              className="p-1.5 hover:bg-red-50 rounded-lg text-red-500 hover:text-red-700 transition-colors ml-1 cursor-pointer"
                              title="Clip entfernen"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Processing Loader */}
                {isConcating && (
                  <div className="bg-emerald-950 p-6 rounded-2xl text-white shadow-md relative overflow-hidden flex flex-col items-center justify-center gap-4 py-8 animate-fade-in">
                    <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
                    <div className="text-center space-y-1">
                      <h4 className="font-semibold text-sm">Videos werden zusammengefügt...</h4>
                      <p className="text-xs text-emerald-200 font-mono">{processStatus}</p>
                    </div>
                  </div>
                )}

                {/* 3. Concat Results display */}
                {concatResultUrl && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                      <span className="bg-gray-200 text-gray-700 w-5 h-5 rounded-full flex items-center justify-center text-[10px]">3</span>
                      Erstelltes Zielvideo
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-150 p-6 shadow-xs space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                        
                        {/* Left Column: Player */}
                        <div className="space-y-3">
                          <div className="aspect-video bg-black rounded-xl overflow-hidden shadow-inner border border-gray-100 flex items-center justify-center">
                            <video
                              src={concatResultUrl}
                              controls
                              className="w-full h-full object-contain"
                            />
                          </div>
                        </div>

                        {/* Right Column: Metadata details & download */}
                        <div className="space-y-4 flex flex-col justify-between h-full">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-md border border-emerald-150/45">
                                Zielvideo Bereit
                              </span>
                              <span className="text-[10px] font-mono text-gray-400">Format: MP4 Container</span>
                            </div>
                            <h4 className="font-display font-semibold text-base text-gray-900 leading-tight">
                              Verkettetes & Normalisiertes Resultat
                            </h4>
                            
                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-2 text-xs text-gray-600 font-mono">
                              <div className="flex justify-between">
                                <span>Gesamtdauer:</span>
                                <span className="text-gray-900 font-bold">
                                  {concatResultMeta?.duration?.toFixed(2) || "N/A"} Sekunden
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Auflösung:</span>
                                <span className="text-gray-900 font-bold">
                                  {concatResultMeta?.width || 1280}x{concatResultMeta?.height || 720}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Bildrate:</span>
                                <span className="text-gray-900 font-bold">30 FPS</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Audio-Kanal:</span>
                                <span className="text-gray-900 font-bold">Stereo 44.1kHz AAC</span>
                              </div>
                            </div>
                          </div>

                          <a
                            href={concatResultUrl}
                            download={`merged-video-${Date.now()}.mp4`}
                            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-[0.99] mt-4"
                          >
                            <Download className="w-4 h-4" /> Zielvideo herunterladen
                          </a>
                        </div>

                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Right Column: Technical guidelines for merging */}
              <div className="lg:col-span-4 space-y-6">
                <div className="bg-white rounded-2xl border border-gray-150 p-6 shadow-xs space-y-5">
                  <div className="flex items-center gap-2.5 pb-4 border-b border-gray-50">
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                      <Sliders className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-display font-semibold text-sm text-gray-900">Technische Normalisierung</h3>
                      <p className="text-[11px] text-gray-400">Automatische Qualitätssicherung</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1">
                      <div className="text-xs font-semibold text-gray-800">1. Seitenverhältnis-Gleichschaltung</div>
                      <p className="text-xs text-gray-500 leading-normal">
                        Abweichende Auflösungen oder Ausrichtungen werden dank intelligentem Letterboxing/Pillboxing vollautomatisch an ein standardisiertes 1280x720 HD-Format angepasst, ohne das Originalbild zu verzerren oder zu quetschen.
                      </p>
                    </div>

                    <div className="space-y-1">
                      <div className="text-xs font-semibold text-gray-800">2. Frame-Präzision & Bildwiederholrate</div>
                      <p className="text-xs text-gray-500 leading-normal">
                        Alle Clips werden auf exakt 30 Bilder pro Sekunde (30 FPS) neu berechnet, um Ruckeln, asynchronen Ton oder Abspielfehler an den Übergängen zu verhindern.
                      </p>
                    </div>

                    <div className="space-y-1">
                      <div className="text-xs font-semibold text-gray-800">3. Nahtloser Sound & Stumm-Ausgleich</div>
                      <p className="text-xs text-gray-500 leading-normal">
                        Sollte ein Clip keinen Ton besitzen, wird automatisch ein lautloser Audiopuffer der gleichen Dauer generiert. So bleibt die Tonspur des Gesamtwerks intakt und läuft nicht asynchron.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleTriggerConcatenation}
                    disabled={concatVideos.length < 2 || isConcating}
                    className={`w-full py-3.5 rounded-xl text-xs font-bold tracking-wide transition flex items-center justify-center gap-2 shadow-sm shrink-0 ${
                      concatVideos.length < 2 || isConcating
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-[0.99]"
                    }`}
                  >
                    {isConcating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Zusammenfügung läuft...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4" /> Videos verketten
                      </>
                    )}
                  </button>
                </div>
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
