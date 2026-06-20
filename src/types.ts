export interface UploadedFile {
  filename: string;
  originalName: string;
  path: string;
  fullPath: string;
  duration: number;
  width: number;
  height: number;
  hasAudio: boolean;
}

export interface CropSelection {
  x: number;   // pixel coordinate x
  y: number;   // pixel coordinate y
  width: number; // pixel width
  height: number; // pixel height
}

export interface TrimSelection {
  startTime: number;
  endTime: number;
}

export type LoopMode = "ping-pong" | "normal";

export interface QueueItem {
  id: string;
  name: string;
  originalSize: number;
  status: 'uploading' | 'pending' | 'processing' | 'done' | 'failed';
  file?: UploadedFile;
  compressResult?: {
    url: string;
    originalSize: number;
    compressedSize: number;
    savingPercent: number;
  };
  error?: string;
}

export interface CompressionPreset {
  id: string;
  name: string;
  crfPreset: "low" | "medium" | "high";
  resolutionPreset: "original" | "1080p" | "720p" | "480p";
  isCustom: boolean;
}

export interface BlendParameters {
  videoFile: UploadedFile;
  audioFile?: UploadedFile;
  crop: CropSelection;
  trim: TrimSelection;
  loopType: LoopMode;
}
