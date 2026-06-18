import express from "express";
import path from "path";
import fs from "fs";
import { exec } from "child_process";
import multer from "multer";
import { createServer as createViteServer } from "vite";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";

const app = express();
const PORT = 3000;

// Set up directory paths
const UPLOADS_DIR = path.join(process.cwd(), "uploads");
const OUTPUTS_DIR = path.join(process.cwd(), "outputs");

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
if (!fs.existsSync(OUTPUTS_DIR)) {
  fs.mkdirSync(OUTPUTS_DIR, { recursive: true });
}

// Find FFmpeg binary
let ffmpegCmd = "ffmpeg";
try {
  if (ffmpegInstaller.path) {
    ffmpegCmd = ffmpegInstaller.path;
    console.log(`FFmpeg resolved via installer at: ${ffmpegCmd}`);
  }
} catch (e) {
  console.log("Could not locate @ffmpeg-installer, using fallback 'ffmpeg'");
}

// JSON Parser
app.use(express.json());

// Serve static assets
app.use("/uploads", express.static(UPLOADS_DIR));
app.use("/outputs", express.static(OUTPUTS_DIR));

// Configure Multer for local uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".mp4";
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 2000 * 1024 * 1024, // 2GB limit for larger video compressions
  },
});

// Help analyze video file parameters using ffmpeg
function getMediaMetadata(filePath: string): Promise<{ duration: number; width: number; height: number; hasAudio: boolean }> {
  return new Promise((resolve) => {
    const cmd = `"${ffmpegCmd}" -i "${filePath}"`;
    exec(cmd, (error, stdout, stderr) => {
      const output = stderr || stdout;
      
      // Calculate duration
      let duration = 0;
      const durationMatch = output.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+|\d+)/);
      if (durationMatch) {
        const hours = parseInt(durationMatch[1], 10);
        const minutes = parseInt(durationMatch[2], 10);
        const seconds = parseFloat(durationMatch[3]);
        duration = hours * 3600 + minutes * 60 + seconds;
      }

      // Calculate width & height
      let width = 0;
      let height = 0;
      // Look for a string like: 1920x1080 [SAR 1:1 DAR 16:9]
      const resolutionMatch = output.match(/,\s*(\d+)x(\d+)\s*[,\[]/);
      if (resolutionMatch) {
        width = parseInt(resolutionMatch[1], 10);
        height = parseInt(resolutionMatch[2], 10);
      } else {
        // Fallback check: look for things like: Video: h264 (...), yuv420p, 640x360
        const videoMatch = output.match(/Video:.*?\s+(\d+)x(\d+)/i);
        if (videoMatch) {
          width = parseInt(videoMatch[1], 10);
          height = parseInt(videoMatch[2], 10);
        }
      }

      // Check if it has an Audio Stream
      const hasAudio = output.toLowerCase().includes("audio:");

      resolve({
        duration: duration || 10, // default if fails
        width: width || 1280,
        height: height || 720,
        hasAudio
      });
    });
  });
}

