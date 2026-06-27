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

// Audio Separation API Endpoint (Stimm-Extraktor)
app.post("/api/split-audio", async (req: any, res) => {
  const { audioFullPath, startTime, endTime } = req.body;

  if (!audioFullPath || !fs.existsSync(audioFullPath)) {
    return res.status(400).json({ success: false, error: "Audiodatei zur Trennung wurde auf dem Server nicht gefunden." });
  }

  const taskId = Date.now();
  const vocalOutPath = path.join(OUTPUTS_DIR, `vocal-${taskId}.mp3`);
  const instrumentalOutPath = path.join(OUTPUTS_DIR, `instrumental-${taskId}.mp3`);

  let trimInputPrefix = "";
  if (startTime !== undefined && endTime !== undefined) {
    const startNum = parseFloat(startTime);
    const endNum = parseFloat(endTime);
    if (!isNaN(startNum) && !isNaN(endNum) && startNum >= 0 && endNum > startNum) {
      trimInputPrefix = `-ss ${startNum} -to ${endNum}`;
    }
  }

  try {
    console.log(`Starting audio separation on ${audioFullPath} (trim: ${startTime}s - ${endTime}s)`);

    // 1. EXTRACT INSTRUMENTAL
    // Subtrahiert den Mono-Anteil (Meist Gesang im Center) und erhält den Bass-Bereich (<180Hz) unberührt für ein sattes Instrumental.
    const instrumentalFilter = "[0:a]asplit=2[low][high];[low]lowpass=f=180[low_mono];[high]highpass=f=180,pan=mono|c0=c0-c1[high_cancel];[low_mono][high_cancel]amix=inputs=2:weights=1.2 1.5";
    const instCmd = `"${ffmpegCmd}" -y ${trimInputPrefix} -i "${audioFullPath}" -filter_complex "${instrumentalFilter}" -c:a libmp3lame -q:a 2 "${instrumentalOutPath}"`;

    await new Promise<void>((resolve, reject) => {
      exec(instCmd, (err, stdout, stderr) => {
        if (err) {
          console.error("Instrumental-Extraktion fehlgeschlagen:", stderr);
          reject(err);
        } else {
          resolve();
        }
      });
    });

    // 2. EXTRACT VOCALS
    // Mischt Left+Right zu Mono, filtert tiefe Frequenzen (<200Hz) und hohe Frequenzen (>3000Hz) heraus,
    // um die Musikbegleitung an den Rändern des Frequenzspektrums abzudämpfen.
    // Ein EQ hebt die charakteristische Gesangspräsenz an, während das agate-Filter (Audio Gate)
    // Hintergrundgeräusche und leise Instrumentenpassagen in Gesangspausen automatisch stummschaltet.
    const vocalFilter = "[0:a]pan=mono|c0=0.5*c0+0.5*c1,highpass=f=200,lowpass=f=3000,equalizer=f=1000:width_type=q:width=1.0:g=4,equalizer=f=2500:width_type=q:width=1.0:g=3.5,agate=threshold=0.05:ratio=5.0:attack=15:release=150:makeup=1.2";
    const vocalCmd = `"${ffmpegCmd}" -y ${trimInputPrefix} -i "${audioFullPath}" -filter_complex "${vocalFilter}" -c:a libmp3lame -q:a 2 "${vocalOutPath}"`;

    await new Promise<void>((resolve, reject) => {
      exec(vocalCmd, (err, stdout, stderr) => {
        if (err) {
          console.error("Vocal-Extraktion fehlgeschlagen:", stderr);
          reject(err);
        } else {
          resolve();
        }
      });
    });

    res.json({
      success: true,
      vocalUrl: `/outputs/vocal-${taskId}.mp3`,
      instrumentalUrl: `/outputs/instrumental-${taskId}.mp3`,
    });

  } catch (err: any) {
    console.error("Audio splitter processing error:", err);
    [vocalOutPath, instrumentalOutPath].forEach(p => {
      if (fs.existsSync(p)) {
        try { fs.unlinkSync(p); } catch (e) {}
      }
    });
    res.status(500).json({ success: false, error: err.message || "Fehler bei der Frequenzttrennung des Audios." });
  }
});

