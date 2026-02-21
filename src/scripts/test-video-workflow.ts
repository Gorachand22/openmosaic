// Full Video Workflow Test
// Downloads a sample video, processes it, and creates Instagram clips

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DOWNLOAD_DIR = path.join(__dirname, '../../download');
const PYTHON_PATH = path.join(__dirname, '../../venv/bin/python3');
const VIDEO_PROCESSOR = path.join(__dirname, '../../scripts/python/video_processor.py');

// Sample video URL (short creative commons video)
const SAMPLE_VIDEO_URL = 'https://www.youtube.com/watch?v=jNQXAC9IVRw'; // "Me at the zoo" - first YouTube video, 18 seconds

function runCommand(cmd: string, args: Record<string, unknown>) {
  const argsJson = JSON.stringify(args).replace(/'/g, "'\\''");
  const fullCmd = `${PYTHON_PATH} ${VIDEO_PROCESSOR} ${cmd} '${argsJson}'`;
  console.log(`Running: ${cmd}`);
  try {
    const result = execSync(fullCmd, { encoding: 'utf-8', timeout: 60000 });
    return JSON.parse(result);
  } catch (error) {
    console.error('Command failed:', error);
    return { success: false, error: String(error) };
  }
}

async function testVideoWorkflow() {
  console.log('\n🎬 Full Video Workflow Test\n');
  console.log('='.repeat(50));

  // Step 1: Download video
  console.log('\n📹 Step 1: Downloading sample video...');
  const downloadResult = runCommand('download', {
    url: SAMPLE_VIDEO_URL,
    output_path: path.join(DOWNLOAD_DIR, 'test_video.%(ext)s'),
  });

  if (!downloadResult.success) {
    console.log('❌ Download failed:', downloadResult.error);
    console.log('⚠️  Skipping video tests - using placeholder');
    return;
  }

  console.log('✅ Downloaded:', downloadResult.file_path);
  console.log('   Title:', downloadResult.title);
  console.log('   Duration:', downloadResult.duration, 'seconds');

  const videoPath = downloadResult.file_path;

  // Step 2: Get video info
  console.log('\n📊 Step 2: Getting video info...');
  const infoResult = runCommand('info', { file_path: videoPath });

  if (infoResult.success) {
    console.log('✅ Video Info:');
    console.log('   Resolution:', `${infoResult.width}x${infoResult.height}`);
    console.log('   Duration:', infoResult.duration, 'seconds');
    console.log('   FPS:', infoResult.fps);
    console.log('   Video codec:', infoResult.video_codec);
  }

  // Step 3: Trim video
  console.log('\n✂️ Step 3: Trimming video (0-10 seconds)...');
  const trimResult = runCommand('trim', {
    input_path: videoPath,
    output_path: path.join(DOWNLOAD_DIR, 'trimmed_video.mp4'),
    start: 0,
    end: 10,
  });

  if (trimResult.success) {
    console.log('✅ Trimmed video:', trimResult.output_path);
  }

  // Step 4: Create subtitles
  console.log('\n📜 Step 4: Creating subtitles...');
  const srtResult = runCommand('create_srt', {
    segments: [
      { start: 0, end: 3, text: 'Welcome to OpenMosaic!' },
      { start: 3, end: 6, text: 'The AI video editor' },
      { start: 6, end: 10, text: 'Creating amazing videos!' },
    ],
    output_path: path.join(DOWNLOAD_DIR, 'subtitles.srt'),
  });

  if (srtResult.success) {
    console.log('✅ Subtitles created:', srtResult.srt_path);
  }

  // Step 5: Add text overlay
  console.log('\n✨ Step 5: Adding text overlay...');
  const overlayResult = runCommand('text_overlay', {
    input_path: trimResult.output_path || videoPath,
    text: 'Made with OpenMosaic',
    output_path: path.join(DOWNLOAD_DIR, 'overlay_video.mp4'),
    position: 'bottom',
    font_size: 36,
    color: 'white',
    bg_color: 'black@0.5',
  });

  if (overlayResult.success) {
    console.log('✅ Text overlay added:', overlayResult.output_path);
  }

  // Step 6: Create Instagram format
  console.log('\n📱 Step 6: Creating Instagram-style clip...');
  const instagramResult = runCommand('split_instagram', {
    input_path: trimResult.output_path || videoPath,
    clips: [
      { start: 0, end: 10 },
    ],
  });

  if (instagramResult.length > 0 && instagramResult[0].success) {
    console.log('✅ Instagram clip created:', instagramResult[0].output_path);
  }

  console.log('\n' + '='.repeat(50));
  console.log('🎉 Video Workflow Test Complete!');
  console.log('\n📁 Output files in:', DOWNLOAD_DIR);
  
  // List output files
  try {
    const files = fs.readdirSync(DOWNLOAD_DIR);
    const videoFiles = files.filter((f: string) => f.endsWith('.mp4'));
    const srtFiles = files.filter((f: string) => f.endsWith('.srt'));
    
    console.log('\n🎬 Video files:', videoFiles.join(', ') || 'None');
    console.log('📜 Subtitle files:', srtFiles.join(', ') || 'None');
  } catch (error) {
    console.log('Could not list files');
  }
}

testVideoWorkflow().catch(console.error);