// REST APIs
app.post(
  "/api/upload",
  upload.fields([
    { name: "videoFile", maxCount: 1 },
    { name: "audioFile", maxCount: 1 },
  ]),
  async (req: any, res) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const videoField = files?.videoFile?.[0];
      const audioField = files?.audioFile?.[0];

      const result: { [key: string]: any } = {};

      if (videoField) {
        const meta = await getMediaMetadata(videoField.path);
        result.video = {
          filename: videoField.filename,
          originalName: videoField.originalname,
          path: `/uploads/${videoField.filename}`,
          fullPath: videoField.path,
          ...meta,
        };
      }

      if (audioField) {
        const meta = await getMediaMetadata(audioField.path);
        result.audio = {
          filename: audioField.filename,
          originalName: audioField.originalname,
          path: `/uploads/${audioField.filename}`,
          fullPath: audioField.path,
          ...meta,
        };
      }

      res.json({ success: true, files: result });
    } catch (err: any) {
      console.error("Upload handler error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

// Unified Video Blending Pipeline
app.post("/api/blend", async (req: any, res) => {
  const {
    videoFullPath,
    audioFullPath,
    startTime = 0,
    endTime = 5,
    cropX = 0,
    cropY = 0,
    cropW = 200,
    cropH = 200,
    loopType = "ping-pong", // "ping-pong" | "normal"
  } = req.body;

  if (!videoFullPath || !fs.existsSync(videoFullPath)) {
    return res.status(400).json({ success: false, error: "Main video file not found on server." });
  }

  const taskId = Date.now();
  const tempCropPath = path.join(OUTPUTS_DIR, `temp-crop-${taskId}.mp4`);
  const tempRevPath = path.join(OUTPUTS_DIR, `temp-rev-${taskId}.mp4`);
  const tempUnitPath = path.join(OUTPUTS_DIR, `temp-unit-${taskId}.mp4`);
  const extractedAudioPath = path.join(OUTPUTS_DIR, `extracted-audio-${taskId}.mp3`);
  const finalBlendPath = path.join(OUTPUTS_DIR, `blend-${taskId}.mp4`);

  try {
    // 1. EXTRACT SOUNDTRACK OR OBTAIN AUDIO TRACK
    let soundtrackPath = "";
    let audioDuration = 10;

    if (audioFullPath && fs.existsSync(audioFullPath)) {
      console.log(`Extracting audio soundtrack from: ${audioFullPath}`);
      const audioMeta = await getMediaMetadata(audioFullPath);
      audioDuration = audioMeta.duration;

      if (audioMeta.hasAudio) {
        // Run audio extraction
        await new Promise<void>((resolve, reject) => {
          // Extrahiere Audio als MP3
          const extractCmd = `"${ffmpegCmd}" -y -i "${audioFullPath}" -vn -acodec libmp3lame -q:a 2 "${extractedAudioPath}"`;
          exec(extractCmd, (err, stdout, stderr) => {
            if (err) {
              console.error("Audio extraction failed, falling back to copy codec:", stderr);
              // Fallback: try copy if stream is already audio or can be extracted easily
              const fallbackCmd = `"${ffmpegCmd}" -y -i "${audioFullPath}" -vn -c:a copy "${extractedAudioPath}"`;
              exec(fallbackCmd, (fallbackErr) => {
                if (fallbackErr) reject(new Error("Failed to extract audio track."));
                else resolve();
              });
            } else {
              resolve();
            }
          });
        });
        soundtrackPath = extractedAudioPath;
      } else {
        // If the audio source file doesn't actually have audio, use a dummy mute track or fail gracefully
        return res.status(400).json({ success: false, error: "The selected audio source has no audio track." });
      }
    } else {
      // If no audio track loaded, we fall back to the original video's audio track
      console.log("No custom audio tracks provided. Extracting original video audio track.");
      const videoMeta = await getMediaMetadata(videoFullPath);
      audioDuration = videoMeta.duration;
      if (videoMeta.hasAudio) {
        await new Promise<void>((resolve, reject) => {
          const extractCmd = `"${ffmpegCmd}" -y -i "${videoFullPath}" -vn -acodec libmp3lame -q:a 2 "${extractedAudioPath}"`;
          exec(extractCmd, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
        soundtrackPath = extractedAudioPath;
      } else {
        return res.status(400).json({ success: false, error: "No audio tracks present at all. Please upload an audio file." });
      }
    }

    // 2. TRIM AND CROP VIDEO REGION
    console.log(`Trimming [${startTime}s - ${endTime}s] and cropping to ${cropW}x${cropH} at (${cropX}, ${cropY})`);
    
    // Safety check on dimension coordinates (must be even integers for libx264 encoding)
    const cw = Math.floor(cropW / 2) * 2;
    const ch = Math.floor(cropH / 2) * 2;
    const cx = Math.floor(cropX);
    const cy = Math.floor(cropY);

    await new Promise<void>((resolve, reject) => {
      // Crop & remove original audio (-an) to avoid interference
      const cropCmd = `"${ffmpegCmd}" -y -ss ${startTime} -to ${endTime} -i "${videoFullPath}" -vf "crop=${cw}:${ch}:${cx}:${cy}" -an -c:v libx264 -pix_fmt yuv420p "${tempCropPath}"`;
      exec(cropCmd, (err, stdout, stderr) => {
        if (err) {
          console.error("Cropping failed:", stderr);
          reject(err);
        } else {
          resolve();
        }
      });
    });

    const clipDuration = endTime - startTime;
    let loopUnitFile = tempCropPath;
    let loopUnitDuration = clipDuration;

    // 3. SEAMLESS LOOP REVERSAL PREPARATION (PING-PONG)
    if (loopType === "ping-pong") {
      console.log("Preparing Ping-Pong (mirror) loop sequence to remove visible cuts");
      // Create a reversed video segment
      await new Promise<void>((resolve, reject) => {
        const revCmd = `"${ffmpegCmd}" -y -i "${tempCropPath}" -vf "reverse" -c:v libx264 -pix_fmt yuv420p "${tempRevPath}"`;
        exec(revCmd, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Concat original trimmed video + reversed video
      await new Promise<void>((resolve, reject) => {
        const concatCmd = `"${ffmpegCmd}" -y -i "${tempCropPath}" -i "${tempRevPath}" -filter_complex "[0:v][1:v]concat=n=2:v=1:a=0[v]" -map "[v]" -c:v libx264 -pix_fmt yuv420p "${tempUnitPath}"`;
        exec(concatCmd, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      loopUnitFile = tempUnitPath;
      loopUnitDuration = clipDuration * 2;
    }

    // 4. MERGE LOOPS WITH TRACK SYNCHRONIZATION
    // Calculate required loops
    const loopsNeeded = Math.ceil(audioDuration / loopUnitDuration);
    console.log(`Audiospur-Dauer: ${audioDuration}s. Loop-Einheitsdauer: ${loopUnitDuration}s. Anzahl Loops: ${loopsNeeded}`);

    await new Promise<void>((resolve, reject) => {
      // Loop the video stream to match audio track, using libx264 and forcing audio length cutoff
      const mergeCmd = `"${ffmpegCmd}" -y -stream_loop ${loopsNeeded} -i "${loopUnitFile}" -i "${soundtrackPath}" -map 0:v -map 1:a -c:v libx264 -pix_fmt yuv420p -shortest -t ${audioDuration} "${finalBlendPath}"`;
      exec(mergeCmd, (err, stdout, stderr) => {
        if (err) {
          console.error("Merging loops failed:", stderr);
          reject(err);
        } else {
          resolve();
        }
      });
    });

    // Clean up temporary unit clips
    [tempCropPath, tempRevPath, tempUnitPath, extractedAudioPath].forEach((p) => {
      if (fs.existsSync(p)) {
        try { fs.unlinkSync(p); } catch(e) {}
      }
    });

    res.json({
      success: true,
      resultUrl: `/outputs/blend-${taskId}.mp4`,
      duration: audioDuration,
      loops: loopsNeeded,
    });

  } catch (err: any) {
    console.error("Blending processing error:", err);
    // Cleanup files in case of errors
    [tempCropPath, tempRevPath, tempUnitPath, extractedAudioPath, finalBlendPath].forEach((p) => {
      if (fs.existsSync(p)) {
        try { fs.unlinkSync(p); } catch(e) {}
      }
    });
    res.status(500).json({ success: false, error: err.message || "Unknown error during FFmpeg execution." });
  }
});

// Video Compression API Endpoint
app.post("/api/compress", async (req: any, res) => {
  const {
    videoFullPath,
    crfPreset = "medium",         // "low" | "medium" | "high" 
    resolutionPreset = "original"   // "original" | "1080p" | "720p" | "480p"
  } = req.body;

  if (!videoFullPath || !fs.existsSync(videoFullPath)) {
    return res.status(400).json({ success: false, error: "Videodatei zum Komprimieren wurde auf dem Server nicht gefunden." });
  }

  const taskId = Date.now();
  const compressedPath = path.join(OUTPUTS_DIR, `compressed-${taskId}.mp4`);

  try {
    // Translate CRF profile inside standard range (20: heavy visual fidelity, 26: medium, 32: extreme space saving)
    let crf = 26;
    if (crfPreset === "low") crf = 20;
    else if (crfPreset === "high") crf = 32;

    // Apply scale filters, keeping pixels divisible by 2 for proper H264 profile alignment
    let scaleFilter = "";
    if (resolutionPreset === "1085p" || resolutionPreset === "1080p") {
      scaleFilter = "-vf \"scale='min(1920,iw)':-2\"";
    } else if (resolutionPreset === "720p") {
      scaleFilter = "-vf \"scale='min(1280,iw)':-2\"";
    } else if (resolutionPreset === "480p") {
      scaleFilter = "-vf \"scale='min(854,iw)':-2\"";
    }

    console.log(`Starting compression on ${videoFullPath}. CRF: ${crf}, Filter: ${scaleFilter}`);

    // Standard high compatibility Web-H264 command
    const compressCmd = `"${ffmpegCmd}" -y -i "${videoFullPath}" ${scaleFilter} -c:v libx264 -crf ${crf} -preset fast -c:a aac -b:a 128k "${compressedPath}"`;

    await new Promise<void>((resolve, reject) => {
      exec(compressCmd, (err, stdout, stderr) => {
        if (err) {
          console.error("Compression processing failed:", stderr);
          reject(err);
        } else {
          resolve();
        }
      });
    });

    const originalStats = fs.statSync(videoFullPath);
    const compressedStats = fs.statSync(compressedPath);

    res.json({
      success: true,
      resultUrl: `/outputs/compressed-${taskId}.mp4`,
      originalSize: originalStats.size,
      compressedSize: compressedStats.size,
      savingPercent: Math.round(((originalStats.size - compressedStats.size) / originalStats.size) * 100),
    });

  } catch (err: any) {
    console.error("Server-side compression route error:", err);
    if (fs.existsSync(compressedPath)) {
      try { fs.unlinkSync(compressedPath); } catch (e) {}
    }
    res.status(500).json({ success: false, error: err.message || "Unerwarteter Fehler bei der Videokompression." });
  }
});

// Start backend server
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
