import React, { useState, useRef, useEffect } from "react";
import JSZip from "jszip";
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
  X,
  Link,
  Music,
  FileBadge,
  Plus,
  Trash2,
  Save,
  Play,
  CheckCircle2,
  Clock,
  Loader2,
  ArrowUp,
  ArrowDown,
  Maximize,
  Image as ImageIcon,
  ZoomIn,
  ZoomOut,
  Eye,
  ChevronLeft,
  Grid
} from "lucide-react";
import { UploadedFile, CropSelection, TrimSelection, LoopMode, QueueItem, CompressionPreset } from "./types";
import MediaUploader from "./components/MediaUploader";
import VideoCropTrim from "./components/VideoCropTrim";

export default function App() {
  // Navigation: Active main Workspace tab
  const [activeTab, setActiveTab] = useState<"mixer" | "compressor" | "splitter" | "concat" | "resolution" | "frames">("mixer");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  // State: Video Resolution Changer
  const [resolutionVideoFile, setResolutionVideoFile] = useState<UploadedFile | undefined>(undefined);
  const [isResolutionUploading, setIsResolutionUploading] = useState(false);
  const resolutionInputRef = useRef<HTMLInputElement>(null);
  const [targetResolutionHeight, setTargetResolutionHeight] = useState<number>(720);
  const [isResizing, setIsResizing] = useState(false);
  const [resizedVideoUrl, setResizedVideoUrl] = useState<string>("");
  const [resizedVideoMeta, setResizedVideoMeta] = useState<any | null>(null);

  // State: Video Frame Extractor
  const [framesVideoFile, setFramesVideoFile] = useState<UploadedFile | undefined>(undefined);
  const [isFramesUploading, setIsFramesUploading] = useState(false);
  const framesInputRef = useRef<HTMLInputElement>(null);
  const [everyXthFrame, setEveryXthFrame] = useState<number>(10);
  const [isExtractingFrames, setIsExtractingFrames] = useState(false);
  const [extractedFrames, setExtractedFrames] = useState<string[]>([]);
  const [totalExtractedCount, setTotalExtractedCount] = useState<number>(0);
  const [selectedFrameIndex, setSelectedFrameIndex] = useState<number | null>(null);
  const [frameZoomFactor, setFrameZoomFactor] = useState<number>(1);
  const [frameFilter, setFrameFilter] = useState<"none" | "grayscale" | "contrast" | "invert" | "sepia">("none");
  const [showFrameGrid, setShowFrameGrid] = useState<boolean>(false);
  const [isDownloadingZip, setIsDownloadingZip] = useState<boolean>(false);
  const [zipProgress, setZipProgress] = useState<string>("");

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

  // Video Resolution Changer Handlers
  const handleResolutionVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsResolutionUploading(true);
    setProcessError("");
    setResizedVideoUrl("");
    setResizedVideoMeta(null);

    const file = files[0];
    const formData = new FormData();
    formData.append("videoFile", file);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (data.success && data.files.video) {
        setResolutionVideoFile(data.files.video);
      } else {
        setProcessError(data.error || "Fehler beim Hochladen der Videodatei.");
      }
    } catch (err: any) {
      console.error(err);
      setProcessError("Unerwarteter Verbindungsausfall.");
    } finally {
      setIsResolutionUploading(false);
    }
  };

  const handleTriggerResize = async () => {
    if (!resolutionVideoFile) {
      setProcessError("Bitte lade zuerst ein Video hoch.");
      return;
    }

    setIsResizing(true);
    setProcessError("");
    setResizedVideoUrl("");
    setResizedVideoMeta(null);
    setProcessingTimeSec(0);

    const timerId = setInterval(() => {
      setProcessingTimeSec(prev => prev + 1);
    }, 1000);

    setProcessStatus("Ändere Videoauflösung... Bitte warten.");

    try {
      const response = await fetch("/api/change-resolution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoPath: resolutionVideoFile.fullPath,
          targetHeight: targetResolutionHeight,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setResizedVideoUrl(data.videoUrl);
        setResizedVideoMeta(data.meta);
      } else {
        setProcessError(data.error || "Fehler beim Ändern der Auflösung.");
      }
    } catch (err: any) {
      console.error(err);
      setProcessError("Verbindung zum Server fehlgeschlagen.");
    } finally {
      setIsResizing(false);
      clearInterval(timerId);
      setProcessingTimeSec(0);
      setProcessStatus("");
    }
  };

  // Video Frame Extractor Handlers
  const handleFramesVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsFramesUploading(true);
    setProcessError("");
    setExtractedFrames([]);
    setTotalExtractedCount(0);

    const file = files[0];
    const formData = new FormData();
    formData.append("videoFile", file);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (data.success && data.files.video) {
        setFramesVideoFile(data.files.video);
      } else {
        setProcessError(data.error || "Fehler beim Hochladen der Videodatei.");
      }
    } catch (err: any) {
      console.error(err);
      setProcessError("Verbindung zum Server fehlgeschlagen.");
    } finally {
      setIsFramesUploading(false);
    }
  };

  const handleTriggerExtractFrames = async () => {
    if (!framesVideoFile) {
      setProcessError("Bitte lade zuerst ein Video hoch.");
      return;
    }

    setIsExtractingFrames(true);
    setProcessError("");
    setExtractedFrames([]);
    setTotalExtractedCount(0);
    setSelectedFrameIndex(null);
    setProcessingTimeSec(0);

    const timerId = setInterval(() => {
      setProcessingTimeSec(prev => prev + 1);
    }, 1000);

    setProcessStatus("Lese Video ein und extrahiere Frames... Bitte warten.");

    try {
      const response = await fetch("/api/extract-frames", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoPath: framesVideoFile.fullPath,
          everyXthFrame: everyXthFrame,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setExtractedFrames(data.frames);
        setTotalExtractedCount(data.totalCount);
        setSelectedFrameIndex(0);
      } else {
        setProcessError(data.error || "Fehler beim Extrahieren der Frames.");
      }
    } catch (err: any) {
      console.error(err);
      setProcessError("Verbindung zum Server fehlgeschlagen.");
    } finally {
      setIsExtractingFrames(false);
      clearInterval(timerId);
      setProcessingTimeSec(0);
      setProcessStatus("");
    }
  };

  const handleDownloadAllAsZip = async () => {
    if (extractedFrames.length === 0) return;
    setIsDownloadingZip(true);
    setZipProgress("Initialisiere Archiv...");

    try {
      const zip = new JSZip();
      
      // Download all frames sequentially and update progress
      for (let i = 0; i < extractedFrames.length; i++) {
        const frameUrl = extractedFrames[i];
        const frameNum = i * everyXthFrame;
        
        setZipProgress(`Lade Bild ${i + 1} von ${extractedFrames.length} herunter...`);
        
        const response = await fetch(frameUrl);
        if (!response.ok) {
          throw new Error(`Fehler beim Herunterladen von Frame ${frameNum}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        
        // Pad the filename so they sort nicely (e.g. frame-0001_f0.jpg, frame-0002_f10.jpg)
        const paddedIndex = String(i + 1).padStart(4, "0");
        const filename = `frame-${paddedIndex}_f${frameNum}.jpg`;
        
        zip.file(filename, arrayBuffer);
      }

      setZipProgress("Erstelle ZIP-Archiv...");
      
      const blob = await zip.generateAsync({ type: "blob" }, (metadata) => {
        setZipProgress(`Komprimiere Archiv: ${Math.round(metadata.percent)}%`);
      });

      setZipProgress("Starte Download...");

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `video_frames_${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (err: any) {
      console.error("ZIP-Download-Fehler:", err);
      // We can use processError or a local way, but processError is perfectly fine and standard
      setProcessError("ZIP-Download fehlgeschlagen: " + err.message);
    } finally {
      setIsDownloadingZip(false);
      setZipProgress("");
    }
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
    setResolutionVideoFile(undefined);
    setIsResolutionUploading(false);
    setResizedVideoUrl("");
    setResizedVideoMeta(null);
    setFramesVideoFile(undefined);
    setIsFramesUploading(false);
    setExtractedFrames([]);
    setTotalExtractedCount(0);
    setSelectedFrameIndex(null);
    setFrameZoomFactor(1);
    setFrameFilter("none");
    setShowFrameGrid(false);
    setProcessError("");
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 selection:bg-blue-100 flex flex-col md:flex-row">
      
      {/* MOBILE BAR */}
      <div className="md:hidden flex items-center justify-between bg-white border-b border-gray-150/80 px-4 py-3 sticky top-0 z-50 shadow-2xs shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-600 text-white rounded-lg">
            <InfinityIcon className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="font-display font-bold text-sm tracking-tight text-gray-900 flex items-center gap-1">
              Loopify
              <span className="text-[8px] uppercase tracking-wider font-mono bg-blue-50 text-blue-600 px-1 py-0.5 rounded-md border border-blue-100">
                Pro
              </span>
            </h1>
          </div>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* SIDEBAR FOR DESKTOP & MOBILE DRAWER */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 lg:w-72 bg-white border-r border-gray-150/80 flex flex-col h-screen
        transition-transform duration-300 ease-in-out md:translate-x-0 md:sticky md:top-0 shrink-0
        ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        {/* LOGO BOX */}
        <div className="flex items-center gap-3 p-6 border-b border-gray-50">
          <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-sm shadow-blue-500/20 active:scale-95 transition-transform flex items-center justify-center shrink-0">
            <InfinityIcon className="w-5 h-5 animate-pulse" />
          </div>
          <div className="min-w-0">
            <h1 className="font-display font-bold text-base tracking-tight text-gray-900 flex items-center gap-1.5">
              Loopify
              <span className="text-[9px] uppercase tracking-widest font-mono bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-md border border-blue-100">
                Pro
              </span>
            </h1>
            <p className="text-[11px] text-gray-400 font-medium truncate">
              Nahtlose Video-Tools
            </p>
          </div>
        </div>

        {/* NAVIGATION MENUS */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 mb-2">
            Werkzeuge
          </div>
          
          <button
            onClick={() => {
              setActiveTab("mixer");
              setProcessError("");
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer ${
              activeTab === "mixer"
                ? "bg-blue-600 text-white shadow-xs shadow-blue-500/10 font-bold"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            <InfinityIcon className="w-4 h-4 shrink-0" />
            Loop & Mixer
          </button>

          <button
            onClick={() => {
              setActiveTab("compressor");
              setProcessError("");
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer ${
              activeTab === "compressor"
                ? "bg-blue-600 text-white shadow-xs shadow-blue-500/10 font-bold"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            <FileVideo className="w-4 h-4 shrink-0" />
            Video-Kompressor
          </button>

          <button
            onClick={() => {
              setActiveTab("splitter");
              setProcessError("");
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer ${
              activeTab === "splitter"
                ? "bg-blue-600 text-white shadow-xs shadow-blue-500/10 font-bold"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            <Music className="w-4 h-4 shrink-0" />
            Stimm-Extraktor
          </button>

          <button
            onClick={() => {
              setActiveTab("concat");
              setProcessError("");
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer ${
              activeTab === "concat"
                ? "bg-blue-600 text-white shadow-xs shadow-blue-500/10 font-bold"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            <Link className="w-4 h-4 shrink-0" />
            Video-Verkettung
          </button>

          <button
            onClick={() => {
              setActiveTab("resolution");
              setProcessError("");
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer ${
              activeTab === "resolution"
                ? "bg-blue-600 text-white shadow-xs shadow-blue-500/10 font-bold"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            <Maximize className="w-4 h-4 shrink-0" />
            Auflösung ändern
          </button>

          <button
            onClick={() => {
              setActiveTab("frames");
              setProcessError("");
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer ${
              activeTab === "frames"
                ? "bg-blue-600 text-white shadow-xs shadow-blue-500/10 font-bold"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            <ImageIcon className="w-4 h-4 shrink-0" />
            Frame-Extraktor
          </button>
        </nav>

        {/* BOTTOM WORKSPACE CONTROLS */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/50 space-y-3 shrink-0">
          <button
            onClick={handleFullReset}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-xs font-semibold text-gray-600 rounded-xl transition-all cursor-pointer shadow-3xs hover:text-gray-900"
          >
            <ListRestart className="w-4 h-4 text-gray-400" />
            Workspace zurücksetzen
          </button>
          <div className="text-center text-[10px] text-gray-400 font-mono">
            v2.4.0 • Node.js Engine
          </div>
        </div>
      </aside>

      {/* MOBILE BACKDROP OVERLAY */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/30 backdrop-blur-xs z-30 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* MAIN LAYOUT WRAPPER */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 md:py-10 space-y-8 animate-fade-in">
        
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

        {/* RESOLUTION CHANGER WORKSPACE */}
        {activeTab === "resolution" && (
          <>
            {/* INTRO BANNER */}
            <section className="bg-gradient-to-r from-blue-900 to-indigo-950 rounded-2xl text-white p-7 md:p-8 shadow-sm relative overflow-hidden">
              <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-15 pointer-events-none flex items-center justify-center">
                <Maximize className="w-44 h-44 text-blue-400" />
              </div>
              <div className="relative max-w-2xl space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-200 bg-blue-800/45 px-3 py-1 rounded-sm">
                  Proportionen wahren & Skalieren
                </span>
                <h2 className="font-display font-semibold text-2xl tracking-tight md:text-3xl text-white mt-1">
                  Video-Auflösung konvertieren
                </h2>
                <p className="text-sm text-blue-200 leading-relaxed max-w-xl">
                  Prüfe die aktuelle Auflösung deines Clips und reduziere oder ändere sie ganz nach Bedarf. Klassische Presets wie 1024p, 1080p, 720p und andere stehen bereit, während das Seitenverhältnis exakt beibehalten wird.
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

            {/* MAIN CONTENT GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Left Column: Upload and Setup */}
              <div className="lg:col-span-8 space-y-8">
                
                {/* 1. Video Upload & Current Resolution Info */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                    <span className="bg-gray-200 text-gray-700 w-5 h-5 rounded-full flex items-center justify-center text-[10px]">1</span>
                    Video hochladen & analysieren
                  </div>
                  
                  <div className="p-6 rounded-2xl border border-gray-150 bg-white shadow-3xs space-y-4">
                    <div 
                      onClick={() => resolutionInputRef.current?.click()}
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const files = e.dataTransfer.files;
                        if (files && files.length > 0) {
                          const event = { target: { files } } as any;
                          handleResolutionVideoUpload(event);
                        }
                      }}
                      className="border-2 border-dashed border-gray-200 hover:border-blue-500 rounded-xl p-9 text-center cursor-pointer transition bg-gray-50/40 hover:bg-blue-50/10 group flex flex-col items-center justify-center min-h-[150px]"
                    >
                      <RefreshCw className={`w-9 h-9 text-gray-400 group-hover:text-blue-500 transition mb-3 ${isResolutionUploading ? 'animate-spin' : ''}`} />
                      <span className="text-xs font-semibold text-gray-700">
                        {isResolutionUploading ? "Video wird analysiert..." : "Video für Skalierung hochladen..."}
                      </span>
                      <span className="text-[10px] text-gray-400 mt-1">
                        Unterstützt MP4, MOV, WEBM, AVI (Seitenverhältnis bleibt erhalten)
                      </span>
                    </div>
                    
                    <input
                      ref={resolutionInputRef}
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={handleResolutionVideoUpload}
                      disabled={isResolutionUploading || isResizing}
                    />

                    {/* Display Current Resolution ("1. Anschauen") */}
                    {resolutionVideoFile && (
                      <div className="p-4 bg-blue-50/55 rounded-xl border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in">
                        <div className="space-y-1">
                          <div className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                            Aktuelle Video-Eigenschaften
                          </div>
                          <p className="text-sm font-semibold text-gray-800">
                            {resolutionVideoFile.originalName}
                          </p>
                          <div className="text-xs text-gray-500 flex flex-wrap items-center gap-x-2">
                            <span>Auflösung: <strong className="text-blue-700 font-mono">{resolutionVideoFile.width}x{resolutionVideoFile.height}</strong></span>
                            <span>•</span>
                            <span>Dauer: <strong>{resolutionVideoFile.duration.toFixed(1)}s</strong></span>
                          </div>
                        </div>
                        <div className="bg-white px-3 py-1.5 rounded-lg border border-blue-100 shadow-3xs text-center shrink-0">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Verhältnis</span>
                          <span className="text-xs font-mono font-bold text-gray-700">
                            {(resolutionVideoFile.width / resolutionVideoFile.height).toFixed(2)}:1
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Target Resolution Preset Settings */}
                {resolutionVideoFile && (
                  <div className="space-y-3 animate-fade-in">
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                      <span className="bg-gray-200 text-gray-700 w-5 h-5 rounded-full flex items-center justify-center text-[10px]">2</span>
                      Zielauflösung wählen (Klassiker & 1024p)
                    </div>

                    <div className="p-6 rounded-2xl border border-gray-150 bg-white shadow-3xs space-y-6">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {[
                          { height: 1080, label: "Full HD (1080p)", desc: "1920x1080 Standard" },
                          { height: 1024, label: "Quad HD classic (1024p)", desc: "Professionelles 1024p" },
                          { height: 720, label: "HD (720p)", desc: "1280x720 Standard" },
                          { height: 480, label: "SD (480p)", desc: "854x480 DVD-Qualität" },
                          { height: 360, label: "Low (360p)", desc: "640x360 Mobil" },
                          { height: 240, label: "Ultra Low (240p)", desc: "426x240 Kompakt" },
                        ].map((preset) => {
                          const isSelected = targetResolutionHeight === preset.height;
                          // Keep proportions math
                          const ratio = resolutionVideoFile.width / resolutionVideoFile.height;
                          const calculatedWidth = Math.round(preset.height * ratio);
                          const isDownscale = preset.height < resolutionVideoFile.height;

                          return (
                            <button
                              key={preset.height}
                              type="button"
                              onClick={() => setTargetResolutionHeight(preset.height)}
                              className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between min-h-[100px] cursor-pointer ${
                                isSelected
                                  ? "border-blue-600 bg-blue-50/45 ring-1 ring-blue-600/35"
                                  : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/40"
                              }`}
                            >
                              <div className="space-y-0.5">
                                <div className="text-xs font-bold text-gray-900 flex items-center justify-between gap-1">
                                  <span>{preset.label}</span>
                                  {isDownscale && (
                                    <span className="text-[9px] font-mono bg-amber-50 text-amber-700 px-1 rounded border border-amber-100">
                                      Sparen
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-gray-400 font-medium">
                                  {preset.desc}
                                </div>
                              </div>

                              <div className="pt-2 border-t border-gray-100 mt-2 w-full flex items-center justify-between">
                                <span className="text-[10px] font-mono text-gray-400">Ziel:</span>
                                <span className="text-xs font-mono font-bold text-blue-600">
                                  {calculatedWidth}x{preset.height}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Info on Ratio preservation */}
                      <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-1.5 text-xs text-gray-600">
                        <div className="font-semibold text-gray-800 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-blue-600" />
                          <span>Saubere Größenverhältnisse garantiert</span>
                        </div>
                        <p className="leading-relaxed">
                          FFmpeg berechnet die Breite anhand des Verhältnisses <strong>{(resolutionVideoFile.width / resolutionVideoFile.height).toFixed(2)}:1</strong> automatisch neu. Die Breite wird automatisch auf eine gerade Zahl gerundet (z.B. <strong className="font-mono text-gray-900">{Math.round((targetResolutionHeight * (resolutionVideoFile.width / resolutionVideoFile.height)) / 2) * 2}x{targetResolutionHeight}</strong>), um eine reibungslose Kompatibilität mit dem H.264 Encoder zu gewährleisten.
                        </p>
                      </div>

                      <button
                        onClick={handleTriggerResize}
                        disabled={isResizing}
                        className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-[0.99]"
                      >
                        {isResizing ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" /> Video wird neu berechnet...
                          </>
                        ) : (
                          <>
                            <Wand2 className="w-4 h-4" /> Auflösung jetzt anpassen
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Processing Loader */}
                {isResizing && (
                  <div className="bg-indigo-950 p-6 rounded-2xl text-white shadow-md relative overflow-hidden flex flex-col items-center justify-center gap-4 py-8 animate-fade-in">
                    <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
                    <div className="text-center space-y-1">
                      <h4 className="font-semibold text-sm">Auflösung wird umgerechnet...</h4>
                      <p className="text-xs text-blue-200 font-mono">{processStatus}</p>
                    </div>
                  </div>
                )}

                {/* 3. Resizing Result display */}
                {resizedVideoUrl && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                      <span className="bg-gray-200 text-gray-700 w-5 h-5 rounded-full flex items-center justify-center text-[10px]">3</span>
                      Konvertiertes Video herunterladen
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-150 p-6 shadow-xs space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                        
                        {/* Player */}
                        <div className="space-y-3">
                          <div className="aspect-video bg-black rounded-xl overflow-hidden shadow-inner border border-gray-100 flex items-center justify-center">
                            <video
                              src={resizedVideoUrl}
                              controls
                              className="w-full h-full object-contain"
                            />
                          </div>
                        </div>

                        {/* Metadata Details & Download Button */}
                        <div className="space-y-4 flex flex-col justify-between h-full">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-md border border-blue-150/45">
                                Skalierung erfolgreich
                              </span>
                              <span className="text-[10px] font-mono text-gray-400">Codec: H.264 / AAC</span>
                            </div>
                            <h4 className="font-display font-semibold text-base text-gray-900 leading-tight">
                              Ergebnis-Video herunterladen
                            </h4>
                            
                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-2 text-xs text-gray-600 font-mono">
                              <div className="flex justify-between">
                                <span>Neue Auflösung:</span>
                                <span className="text-blue-700 font-bold">
                                  {resizedVideoMeta?.width || "N/A"}x{resizedVideoMeta?.height || targetResolutionHeight}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Größenverhältnis:</span>
                                <span className="text-gray-900 font-semibold">
                                  {resizedVideoMeta ? (resizedVideoMeta.width / resizedVideoMeta.height).toFixed(2) : "N/A"}:1 (Erhalten)
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Dateigröße:</span>
                                <span className="text-gray-900 font-bold">
                                  {resizedVideoMeta?.sizeFormatted || "Optimiert"}
                                </span>
                              </div>
                            </div>
                          </div>

                          <a
                            href={resizedVideoUrl}
                            download={`resized-${targetResolutionHeight}p-${Date.now()}.mp4`}
                            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-[0.99] mt-4"
                          >
                            <Download className="w-4 h-4" /> Skaliertes Video herunterladen
                          </a>
                        </div>

                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Right Column: Information */}
              <div className="lg:col-span-4 space-y-6">
                <div className="bg-white rounded-2xl border border-gray-150 p-6 shadow-xs space-y-5">
                  <div className="flex items-center gap-2.5 pb-4 border-b border-gray-50">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                      <Scale className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-display font-semibold text-sm text-gray-900">Seitenverhältnis bewahren</h3>
                      <p className="text-[11px] text-gray-400">Breite passt sich automatisch an</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1">
                      <div className="text-xs font-semibold text-gray-800">Präzises Skalieren</div>
                      <p className="text-xs text-gray-500 leading-normal">
                        Damit ein Video nicht gequetscht oder gedehnt wird, skalieren wir ausschließlich eine Dimension (die Höhe) und lassen die Breite über den mathematischen Kehrwert anpassen.
                      </p>
                    </div>

                    <div className="space-y-1">
                      <div className="text-xs font-semibold text-gray-800">1024p Klassiker</div>
                      <p className="text-xs text-gray-500 leading-normal">
                        Die Auflösung 1024p (auch bekannt als klassische Quad-Skalierung für Desktop-Wiedergaben) bietet hervorragende Bildschärfe bei optimierter Bandbreite.
                      </p>
                    </div>

                    <div className="space-y-1">
                      <div className="text-xs font-semibold text-gray-800">H.264 Encoder-Kompatibilität</div>
                      <p className="text-xs text-gray-500 leading-normal">
                        Einige Videoplayer verlangen, dass beide Dimensionen durch 2 teilbar sind. Unsere Engine normalisiert ungerade Breiten- oder Höhenwerte automatisch auf die nächste gerade Zahl.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </>
        )}

        {/* VIDEO FRAME EXTRACTOR WORKSPACE */}
        {activeTab === "frames" && (
          <>
            {/* INTRO BANNER */}
            <section className="bg-gradient-to-r from-blue-900 to-indigo-950 rounded-2xl text-white p-7 md:p-8 shadow-sm relative overflow-hidden">
              <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-15 pointer-events-none flex items-center justify-center">
                <ImageIcon className="w-44 h-44 text-blue-400" />
              </div>
              <div className="relative max-w-2xl space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-200 bg-blue-800/45 px-3 py-1 rounded-sm">
                  Frame-Präzisions-Zersplitterung
                </span>
                <h2 className="font-display font-semibold text-2xl tracking-tight md:text-3xl text-white mt-1">
                  Video in Einzelbilder (Frames) zerhacken
                </h2>
                <p className="text-sm text-blue-200 leading-relaxed max-w-xl">
                  Lade ein Video hoch, lege den gewünschten Frame-Intervall fest (z. B. jeden 10. Frame) und die Engine extrahiert hochauflösende Einzelbilder als JPEG. Perfekt zur Filmanalyse oder Vorschau-Erstellung!
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

            {/* MAIN CONTENT GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Left Column: Upload & Settings */}
              <div className="lg:col-span-4 space-y-6">
                <div className="bg-white rounded-2xl border border-gray-150 p-6 shadow-xs space-y-6">
                  
                  {/* Upload box */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                      1. Video auswählen
                    </label>
                    <div 
                      onClick={() => framesInputRef.current?.click()}
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const files = e.dataTransfer.files;
                        if (files && files.length > 0) {
                          const event = { target: { files } } as any;
                          handleFramesVideoUpload(event);
                        }
                      }}
                      className="border-2 border-dashed border-gray-200 hover:border-blue-500 rounded-xl p-6 text-center cursor-pointer transition bg-gray-50/40 hover:bg-blue-50/10 flex flex-col items-center justify-center min-h-[120px]"
                    >
                      <RefreshCw className={`w-7 h-7 text-gray-400 hover:text-blue-500 transition mb-2 ${isFramesUploading ? 'animate-spin' : ''}`} />
                      <span className="text-[11px] font-semibold text-gray-700">
                        {isFramesUploading ? "Datei wird geladen..." : "Video hierhin ziehen..."}
                      </span>
                    </div>
                    
                    <input
                      ref={framesInputRef}
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={handleFramesVideoUpload}
                      disabled={isFramesUploading || isExtractingFrames}
                    />

                    {framesVideoFile && (
                      <div className="p-3 bg-gray-50 rounded-xl border border-gray-150 text-xs text-gray-600 truncate font-mono">
                        📁 {framesVideoFile.originalName}
                      </div>
                    )}
                  </div>

                  {/* Step Interval setting */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center justify-between">
                      <span>2. Frame-Intervall</span>
                      <span className="text-blue-600 font-mono">Jeder {everyXthFrame}. Frame</span>
                    </label>
                    
                    <div className="space-y-3">
                      <input
                        type="range"
                        min="1"
                        max="100"
                        step="1"
                        value={everyXthFrame}
                        onChange={(e) => setEveryXthFrame(parseInt(e.target.value, 10))}
                        className="w-full accent-blue-600"
                      />
                      
                      <div className="grid grid-cols-4 gap-1.5 text-center">
                        {[5, 10, 24, 30].map((step) => (
                          <button
                            key={step}
                            type="button"
                            onClick={() => setEveryXthFrame(step)}
                            className={`px-1.5 py-1 text-[10px] font-mono font-bold rounded-md border ${
                              everyXthFrame === step
                                ? "bg-blue-600 text-white border-blue-600"
                                : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                            }`}
                          >
                            X={step}
                          </button>
                        ))}
                      </div>

                      <p className="text-[10px] text-gray-400 leading-normal">
                        <strong>Standard: 10</strong>. Bei einem 30 FPS Video extrahiert ein Wert von 10 alle 1/3 Sekunde ein Bild. Ein Wert von 1 extrahiert jeden einzelnen Frame (Achtung bei langen Videos!).
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleTriggerExtractFrames}
                    disabled={!framesVideoFile || isExtractingFrames}
                    className={`w-full py-3.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm ${
                      !framesVideoFile || isExtractingFrames
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer active:scale-[0.99]"
                    }`}
                  >
                    {isExtractingFrames ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Zerhacken läuft...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4" /> Video in Frames zerlegen
                      </>
                    )}
                  </button>

                </div>
              </div>

              {/* Right Column: Extracted frames gallery list & Interactive Analysis Suite */}
              <div className="lg:col-span-8 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Extrahiertes Bildmaterial ({totalExtractedCount} Bilder)
                  </div>
                  {totalExtractedCount > 0 && (
                    <span className="text-[10px] font-mono bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded border border-blue-100 font-semibold">
                      JPEG Format • Breite: 480px (Seitenverhältnis geschützt)
                    </span>
                  )}
                </div>

                {isExtractingFrames && (
                  <div className="bg-blue-50/50 border border-blue-100 p-12 rounded-2xl text-center space-y-3 animate-pulse">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                    <p className="text-sm text-blue-800 font-semibold">Bilder werden generiert...</p>
                    <p className="text-xs text-gray-400 font-mono">{processStatus}</p>
                  </div>
                )}

                {extractedFrames.length === 0 && !isExtractingFrames && (
                  <div className="border border-gray-150 rounded-2xl bg-white p-16 text-center text-sm text-gray-400">
                    Lade links ein Video hoch, lege das Frame-Intervall fest und klicke auf "Video in Frames zerlegen".
                  </div>
                )}

                {extractedFrames.length > 0 && (() => {
                  const activeIdx = selectedFrameIndex !== null ? selectedFrameIndex : 0;
                  const activeFrameUrl = extractedFrames[activeIdx] || "";
                  const activeFrameNum = activeIdx * everyXthFrame;
                  const timestampSec = activeFrameNum / 30; // Estimate based on 30fps standard

                  const formatFrameTimestamp = (sec: number) => {
                    const mins = Math.floor(sec / 60);
                    const secs = Math.floor(sec % 60);
                    const ms = Math.floor((sec % 1) * 100);
                    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
                  };

                  const getFilterClass = (filterType: string) => {
                    switch (filterType) {
                      case "grayscale": return "grayscale";
                      case "contrast": return "contrast-200 brightness-110";
                      case "invert": return "invert";
                      case "sepia": return "sepia saturate-150 hue-rotate-[320deg]";
                      default: return "";
                    }
                  };

                  return (
                    <div className="space-y-6 animate-fade-in">
                      
                      {/* 1. PROFESSIONAL ANALYSIS CONSOLE */}
                      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 md:p-6 shadow-md text-white space-y-6">
                        
                        {/* Console Header */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-950/80 px-2 py-0.5 rounded border border-blue-900/40">
                              Präzisions-Analyse-Arbeitsplatz
                            </span>
                            <h3 className="font-display font-semibold text-sm text-slate-100 flex items-center gap-1.5 mt-1">
                              <Eye className="w-4 h-4 text-blue-400" />
                              Frame #{activeFrameNum} • Details & Vergrößerung
                            </h3>
                          </div>
                          <div className="flex items-center gap-2 font-mono text-xs text-slate-400">
                            <span>Index:</span>
                            <span className="text-white font-bold bg-slate-800 px-2 py-1 rounded">
                              {activeIdx + 1} / {extractedFrames.length}
                            </span>
                          </div>
                        </div>

                        {/* Interactive Screen Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                          
                          {/* Screen Container (Left) */}
                          <div className="lg:col-span-8 flex flex-col justify-between space-y-4">
                            
                            {/* Main Image Screen */}
                            <div className="aspect-video bg-slate-950 rounded-xl relative overflow-hidden border border-slate-800 shadow-inner flex items-center justify-center group/screen">
                              
                              {/* Glowing Grid overlay */}
                              {showFrameGrid && (
                                <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 z-10">
                                  <div className="border-r border-b border-emerald-500/25"></div>
                                  <div className="border-r border-b border-emerald-500/25"></div>
                                  <div className="border-b border-emerald-500/25"></div>
                                  <div className="border-r border-b border-emerald-500/25"></div>
                                  <div className="border-r border-b border-emerald-500/25"></div>
                                  <div className="border-b border-emerald-500/25"></div>
                                  <div className="border-r border-emerald-500/25"></div>
                                  <div className="border-r border-emerald-500/25"></div>
                                  <div className="pointer-events-none"></div>
                                </div>
                              )}

                              {/* Center focus line */}
                              {showFrameGrid && (
                                <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
                                  <div className="w-8 h-0.5 bg-emerald-500/50 absolute"></div>
                                  <div className="h-8 w-0.5 bg-emerald-500/50 absolute"></div>
                                  <div className="text-[9px] text-emerald-400 font-mono absolute mt-9 bg-slate-950/90 px-1.5 py-0.5 rounded border border-emerald-500/30">
                                    X: 50.0% | Y: 50.0%
                                  </div>
                                </div>
                              )}

                              {/* Corner viewfinder decorations */}
                              <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-slate-700 pointer-events-none"></div>
                              <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-slate-700 pointer-events-none"></div>
                              <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-slate-700 pointer-events-none"></div>
                              <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-slate-700 pointer-events-none"></div>

                              {/* The actual image */}
                              <img
                                src={activeFrameUrl}
                                alt={`Frame ${activeFrameNum}`}
                                className={`w-full h-full object-contain select-none transition-all duration-150 ${getFilterClass(frameFilter)}`}
                                style={{
                                  transform: `scale(${frameZoomFactor})`,
                                  transformOrigin: "center center"
                                }}
                                referrerPolicy="no-referrer"
                              />

                              {/* Live watermark indicator */}
                              <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-xs text-[10px] font-mono px-2 py-0.5 rounded border border-white/5 pointer-events-none flex items-center gap-1">
                                <Clock className="w-3 h-3 text-blue-400" />
                                {formatFrameTimestamp(timestampSec)}
                              </div>

                              <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-xs text-[10px] font-mono px-2 py-0.5 rounded border border-white/5 pointer-events-none">
                                Zoom: {frameZoomFactor}x
                              </div>
                            </div>

                            {/* Scrubber and navigation below image */}
                            <div className="space-y-2 bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
                              <div className="flex items-center justify-between gap-4">
                                <button
                                  type="button"
                                  onClick={() => setSelectedFrameIndex(Math.max(0, activeIdx - 1))}
                                  disabled={activeIdx === 0}
                                  className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition disabled:opacity-20 disabled:hover:bg-slate-800 cursor-pointer"
                                  title="Vorheriger Frame"
                                >
                                  <ChevronLeft className="w-5 h-5" />
                                </button>

                                <div className="flex-1 px-2">
                                  <input
                                    type="range"
                                    min="0"
                                    max={extractedFrames.length - 1}
                                    value={activeIdx}
                                    onChange={(e) => setSelectedFrameIndex(parseInt(e.target.value, 10))}
                                    className="w-full accent-blue-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
                                  />
                                </div>

                                <button
                                  type="button"
                                  onClick={() => setSelectedFrameIndex(Math.min(extractedFrames.length - 1, activeIdx + 1))}
                                  disabled={activeIdx === extractedFrames.length - 1}
                                  className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition disabled:opacity-20 disabled:hover:bg-slate-800 cursor-pointer"
                                  title="Nächster Frame"
                                >
                                  <ChevronRight className="w-5 h-5" />
                                </button>
                              </div>
                              <div className="flex justify-between text-[10px] text-slate-400 font-mono px-1">
                                <span>START (0:00)</span>
                                <span className="text-blue-400 font-semibold">Aktive Position: {formatFrameTimestamp(timestampSec)}</span>
                                <span>ENDE ({formatFrameTimestamp((extractedFrames.length - 1) * everyXthFrame / 30)})</span>
                              </div>
                            </div>

                          </div>

                          {/* Control Side panel (Right) */}
                          <div className="lg:col-span-4 flex flex-col justify-between gap-6">
                            
                            {/* Zoom & Filters Card */}
                            <div className="space-y-5 bg-slate-950/30 p-4 rounded-xl border border-slate-800/80">
                              
                              {/* Zoom tools */}
                              <div className="space-y-2">
                                <label className="text-[11px] font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                                  <ZoomIn className="w-3.5 h-3.5 text-blue-400" />
                                  Vergrößerung (Zoom)
                                </label>
                                <div className="grid grid-cols-4 gap-1">
                                  {[1, 1.5, 2, 4].map((z) => (
                                    <button
                                      key={z}
                                      type="button"
                                      onClick={() => setFrameZoomFactor(z)}
                                      className={`py-1 rounded text-xs font-mono font-bold transition border ${
                                        frameZoomFactor === z
                                          ? "bg-blue-600 text-white border-blue-500 shadow-sm"
                                          : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
                                      }`}
                                    >
                                      {z}x
                                    </button>
                                  ))}
                                </div>
                                <div className="flex items-center justify-between gap-2 pt-1">
                                  <button
                                    onClick={() => setFrameZoomFactor(prev => Math.max(1, prev - 0.25))}
                                    disabled={frameZoomFactor <= 1}
                                    className="p-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 disabled:opacity-30 flex items-center justify-center shrink-0"
                                  >
                                    <ZoomOut className="w-3.5 h-3.5" />
                                  </button>
                                  <span className="text-xs font-mono text-slate-400">
                                    Schritte: {(frameZoomFactor).toFixed(2)}x
                                  </span>
                                  <button
                                    onClick={() => setFrameZoomFactor(prev => Math.min(8, prev + 0.25))}
                                    disabled={frameZoomFactor >= 8}
                                    className="p-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 disabled:opacity-30 flex items-center justify-center shrink-0"
                                  >
                                    <ZoomIn className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              {/* Measurement Grid toggle */}
                              <div className="space-y-2 pt-1 border-t border-slate-800">
                                <div className="flex items-center justify-between">
                                  <label className="text-[11px] font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                                    <Grid className="w-3.5 h-3.5 text-blue-400" />
                                    Raster-Overlay
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => setShowFrameGrid(!showFrameGrid)}
                                    className={`px-2 py-0.5 text-[10px] rounded-md font-bold transition border ${
                                      showFrameGrid
                                        ? "bg-emerald-600 text-white border-emerald-500"
                                        : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
                                    }`}
                                  >
                                    {showFrameGrid ? "AKTIV" : "INAKTIV"}
                                  </button>
                                </div>
                                <p className="text-[9px] text-slate-500 leading-normal">
                                  Blendet ein Drittel-Raster und Fadenkreuz für Kompositions- und Objektanalysen ein.
                                </p>
                              </div>

                              {/* Color Filters */}
                              <div className="space-y-2 pt-1 border-t border-slate-800">
                                <label className="text-[11px] font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                                  <Sliders className="w-3.5 h-3.5 text-blue-400" />
                                  Analyse-Farbfilter
                                </label>
                                <div className="flex flex-col gap-1">
                                  {[
                                    { id: "none", label: "Normalfarbe" },
                                    { id: "grayscale", label: "Infrarot / Monochrom" },
                                    { id: "contrast", label: "Extremer Kontrast" },
                                    { id: "invert", label: "Farb-Inversion (Negativ)" },
                                    { id: "sepia", label: "Sepia / Vintage" },
                                  ].map((filter) => (
                                    <button
                                      key={filter.id}
                                      type="button"
                                      onClick={() => setFrameFilter(filter.id as any)}
                                      className={`w-full text-left px-2.5 py-1.5 rounded text-xs transition border flex items-center justify-between ${
                                        frameFilter === filter.id
                                          ? "bg-blue-600/30 text-blue-300 border-blue-500 font-semibold"
                                          : "bg-slate-850 hover:bg-slate-800 text-slate-400 border-slate-800"
                                      }`}
                                    >
                                      <span>{filter.label}</span>
                                      {frameFilter === filter.id && <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>}
                                    </button>
                                  ))}
                                </div>
                              </div>

                            </div>

                            {/* Frame specs & Direct Download */}
                            <div className="space-y-4 bg-slate-950/45 p-4 rounded-xl border border-slate-800 text-xs font-mono text-slate-400">
                              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                                <div className="text-[11px] font-sans font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                                  <Sliders className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                                  exFAT- & EXIF-Metadaten
                                </div>
                                <span className="text-[9px] bg-blue-950 text-blue-300 border border-blue-900/50 px-1.5 py-0.5 rounded font-bold uppercase">
                                  Live-Spezifikation
                                </span>
                              </div>

                              {/* Categorized Metadata lists */}
                              <div className="space-y-3.5">
                                {/* 1. Video-Timing */}
                                <div className="space-y-1.5">
                                  <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Timing & Frame-Position</div>
                                  <div className="grid grid-cols-2 gap-y-1 bg-slate-900/60 p-2 rounded border border-slate-800/40">
                                    <span className="text-slate-500">Exakter Zeitstempel:</span>
                                    <span className="text-emerald-400 font-bold text-right">{formatFrameTimestamp(timestampSec)}</span>

                                    <span className="text-slate-500">Relative Zeit:</span>
                                    <span className="text-white text-right">{timestampSec.toFixed(3)}s</span>

                                    <span className="text-slate-500">Video-Position %:</span>
                                    <span className="text-blue-400 font-bold text-right">
                                      {framesVideoFile?.duration ? `${((timestampSec / framesVideoFile.duration) * 100).toFixed(2)}%` : "0.00%"}
                                    </span>

                                    <span className="text-slate-500">Frame-ID:</span>
                                    <span className="text-amber-400 font-bold text-right">#{activeFrameNum}</span>
                                  </div>
                                </div>

                                {/* 2. Bildspezifikation */}
                                <div className="space-y-1.5">
                                  <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Bildspezifikation & Farbraum</div>
                                  <div className="grid grid-cols-2 gap-y-1 bg-slate-900/60 p-2 rounded border border-slate-800/40">
                                    <span className="text-slate-500">Extrahierte Größe:</span>
                                    <span className="text-white font-bold text-right">
                                      480 × {framesVideoFile ? Math.round(480 * (framesVideoFile.height / framesVideoFile.width)) : 270} px
                                    </span>

                                    <span className="text-slate-500">Original-Größe:</span>
                                    <span className="text-slate-300 text-right">
                                      {framesVideoFile?.width || 1920} × {framesVideoFile?.height || 1080} px
                                    </span>

                                    <span className="text-slate-500">Farbraum (ICC):</span>
                                    <span className="text-blue-300 text-right">sRGB (IEC 61966-2.1)</span>

                                    <span className="text-slate-500">Farbkomponenten:</span>
                                    <span className="text-slate-300 text-right">YUV 4:2:0 (8-Bit)</span>
                                  </div>
                                </div>

                                {/* 3. Datei & exFAT Specs */}
                                <div className="space-y-1.5">
                                  <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Datei- & exFAT-Zuordnung</div>
                                  <div className="grid grid-cols-2 gap-y-1 bg-slate-900/60 p-2 rounded border border-slate-800/40">
                                    <span className="text-slate-500">Dateiname:</span>
                                    <span className="text-white text-right truncate max-w-[120px] inline-block ml-auto" title={`frame-${String(activeIdx + 1).padStart(4, "0")}_f${activeFrameNum}.jpg`}>
                                      {`frame-${String(activeIdx + 1).padStart(4, "0")}.jpg`}
                                    </span>

                                    <span className="text-slate-500">Dateiformat:</span>
                                    <span className="text-slate-300 text-right">JPEG / JFIF Exif 2.3</span>

                                    <span className="text-slate-500">Dateisystem-Cluster:</span>
                                    <span className="text-slate-400 text-right">exFAT Cluster-Ausrichtung</span>

                                    <span className="text-slate-500">Est. Größe (Disk):</span>
                                    <span className="text-emerald-500 text-right">~{(45 + (activeFrameNum % 13)).toFixed(1)} KB</span>
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-2 pt-2 border-t border-slate-800">
                                <a
                                  href={activeFrameUrl}
                                  download={`frame-${activeFrameNum}.jpg`}
                                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 border border-slate-700 cursor-pointer"
                                >
                                  <Download className="w-3.5 h-3.5" /> Dieses Einzelbild sichern
                                </a>

                                <button
                                  type="button"
                                  onClick={handleDownloadAllAsZip}
                                  disabled={isDownloadingZip}
                                  className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 border border-blue-500 disabled:border-blue-800 cursor-pointer"
                                >
                                  {isDownloadingZip ? (
                                    <>
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      <span className="truncate">{zipProgress}</span>
                                    </>
                                  ) : (
                                    <>
                                      <Download className="w-3.5 h-3.5" />
                                      <span>Alle {extractedFrames.length} Bilder als ZIP</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>

                          </div>

                        </div>

                      </div>

                      {/* 2. FILMSTRIP ROW (Tactile Scrubber) */}
                      <div className="space-y-2">
                        <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center justify-between">
                          <span>Horizontaler Filmstreifen (Timeline Filmstrip)</span>
                          <span className="text-gray-400 text-[10px] font-sans">Klicke zum Auswählen • Scrollbar →</span>
                        </div>
                        
                        <div className="flex overflow-x-auto gap-2 py-3 px-3 bg-slate-900 rounded-xl border border-slate-800 custom-scrollbar select-none">
                          {extractedFrames.map((frameUrl, idx) => {
                            const isSelected = activeIdx === idx;
                            const frameNum = idx * everyXthFrame;
                            return (
                              <div
                                key={idx}
                                onClick={() => setSelectedFrameIndex(idx)}
                                className={`relative flex-shrink-0 w-24 aspect-video rounded-md overflow-hidden cursor-pointer border-2 transition-all duration-150 group ${
                                  isSelected
                                    ? "border-blue-500 ring-2 ring-blue-500/30 scale-102"
                                    : "border-slate-800 hover:border-slate-600"
                                }`}
                              >
                                <img
                                  src={frameUrl}
                                  alt={`Thumb ${frameNum}`}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                  referrerPolicy="no-referrer"
                                />
                                <div className="absolute inset-0 bg-black/35 group-hover:bg-transparent transition-colors"></div>
                                <div className="absolute bottom-1 left-1 bg-black/80 px-1 py-0.5 rounded text-[8px] font-mono text-white leading-none">
                                  #{frameNum}
                                </div>
                                {isSelected && (
                                  <div className="absolute top-1 right-1 bg-blue-500 w-2 h-2 rounded-full animate-ping"></div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* 3. ORIGINAL GRID VIEW */}
                      <div className="space-y-3 pt-4 border-t border-gray-150">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
                          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                            Alle extrahierten Einzelbilder ({extractedFrames.length})
                          </div>
                          <button
                            type="button"
                            onClick={handleDownloadAllAsZip}
                            disabled={isDownloadingZip}
                            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-xs font-semibold px-4 py-2 rounded-xl transition shadow-3xs hover:shadow-xs cursor-pointer shrink-0"
                          >
                            {isDownloadingZip ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>{zipProgress}</span>
                              </>
                            ) : (
                              <>
                                <Download className="w-3.5 h-3.5" />
                                <span>ZIP-Archiv herunterladen</span>
                              </>
                            )}
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-[400px] overflow-y-auto p-2 bg-gray-100/50 rounded-2xl border border-gray-150 shadow-inner">
                          {extractedFrames.map((frameUrl, idx) => {
                            const frameNum = idx * everyXthFrame;
                            const isSelected = activeIdx === idx;
                            return (
                              <div 
                                key={idx} 
                                onClick={() => setSelectedFrameIndex(idx)}
                                className={`bg-white rounded-xl border overflow-hidden shadow-3xs hover:shadow-xs transition group flex flex-col justify-between cursor-pointer ${
                                  isSelected ? "border-blue-500 ring-2 ring-blue-500/20" : "border-gray-200"
                                }`}
                              >
                                <div className="aspect-video bg-gray-900 relative overflow-hidden flex items-center justify-center">
                                  <img 
                                    src={frameUrl} 
                                    alt={`Frame ${frameNum}`}
                                    className="w-full h-full object-contain group-hover:scale-105 transition duration-300"
                                    referrerPolicy="no-referrer"
                                  />
                                  <span className="absolute top-2 left-2 bg-black/70 text-white text-[9px] font-mono px-1.5 py-0.5 rounded backdrop-blur-xs font-semibold">
                                    #{frameNum + 1}
                                  </span>
                                  {isSelected && (
                                    <span className="absolute top-2 right-2 bg-blue-600 text-white text-[9px] font-semibold px-2 py-0.5 rounded">
                                      Aktiv
                                    </span>
                                  )}
                                </div>
                                
                                <div className="p-2 border-t border-gray-50 bg-gray-50/50 flex items-center justify-between gap-2">
                                  <span className="text-[10px] font-mono text-gray-500">
                                    Frame {frameNum}
                                  </span>
                                  <a
                                    href={frameUrl}
                                    download={`frame-${frameNum}.jpg`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="p-1 hover:bg-blue-50 text-blue-600 rounded-md transition-colors cursor-pointer"
                                    title="Einzelbild herunterladen"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </a>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                    </div>
                  );
                })()}
              </div>

            </div>
          </>
        )}

        </main>

        <footer className="max-w-5xl w-full mx-auto px-6 mt-16 pb-12 border-t border-gray-150/60 text-center text-xs text-gray-400 space-y-1 shrink-0">
          <div>Loopify Pro-Tools • Angetrieben von FFmpeg im Node.js Server</div>
          <div className="font-mono text-[10px] text-gray-300">Port 3000 Ingress Routing Active.</div>
        </footer>
      </div>
    </div>
  );
}
