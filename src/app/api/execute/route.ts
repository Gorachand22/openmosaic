import { NextRequest, NextResponse } from 'next/server';
import {
  ensureFolders,
  executeVideoInput,
  executeImageInput,
  executeAudioInput,
  executeTextInput,
  executeAIImage,
  executeAIVideo,
  executeAIAvatar,
  executeClips,
  executeSilenceRemoval,
  executeCaptions,
  executeAudioEnhance,
  executeManim,
  executeRemotion,
  executeVideoOutput,
  executeVideoPreview,
  executeImagePreview,
  executeAudioPreview,
  executeSpeed,
  executeWatermark,
  executeReverse,
  executeSplitVideo,
  executeSoxAudio,
  executeImageMagick,
  executeD3Chart,
  executeVoiceTTS,
  FOLDERS,
} from '@/lib/tile-executor';

// Ensure folders exist
ensureFolders().catch(console.error);

/**
 * POST /api/execute
 * Execute a tile with given configuration
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      tileType,
      config,
      inputs = {},
      nodeId
    } = body;

    if (!tileType) {
      return NextResponse.json({ error: 'tileType is required' }, { status: 400 });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (event: string, data: any) => {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        };

        const onProgress = (progress: number, message: string) => {
          console.log(`[${tileType}] ${progress}%: ${message}`);
          sendEvent('progress', { nodeId, progress, message });
        };

        try {
          sendEvent('executing', { nodeId, tileType, progress: 0, status: 'running' });

          let result;
          // Route to appropriate executor
          switch (tileType) {
            // Input tiles
            case 'video-input':
              result = await executeVideoInput(config, onProgress);
              break;
            case 'youtube-trigger':
              result = await executeVideoInput({ source: 'url', fileUrl: config.url }, onProgress);
              break;
            case 'image-input':
              result = await executeImageInput(config, onProgress);
              break;
            case 'audio-input':
              result = await executeAudioInput(config, onProgress);
              break;
            case 'text-input':
              result = await executeTextInput(config, onProgress);
              break;

            // AI Generation tiles
            case 'ai-image':
              result = await executeAIImage({ ...config, prompt: inputs.text || config.prompt }, onProgress);
              break;
            case 'ai-video':
              result = await executeAIVideo({ ...config, prompt: inputs.text || config.prompt }, inputs.image, onProgress);
              break;
            case 'ai-avatar':
              result = await executeAIAvatar({ ...config, prompt: inputs.text || config.prompt }, onProgress);
              break;

            // Video processing tiles
            case 'clips':
              if (!inputs.video) throw new Error('Video input required');
              result = await executeClips(inputs.video, config, onProgress);
              break;
            case 'silence-removal':
              if (!inputs.video) throw new Error('Video input required');
              result = await executeSilenceRemoval(inputs.video, config, onProgress);
              break;
            case 'captions':
            case 'cinematic-captions':
              if (!inputs.video) throw new Error('Video input required');
              result = await executeCaptions(inputs.video, inputs.text || '', config, onProgress);
              break;
            case 'audio-enhance':
              if (!inputs.video) throw new Error('Video input required');
              result = await executeAudioEnhance(inputs.video, config, onProgress);
              break;
            case 'speed':
              if (!inputs.video) throw new Error('Video input required');
              result = await executeSpeed(inputs.video, config, onProgress);
              break;
            case 'watermark':
              if (!inputs.video) throw new Error('Video input required');
              result = await executeWatermark(inputs.video, inputs.image, config, onProgress);
              break;
            case 'reverse':
              if (!inputs.video) throw new Error('Video input required');
              result = await executeReverse(inputs.video, config, onProgress);
              break;
            case 'split-video':
              if (!inputs.video) throw new Error('Video input required');
              result = await executeSplitVideo(inputs.video, config, onProgress);
              break;

            // New Tool Nodes
            case 'sox-audio':
              if (!inputs.audio) throw new Error('Audio input required for SoX processing');
              result = await executeSoxAudio(inputs, config, onProgress);
              break;
            case 'image-magick':
              if (!inputs.image) throw new Error('Image input required for ImageMagick');
              result = await executeImageMagick(inputs, config, onProgress);
              break;
            case 'd3-chart':
              result = await executeD3Chart(inputs, config, onProgress);
              break;
            case 'voice':
              if (!inputs.text) throw new Error('Text script required for Voice TTS generation');
              result = await executeVoiceTTS(inputs, config, onProgress);
              break;

            // Animation tiles
            case 'manim':
              result = await executeManim(config.script || inputs.text, config, onProgress);
              break;
            case 'remotion':
              result = await executeRemotion(config.composition || inputs.text, config, onProgress);
              break;

            // Preview tiles
            case 'video-preview':
              if (!inputs.video) throw new Error('Video input required');
              result = await executeVideoPreview(inputs.video, onProgress);
              break;
            case 'image-preview':
              if (!inputs.image) throw new Error('Image input required');
              result = await executeImagePreview(inputs.image, onProgress);
              break;
            case 'audio-preview':
              if (!inputs.audio) throw new Error('Audio input required');
              result = await executeAudioPreview(inputs.audio, onProgress);
              break;

            // Logic tiles - just pass through
            case 'branch':
            case 'merge':
              result = {
                success: true,
                outputs: inputs,
                message: 'Logic tile processed'
              };
              break;

            default:
              result = {
                success: true,
                message: `${tileType} executed (simulated)`,
                outputs: inputs,
                data: { simulated: true }
              };
          }

          sendEvent('executed', {
            success: result.success,
            nodeId,
            tileType,
            ...result
          });
        } catch (error) {
          console.error('Execution stream error:', error);
          sendEvent('error', {
            success: false,
            nodeId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        } finally {
          controller.close();
        }
      }
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Execution preparation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to initialize execution stream' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/execute
 * Get execution status and available executors
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    folders: FOLDERS,
    executors: [
      // Input
      'video-input',
      'youtube-trigger',
      'image-input',
      'audio-input',
      'text-input',
      // AI
      'ai-image',
      'ai-video',
      'ai-avatar',
      // Processing
      'reframe',
      'clips',
      'silence-removal',
      'captions',
      'cinematic-captions',
      'audio-enhance',
      // Transcription
      'transcribe',
      // Animation
      'manim',
      'remotion',
      // Preview
      'video-preview',
      'image-preview',
      'audio-preview',
      'text-preview',
      // Logic
      'branch',
      'merge',
    ]
  });
}
