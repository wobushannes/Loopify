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

export interface BlendParameters {
  videoFile: UploadedFile;
  audioFile?: UploadedFile;
  crop: CropSelection;
  trim: TrimSelection;
  loopType: LoopMode;
}
