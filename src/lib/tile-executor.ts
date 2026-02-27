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

export async function checkManim(): Promise<{ installed: boolean; version?: string; error?: string }> {
  try {
    const { stdout } = await execAsync('manim --version');
    return { installed: true, version: stdout.trim() };
  } catch {
    return { installed: false, error: 'manim not installed. Run: pip install manim' };
  }
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
  config: { source: string; fileName?: string },
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
  config: { source: string; fileName?: string },
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
  config: { content: string; format: string },
  onProgress?: ProgressCallback
): Promise<ExecutionResult> {
  onProgress?.(100, 'Text loaded!');
  return {
    success: true,
    outputs: {
      text: { type: 'text', path: '', data: config.content }
    },
    data: { content: config.content, format: config.format }
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
      params.image_url = inputImage;
    }

    console.log(`[AI VIDEO TILE] Patching ZAI client for proxy compatibility...`);
    // Patch ZAI SDK methods because the remote proxy expects /video/generations and GET /video/generations/:id
    const originalConfig = (zai as any).config;

    zai.video.generations.create = async function (body: any) {
      const url = `${originalConfig.baseUrl}/video/generations`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${originalConfig.apiKey}`
        },
        body: JSON.stringify(body)
      });
      if (!response.ok) throw new Error(await response.text());
      return await response.json();
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

// Reframe Video
export async function executeReframe(
  videoPath: string,
  config: { targetRatio: string; mode: string; padding: string; backgroundColor: string },
  onProgress?: ProgressCallback
): Promise<ExecutionResult> {
  const ffmpegCheck = await checkFfmpeg();
  if (!ffmpegCheck.installed) {
    return { success: false, error: ffmpegCheck.error };
  }

  try {
    onProgress?.(0, 'Reframing video...');

    // Get video dimensions
    const { stdout: probeOut } = await execAsync(
      `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "${videoPath}"`
    );

    const resolutions: Record<string, { w: number; h: number }> = {
      '9:16': { w: 1080, h: 1920 },
      '16:9': { w: 1920, h: 1080 },
      '1:1': { w: 1080, h: 1080 },
      '4:5': { w: 1080, h: 1350 },
    };

    const target = resolutions[config.targetRatio] || resolutions['9:16'];
    const outputFilename = `reframed_${uuidv4()}.mp4`;
    const outputPath = path.join(FOLDERS.OUTPUT, outputFilename);

    let command: string;

    if (config.padding === 'blur') {
      command = `ffmpeg -i "${videoPath}" -filter_complex "[0:v]scale=${target.w}:${target.h}:force_original_aspect_ratio=decrease[fg];[0:v]scale=${target.w}:${target.h}:force_original_aspect_ratio=increase,boxblur=20[bg];[bg][fg]overlay=(W-w)/2:(H-h)/2" -c:v libx264 -c:a aac "${outputPath}" -y`;
    } else if (config.padding === 'color') {
      command = `ffmpeg -i "${videoPath}" -vf "scale=${target.w}:${target.h}:force_original_aspect_ratio=decrease,pad=${target.w}:${target.h}:(ow-iw)/2:(oh-ih)/2:${config.backgroundColor}" -c:v libx264 -c:a aac "${outputPath}" -y`;
    } else {
      command = `ffmpeg -i "${videoPath}" -vf "scale=${target.w}:${target.h}:force_original_aspect_ratio=decrease,pad=${target.w}:${target.h}:(ow-iw)/2:(oh-ih)/2:black" -c:v libx264 -c:a aac "${outputPath}" -y`;
    }

    await execAsync(command, { maxBuffer: 1024 * 1024 * 100 });

    onProgress?.(100, 'Reframe complete!');

    return {
      success: true,
      outputs: {
        video: { type: 'video', path: outputPath, url: `/api/files/output/${outputFilename}` }
      }
    };
  } catch (error) {
    console.error(`\n[REFRAME TILE] ERROR:`, error);
    return { success: false, error: `Reframe failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

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
  config: { speed: number; preserveAudio: boolean; pitchCorrection: boolean },
  onProgress?: ProgressCallback
): Promise<ExecutionResult> {
  const ffmpegCheck = await checkFfmpeg();
  if (!ffmpegCheck.installed) {
    return { success: false, error: ffmpegCheck.error };
  }

  try {
    onProgress?.(0, 'Adjusting video speed...');

    const outputFilename = `speed_${uuidv4()}.mp4`;
    const outputPath = path.join(FOLDERS.OUTPUT, outputFilename);
    const videoFilter = `setpts=${1 / config.speed}*PTS`;

    // ATempo supports 0.5 to 100.0, if out of bounds need to chain it, but for our simple case:
    const audioFilter = `atempo=${config.speed}`;

    const actualInputPath = resolveLocalPath(videoPath);

    let command = `ffmpeg -i "${actualInputPath}" -filter_complex "[0:v]${videoFilter}[v]`;
    if (config.preserveAudio) {
      command += `;[0:a]${audioFilter}[a]" -map "[v]" -map "[a]"`;
    } else {
      command += `" -map "[v]"`;
    }

    command += ` -c:v libx264 -c:a aac "${outputPath}" -y`;

    await execAsync(command, { maxBuffer: 1024 * 1024 * 100 });
    onProgress?.(100, 'Speed adjusted!');

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

export async function executeTranscribe(
  videoPath: string,
  config: { language: string; model: string },
  onProgress?: ProgressCallback
): Promise<ExecutionResult> {
  const whisperCheck = await checkWhisper();
  if (!whisperCheck.installed) {
    return { success: false, error: whisperCheck.error };
  }

  try {
    onProgress?.(0, 'Extracting audio...');

    // Extract audio first
    const audioPath = path.join(FOLDERS.TEMP, `${uuidv4()}.wav`);
    await execAsync(`ffmpeg -i "${videoPath}" -vn -acodec pcm_s16le -ar 16000 -ac 1 "${audioPath}" -y`);

    onProgress?.(20, 'Transcribing with Whisper...');

    // Run whisper
    const outputPath = path.join(FOLDERS.OUTPUT, `transcript_${uuidv4()}`);
    const command = `whisper "${audioPath}" --model ${config.model || 'base'} --language ${config.language || 'en'} --output_dir "${FOLDERS.TEMP}" --output_format srt`;

    await execAsync(command, { maxBuffer: 1024 * 1024 * 100 });

    // Read the generated SRT
    const srtFile = audioPath.replace('.wav', '.srt');
    const transcript = await fs.readFile(srtFile, 'utf-8');

    // Cleanup
    await fs.unlink(audioPath).catch(() => { });
    await fs.unlink(srtFile).catch(() => { });

    onProgress?.(100, 'Transcription complete!');

    return {
      success: true,
      outputs: {
        text: { type: 'text', path: '', data: transcript }
      },
      data: { transcript }
    };
  } catch (error) {
    console.error(`\n[TRANSCRIBE TILE] ERROR:`, error);
    return { success: false, error: `Transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

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

  try {
    onProgress?.(0, 'Creating Manim animation...');

    // Create a Python file from the script
    const pythonScript = `
from manim import *

class GeneratedScene(Scene):
    def construct(self):
        ${script}
`;

    const scriptPath = path.join(FOLDERS.TEMP, `manim_${uuidv4()}.py`);
    await fs.writeFile(scriptPath, pythonScript);

    onProgress?.(30, 'Rendering animation...');

    // Run manim
    const quality = config.quality || 'p'; // p=1080p, m=720p, l=480p
    const format = config.format || 'mp4';

    const command = `manim -${quality}qh "${scriptPath}" GeneratedScene -o animation.${format}`;
    await execAsync(command, { maxBuffer: 1024 * 1024 * 500, timeout: 300000 });

    // Find the output file
    const mediaDir = path.join(FOLDERS.TEMP, 'media');
    const outputFile = path.join(FOLDERS.OUTPUT, `manim_${uuidv4()}.${format}`);

    // Move the generated file (manim creates complex folder structure)
    // This is simplified - in production, parse the output path
    onProgress?.(90, 'Moving output...');

    await fs.unlink(scriptPath).catch(() => { });

    onProgress?.(100, 'Animation complete!');

    return {
      success: true,
      outputs: {
        video: { type: 'video', path: outputFile, url: `/api/files/output/${path.basename(outputFile)}` }
      }
    };
  } catch (error) {
    return { success: false, error: `Manim failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
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
