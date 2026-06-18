import React, { useState, useRef, useEffect } from "react";
import { Move, Maximize2, Crop, Scissors, ShieldAlert, Layers } from "lucide-react";
import { UploadedFile, CropSelection, TrimSelection } from "../types";

interface VideoCropTrimProps {
  videoFile: UploadedFile;
  onConfigChange: (crop: CropSelection, trim: TrimSelection) => void;
}

export default function VideoCropTrim({ videoFile, onConfigChange }: VideoCropTrimProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Crop Box state in percentages (0 to 100)
  const [cropPercent, setCropPercent] = useState({
    x: 10,
    y: 10,
    w: 80,
    h: 80,
  });

  // Time trim parameters
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(Math.min(videoFile.duration, 5));

  // Dragging states
  const [isDraggingBox, setIsDraggingBox] = useState(false);
  const [isResizingBox, setIsResizingBox] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, boxX: 0, boxY: 0, boxW: 0, boxH: 0 });
  const [aspectRatio, setAspectRatio] = useState<"free" | "1:1" | "16:9" | "9:16">("free");

  // Keep track of parent size to translate percentages correctly
  const [containerSize, setContainerSize] = useState({ width: 1, height: 1 });

  // Update outer state when either crop or trim changes
  useEffect(() => {
    const cropX = Math.round((cropPercent.x / 100) * videoFile.width);
    const cropY = Math.round((cropPercent.y / 100) * videoFile.height);
    const cropW = Math.round((cropPercent.w / 100) * videoFile.width);
    const cropH = Math.round((cropPercent.h / 100) * videoFile.height);

    onConfigChange(
      { x: cropX, y: cropY, width: cropW, height: cropH },
      { startTime, endTime }
    );
  }, [cropPercent, startTime, endTime, videoFile]);

  // Update container size on mount & load of video metadata
  const handleVideoLoaded = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setContainerSize({ width: rect.width, height: rect.height });
    }
  };

  useEffect(() => {
    // Also re-trigger resize check periodically
    const handleResize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({ width: rect.width, height: rect.height });
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Set default crop aspect ratios
  const applyRatio = (ratio: "free" | "1:1" | "16:9" | "9:16") => {
    setAspectRatio(ratio);
    if (ratio === "1:1") {
      setCropPercent((c) => {
        const size = Math.min(c.w, c.h, 60);
        return { ...c, w: size, h: size };
      });
    } else if (ratio === "16:9") {
      setCropPercent((c) => {
        const w = Math.min(c.w, 80);
        const h = (w * 9) / 16;
        return { ...c, w, h: Math.min(h, 90) };
      });
    } else if (ratio === "9:16") {
      setCropPercent((c) => {
        const h = Math.min(c.h, 80);
        const w = (h * 9) / 16;
        return { ...c, w: Math.min(w, 90), h };
      });
    }
  };

  // Drag and resize handlers
  const handleBoxMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingBox(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      boxX: cropPercent.x,
      boxY: cropPercent.y,
      boxW: cropPercent.w,
      boxH: cropPercent.h,
    });
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizingBox(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      boxX: cropPercent.x,
      boxY: cropPercent.y,
      boxW: cropPercent.w,
      boxH: cropPercent.h,
    });
  };

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isDraggingBox) {
        const deltaXPercent = ((e.clientX - dragStart.x) / containerSize.width) * 100;
        const deltaYPercent = ((e.clientY - dragStart.y) / containerSize.height) * 100;

        let nextX = dragStart.boxX + deltaXPercent;
        let nextY = dragStart.boxY + deltaYPercent;

        // Boundary checks
        if (nextX < 0) nextX = 0;
        if (nextY < 0) nextY = 0;
        if (nextX + dragStart.boxW > 100) nextX = 100 - dragStart.boxW;
        if (nextY + dragStart.boxH > 100) nextY = 100 - dragStart.boxH;

        setCropPercent((c) => ({ ...c, x: nextX, y: nextY }));
      }

      if (isResizingBox) {
        const deltaXPercent = ((e.clientX - dragStart.x) / containerSize.width) * 100;
        let nextW = dragStart.boxW + deltaXPercent;

        // Bound width
        if (nextW < 10) nextW = 10;
        if (dragStart.boxX + nextW > 100) nextW = 100 - dragStart.boxX;

        let nextH = dragStart.boxH;
        if (aspectRatio === "free") {
          const deltaYPercent = ((e.clientY - dragStart.y) / containerSize.height) * 100;
          nextH = dragStart.boxH + deltaYPercent;
          if (nextH < 10) nextH = 10;
          if (dragStart.boxY + nextH > 100) nextH = 100 - dragStart.boxY;
        } else if (aspectRatio === "1:1") {
          nextH = nextW;
          if (dragStart.boxY + nextH > 100) {
            nextH = 100 - dragStart.boxY;
            nextW = nextH;
          }
        } else if (aspectRatio === "16:9") {
          nextH = (nextW * 9) / 16;
          if (dragStart.boxY + nextH > 100) {
            nextH = 100 - dragStart.boxY;
            nextW = (nextH * 16) / 9;
          }
        } else if (aspectRatio === "9:16") {
          nextH = (nextW * 16) / 9;
          if (dragStart.boxY + nextH > 100) {
            nextH = 100 - dragStart.boxY;
            nextW = (nextH * 9) / 16;
          }
        }

        setCropPercent((c) => ({ ...c, w: nextW, h: nextH }));
      }
    };

    const handleGlobalMouseUp = () => {
      setIsDraggingBox(false);
      setIsResizingBox(false);
    };

    if (isDraggingBox || isResizingBox) {
      window.addEventListener("mousemove", handleGlobalMouseMove);
      window.addEventListener("mouseup", handleGlobalMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      window.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [isDraggingBox, isResizingBox, dragStart, containerSize, aspectRatio]);

  // Handle trim modifications
  const handleStartTimeChange = (val: number) => {
    const endChecked = Math.max(val + 0.5, endTime);
    setStartTime(val);
    setEndTime(endChecked);
    if (videoRef.current) {
      videoRef.current.currentTime = val;
    }
  };

  const handleEndTimeChange = (val: number) => {
    const startChecked = Math.min(val - 0.5, startTime);
    setEndTime(val);
    setStartTime(startChecked);
    if (videoRef.current) {
      videoRef.current.currentTime = val;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs max-w-full">
      <div className="flex items-center gap-3 mb-6 border-b border-gray-50 pb-4">
        <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
          <Crop className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-display font-semibold text-lg text-gray-900">
            Ausschneiden & Trimmen
          </h2>
          <p className="text-xs text-gray-500">
            Wähle den Bildausschnitt und das Zeitfenster deiner Videoschleife.
          </p>
        </div>
      </div>

      {/* Video Cropping Canvas */}
      <div className="flex flex-col items-center justify-center">
        <div 
          ref={containerRef} 
          className="relative max-w-full rounded-xl overflow-hidden bg-black select-none shadow-sm"
          style={{ maxHeight: "400px" }}
        >
          <video
            ref={videoRef}
            src={videoFile.path}
            className="block max-h-[400px] object-contain pointer-events-none"
            muted
            onLoadedMetadata={handleVideoLoaded}
            onTimeUpdate={() => {
              if (videoRef.current && videoRef.current.currentTime >= endTime) {
                videoRef.current.currentTime = startTime;
              }
            }}
            onPlay={() => {
              // Ensure video starts inside trim boundary
              if (videoRef.current && (videoRef.current.currentTime < startTime || videoRef.current.currentTime > endTime)) {
                videoRef.current.currentTime = startTime;
              }
            }}
          />

          {/* Visual Dark Overlay Layer */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Top mask */}
            <div 
              className="absolute bg-black/60 left-0 right-0 top-0"
              style={{ height: `${cropPercent.y}%` }}
            />
            {/* Bottom mask */}
            <div 
              className="absolute bg-black/60 left-0 right-0 bottom-0"
              style={{ height: `${100 - cropPercent.y - cropPercent.h}%` }}
            />
            {/* Left mask */}
            <div 
              className="absolute bg-black/60 top-[var(--top)] bottom-[var(--bottom)] left-0"
              style={{ 
                top: `${cropPercent.y}%`, 
                bottom: `${100 - cropPercent.y - cropPercent.h}%`,
                width: `${cropPercent.x}%` 
              } as any}
            />
            {/* Right mask */}
            <div 
              className="absolute bg-black/60 top-[var(--top)] bottom-[var(--bottom)] right-0"
              style={{ 
                top: `${cropPercent.y}%`, 
                bottom: `${100 - cropPercent.y - cropPercent.h}%`,
                width: `${100 - cropPercent.x - cropPercent.w}%` 
              } as any}
            />
          </div>

          {/* Interactive Draggable Crop Area */}
          <div
            className="absolute border-2 border-dashed border-white cursor-move flex flex-col justify-between"
            style={{
              left: `${cropPercent.x}%`,
              top: `${cropPercent.y}%`,
              width: `${cropPercent.w}%`,
              height: `${cropPercent.h}%`,
              boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.15)",
            }}
            onMouseDown={handleBoxMouseDown}
          >
            {/* Display grid lines */}
            <div className="flex-1 flex pointer-events-none">
              <div className="flex-1 border-r border-dashed border-white/20 h-full" />
              <div className="flex-1 border-r border-dashed border-white/20 h-full" />
              <div className="flex-1 h-full" />
            </div>
            <div className="absolute inset-0 flex flex-col pointer-events-none">
              <div className="flex-1 border-b border-dashed border-white/20 w-full" />
              <div className="flex-1 border-b border-dashed border-white/20 w-full" />
              <div className="flex-1 w-full" />
            </div>

            {/* Move indicator */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/70 p-1 rounded text-white pointer-events-none shadow-xs">
              <Move className="w-3.5 h-3.5 opacity-80" />
            </div>

            {/* Resize Handle on Bottom Right */}
            <div
              className="absolute bottom-[-6px] right-[-6px] w-[16px] h-[16px] bg-blue-600 rounded-full border-2 border-white cursor-se-resize flex items-center justify-center shadow-md active:scale-125 transition-transform"
              onMouseDown={handleResizeMouseDown}
            >
              <Maximize2 className="w-2.5 h-2.5 text-white scale-75" />
            </div>
          </div>
        </div>

        {/* Aspect Ratio Tools */}
        <div className="mt-4 flex flex-wrap gap-2 w-full max-w-md justify-center">
          <span className="text-xs text-gray-400 flex items-center gap-1.5 mr-2 pr-2 border-r border-gray-100 font-medium">
            <Layers className="w-3.5 h-3.5" /> Format:
          </span>
          <button
            onClick={() => applyRatio("free")}
            className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors ${
              aspectRatio === "free"
                ? "bg-gray-900 text-white"
                : "bg-gray-50 text-gray-600 hover:bg-gray-100"
            }`}
          >
            Frei
          </button>
          <button
            onClick={() => applyRatio("1:1")}
            className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors ${
              aspectRatio === "1:1"
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Quadrat (1:1)
          </button>
          <button
            onClick={() => applyRatio("16:9")}
            className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors ${
              aspectRatio === "16:9"
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Querformat (16:9)
          </button>
          <button
            onClick={() => applyRatio("9:16")}
            className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors ${
              aspectRatio === "9:16"
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Hochformat (9:16)
          </button>
        </div>
      </div>

      {/* Video controls */}
      <div className="mt-6 flex justify-center gap-3">
        <button
          onClick={() => {
            if (videoRef.current) {
              if (videoRef.current.paused) {
                videoRef.current.play();
              } else {
                videoRef.current.pause();
              }
            }
          }}
          className="px-4 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-150 rounded-xl text-xs font-semibold text-gray-700 transition"
        >
          Vorschau Play/Pause
        </button>
      </div>

      {/* Temporal Trim Controller */}
      <div className="mt-8">
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
            <Scissors className="w-4 h-4 text-blue-500" />
            Video-Ausschnitt trimmen
          </label>
          <span className="text-xs font-mono text-gray-500 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">
            {startTime.toFixed(2)}s - {endTime.toFixed(2)}s ({ (endTime - startTime).toFixed(2) }s Dauer)
          </span>
        </div>

        <div className="space-y-4 bg-gray-50/70 p-4 rounded-xl border border-gray-100/50">
          {/* Start range slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-gray-500">
              <span className="font-semibold text-blue-600">Startzeitpunkt</span>
              <span className="font-mono">{startTime.toFixed(2)}s / {videoFile.duration.toFixed(2)}s</span>
            </div>
            <input
              type="range"
              min={0}
              max={videoFile.duration}
              step={0.1}
              value={startTime}
              onChange={(e) => handleStartTimeChange(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>

          {/* End range slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-gray-500">
              <span className="font-semibold text-teal-600">Endzeitpunkt</span>
              <span className="font-mono">{endTime.toFixed(2)}s / {videoFile.duration.toFixed(2)}s</span>
            </div>
            <input
              type="range"
              min={0}
              max={videoFile.duration}
              step={0.1}
              value={endTime}
              onChange={(e) => handleEndTimeChange(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
            />
          </div>
        </div>

        {/* Safety info warning if duration is high */}
        {endTime - startTime > 10 && (
          <div className="mt-3 flex gap-2 p-3 bg-amber-50 border border-amber-100 text-amber-800 rounded-xl text-xs leading-normal">
            <ShieldAlert className="w-4 h-4 shrink-0 text-amber-500" />
            <span>
              <strong>Hinweis:</strong> Kürzere loops (z.B. 2-5 Sekunden Länge) eignen sich am besten für nahtlose "Kinetische Loops" und verarbeiten deutlich schneller.
            </span>
          </div>
        )}
      </div>

      {/* Calculated Coordinate specifications in JetBrains Mono */}
      <div className="mt-6 pt-4 border-t border-gray-50 flex flex-wrap justify-between gap-4 text-[10px] font-mono text-gray-400">
        <div>X: {Math.round((cropPercent.x / 100) * videoFile.width)}px ({cropPercent.x.toFixed(0)}%)</div>
        <div>Y: {Math.round((cropPercent.y / 100) * videoFile.height)}px ({cropPercent.y.toFixed(0)}%)</div>
        <div>BREITE: {Math.round((cropPercent.w / 100) * videoFile.width)}px ({cropPercent.w.toFixed(0)}%)</div>
        <div>HÖHE: {Math.round((cropPercent.h / 100) * videoFile.height)}px ({cropPercent.h.toFixed(0)}%)</div>
      </div>
    </div>
  );
}