// Video Concatenation API Endpoint (Video-Verkettung)
app.post("/api/concat-videos", async (req: any, res) => {
  const { videoPaths } = req.body;

  if (!videoPaths || !Array.isArray(videoPaths) || videoPaths.length < 2) {
    return res.status(400).json({ success: false, error: "Mindestens zwei Videos müssen zum Verketten angegeben werden." });
  }

  // Verify all files exist
  for (const p of videoPaths) {
    if (!fs.existsSync(p)) {
      return res.status(400).json({ success: false, error: `Video-Datei wurde nicht gefunden: ${path.basename(p)}` });
    }
  }

  const taskId = Date.now();
  const normalizedFiles: string[] = [];
  const outputFilename = `concat-${taskId}.mp4`;
  const outputPath = path.join(OUTPUTS_DIR, outputFilename);
  const concatListPath = path.join(OUTPUTS_DIR, `list-${taskId}.txt`);

  try {
    console.log(`Starting video concatenation for ${videoPaths.length} videos`);

    // Step 1: Normalize each video to 1280x720, 30fps, stereo aac 44100Hz audio (adding silence if missing)
    for (let i = 0; i < videoPaths.length; i++) {
      const inputPath = videoPaths[i];
      const normPath = path.join(OUTPUTS_DIR, `norm-${taskId}-${i}.mp4`);
      normalizedFiles.push(normPath);

      const meta = await getMediaMetadata(inputPath);
      
      let normCmd = "";
      if (meta.hasAudio) {
        normCmd = `"${ffmpegCmd}" -y -i "${inputPath}" -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1" -r 30 -c:v libx264 -pix_fmt yuv420p -b:v 2M -c:a aac -b:a 128k -ar 44100 -ac 2 "${normPath}"`;
      } else {
        normCmd = `"${ffmpegCmd}" -y -i "${inputPath}" -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100 -t ${meta.duration} -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1" -r 30 -c:v libx264 -pix_fmt yuv420p -b:v 2M -c:a aac -b:a 128k -ar 44100 -ac 2 "${normPath}"`;
      }

      console.log(`Normalizing video ${i + 1}/${videoPaths.length}: ${normCmd}`);
      await new Promise<void>((resolve, reject) => {
        exec(normCmd, (err, stdout, stderr) => {
          if (err) {
            console.error(`Error normalizing video ${i}:`, stderr);
            reject(new Error(`Fehler bei der Videonormalisierung von Clip ${i + 1}.`));
          } else {
            resolve();
          }
        });
      });
    }

    // Step 2: Create concat list file
    const listContent = normalizedFiles.map(fp => `file '${fp.replace(/\\/g, "/")}'`).join("\n");
    fs.writeFileSync(concatListPath, listContent);

    // Step 3: Concat normalized videos
    const concatCmd = `"${ffmpegCmd}" -y -f concat -safe 0 -i "${concatListPath}" -c copy "${outputPath}"`;
    console.log(`Running concat command: ${concatCmd}`);

    await new Promise<void>((resolve, reject) => {
      exec(concatCmd, (err, stdout, stderr) => {
        if (err) {
          console.error("Concat command failed:", stderr);
          reject(new Error("Fehler beim Zusammenfügen der normalisierten Videos."));
        } else {
          resolve();
        }
      });
    });

    // Clean up normalized temporary videos and text list file
    for (const fp of normalizedFiles) {
      if (fs.existsSync(fp)) {
        try { fs.unlinkSync(fp); } catch (e) {}
      }
    }
    if (fs.existsSync(concatListPath)) {
      try { fs.unlinkSync(concatListPath); } catch (e) {}
    }

    // Get metadata of the output video
    const finalMeta = await getMediaMetadata(outputPath);

    res.json({
      success: true,
      videoUrl: `/outputs/${outputFilename}`,
      meta: finalMeta
    });

  } catch (err: any) {
    console.error("Concatenation error:", err);
    
    // Clean up any generated files on error
    for (const fp of normalizedFiles) {
      if (fs.existsSync(fp)) {
        try { fs.unlinkSync(fp); } catch (e) {}
      }
    }
    if (fs.existsSync(concatListPath)) {
      try { fs.unlinkSync(concatListPath); } catch (e) {}
    }
    if (fs.existsSync(outputPath)) {
      try { fs.unlinkSync(outputPath); } catch (e) {}
    }

    res.status(500).json({ success: false, error: err.message || "Unbekannter Fehler bei der Zusammenfügung." });
  }
});

