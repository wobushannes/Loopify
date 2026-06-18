import React, { useState, useRef, ChangeEvent } from "react";
import { UploadCloud, Video, Music, CheckCircle2, RotateCcw, AlertTriangle, Disc } from "lucide-react";
import { UploadedFile } from "../types";

interface MediaUploaderProps {
  onVideoUploaded: (file: UploadedFile) => void;
  onAudioUploaded: (file: UploadedFile | undefined) => void;
  videoFile?: UploadedFile;
  audioFile?: UploadedFile;
  onReset: () => void;
}

export default function MediaUploader({
  onVideoUploaded,
  onAudioUploaded,
  videoFile,
  audioFile,
  onReset,
}: MediaUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);

  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  // Unified File upload handle
  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>, type: "video" | "audio") => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setErrorMessage("");
    setUploadProgress(20);

    const formData = new FormData();
    if (type === "video") {
      formData.append("videoFile", file);
    } else {
      formData.append("audioFile", file);
    }

    try {
      setUploadProgress(50);
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      setUploadProgress(80);
      const data = await response.json();

      if (data.success) {
        if (type === "video" && data.files.video) {
          onVideoUploaded(data.files.video);
        } else if (type === "audio" && data.files.audio) {
          onAudioUploaded(data.files.audio);
        }
      } else {
        setErrorMessage(data.error || "Unerwarteter Fehler beim Hochladen.");
      }
    } catch (err: any) {
      console.error("Upload error:", err);
      setErrorMessage("Verbindung zum Server fehlgeschlagen. Bitte versuche es erneut.");
    } finally {
      setIsUploading(false);
      setUploadProgress(100);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Cards Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* VIDEO TO CROP UPLOAD */}
        <div className={`p-6 rounded-2xl border bg-white shadow-xs transition-all ${
          videoFile ? "border-green-100" : "border-gray-100"
        }`}>
          <div className="flex items-center gap-3 mb-4 border-b border-gray-50 pb-3">
            <div className={`p-2 rounded-xl ${videoFile ? "bg-green-50 text-green-600" : "bg-blue-50 text-blue-600"}`}>
              <Video className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-sm text-gray-900">1. Hauptvideo (Bildquelle)</h3>
              <p className="text-xs text-gray-400">Das Video, aus dem du den Loop ausschneidest.</p>
            </div>
          </div>

          {videoFile ? (
            <div className="space-y-4">
              <div className="bg-green-50/70 p-4 rounded-xl border border-green-150/40 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-green-900 truncate">
                    {videoFile.originalName}
                  </div>
                  <div className="text-xs text-green-800 font-mono mt-1 space-y-0.5">
                    <div>Auflösung: {videoFile.width}x{videoFile.height}px</div>
                    <div>Dauer: {videoFile.duration.toFixed(2)}s</div>
                    <div>Audio: {videoFile.hasAudio ? "Vorhanden" : "Stumm"}</div>
                  </div>
                </div>
              </div>
              <button
                onClick={() => videoInputRef.current?.click()}
                className="w-full py-2 bg-gray-50 hover:bg-gray-100 text-xs font-semibold text-gray-600 rounded-xl transition border border-gray-150"
              >
                Anderes Video auswählen
              </button>
            </div>
          ) : (
            <div 
              onClick={() => videoInputRef.current?.click()}
              className="border-2 border-dashed border-gray-200 hover:border-blue-400 rounded-xl p-8 text-center cursor-pointer transition bg-gray-50/40 hover:bg-blue-50/10 group flex flex-col items-center justify-center min-h-[160px]"
            >
              <UploadCloud className="w-9 h-9 text-gray-400 group-hover:text-blue-500 transition mb-3" />
              <span className="text-xs font-semibold text-gray-700">Hauptvideo hochladen...</span>
              <span className="text-[10px] text-gray-400 mt-1">MP4, WEBM oder MOV bis 100MB</span>
            </div>
          )}
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => handleFileUpload(e, "video")}
            disabled={isUploading}
          />
        </div>

        {/* SOUNDTRACK SOURCE UPLOAD */}
        <div className={`p-6 rounded-2xl border bg-white shadow-xs transition-all ${
          audioFile ? "border-green-100" : "border-gray-100"
        }`}>
          <div className="flex items-center gap-3 mb-4 border-b border-gray-50 pb-3">
            <div className={`p-2 rounded-xl ${audioFile ? "bg-green-50 text-green-600" : "bg-teal-50 text-teal-600"}`}>
              <Music className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-sm text-gray-900">2. Audiospur (Hintergrundmusik)</h3>
              <p className="text-xs text-gray-400">Lade ein Audio oder Zweitvideo mit Tonspur hoch.</p>
            </div>
          </div>

          {audioFile ? (
            <div className="space-y-4">
              <div className="bg-green-50/70 p-4 rounded-xl border border-green-150/40 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-green-900 truncate">
                    {audioFile.originalName}
                  </div>
                  <div className="text-xs text-green-800 font-mono mt-1 space-y-0.5">
                    <div>Typ: {audioFile.hasAudio ? "Audio Spur vorhanden" : "Keine Tonspur"}</div>
                    <div>Dauer: {audioFile.duration.toFixed(2)}s</div>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => audioInputRef.current?.click()}
                  className="flex-1 py-2 bg-gray-50 hover:bg-gray-100 text-xs font-semibold text-gray-600 rounded-xl transition border border-gray-150"
                >
                  Andere Audiodatei
                </button>
                <button
                  onClick={() => onAudioUploaded(undefined)}
                  className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition border border-red-100"
                  title="Audio entfernen"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div 
              onClick={() => audioInputRef.current?.click()}
              className="border-2 border-dashed border-gray-200 hover:border-teal-400 rounded-xl p-8 text-center cursor-pointer transition bg-gray-50/40 hover:bg-teal-50/10 group flex flex-col items-center justify-center min-h-[160px]"
            >
              <Music className="w-9 h-9 text-gray-400 group-hover:text-teal-500 transition mb-3" />
              <span className="text-xs font-semibold text-gray-700">Audiospur / Zweitvideo hochladen...</span>
              <span className="text-[10px] text-gray-400 mt-1">MP3, WAV, M4A oder zweites Video mit Musik</span>
            </div>
          )}
          <input
            ref={audioInputRef}
            type="file"
            accept="audio/*,video/*"
            className="hidden"
            onChange={(e) => handleFileUpload(e, "audio")}
            disabled={isUploading}
          />
        </div>

      </div>

      {/* Uploading progress bar */}
      {isUploading && (
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-700 flex items-center gap-2">
              <Disc className="w-4 h-4 text-blue-500 animate-spin" /> Verarbeite und analysiere Mediendatei auf dem Server...
            </span>
            <span className="text-xs font-mono text-gray-500">{uploadProgress}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Upload Error notification */}
      {errorMessage && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-start gap-3 text-red-800">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-semibold">Fehler beim Upload</div>
            <div className="text-xs mt-0.5 opacity-90">{errorMessage}</div>
          </div>
        </div>
      )}

      {/* If only main video is uploaded, show helper about original sound fallback */}
      {videoFile && !audioFile && (
        <div className="p-4 bg-blue-50/60 border border-blue-100/50 rounded-2xl text-xs text-blue-800">
          <strong>Hinweis zum Tonspiel:</strong> Da du noch keine eigenständige Audiospur im Modul 2 geladen hast, wird das Endergebnis die Original-Audiospur des Hauptvideos ({videoFile.hasAudio ? "mit Ton" : "stumm"}) dahinterlegen und anpassen. Lade rechts eine eigene Musikdatei oder ein Video hoch, um seine Tonspur zu extrahieren.
        </div>
      )}
    </div>
  );
}
