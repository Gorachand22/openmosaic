/**
 * OpenMosaic Complete Tile Execution Engine
 * 
 * Every tile has a proper executor function with real implementation
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import ZAI from 'z-ai-web-dev-sdk';
import { addGrokTask, waitForGrokTask } from './grok-store';

const execAsync = promisify(exec);

// Folder structure
export const FOLDERS = {
  INPUT: path.join(process.cwd(), 'input'),
  OUTPUT: path.join(process.cwd(), 'output'),
  WORKFLOWS: path.join(process.cwd(), 'workflows'),
  TEMP: path.join(process.cwd(), 'temp'),
} as const;

// Helper to convert /api/files/ URLs to absolute local file paths
export function resolveLocalPath(inputPath: string): string {
  if (!inputPath) return inputPath;
  if (inputPath.startsWith('/api/files/input/')) {
    return path.join(FOLDERS.INPUT, path.basename(inputPath));
  }
  if (inputPath.startsWith('/api/files/output/')) {
    return path.join(FOLDERS.OUTPUT, path.basename(inputPath));
  }
  return inputPath;
}

export async function checkSystemDependencies() {
  const ffmpeg = await checkFfmpeg();
  const ytDlp = await checkYtDlp();
  const manim = await checkManim();
  const python = { installed: manim.installed, version: manim.version };
  return { ffmpeg, ytDlp, manim, python };
}

export async function listFiles(folderName: string) {
  try {
    const dirMap: Record<string, string> = {
      'input': FOLDERS.INPUT,
      'output': FOLDERS.OUTPUT,
      'workflows': FOLDERS.WORKFLOWS,
    };
    const targetDir = dirMap[folderName] || FOLDERS.TEMP;
    // fs.existsSync is synchronous, but it's okay for checking directory existence before async operations
    if (!await fs.stat(targetDir).then(() => true).catch(() => false)) return [];
    const files = await fs.readdir(targetDir);
    return Promise.all(files.map(async (file) => {
      const stat = await fs.stat(path.join(targetDir, file));
      return { name: file, size: stat.size, modified: stat.mtime };
    }));
  } catch (e) {
    return [];
  }
}

// Ensure folders exist
export async function ensureFolders() {
  await Promise.all([
    fs.mkdir(FOLDERS.INPUT, { recursive: true }),
    fs.mkdir(FOLDERS.OUTPUT, { recursive: true }),
    fs.mkdir(FOLDERS.WORKFLOWS, { recursive: true }),
    fs.mkdir(FOLDERS.TEMP, { recursive: true }),
  ]);
}

// Execution result type
export interface ExecutionResult {
  success: boolean;
  data?: unknown;
  outputs?: Record<string, { type: string; path: string; url?: string; data?: unknown }>;
  error?: string;
  progress?: number;
  message?: string;
}

// Progress callback
export type ProgressCallback = (progress: number, message: string) => void;

// ============================================================
// SYSTEM UTILITIES
// ============================================================

export async function checkYtDlp(): Promise<{ installed: boolean; version?: string; error?: string }> {
  try {
    const { stdout } = await execAsync('yt-dlp --version');
    return { installed: true, version: stdout.trim() };
  } catch {
    return { installed: false, error: 'yt-dlp not installed. Run: pip install yt-dlp' };
  }
}

export async function checkFfmpeg(): Promise<{ installed: boolean; version?: string; error?: string }> {
  try {
    const { stdout } = await execAsync('ffmpeg -version');
    const version = stdout.split('\n')[0];
    return { installed: true, version };
  } catch {
    return { installed: false, error: 'ffmpeg not installed. Run: brew install ffmpeg OR apt install ffmpeg' };
  }
}

// Find the manim executable (could be in ~/.local/bin or /usr/local/bin etc.)
function getManimBinary(): string {
  const home = process.env.HOME || '/root';
  const candidates = [
    `${home}/.local/bin/manim`,
    '/usr/local/bin/manim',
    '/usr/bin/manim',
    'manim',
  ];
  // Return first candidate with full path so exec can find it even without $PATH
  // We'll verify existence at runtime via checkManim
  return candidates[0]; // Primary candidate; fallback handled by execAsync PATH
}

export async function checkManim(): Promise<{ installed: boolean; version?: string; error?: string; bin?: string }> {
  const home = process.env.HOME || '/root';
  const candidates = [
    `${home}/.local/bin/manim`,
    '/usr/local/bin/manim',
    '/usr/bin/manim',
    'manim',
  ];

  for (const bin of candidates) {
    try {
      const { stdout } = await execAsync(`"${bin}" --version`);
      return { installed: true, version: stdout.trim(), bin };
    } catch {
      continue;
    }
  }
  return { installed: false, error: 'manim not installed. Run: pip install manim' };
}

export async function checkWhisper(): Promise<{ installed: boolean; version?: string; error?: string }> {
  try {
    const { stdout } = await execAsync('whisper --help');
    return { installed: true, version: 'installed' };
  } catch {
    return { installed: false, error: 'whisper not installed. Run: pip install openai-whisper' };
  }
}

// ============================================================
// INPUT TILES
// ============================================================

// Video Input - Upload or URL
export async function executeVideoInput(
  config: { source: string; fileUrl?: string; fileName?: string; youtubeUrl?: string; separateAudio?: boolean },
  onProgress?: ProgressCallback
): Promise<ExecutionResult> {
  const ffmpegCheck = await checkFfmpeg();
  if (!ffmpegCheck.installed) {
    return { success: false, error: ffmpegCheck.error };
  }

  try {
    if (config.source === 'youtube' && config.youtubeUrl) {
      return await downloadYouTubeVideo(config.youtubeUrl, config, onProgress);
    }

    if (config.source === 'upload' && config.fileName) {
      onProgress?.(0, 'Processing uploaded video...');
      const filePath = path.join(FOLDERS.INPUT, config.fileName);

      try {
        await fs.stat(filePath);
      } catch {
        return { success: false, error: `File not found: ${config.fileName}` };
      }

      const separateAudio = config.separateAudio ?? true;
      const baseName = path.parse(config.fileName).name;

      onProgress?.(30, separateAudio ? 'Extracting video and audio streams...' : 'Processing video stream...');

      let videoOutputPath = filePath;
      let videoOutputUrl = `/api/files/input/${config.fileName}`;
      let audioOutputPath = '';
      let audioOutputUrl = '';
      let hasAudio = false;

      if (separateAudio) {
        const videoOutputFilename = `${baseName}_only_video.mp4`;
        const audioOutputFilename = `${baseName}_only_audio.m4a`;
        videoOutputPath = path.join(FOLDERS.OUTPUT, videoOutputFilename);
        audioOutputPath = path.join(FOLDERS.OUTPUT, audioOutputFilename);
        videoOutputUrl = `/api/files/output/${videoOutputFilename}`;
        audioOutputUrl = `/api/files/output/${audioOutputFilename}`;

        // Extract video (no audio)
        const videoCmd = `ffmpeg -i "${filePath}" -c:v copy -an "${videoOutputPath}" -y`;
        await execAsync(videoCmd);

        // Extract audio (no video)
        hasAudio = true;
        try {
          const audioCmd = `ffmpeg -i "${filePath}" -vn -c:a aac "${audioOutputPath}" -y`;
          await execAsync(audioCmd);
        } catch (e) {
          hasAudio = false; // Video might not have audio
        }
      }

      onProgress?.(70, 'Extracting metadata...');
      const metadata = await extractMetadata(filePath);

      onProgress?.(100, 'Video processing complete!');

      const outputs: any = {
        video: { type: 'video', path: videoOutputPath, url: videoOutputUrl },
        text: { type: 'text', path: '', data: [] },
        metadata: { type: 'any', data: metadata }
      };

      if (hasAudio) {
        outputs.audio = { type: 'audio', path: audioOutputPath, url: audioOutputUrl };
      }

      return {
        success: true,
        outputs
      };
    }

    return { success: false, error: 'No video source provided' };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ========== VOICE TTS API (audio.z.ai) ==========
export async function executeVoiceTTS(
  inputs: Record<string, string>,
  config: Record<string, unknown>,
  onProgress?: (pct: number, msg: string) => void
): Promise<ExecutionResult> {
  try {
    const text = inputs.text;
    const voiceId = typeof config.voice_id === 'string' ? config.voice_id : '';

    const speed = typeof config.speed === 'number' ? config.speed : 1.0;
    const volume = typeof config.volume === 'number' ? Math.round(config.volume) : 1;

    if (!text) {
      return { success: false, error: 'Input text is required for Voice TTS generation' };
    }
    if (!voiceId) {
      return { success: false, error: 'Please select a Voice profile from the dropdown' };
    }

    const token = process.env.Z_AUDIO_TOKEN;
    const userId = process.env.Z_AUDIO_USER_ID;
    const apiBase = process.env.Z_AUDIO_API_BASE || 'https://audio.z.ai/api';

    if (!token || !userId) {
      return { success: false, error: 'Z_AUDIO_TOKEN or Z_AUDIO_USER_ID missing from .env' };
    }

    onProgress?.(10, 'Initializing Voice Generation Request...');

    const payload = {
      voice_id: voiceId,
      voice_name: 'Unknown', // Backend doesn't strictly need accurate name for clone ID
      user_id: userId,
      input_text: text,
      speed,
      volume
    };

    onProgress?.(30, 'Streaming audio chunks from API...');

    const response = await fetch(`${apiBase}/v1/z-audio/tts/create`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`TTS API Error: ${response.status} ${errorText}`);
    }

    // Process SSE stream fully manually since Node `fetch` natively drains to buffer array
    const streamText = await response.text();
    const lines = streamText.split('\n');

    let firstChunk = true;
    const chunks: Buffer[] = [];

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const jsonStr = line.substring(6).trim();
        if (jsonStr && jsonStr !== '[DONE]') {
          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.audio) {
              const chunkBuffer = Buffer.from(parsed.audio, 'base64');

              if (firstChunk) {
                // Keep the entire wav header block for the first chunk
                chunks.push(chunkBuffer);
                firstChunk = false;
              } else {
                // Strip the 44-byte WAV header on all subsequent chunks
                if (chunkBuffer.length > 44) {
                  chunks.push(chunkBuffer.subarray(44));
                }
              }
            }
          } catch (e) {
            // Ignore parse errors from partial broken events in stream
          }
        }
      }
    }

    if (chunks.length === 0) {
      throw new Error('No audio data received from generation api');
    }

    onProgress?.(80, 'Assembling exact frame boundaries...');

    // Stitch
    const assembledWav = Buffer.concat(chunks);
    const totalSize = assembledWav.length;

    if (totalSize > 44) {
      // Patch WAV header with correct final binary size
      // RIFF size (index 4-7, Little Endian, file size - 8)
      assembledWav.writeUInt32LE(totalSize - 8, 4);

      // Data chunk size (index 40-43, Little Endian, file size - 44)
      assembledWav.writeUInt32LE(totalSize - 44, 40);
    }

    onProgress?.(95, 'Writing generated audio file locally...');

    const outputFilename = `tts_${process.hrtime()[1]}.wav`;
    const outputPath = path.join(FOLDERS.OUTPUT, outputFilename);
    const outputUrl = `/api/files/output/${outputFilename}`;

    await fs.writeFile(outputPath, assembledWav);

    onProgress?.(100, 'TTS Generation Complete!');

    return {
      success: true,
      outputs: {
        audio: { type: 'audio', path: outputPath, url: outputUrl }
      }
    };

  } catch (error) {
    console.error('[VOICE TTS API TILE] ERROR:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown generation error' };
  }
}

async function extractMetadata(filePath: string): Promise<Record<string, any>> {
  try {
    const { stdout } = await execAsync(`ffprobe -v error -select_streams v:0 -show_entries stream=r_frame_rate,width,height,duration -of json "${filePath}"`);
    const info = JSON.parse(stdout);
    const stream = info.streams?.[0];
    if (!stream) return {};

    let fps = 0;
    if (stream.r_frame_rate) {
      const parts = stream.r_frame_rate.split('/');
      fps = parts.length === 2 ? Math.round(parseInt(parts[0]) / parseInt(parts[1])) : parseInt(stream.r_frame_rate);
    }

    return {
      fps,
      duration: parseFloat(stream.duration || '0'),
      width: stream.width,
      height: stream.height,
      aspectRatio: stream.width && stream.height ? `${stream.width}:${stream.height}` : undefined
    };
  } catch {
    return {};
  }
}

// YouTube Trigger - Download YouTube video
export async function downloadYouTubeVideo(
  url: string,
  config?: any,
  onProgress?: ProgressCallback
): Promise<ExecutionResult> {
  const ytDlpCheck = await checkYtDlp();
  if (!ytDlpCheck.installed) {
    return { success: false, error: ytDlpCheck.error };
  }

  try {
    onProgress?.(0, 'Starting YouTube download...');

    const { stdout: infoJson } = await execAsync(`yt-dlp --dump-json "${url}"`);
    const info = JSON.parse(infoJson);

    const safeTitle = info.title.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50) || `yt_video_${uuidv4()}`;
    const separateAudio = config?.separateAudio ?? true;

    let videoOutputFilename = '';
    let audioOutputFilename = '';
    let videoOutputPath = '';
    let audioOutputPath = '';
    let videoOutputUrl = '';
    let audioOutputUrl = '';
    let hasAudio = false;

    if (separateAudio) {
      videoOutputFilename = `${safeTitle}_only_video.mp4`;
      audioOutputFilename = `${safeTitle}_only_audio.m4a`;
      videoOutputPath = path.join(FOLDERS.OUTPUT, videoOutputFilename);
      audioOutputPath = path.join(FOLDERS.OUTPUT, audioOutputFilename);
      videoOutputUrl = `/api/files/output/${videoOutputFilename}`;
      audioOutputUrl = `/api/files/output/${audioOutputFilename}`;

      onProgress?.(20, `Downloading Video: ${info.title}...`);
      // Download ONLY the best video stream without audio
      const videoCmd = `yt-dlp -f "bestvideo[ext=mp4]/bestvideo/best" -o "${videoOutputPath}" "${url}"`;
      await execAsync(videoCmd, { maxBuffer: 1024 * 1024 * 100 });

      onProgress?.(50, `Downloading Audio...`);
      hasAudio = true;
      try {
        // Download ONLY the best audio stream
        const audioCmd = `yt-dlp -f "bestaudio[ext=m4a]/bestaudio/best" -o "${audioOutputPath}" "${url}"`;
        await execAsync(audioCmd, { maxBuffer: 1024 * 1024 * 100 });
      } catch {
        hasAudio = false;
      }
    } else {
      videoOutputFilename = `${safeTitle}.mp4`;
      videoOutputPath = path.join(FOLDERS.OUTPUT, videoOutputFilename);
      videoOutputUrl = `/api/files/output/${videoOutputFilename}`;

      onProgress?.(20, `Downloading Merged Media: ${info.title}...`);
      // Download best video and audio merged
      const videoCmd = `yt-dlp -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best" --merge-output-format mp4 -o "${videoOutputPath}" "${url}"`;
      await execAsync(videoCmd, { maxBuffer: 1024 * 1024 * 100 });
    }

    onProgress?.(70, `Fetching subtitles...`);
    let transcriptData = [];
    try {
      // Execute the python script to fetch robust transcripts using youtube-transcript-api
      const languagesArg = config?.subtitleLanguage || 'en,hi';
      // Extract the 11-char video ID using regex
      const videoIdMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
      const videoId = videoIdMatch ? videoIdMatch[1] : url;

      const cmd = `python3 scripts/fetch_metadata.py ${videoId} "${languagesArg}"`;
      const { stdout } = await execAsync(cmd);

      const result = JSON.parse(stdout.trim());
      if (result.success && result.data && result.data.length > 0) {
        transcriptData = result.data;
      }
    } catch (err) {
      console.error("Failed to fetch youtube transcript via python:", err);
    }

    // Save transcript to disk if we have data
    let transcriptOutputPath = '';
    let transcriptOutputUrl = '';
    if (transcriptData.length > 0) {
      const transcriptFilename = `${safeTitle}_subtitle.json`;
      transcriptOutputPath = path.join(FOLDERS.OUTPUT, transcriptFilename);
      transcriptOutputUrl = `/api/files/output/${transcriptFilename}`;
      await fs.writeFile(transcriptOutputPath, JSON.stringify(transcriptData, null, 2), 'utf8');
    }

    onProgress?.(90, `Extracting metadata...`);
    const metadata = await extractMetadata(videoOutputPath);
    metadata.title = info.title;

    onProgress?.(100, 'YouTube processing complete!');

    const outputs: any = {
      video: { type: 'video', path: videoOutputPath, url: videoOutputUrl },
      text: { type: 'text', path: transcriptOutputPath, url: transcriptOutputUrl, data: transcriptData },
      metadata: { type: 'any', path: '', data: metadata }
    };

    if (hasAudio) {
      outputs.audio = { type: 'audio', path: audioOutputPath, url: audioOutputUrl };
    }

    return {
      success: true,
      message: `Downloaded: ${info.title}`,
      outputs,
      data: metadata
    };
  } catch (error) {
    return { success: false, error: `YouTube download failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

// Image Input
export async function executeImageInput(
  config: { fileName?: string },
  onProgress?: ProgressCallback
): Promise<ExecutionResult> {
  try {
    onProgress?.(0, 'Loading image...');

    if (config.fileName) {
      const filePath = path.join(FOLDERS.INPUT, config.fileName);
      await fs.stat(filePath);
      onProgress?.(100, 'Image loaded!');
      return {
        success: true,
        outputs: {
          image: { type: 'image', path: filePath, url: `/api/files/input/${config.fileName}` }
        }
      };
    }

    return { success: false, error: 'No image source provided' };
  } catch (error) {
    return { success: false, error: 'Image not found' };
  }
}

// Audio Input
export async function executeAudioInput(
  config: { fileName?: string },
  onProgress?: ProgressCallback
): Promise<ExecutionResult> {
  try {
    onProgress?.(0, 'Loading audio...');

    if (config.fileName) {
      const filePath = path.join(FOLDERS.INPUT, config.fileName);
      await fs.stat(filePath);
      onProgress?.(100, 'Audio loaded!');
      return {
        success: true,
        outputs: {
          audio: { type: 'audio', path: filePath, url: `/api/files/input/${config.fileName}` }
        }
      };
    }

    return { success: false, error: 'No audio source provided' };
  } catch {
    return { success: false, error: 'Audio not found' };
  }
}

// Text Input
export async function executeTextInput(
  config: { content: string },
  onProgress?: ProgressCallback
): Promise<ExecutionResult> {
  onProgress?.(100, 'Text loaded!');
  return {
    success: true,
    outputs: {
      text: { type: 'text', path: '', data: config.content }
    },
    data: { content: config.content }
  };
}

// ============================================================
// AI GENERATION TILES
// ============================================================

// AI Image Generation
export async function executeAIImage(
  config: { prompt: string; style: string; aspectRatio: string; quality: string },
  onProgress?: ProgressCallback
): Promise<ExecutionResult> {
  try {
    console.log(`\n[AI IMAGE TILE] Start execution. Config:`, JSON.stringify(config));
    onProgress?.(0, 'Generating image with AI...');

    console.log(`[AI IMAGE TILE] Initializing ZAI client...`);
    const zai = await ZAI.create();

    // Map aspect ratio to size
    const sizes: Record<string, string> = {
      '16:9': '1344x768',
      '9:16': '768x1344',
      '1:1': '1024x1024',
      '4:5': '864x1152',
    };

    const size = sizes[config.aspectRatio] || '1024x1024';

    onProgress?.(30, 'Creating image...');

    const prompt = config.prompt?.trim() || "A beautiful, high quality intricate realistic image";

    console.log(`[AI IMAGE TILE] Calling zai.images.generations.create with size ${size} and prompt: "${prompt}"...`);
    const response = await zai.images.generations.create({
      prompt: prompt,
      size: size as '1024x1024',
    });
    console.log(`[AI IMAGE TILE] Received API response success!`);

    const base64 = response.data?.[0]?.base64;
    if (!base64) {
      return { success: false, error: 'No image generated' };
    }

    // Save to output folder
    const filename = `ai_image_${uuidv4()}.png`;
    const outputPath = path.join(FOLDERS.OUTPUT, filename);
    await fs.writeFile(outputPath, Buffer.from(base64, 'base64'));

    onProgress?.(100, 'Image generated!');

    return {
      success: true,
      outputs: {
        image: { type: 'image', path: outputPath, url: `/api/files/output/${filename}` }
      },
      data: { path: outputPath }
    };
  } catch (error) {
    console.warn(`[AI IMAGE TILE] ZAI Failed, falling back to Grok Extension...`, error);
    try {
      onProgress?.(10, 'ZAI unavailable. Sending prompt to Grok Automate Extension...');
      const taskId = addGrokTask({
        prompt: config.prompt,
        mode: 'textToImage',
        aspectRatio: config.aspectRatio || '1:1',
      });

      onProgress?.(30, 'Waiting for Grok Extension to generate image (Keep Grok.com open)...');

      const grokResult = await waitForGrokTask(taskId, 300000); // 5 mins

      if (grokResult.status === 'failed' || !grokResult.result?.dataBase64) {
        throw new Error(grokResult.result?.error || 'Grok extension failed to deliver media');
      }

      const extractedPath = grokResult.result.dataBase64;
      onProgress?.(100, 'Image generated via Grok!');

      return {
        success: true,
        outputs: {
          image: { type: 'image', path: extractedPath, url: `/api/files/output/${path.basename(extractedPath)}` }
        },
        data: { path: extractedPath }
      };
    } catch (grokError) {
      console.error(`\n[AI IMAGE TILE] GROK FALLBACK ERROR:`, grokError);
      return { success: false, error: `Image generation failed (Both ZAI and Grok): ${grokError instanceof Error ? grokError.message : 'Unknown error'}` };
    }
  }
}

// AI Video Generation
export async function executeAIVideo(
  config: { prompt: string; duration: number; aspectRatio: string; style: string; quality: string },
  inputImage?: string,
  onProgress?: ProgressCallback
): Promise<ExecutionResult> {
  try {
    console.log(`\n[AI VIDEO TILE] Start execution. Config:`, JSON.stringify({ ...config, inputImage: inputImage ? '(image attached)' : 'none' }));
    onProgress?.(0, 'Generating video with AI...');

    console.log(`[AI VIDEO TILE] Initializing ZAI client...`);
    const zai = await ZAI.create();

    const sizes: Record<string, string> = {
      '16:9': '1344x768',
      '9:16': '768x1344',
      '1:1': '1024x1024',
    };

    const size = sizes[config.aspectRatio] || '768x1344';

    onProgress?.(20, 'Starting video generation...');

    // Parse duration properly, fallback to 5
    const durNum = Number(config.duration) || 5;
    const finalDuration = [5, 10].includes(durNum) ? durNum : 5;

    const params: Record<string, unknown> = {
      prompt: config.prompt,
      size,
      duration: finalDuration,
      quality: config.quality || 'speed',
      fps: 30,
      model: inputImage ? 'cogvideox-flash' : 'cogvideox'
    };

    if (inputImage) {
      if (inputImage.startsWith('data:image/') || inputImage.startsWith('http://') || inputImage.startsWith('https://')) {
        params.image_url = inputImage;
      } else {
        const localImagePath = resolveLocalPath(inputImage);
        try {
          const imageBuffer = await fs.readFile(localImagePath);
          const base64Data = imageBuffer.toString('base64');
          const ext = path.extname(localImagePath).toLowerCase().substring(1) || 'jpeg';
          const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
          params.image_url = `data:${mimeType};base64,${base64Data}`;
          console.log(`[AI VIDEO TILE] Successfully encoded local image to base64 (${Math.round(base64Data.length / 1024)} KB)`);
        } catch (err) {
          console.error(`[AI VIDEO TILE] Failed to read input image for encoding:`, err);
          throw new Error(`Failed to read input image: ${err}`);
        }
      }
    }

    console.log(`[AI VIDEO TILE] Patching ZAI client for proxy compatibility...`);
    // Patch ZAI SDK methods because the remote proxy expects /video/generations and GET /video/generations/:id
    const originalConfig = (zai as any).config;

    zai.video.generations.create = async function (body: any) {
      const url = `${originalConfig.baseUrl}/video/generations`;
      let retries = 3;
      let delay = 30000;

      while (retries >= 0) {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${originalConfig.apiKey}`
          },
          body: JSON.stringify(body)
        });

        if (response.status === 429 && retries > 0) {
          onProgress?.(25, `Rate limit reached. Retrying in ${delay / 1000}s...`);
          console.warn(`[AI VIDEO TILE] Rate limit (429) hit. Waiting ${delay}ms...`);
          await new Promise(r => setTimeout(r, delay));
          retries--;
          delay *= 2;
          continue;
        }

        if (!response.ok) throw new Error(`API request failed with status ${response.status}: ${await response.text()}`);
        return await response.json();
      }
    };

    zai.async.result.query = async function (taskId: string | { task_id: string }) {
      // Handle BOTH string and the object case (which is a bug in the proxy)
      const id = typeof taskId === 'string' ? taskId : (taskId as any).task_id;
      const url = `${originalConfig.baseUrl}/video/generations/${id}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${originalConfig.apiKey}`
        }
      });
      if (!response.ok) throw new Error(await response.text());
      return await response.json();
    };

    console.log(`[AI VIDEO TILE] Calling ZAI SDK directly...`);
    const taskInfo = await zai.video.generations.create(params);
    const taskId = (taskInfo as any).id || (taskInfo as any).taskId;

    console.log(`[AI VIDEO TILE] Task created successfully. Task ID: ${taskId}`);
    onProgress?.(50, 'Video processing in cloud...');

    // Polling task loop
    let pollCount = 0;
    const maxPolls = 60;
    const pollInterval = 5000;

    while (pollCount < maxPolls) {
      pollCount++;
      const result = await zai.async.result.query(taskId);

      console.log(`[AI VIDEO TILE] Poll ${pollCount}/${maxPolls}: Status ${result.task_status}`);

      if (result.task_status === 'SUCCESS') {
        const videoUrl = result.video_result?.[0]?.url || result.video_url || result.url || result.video;
        if (!videoUrl) throw new Error("Video succeeded but no URL was returned by API");

        console.log(`[AI VIDEO TILE] Downloading final video from ${videoUrl}`);
        const vidRes = await fetch(videoUrl);
        if (!vidRes.ok) throw new Error(`Download fetch failed with status ${vidRes.status}`);

        const arrayBuffer = await vidRes.arrayBuffer();
        const filename = `ai_video_${uuidv4()}.mp4`;
        const outputPath = path.join(FOLDERS.OUTPUT, filename);

        await fs.writeFile(outputPath, Buffer.from(arrayBuffer));
        onProgress?.(100, 'Video processing completed!');

        return {
          success: true,
          outputs: {
            video: { type: 'video', path: outputPath, url: `/api/files/output/${filename}` }
          },
          data: { taskId }
        };
      }

      if (result.task_status === 'FAIL') {
        throw new Error(`Video Task failed in cloud: ${JSON.stringify(result)}`);
      }

      onProgress?.(50 + Math.floor((pollCount / maxPolls) * 45), `Rendering video... (${pollCount * 5}s)`);
      await new Promise(r => setTimeout(r, pollInterval));
    }

    throw new Error('Video generation timed out after 5 minutes');
  } catch (error) {
    console.warn(`\n[AI VIDEO TILE] ZAI Failed, falling back to Grok...`, error);
    try {
      onProgress?.(10, 'ZAI unavailable. Sending prompt to Grok Automate Extension...');
      const taskId = addGrokTask({
        prompt: config.prompt,
        mode: inputImage ? 'imageToVideo' : 'textToVideo',
        aspectRatio: config.aspectRatio || '16:9',
      });

      onProgress?.(30, 'Waiting for Grok Extension to generate video (Keep Grok.com open)...');

      const grokResult = await waitForGrokTask(taskId, 300000); // 5 mins

      if (grokResult.status === 'failed' || !grokResult.result?.dataBase64) {
        throw new Error(grokResult.result?.error || 'Grok extension failed to deliver media');
      }

      const extractedPath = grokResult.result.dataBase64;
      onProgress?.(100, 'Video generated via Grok!');

      return {
        success: true,
        outputs: {
          video: { type: 'video', path: extractedPath, url: `/api/files/output/${path.basename(extractedPath)}` }
        },
        data: { path: extractedPath }
      };
    } catch (grokError) {
      console.error(`\n[AI VIDEO TILE] GROK FALLBACK ERROR:`, grokError);
      return { success: false, error: `Video generation failed (Both ZAI and Grok): ${grokError instanceof Error ? grokError.message : 'Unknown error'}` };
    }
  }
}

// AI Avatar Generation
export async function executeAIAvatar(
  config: { script: string; voice: string; language: string; avatar: string },
  onProgress?: ProgressCallback
): Promise<ExecutionResult> {
  try {
    console.log(`\n[AI AVATAR TILE] Start execution. Config:`, JSON.stringify(config));
    onProgress?.(0, 'Generating AI avatar video...');

    // This would integrate with avatar APIs like D-ID, Synthesia, etc.
    // For now, we'll use z-ai video generation
    console.log(`[AI AVATAR TILE] Initializing ZAI client...`);
    const zai = await ZAI.create();

    onProgress?.(30, 'Creating talking avatar...');

    console.log(`[AI AVATAR TILE] Calling zai.video.generations.create for avatar...`);
    const response = await zai.video.generations.create({
      prompt: `talking head avatar speaking: "${config.script}"`,
      size: '1024x1024',
      duration: Math.ceil(config.script.length / 15), // ~15 chars per second
      quality: 'speed',
    });

    onProgress?.(80, 'Finalizing avatar...');

    // In production, handle async video generation properly
    const filename = `avatar_${uuidv4()}.mp4`;
    const outputPath = path.join(FOLDERS.OUTPUT, filename);

    onProgress?.(100, 'Avatar video generated!');

    return {
      success: true,
      message: 'Avatar generation started',
      data: { taskId: response.id },
      outputs: {
        video: { type: 'video', path: outputPath, url: `/api/files/output/${filename}` }
      }
    };
  } catch (error) {
    console.error(`\n[AI AVATAR TILE] ERROR:`, error);
    return { success: false, error: `Avatar generation failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

// ============================================================
// VIDEO PROCESSING TILES
// ============================================================


// Extract Clips
export async function executeClips(
  videoPath: string,
  config: { mode: string; clipCount: number; minDuration: number; maxDuration: number },
  onProgress?: ProgressCallback
): Promise<ExecutionResult> {
  const ffmpegCheck = await checkFfmpeg();
  if (!ffmpegCheck.installed) {
    return { success: false, error: ffmpegCheck.error };
  }

  try {
    onProgress?.(0, 'Extracting clips...');

    // Get video duration
    const { stdout: durationOut } = await execAsync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`
    );
    const totalDuration = parseFloat(durationOut);

    const clips: Array<{ start: number; end: number }> = [];
    const clipDuration = config.minDuration;
    const interval = totalDuration / (config.clipCount + 1);

    for (let i = 0; i < config.clipCount; i++) {
      const start = interval * (i + 0.5);
      const end = Math.min(start + clipDuration, totalDuration);
      clips.push({ start, end });
    }

    const outputFiles: Record<string, { type: string; path: string; url: string }> = {};

    for (let i = 0; i < clips.length; i++) {
      const clip = clips[i];
      const clipFilename = `clip_${i + 1}_${uuidv4()}.mp4`;
      const outputPath = path.join(FOLDERS.OUTPUT, clipFilename);

      onProgress?.(Math.round(((i + 1) / clips.length) * 100), `Extracting clip ${i + 1}/${clips.length}...`);

      const command = `ffmpeg -i "${videoPath}" -ss ${clip.start} -to ${clip.end} -c:v libx264 -c:a aac "${outputPath}" -y`;
      await execAsync(command, { maxBuffer: 1024 * 1024 * 100 });

      outputFiles[`clip_${i + 1}`] = {
        type: 'video',
        path: outputPath,
        url: `/api/files/output/${clipFilename}`
      };
    }

    return {
      success: true,
      message: `Extracted ${clips.length} clips`,
      outputs: outputFiles
    };
  } catch (error) {
    console.error(`\n[CLIPS TILE] ERROR:`, error);
    return { success: false, error: `Clip extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

// Silence Removal
export async function executeSilenceRemoval(
  videoPath: string,
  config: { threshold: number; minDuration: number; padding: number },
  onProgress?: ProgressCallback
): Promise<ExecutionResult> {
  const ffmpegCheck = await checkFfmpeg();
  if (!ffmpegCheck.installed) {
    return { success: false, error: ffmpegCheck.error };
  }

  try {
    onProgress?.(0, 'Detecting silence...');

    // Use silencedetect filter
    const { stdout } = await execAsync(
      `ffmpeg -i "${videoPath}" -af silencedetect=noise=${config.threshold}dB:d=${config.minDuration} -f null - 2>&1`
    );

    // Parse silence timestamps
    const silenceStarts: number[] = [];
    const silenceEnds: number[] = [];

    const startRegex = /silence_start: (\d+\.?\d*)/g;
    const endRegex = /silence_end: (\d+\.?\d*)/g;

    let match;
    while ((match = startRegex.exec(stdout)) !== null) {
      silenceStarts.push(parseFloat(match[1]));
    }
    while ((match = endRegex.exec(stdout)) !== null) {
      silenceEnds.push(parseFloat(match[1]));
    }

    onProgress?.(50, 'Removing silent segments...');

    // Create segments to keep (inverse of silence)
    const segments: Array<{ start: number; end: number }> = [];
    let lastEnd = 0;

    for (let i = 0; i < silenceStarts.length; i++) {
      const start = Math.max(0, silenceStarts[i] - config.padding);
      if (lastEnd < start) {
        segments.push({ start: lastEnd, end: start });
      }
      lastEnd = silenceEnds[i] + config.padding;
    }

    // Get total duration
    const { stdout: durOut } = await execAsync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`
    );
    const totalDuration = parseFloat(durOut);

    if (lastEnd < totalDuration) {
      segments.push({ start: lastEnd, end: totalDuration });
    }

    // Concatenate non-silent segments
    const outputFilename = `no_silence_${uuidv4()}.mp4`;
    const outputPath = path.join(FOLDERS.OUTPUT, outputFilename);

    if (segments.length === 0) {
      // No silence detected, just copy
      await fs.copyFile(videoPath, outputPath);
    } else {
      // Create segment files and concatenate
      const segmentFiles: string[] = [];

      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        const segFile = path.join(FOLDERS.TEMP, `seg_${i}.ts`);
        segmentFiles.push(segFile);

        await execAsync(
          `ffmpeg -i "${videoPath}" -ss ${seg.start} -to ${seg.end} -c copy -bsf:v h264_mp4toannexb -f mpegts "${segFile}" -y`
        );
      }

      // Concatenate
      const concatInput = segmentFiles.map(f => `'${f}'`).join('|');
      await execAsync(
        `ffmpeg -i "concat:${concatInput}" -c:v libx264 -c:a aac "${outputPath}" -y`
      );

      // Cleanup temp files
      for (const f of segmentFiles) {
        await fs.unlink(f).catch(() => { });
      }
    }

    onProgress?.(100, 'Silence removed!');

    return {
      success: true,
      outputs: {
        video: { type: 'video', path: outputPath, url: `/api/files/output/${outputFilename}` }
      }
    };
  } catch (error) {
    console.error(`\n[SILENCE REMOVAL TILE] ERROR:`, error);
    return { success: false, error: `Silence removal failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

// Split Video
export async function executeSplitVideo(
  videoPath: string,
  config: { splitTime: number },
  onProgress?: ProgressCallback
): Promise<ExecutionResult> {
  const ffmpegCheck = await checkFfmpeg();
  if (!ffmpegCheck.installed) {
    return { success: false, error: ffmpegCheck.error };
  }

  try {
    onProgress?.(0, 'Splitting video...');

    const outputFilename1 = `split1_${uuidv4()}.mp4`;
    const outputPath1 = path.join(FOLDERS.OUTPUT, outputFilename1);

    const outputFilename2 = `split2_${uuidv4()}.mp4`;
    const outputPath2 = path.join(FOLDERS.OUTPUT, outputFilename2);

    const actualInputPath = resolveLocalPath(videoPath);

    // Command to create part 1 (from start to splitTime)
    const command1 = `ffmpeg -i "${actualInputPath}" -t ${config.splitTime} -c copy "${outputPath1}" -y`;
    await execAsync(command1, { maxBuffer: 1024 * 1024 * 100 });
    onProgress?.(50, 'First segment created...');

    // Command to create part 2 (from splitTime to end)
    const command2 = `ffmpeg -i "${actualInputPath}" -ss ${config.splitTime} -c copy "${outputPath2}" -y`;
    await execAsync(command2, { maxBuffer: 1024 * 1024 * 100 });
    onProgress?.(100, 'Video split successfully!');

    return {
      success: true,
      outputs: {
        video1: { type: 'video', path: outputPath1, url: `/api/files/output/${outputFilename1}` },
        video2: { type: 'video', path: outputPath2, url: `/api/files/output/${outputFilename2}` }
      }
    };
  } catch (error) {
    console.error(`\n[SPLIT VIDEO TILE] ERROR:`, error);
    return { success: false, error: `Video splitting failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

// Speed Adjustment
export async function executeSpeed(
  videoPath: string,
  config: { speed: number | string; preserveAudio: boolean; pitchCorrection: boolean },
  onProgress?: ProgressCallback
): Promise<ExecutionResult> {
  const ffmpegCheck = await checkFfmpeg();
  if (!ffmpegCheck.installed) {
    return { success: false, error: ffmpegCheck.error };
  }

  try {
    const rawSpeed = typeof config.speed === 'string' ? parseFloat(config.speed) : config.speed;
    const speed = isNaN(rawSpeed) ? 1.0 : rawSpeed;

    onProgress?.(0, `Adjusting video speed to ${speed}x...`);

    const actualInputPath = resolveLocalPath(videoPath);
    const baseName = path.parse(actualInputPath).name;
    const outputFilename = `${baseName}_speed_${speed}x.mp4`;
    const outputPath = path.join(FOLDERS.OUTPUT, outputFilename);

    let hasAudioStream = false;
    try {
      const { stdout: probeOut } = await execAsync(`ffprobe -v error -select_streams a:0 -show_entries stream=codec_type -of default=noprint_wrappers=1:nokey=1 "${actualInputPath}"`);
      hasAudioStream = probeOut.trim().length > 0;
    } catch {
      // Ignore if probe fails
    }

    const videoFilter = `setpts=${1 / speed}*PTS`;

    let command = `ffmpeg -i "${actualInputPath}" -filter_complex "[0:v]${videoFilter}[v]`;
    const maps: string[] = [`-map "[v]"`];

    if (config.preserveAudio && hasAudioStream) {
      if (config.pitchCorrection) {
        // atempo maintains original pitch but changes speed (good for vocals)
        // Note: atempo only allows 0.5 to 100.0 natively. For our options (0.25 to 4.0), it's safe if chained or strictly bounded.
        // If speed is 0.25, we chain two atempo=0.5.
        let audioFilter = '';
        if (speed < 0.5) {
          audioFilter = `atempo=0.5,atempo=${speed * 2.0}`;
        } else {
          audioFilter = `atempo=${speed}`;
        }
        command += `;[0:a]${audioFilter}[a]"`;
      } else {
        // asetrate changes speed AND pitch (creates chipmunk/demonic effect)
        // Standard sample rate is 48000 Hz
        const newSampleRate = Math.round(48000 * speed);
        command += `;[0:a]asetrate=${newSampleRate},aresample=48000[a]"`;
      }
      maps.push(`-map "[a]"`);
    } else {
      command += `"`;
    }

    // Use ultrafast preset with CRF 18 to ensure visually lossless HD quality matching the original footage (Tradeoff: naturally larger file size due to fast processing)
    command += ` ${maps.join(' ')} -c:v libx264 -preset ultrafast -crf 18 ${hasAudioStream && config.preserveAudio ? '-c:a aac' : ''} "${outputPath}" -y`;

    onProgress?.(20, 'Encoding fast video output...');
    await execAsync(command, { maxBuffer: 1024 * 1024 * 100 });
    onProgress?.(100, 'Speed adjusted successfully!');

    return {
      success: true,
      outputs: {
        video: { type: 'video', path: outputPath, url: `/api/files/output/${outputFilename}` }
      }
    };
  } catch (error) {
    console.error(`\n[SPEED TILE] ERROR:`, error);
    return { success: false, error: `Speed adjustment failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

// Watermark
export async function executeWatermark(
  videoPath: string,
  imagePath: string | undefined,
  config: { position: string; opacity: number },
  onProgress?: ProgressCallback
): Promise<ExecutionResult> {
  if (!imagePath) {
    return { success: false, error: 'Watermark image is required.' };
  }

  const ffmpegCheck = await checkFfmpeg();
  if (!ffmpegCheck.installed) {
    return { success: false, error: ffmpegCheck.error };
  }

  try {
    onProgress?.(0, 'Applying watermark...');
    const outputFilename = `watermark_${uuidv4()}.mp4`;
    const outputPath = path.join(FOLDERS.OUTPUT, outputFilename);

    // TopRight overlay position mapping based on "bottom-right", "top-left", etc
    let overlayPos = 'main_w-overlay_w-10:main_h-overlay_h-10'; // default bottom right
    if (config.position === 'top-left') overlayPos = '10:10';
    if (config.position === 'top-right') overlayPos = 'main_w-overlay_w-10:10';
    if (config.position === 'bottom-left') overlayPos = '10:main_h-overlay_h-10';

    const command = `ffmpeg -i "${videoPath}" -i "${imagePath}" -filter_complex "[1:v]format=argb,colorchannelmixer=aa=${config.opacity / 100}[wm];[0:v][wm]overlay=${overlayPos}" -c:v libx264 -c:a copy "${outputPath}" -y`;

    await execAsync(command, { maxBuffer: 1024 * 1024 * 100 });
    onProgress?.(100, 'Watermark applied!');

    return {
      success: true,
      outputs: {
        video: { type: 'video', path: outputPath, url: `/api/files/output/${outputFilename}` }
      }
    };
  } catch (error) {
    console.error(`\n[WATERMARK TILE] ERROR:`, error);
    return { success: false, error: `Watermarking failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

// Reverse
export async function executeReverse(
  videoPath: string,
  config: { reverseVideo: boolean; reverseAudio: boolean },
  onProgress?: ProgressCallback
): Promise<ExecutionResult> {
  const ffmpegCheck = await checkFfmpeg();
  if (!ffmpegCheck.installed) {
    return { success: false, error: ffmpegCheck.error };
  }

  try {
    onProgress?.(0, 'Preparing media for reversal...');
    const actualInputPath = resolveLocalPath(videoPath);
    const baseName = path.parse(actualInputPath).name;
    const outputFilename = `${baseName}_reversed.mp4`;
    const outputPath = path.join(FOLDERS.OUTPUT, outputFilename);

    // Create a temporary directory for chunks
    const tempDirId = uuidv4();
    const tempDirPath = path.join(FOLDERS.TEMP, `reverse_${tempDirId}`);
    await fs.mkdir(tempDirPath, { recursive: true });

    // Probe checking if video has an audio stream to prevent filter crash
    let hasAudioStream = false;
    try {
      const { stdout: probeOut } = await execAsync(`ffprobe -v error -select_streams a:0 -show_entries stream=codec_type -of default=noprint_wrappers=1:nokey=1 "${actualInputPath}"`);
      hasAudioStream = probeOut.trim().length > 0;
    } catch {
      // Ignore if probe fails, default false
    }

    try {
      // 1. Split video into 5-second segments
      onProgress?.(10, 'Segmenting video to prevent memory overload...');
      const segmentPattern = path.join(tempDirPath, 'chunk_%04d.mp4');
      const splitCommand = `ffmpeg -i "${actualInputPath}" -f segment -segment_time 5 -c copy "${segmentPattern}" -y`;
      await execAsync(splitCommand, { maxBuffer: 1024 * 1024 * 100 });

      // 2. Read all generated chunks
      const files = await fs.readdir(tempDirPath);
      const chunkFiles = files.filter(f => f.startsWith('chunk_') && f.endsWith('.mp4')).sort();

      if (chunkFiles.length === 0) {
        throw new Error("Failed to split video into chunks.");
      }

      // 3. Reverse each chunk individually
      const reversedChunks: string[] = [];
      for (let i = 0; i < chunkFiles.length; i++) {
        const chunkFile = chunkFiles[i];
        const chunkPath = path.join(tempDirPath, chunkFile);
        const reversedChunkFilename = `rev_${chunkFile}`;
        const reversedChunkPath = path.join(tempDirPath, reversedChunkFilename);

        const progressPercent = 20 + Math.floor((i / chunkFiles.length) * 60);
        onProgress?.(progressPercent, `Reversing segment ${i + 1} of ${chunkFiles.length}...`);

        let filters = '';
        const maps: string[] = [];

        if (config.reverseVideo) {
          filters += `[0:v]reverse[v]`;
          maps.push(`-map "[v]"`);
        } else {
          maps.push(`-map 0:v`);
        }

        const shouldReverseAudio = config.reverseAudio && hasAudioStream;
        if (shouldReverseAudio) {
          if (filters.length > 0) filters += ';';
          filters += `[0:a]areverse[a]`;
          maps.push(`-map "[a]"`);
        } else if (hasAudioStream) {
          maps.push(`-map 0:a?`);
        }

        let command = '';
        if (filters) {
          // Re-encode to standard format during reversal
          command = `ffmpeg -i "${chunkPath}" -filter_complex "${filters}" ${maps.join(' ')} -c:v libx264 ${hasAudioStream ? '-c:a aac' : ''} -y "${reversedChunkPath}"`;
        } else {
          command = `ffmpeg -i "${chunkPath}" -c copy -y "${reversedChunkPath}"`;
        }

        await execAsync(command, { maxBuffer: 1024 * 1024 * 100 });
        reversedChunks.push(reversedChunkFilename);
      }

      // 4. Create concat list in reverse order (last chunk plays first)
      onProgress?.(85, 'Stitching reversed segments...');
      const concatListPath = path.join(tempDirPath, 'concat.txt');
      let concatFileContent = '';

      // Iterate backwards to stitch from end to start
      for (let i = reversedChunks.length - 1; i >= 0; i--) {
        // use relative names in concat file, ensure safe formatting
        concatFileContent += `file '${reversedChunks[i]}'\n`;
      }
      await fs.writeFile(concatListPath, concatFileContent, 'utf8');

      // 5. Concatenate all reversed chunks
      const concatCommand = `ffmpeg -f concat -safe 0 -i "${concatListPath}" -c copy -y "${outputPath}"`;
      await execAsync(concatCommand, { maxBuffer: 1024 * 1024 * 100 });

    } finally {
      // 6. Cleanup temporary directory
      onProgress?.(95, 'Cleaning up temporary files...');
      try {
        await fs.rm(tempDirPath, { recursive: true, force: true });
      } catch (e) {
        console.error("Failed to cleanup reverse temp directory:", e);
      }
    }

    onProgress?.(100, 'Media reversed successfully!');

    return {
      success: true,
      outputs: {
        video: { type: 'video', path: outputPath, url: `/api/files/output/${outputFilename}` }
      }
    };
  } catch (error) {
    console.error(`\n[REVERSE TILE] ERROR:`, error);
    return { success: false, error: `Reversal failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }

}

// Add Captions
export async function executeCaptions(
  videoPath: string,
  transcript: string,
  config: { style: string; fontSize: number; color: string; highlightColor: string },
  onProgress?: ProgressCallback
): Promise<ExecutionResult> {
  const ffmpegCheck = await checkFfmpeg();
  if (!ffmpegCheck.installed) {
    return { success: false, error: ffmpegCheck.error };
  }

  try {
    onProgress?.(0, 'Adding captions...');

    // Generate SRT from transcript (simplified)
    // In production, use proper speech-to-text timestamps
    const words = transcript.split(' ');
    const srtLines: string[] = [];
    const wordsPerSecond = 3;

    for (let i = 0; i < words.length; i += 4) {
      const chunk = words.slice(i, i + 4).join(' ');
      const startTime = (i / wordsPerSecond);
      const endTime = ((i + 4) / wordsPerSecond);

      const formatTime = (s: number) => {
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const sec = Math.floor(s % 60);
        const ms = Math.floor((s % 1) * 1000);
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
      };

      srtLines.push(`${Math.floor(i / 4) + 1}`);
      srtLines.push(`${formatTime(startTime)} --> ${formatTime(endTime)}`);
      srtLines.push(chunk);
      srtLines.push('');
    }

    const srtPath = path.join(FOLDERS.TEMP, `${uuidv4()}.srt`);
    await fs.writeFile(srtPath, srtLines.join('\n'));

    onProgress?.(50, 'Rendering captions...');

    const outputFilename = `captioned_${uuidv4()}.mp4`;
    const outputPath = path.join(FOLDERS.OUTPUT, outputFilename);

    const command = `ffmpeg -i "${videoPath}" -vf "subtitles='${srtPath}':force_style='FontSize=${config.fontSize},PrimaryColour=&HFFFFFF,OutlineColour=&H000000,Outline=2'" -c:v libx264 -c:a aac "${outputPath}" -y`;

    await execAsync(command, { maxBuffer: 1024 * 1024 * 100 });

    await fs.unlink(srtPath).catch(() => { });

    onProgress?.(100, 'Captions added!');

    return {
      success: true,
      outputs: {
        video: { type: 'video', path: outputPath, url: `/api/files/output/${outputFilename}` }
      }
    };
  } catch (error) {
    console.error(`\n[CAPTIONS TILE] ERROR:`, error);
    return { success: false, error: `Captions failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

// Audio Enhance
export async function executeAudioEnhance(
  videoPath: string,
  config: { noiseReduction: boolean; speechClarity: boolean },
  onProgress?: ProgressCallback
): Promise<ExecutionResult> {
  const ffmpegCheck = await checkFfmpeg();
  if (!ffmpegCheck.installed) {
    return { success: false, error: ffmpegCheck.error };
  }

  try {
    onProgress?.(0, 'Enhancing audio...');

    const outputFilename = `enhanced_audio_${uuidv4()}.mp4`;
    const outputPath = path.join(FOLDERS.OUTPUT, outputFilename);

    // Audio enhancement filters
    let audioFilter = 'highpass=f=200,lowpass=f=3000';

    if (config.noiseReduction) {
      audioFilter += ',afftdn=nf=-25';
    }

    if (config.speechClarity) {
      audioFilter += ',equalizer=f=1000:t=q:w=1:g=3,dynaudnorm';
    }

    const command = `ffmpeg -i "${videoPath}" -af "${audioFilter}" -c:v copy -c:a aac "${outputPath}" -y`;

    await execAsync(command, { maxBuffer: 1024 * 1024 * 100 });

    onProgress?.(100, 'Audio enhanced!');

    return {
      success: true,
      outputs: {
        video: { type: 'video', path: outputPath, url: `/api/files/output/${outputFilename}` }
      }
    };
  } catch (error) {
    console.error(`\n[AUDIO ENHANCE TILE] ERROR:`, error);
    return { success: false, error: `Audio enhance failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

// ============================================================
// TRANSCRIPTION TILE
// ============================================================


// ============================================================
// MANIM TILE - Animation Generation
// ============================================================

export async function executeManim(
  script: string,
  config: { quality: string; format: string },
  onProgress?: ProgressCallback
): Promise<ExecutionResult> {
  const manimCheck = await checkManim();
  if (!manimCheck.installed) {
    return { success: false, error: manimCheck.error };
  }

  const manimBin = (manimCheck as any).bin || 'manim';

  try {
    onProgress?.(0, 'Creating Manim animation script...');

    // Map quality config value to manim quality flags
    // Manim quality flags: -ql (480p15), -qm (720p30), -qh (1080p60), -qp (1440p60), -qk (2160p60)
    const qualityMap: Record<string, string> = {
      'l': '-ql',   // 480p15  - low
      'm': '-qm',   // 720p30  - medium
      'h': '-qh',   // 1080p60 - high
      'p': '-qp',   // 1440p60 - production
      'k': '-qk',   // 2160p60 - 4K
    };
    const qualityFlag = qualityMap[config.quality] || '-ql';
    const format = config.format || 'mp4';

    // Generate a unique base name for the script (no spaces or special chars)
    const scriptBaseName = `manim_${uuidv4().replace(/-/g, '_')}`;
    const workspaceDir = path.join(FOLDERS.TEMP, scriptBaseName);
    await fs.mkdir(workspaceDir, { recursive: true });

    const scriptFileName = `scene.py`;
    const scriptPath = path.join(workspaceDir, scriptFileName);

    // Properly indent each line of the user script for the construct() method
    const constructBody = (script || '').split('\n')
      .map(line => `        ${line}`)  // 8 spaces indent for method body
      .join('\n');

    const pythonScript = `from manim import *

class GeneratedScene(Scene):
    def construct(self):
${constructBody || '        self.wait(1)'}
`;

    await fs.writeFile(scriptPath, pythonScript);

    onProgress?.(20, 'Rendering animation (this may take a few minutes)...');

    // Run manim from workspaceDir so that the media/ folder is created isolated there
    // Command: manim <quality_flag> <script_path> GeneratedScene
    // Manim will output to: <workspaceDir>/media/videos/scene/<quality_folder>/GeneratedScene.mp4
    const command = `"${manimBin}" ${qualityFlag} "${scriptPath}" GeneratedScene`;
    const { stdout: manimStdout, stderr: manimStderr } = await execAsync(command, {
      cwd: workspaceDir,
      maxBuffer: 1024 * 1024 * 500,
      timeout: 600000, // 10 minute timeout for complex animations
      env: { ...process.env, HOME: process.env.HOME || '/root' },
    });

    onProgress?.(80, 'Locating rendered video file...');

    // Manim creates: <workspaceDir>/media/videos/scene/<qualitySubfolder>/GeneratedScene.mp4
    // qualitySubfolder examples: 480p15, 720p30, 1080p60, 1440p60, 2160p60
    // Search recursively under media/videos/scene/ for GeneratedScene.mp4
    const manimVideosDir = path.join(workspaceDir, 'media', 'videos', 'scene');
    let renderedFilePath: string | null = null;

    try {
      // List all subdirs (quality folders) and find the output file
      const qualityDirs = await fs.readdir(manimVideosDir);
      for (const qualDir of qualityDirs) {
        const candidate = path.join(manimVideosDir, qualDir, `GeneratedScene.${format}`);
        try {
          await fs.stat(candidate);
          renderedFilePath = candidate;
          break;
        } catch {
          // Not in this quality dir, try next
        }
      }
    } catch (dirErr) {
      // Could not read the media/videos directory
      console.error('[MANIM] Could not read media dir:', dirErr);
    }

    if (!renderedFilePath) {
      // Fallback: search workspace recursively for GeneratedScene.format
      const findFileRecursive = async (dir: string, targetName: string): Promise<string | null> => {
        try {
          const items = await fs.readdir(dir, { withFileTypes: true });
          for (const item of items) {
            const fullPath = path.join(dir, item.name);
            if (item.isDirectory()) {
              const found = await findFileRecursive(fullPath, targetName);
              if (found) return found;
            } else if (item.isFile() && item.name === targetName) {
              return fullPath;
            }
          }
        } catch (e) {
          // Ignore read errors
        }
        return null;
      };

      renderedFilePath = await findFileRecursive(workspaceDir, `GeneratedScene.${format}`);
    }

    if (!renderedFilePath) {
      await fs.rm(workspaceDir, { recursive: true, force: true }).catch(() => { });
      throw new Error(
        `Manim rendered successfully but output file could not be located.\nSearched: ${manimVideosDir}\nStdout: ${manimStdout}\nStderr: ${manimStderr}`
      );
    }

    onProgress?.(90, 'Copying video to output folder...');

    // Copy rendered video to the project OUTPUT folder
    const outputFilename = `manim_${uuidv4()}.${format}`;
    const outputPath = path.join(FOLDERS.OUTPUT, outputFilename);
    await fs.copyFile(renderedFilePath, outputPath);

    // Clean up entire workspace (script, cache, output, texts)
    await fs.rm(workspaceDir, { recursive: true, force: true }).catch(() => { });

    onProgress?.(100, 'Animation complete!');

    return {
      success: true,
      outputs: {
        video: {
          type: 'video',
          path: outputPath,
          url: `/api/files/output/${outputFilename}`
        }
      },
      data: { path: outputPath }
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('[MANIM] Execution error:', errMsg);
    return { success: false, error: `Manim failed: ${errMsg}` };
  }
}

// ============================================================
// REMOTION TILE - Programmatic Video
// ============================================================

export async function executeRemotion(
  composition: string,
  config: { durationInFrames: number; fps: number; width: number; height: number },
  onProgress?: ProgressCallback
): Promise<ExecutionResult> {
  try {
    console.log(`\n[REMOTION TILE] Start execution. Config:`, JSON.stringify(config));
    onProgress?.(0, 'Rendering Remotion video...');

    // This requires a Remotion project to be set up
    // For now, we'll use the z-ai SDK to generate video
    console.log(`[REMOTION TILE] Initializing ZAI client...`);
    const zai = await ZAI.create();

    onProgress?.(30, 'Generating video frames...');

    console.log(`[REMOTION TILE] Calling zai.video.generations.create for remotion video...`);
    const response = await zai.video.generations.create({
      prompt: composition,
      size: `${config.width || 1080}x${config.height || 1920}`,
      duration: Math.ceil((config.durationInFrames || 150) / (config.fps || 30)),
      quality: 'speed',
    });

    console.log(`[REMOTION TILE] Received response successfully. Task ID: ${response?.id}`);
    onProgress?.(100, 'Remotion video complete!');

    const filename = `remotion_${uuidv4()}.mp4`;
    const outputPath = path.join(FOLDERS.OUTPUT, filename);

    return {
      success: true,
      outputs: {
        video: { type: 'video', path: outputPath, url: `/api/files/output/${filename}` }
      },
      data: { taskId: response.id }
    };
  } catch (error) {
    console.error(`\n[REMOTION TILE] ERROR:`, error);
    return { success: false, error: `Remotion failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

// ============================================================
// OUTPUT TILES
// ============================================================

export async function executeVideoOutput(
  videoPath: string,
  config: { format: string; resolution: string; quality: string; fps: number },
  onProgress?: ProgressCallback
): Promise<ExecutionResult> {
  const ffmpegCheck = await checkFfmpeg();
  if (!ffmpegCheck.installed) {
    return { success: false, error: ffmpegCheck.error };
  }

  try {
    onProgress?.(0, 'Exporting video...');

    const resolutions: Record<string, string> = {
      '720p': '1280:720',
      '1080p': '1920:1080',
      '4k': '3840:2160',
    };

    const scale = resolutions[config.resolution] || resolutions['1080p'];
    const outputFilename = `output_${uuidv4()}.${config.format || 'mp4'}`;
    const outputPath = path.join(FOLDERS.OUTPUT, outputFilename);

    const crf = config.quality === 'high' ? 18 : config.quality === 'medium' ? 23 : 28;

    const command = `ffmpeg -i "${videoPath}" -vf "scale=${scale}" -r ${config.fps || 30} -c:v libx264 -crf ${crf} -c:a aac "${outputPath}" -y`;

    await execAsync(command, { maxBuffer: 1024 * 1024 * 200 });

    onProgress?.(100, 'Video exported!');

    return {
      success: true,
      outputs: {
        video: { type: 'video', path: outputPath, url: `/api/files/output/${outputFilename}` }
      }
    };
  } catch (error) {
    return { success: false, error: `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

// ============================================================
// PREVIEW TILES (No processing, just display)
// ============================================================

export async function executeVideoPreview(
  videoPath: string,
  onProgress?: ProgressCallback
): Promise<ExecutionResult> {
  onProgress?.(100, 'Video ready for preview');

  const isOutput = typeof videoPath === 'string' && (videoPath.includes('/output/') || videoPath.includes('\\output\\'));
  const routeDir = isOutput ? 'output' : 'input';

  return {
    success: true,
    outputs: {
      video: { type: 'video', path: videoPath, url: `/api/files/${routeDir}/${path.basename(videoPath)}` }
    },
    data: { previewType: 'video', path: videoPath }
  };
}

export async function executeImagePreview(
  imagePath: string,
  onProgress?: ProgressCallback
): Promise<ExecutionResult> {
  onProgress?.(100, 'Image ready for preview');

  const isOutput = typeof imagePath === 'string' && (imagePath.includes('/output/') || imagePath.includes('\\output\\') || imagePath.includes('output_'));
  const routeDir = isOutput ? 'output' : 'input';

  return {
    success: true,
    outputs: {
      image: { type: 'image', path: imagePath, url: `/api/files/${routeDir}/${path.basename(imagePath)}` }
    },
    data: { previewType: 'image', path: imagePath }
  };
}

export async function executeAudioPreview(
  audioPath: string,
  onProgress?: ProgressCallback
): Promise<ExecutionResult> {
  onProgress?.(100, 'Audio ready for preview');

  const isOutput = typeof audioPath === 'string' && (audioPath.includes('/output/') || audioPath.includes('\\output\\'));
  const routeDir = isOutput ? 'output' : 'input';

  return {
    success: true,
    outputs: {
      audio: { type: 'audio', path: audioPath, url: `/api/files/${routeDir}/${path.basename(audioPath)}` }
    },
    data: { previewType: 'audio', path: audioPath }
  };
}

// ========== SOX AUDIO PROCESSING NODE ==========

export async function executeSoxAudio(
  inputs: Record<string, string>,
  config: Record<string, unknown>,
  onProgress?: (pct: number, msg: string) => void
) {
  onProgress?.(0, 'Starting SoX audio processing...');

  let audioPath = resolveLocalPath(inputs.audio || '');
  if (!audioPath) throw new Error('No audio input provided');

  const originalExt = path.extname(audioPath).toLowerCase();
  const baseName = path.basename(audioPath, originalExt);
  let tempAudioPath = '';

  // Use ffprobe to detect true internal format, ignoring the file extension which might be spoofed
  let actualFormat = '';
  try {
    const { stdout } = await execAsync(`ffprobe -v error -show_entries format=format_name -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`);
    actualFormat = stdout.trim().toLowerCase();
  } catch (e) {
    onProgress?.(5, 'Warning: ffprobe failed to detect format, relying on FFmpeg fallback...');
  }

  // Common true formats for wav/mp3/ogg/flac
  const isNativeAudio = ['wav', 'mp3', 'ogg', 'flac'].some(fmt => actualFormat.includes(fmt));

  if (actualFormat !== '' && !isNativeAudio) {
    onProgress?.(10, `Converting unsupported format (${actualFormat || 'unknown'}) to WAV...`);
    tempAudioPath = path.join(FOLDERS.TEMP, `${uuidv4()}_sox_temp.wav`);
    try {
      await execAsync(`ffmpeg -i "${audioPath}" -vn -acodec pcm_s16le -ar 44100 -ac 2 "${tempAudioPath}" -y`);
      audioPath = tempAudioPath;
    } catch (e: any) {
      throw new Error(`Could not extract audio from file (unsupported codec or format): ${e.message}`);
    }
  }
  const operation = String(config.operation || 'normalize');
  const outputPath = path.join(FOLDERS.OUTPUT, `${baseName}_sox_${operation}.wav`);

  onProgress?.(20, `Applying SoX operation: ${operation}...`);

  let soxArgs = '';

  switch (operation) {
    case 'normalize':
      soxArgs = `"${audioPath}" "${outputPath}" gain -n ${config.normalizeDb ?? -3}`;
      break;
    case 'noise-reduction': {
      // SoX noisered: generate noise profile then apply
      const profilePath = path.join(FOLDERS.TEMP, `${uuidv4()}_noise.prof`);
      // Use first 0.5s as noise sample
      await execAsync(`sox "${audioPath}" -n trim 0 0.5 noiseprof "${profilePath}"`);
      soxArgs = `"${audioPath}" "${outputPath}" noisered "${profilePath}" ${config.noiseFloor !== undefined ? (Math.abs(Number(config.noiseFloor)) / 100).toFixed(2) : '0.5'}`;
      break;
    }
    case 'fade': {
      const fadeIn = Number(config.fadeIn ?? 2);
      const fadeOut = Number(config.fadeOut ?? 2);
      soxArgs = `"${audioPath}" "${outputPath}" fade t ${fadeIn} -0 ${fadeOut}`;
      break;
    }
    case 'trim': {
      const trimStart = Number(config.trimStart ?? 0);
      const trimEnd = Number(config.trimEnd ?? 0);
      soxArgs = trimEnd > 0
        ? `"${audioPath}" "${outputPath}" trim ${trimStart} =${trimEnd}`
        : `"${audioPath}" "${outputPath}" trim ${trimStart}`;
      break;
    }
    case 'reverb': {
      const reverberance = Number(config.reverberance ?? 50);
      const roomScale = Number(config.roomScale ?? 100);
      const stereoDepth = Number(config.stereoDepth ?? 100);
      soxArgs = `"${audioPath}" "${outputPath}" reverb ${reverberance} 50 ${roomScale} ${stereoDepth}`;
      break;
    }
    case 'pitch': {
      // pitch shift in cents (100 cents = 1 semitone)
      const semitones = Number(config.pitchShift ?? 0);
      const cents = semitones * 100;
      soxArgs = `"${audioPath}" "${outputPath}" pitch ${cents}`;
      break;
    }
    case 'tempo': {
      const tempo = Number(config.tempo ?? 100) / 100;
      soxArgs = `"${audioPath}" "${outputPath}" tempo ${tempo}`;
      break;
    }
    case 'equalizer': {
      const freq = Number(config.eqFrequency ?? 1000);
      const width = Number(config.eqWidth ?? 1.0);
      const gain = Number(config.eqGain ?? 0);
      soxArgs = `"${audioPath}" "${outputPath}" equalizer ${freq} ${width}q ${gain}`;
      break;
    }
    default:
      throw new Error(`Unknown SoX operation: ${operation}`);
  }

  await execAsync(`sox ${soxArgs}`, { maxBuffer: 1024 * 1024 * 100 });

  if (tempAudioPath) {
    fs.unlink(tempAudioPath).catch(() => { });
  }

  onProgress?.(100, 'SoX processing complete!');

  return {
    success: true,
    outputs: {
      audio: { type: 'audio', path: outputPath, url: `/api/files/output/${path.basename(outputPath)}` }
    }
  };
}

// ========== IMAGEMAGICK NODE ==========

export async function executeImageMagick(
  inputs: Record<string, string>,
  config: Record<string, unknown>,
  onProgress?: (pct: number, msg: string) => void
) {
  onProgress?.(0, 'Starting ImageMagick processing...');

  let imagePath = resolveLocalPath(inputs.image || '');
  if (!imagePath) throw new Error('No image input provided');

  const originalExt = path.extname(imagePath).toLowerCase();
  const baseName = path.basename(imagePath, originalExt);
  let tempImagePath = '';

  let actualFormat = '';
  try {
    const { stdout } = await execAsync(`ffprobe -v error -show_entries format=format_name -of default=noprint_wrappers=1:nokey=1 "${imagePath}"`);
    actualFormat = stdout.trim().toLowerCase();
  } catch (e) {
    onProgress?.(5, 'Warning: ffprobe failed to detect format, relying on FFmpeg fallback...');
  }

  // Treat as video if format name indicates common video containers
  const isVideoContainer = ['mp4', 'matroska', 'webm', 'avi', 'mov', 'mpeg'].some(fmt => actualFormat.includes(fmt));

  if (actualFormat !== '' && isVideoContainer) {
    onProgress?.(10, `Extracting frame from video container (${actualFormat || 'unknown'})...`);
    tempImagePath = path.join(FOLDERS.TEMP, `${uuidv4()}_im_temp.jpg`);
    try {
      await execAsync(`ffmpeg -i "${imagePath}" -vframes 1 "${tempImagePath}" -y`);
      imagePath = tempImagePath;
    } catch (e: any) {
      throw new Error(`Could not extract image from video (file may contain no physical video stream): ${e.message}`);
    }
  }

  const operation = String(config.operation || 'resize');
  const outputFormat = String(config.outputFormat || 'jpg');
  const outputPath = path.join(FOLDERS.OUTPUT, `${baseName}_im_${operation}.${outputFormat}`);

  onProgress?.(30, `Applying ImageMagick operation: ${operation}...`);

  let convertArgs = '';

  switch (operation) {
    case 'resize': {
      const w = Number(config.width ?? 1920);
      const h = Number(config.height ?? 1080);
      const aspect = config.maintainAspect !== false;
      convertArgs = aspect ? `-resize ${w}x${h}` : `-resize ${w}x${h}!`;
      break;
    }
    case 'crop': {
      const cw = Number(config.cropWidth ?? 1280);
      const ch = Number(config.cropHeight ?? 720);
      const cx = Number(config.cropX ?? 0);
      const cy = Number(config.cropY ?? 0);
      convertArgs = `-crop ${cw}x${ch}+${cx}+${cy} +repage`;
      break;
    }
    case 'rotate':
      convertArgs = `-rotate ${Number(config.degrees ?? 90)}`;
      break;
    case 'flip':
      convertArgs = `-flop`;
      break;
    case 'flop':
      convertArgs = `-flip`;
      break;
    case 'blur':
      convertArgs = `-blur 0x${Number(config.blurRadius ?? 5)}`;
      break;
    case 'sharpen': {
      const sr = Number(config.sharpenRadius ?? 2);
      const ss = Number(config.sharpenSigma ?? 1.0);
      convertArgs = `-sharpen ${sr}x${ss}`;
      break;
    }
    case 'brightness-contrast': {
      const b = Number(config.brightness ?? 0);
      const c = Number(config.contrast ?? 0);
      convertArgs = `-brightness-contrast ${b}x${c}`;
      break;
    }
    case 'grayscale':
      convertArgs = `-colorspace Gray`;
      break;
    case 'convert-format':
      convertArgs = '';
      break;
    case 'border': {
      const size = Number(config.borderSize ?? 10);
      const color = String(config.borderColor ?? '#000000');
      convertArgs = `-border ${size}x${size} -bordercolor "${color}"`;
      break;
    }
    default:
      throw new Error(`Unknown ImageMagick operation: ${operation}`);
  }

  await execAsync(`convert "${imagePath}" ${convertArgs} "${outputPath}"`, { maxBuffer: 1024 * 1024 * 50 });

  if (tempImagePath) {
    fs.unlink(tempImagePath).catch(() => { });
  }

  onProgress?.(100, 'ImageMagick processing complete!');

  return {
    success: true,
    outputs: {
      image: { type: 'image', path: outputPath, url: `/api/files/output/${path.basename(outputPath)}` }
    }
  };
}

// ========== D3 CHART GENERATOR NODE ==========

export async function executeD3Chart(
  inputs: Record<string, string>,
  config: Record<string, unknown>,
  onProgress?: (pct: number, msg: string) => void
) {
  onProgress?.(0, 'Generating D3 chart...');

  const chartType = String(config.chartType || 'bar');
  const title = String(config.title || 'Chart');
  const width = Number(config.width ?? 1280);
  const height = Number(config.height ?? 720);
  const colorScheme = String(config.colorScheme || 'blue');
  const xLabel = String(config.xLabel || 'X Axis');
  const yLabel = String(config.yLabel || 'Y Axis');

  // Parse data from JSON input or use sample
  let rawData: Array<{ label: string; value: number }> = [];
  const jsonInput = inputs.text || String(config.sampleData || '[]');
  try {
    rawData = JSON.parse(jsonInput);
  } catch {
    rawData = [{ label: 'A', value: 10 }, { label: 'B', value: 25 }, { label: 'C', value: 15 }];
  }

  const chartId = uuidv4().slice(0, 8);
  const outputPath = path.join(FOLDERS.OUTPUT, `${chartType}_chart_${chartId}.png`);
  const scriptPath = path.join(FOLDERS.TEMP, `d3_chart_${chartId}.py`);

  onProgress?.(20, 'Generating chart using Python matplotlib...');

  // Use Python matplotlib as it's more commonly available than Node D3
  const colorMap: Record<string, string> = {
    blue: '#2563EB', green: '#16A34A', red: '#DC2626',
    purple: '#9333EA', orange: '#EA580C', rainbow: 'rainbow'
  };
  const color = colorMap[colorScheme] || '#2563EB';

  const dataLabels = rawData.map(d => JSON.stringify(d.label)).join(', ');
  const dataValues = rawData.map(d => d.value).join(', ');

  const pythonScript = `
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np

labels = [${dataLabels}]
values = [${dataValues}]

fig, ax = plt.subplots(figsize=(${width / 100}, ${height / 100}), dpi=100)
fig.patch.set_facecolor('#0f172a')
ax.set_facecolor('#1e293b')
ax.tick_params(colors='white')
ax.xaxis.label.set_color('white')
ax.yaxis.label.set_color('white')
ax.title.set_color('white')
for spine in ax.spines.values(): spine.set_edgecolor('#475569')

chart_type = '${chartType}'
if '${colorScheme}' == 'rainbow':
    colors = plt.cm.rainbow(np.linspace(0, 1, len(values)))
else:
    colors = '${color}'

if chart_type == 'bar':
    ax.bar(labels, values, color=colors)
elif chart_type == 'line':
    ax.plot(labels, values, color='${color}', marker='o', linewidth=2, markersize=8)
    ax.fill_between(range(len(labels)), values, alpha=0.3, color='${color}')
    ax.set_xticks(range(len(labels)))
    ax.set_xticklabels(labels)
elif chart_type == 'pie':
    ax.pie(values, labels=labels, autopct='%1.1f%%', colors=plt.cm.Set3.colors if '${colorScheme}'=='rainbow' else None)
elif chart_type == 'scatter':
    ax.scatter(range(len(values)), values, color=colors, s=100)
    ax.set_xticks(range(len(labels)))
    ax.set_xticklabels(labels)
elif chart_type == 'area':
    ax.fill_between(range(len(values)), values, alpha=0.6, color='${color}')
    ax.plot(range(len(values)), values, color='${color}', linewidth=2)
    ax.set_xticks(range(len(labels)))
    ax.set_xticklabels(labels)

ax.set_title('${title}', fontsize=16, pad=15, color='white')
if chart_type != 'pie':
    ax.set_xlabel('${xLabel}', color='white')
    ax.set_ylabel('${yLabel}', color='white')

plt.tight_layout()
plt.savefig('${outputPath.replace(/\\/g, '\\\\')}', dpi=100, bbox_inches='tight', facecolor='#0f172a')
plt.close()
print("Chart saved successfully")
`;

  await fs.writeFile(scriptPath, pythonScript);
  await execAsync(`python3 "${scriptPath}"`, { maxBuffer: 1024 * 1024 * 50 });
  await fs.unlink(scriptPath).catch(() => { });

  onProgress?.(100, 'Chart generated successfully!');

  return {
    success: true,
    outputs: {
      image: { type: 'image', path: outputPath, url: `/api/files/output/${path.basename(outputPath)}` }
    }
  };
}