// Video Resolution Changer API Endpoint (Auflösung ändern)
app.post("/api/change-resolution", async (req: any, res) => {
  const { videoPath, targetHeight } = req.body;

  if (!videoPath || !fs.existsSync(videoPath)) {
    return res.status(400).json({ success: false, error: "Ungültiger oder fehlender Videopfad." });
  }

  const height = parseInt(targetHeight, 10);
  if (isNaN(height) || height <= 0) {
    return res.status(400).json({ success: false, error: "Ungültige Zielauflösung." });
  }

  const taskId = Date.now();
  const outputFilename = `resized-${taskId}.mp4`;
  const outputPath = path.join(OUTPUTS_DIR, outputFilename);

  // scale=-2:height maintains aspect ratio and keeps width divisible by 2 (required for libx264)
  const resizeCmd = `"${ffmpegCmd}" -y -i "${videoPath}" -vf "scale=-2:${height}" -c:v libx264 -pix_fmt yuv420p -c:a copy "${outputPath}"`;

  console.log(`Resizing video ${videoPath} to height ${height}: ${resizeCmd}`);

  try {
    await new Promise<void>((resolve, reject) => {
      exec(resizeCmd, (err, stdout, stderr) => {
        if (err) {
          console.error("Resizing error output:", stderr);
          reject(new Error("Fehler beim Ändern der Videoauflösung."));
        } else {
          resolve();
        }
      });
    });

    const finalMeta = await getMediaMetadata(outputPath);

    res.json({
      success: true,
      videoUrl: `/outputs/${outputFilename}`,
      meta: finalMeta
    });
  } catch (err: any) {
    console.error(err);
    if (fs.existsSync(outputPath)) {
      try { fs.unlinkSync(outputPath); } catch (e) {}
    }
    res.status(500).json({ success: false, error: err.message || "Fehler bei der Auflösungsänderung." });
  }
});

// Video Frame Extractor API Endpoint (Video in Frames zerhacken)
app.post("/api/extract-frames", async (req: any, res) => {
  const { videoPath, everyXthFrame } = req.body;

  if (!videoPath || !fs.existsSync(videoPath)) {
    return res.status(400).json({ success: false, error: "Ungültiger oder fehlender Videopfad." });
  }

  const step = parseInt(everyXthFrame, 10);
  if (isNaN(step) || step <= 0) {
    return res.status(400).json({ success: false, error: "Der Frame-Abstand muss mindestens 1 betragen." });
  }

  const taskId = Date.now();
  // Frame pattern
  const outputPattern = path.join(OUTPUTS_DIR, `frame-${taskId}-%04d.jpg`);

  // We use scale=480:-2 to make frame extraction fast and keep image sizes manageable for the UI
  const extractCmd = `"${ffmpegCmd}" -y -i "${videoPath}" -vf "select='not(mod(n,${step}))',scale=480:-2" -vsync vfr "${outputPattern}"`;

  console.log(`Extracting every ${step}-th frame from ${videoPath}: ${extractCmd}`);

  try {
    await new Promise<void>((resolve, reject) => {
      exec(extractCmd, (err, stdout, stderr) => {
        if (err) {
          console.error("Frame extraction error:", stderr);
          reject(new Error("Fehler beim Extrahieren der Frames aus dem Video."));
        } else {
          resolve();
        }
      });
    });

    // Read OUTPUTS_DIR to find all files matching frame-taskId-*.jpg
    const files = fs.readdirSync(OUTPUTS_DIR);
    const frameFiles = files
      .filter(f => f.startsWith(`frame-${taskId}-`) && f.endsWith(".jpg"))
      .sort()
      .map(f => `/outputs/${f}`);

    res.json({
      success: true,
      frames: frameFiles,
      totalCount: frameFiles.length
    });
  } catch (err: any) {
    console.error(err);
    // Cleanup any partially generated files
    try {
      const files = fs.readdirSync(OUTPUTS_DIR);
      files.forEach(f => {
        if (f.startsWith(`frame-${taskId}-`)) {
          try { fs.unlinkSync(path.join(OUTPUTS_DIR, f)); } catch (e) {}
        }
      });
    } catch (e) {}

    res.status(500).json({ success: false, error: err.message || "Fehler bei der Frame-Extraktion." });
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
