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
  executeReframe,
  executeClips,
  executeSilenceRemoval,
  executeCaptions,
  executeAudioEnhance,
  executeTranscribe,
  executeManim,
  executeRemotion,
  executeVideoOutput,
  executeVideoPreview,
  executeImagePreview,
  executeAudioPreview,
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

    // Progress callback (for SSE in future)
    const onProgress = (progress: number, message: string) => {
      console.log(`[${tileType}] ${progress}%: ${message}`);
    };

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
        result = await executeAIImage(config, onProgress);
        break;
      
      case 'ai-video':
        result = await executeAIVideo(config, inputs.image, onProgress);
        break;
      
      case 'ai-avatar':
        result = await executeAIAvatar(config, onProgress);
        break;

      // Video processing tiles
      case 'reframe':
        if (!inputs.video) {
          return NextResponse.json({ error: 'Video input required' }, { status: 400 });
        }
        result = await executeReframe(inputs.video, config, onProgress);
        break;
      
      case 'clips':
        if (!inputs.video) {
          return NextResponse.json({ error: 'Video input required' }, { status: 400 });
        }
        result = await executeClips(inputs.video, config, onProgress);
        break;
      
      case 'silence-removal':
        if (!inputs.video) {
          return NextResponse.json({ error: 'Video input required' }, { status: 400 });
        }
        result = await executeSilenceRemoval(inputs.video, config, onProgress);
        break;
      
      case 'captions':
      case 'cinematic-captions':
        if (!inputs.video) {
          return NextResponse.json({ error: 'Video input required' }, { status: 400 });
        }
        result = await executeCaptions(inputs.video, inputs.text || '', config, onProgress);
        break;
      
      case 'audio-enhance':
        if (!inputs.video) {
          return NextResponse.json({ error: 'Video input required' }, { status: 400 });
        }
        result = await executeAudioEnhance(inputs.video, config, onProgress);
        break;

      // Transcription
      case 'transcribe':
        if (!inputs.video && !inputs.audio) {
          return NextResponse.json({ error: 'Video or audio input required' }, { status: 400 });
        }
        result = await executeTranscribe(inputs.video || inputs.audio, config, onProgress);
        break;

      // Animation tiles
      case 'manim':
        result = await executeManim(config.script || inputs.text, config, onProgress);
        break;
      
      case 'remotion':
        result = await executeRemotion(config.composition || inputs.text, config, onProgress);
        break;

      // Output tiles
      case 'video-output':
        if (!inputs.video) {
          return NextResponse.json({ error: 'Video input required' }, { status: 400 });
        }
        result = await executeVideoOutput(inputs.video, config, onProgress);
        break;

      // Preview tiles
      case 'video-preview':
        if (!inputs.video) {
          return NextResponse.json({ error: 'Video input required' }, { status: 400 });
        }
        result = await executeVideoPreview(inputs.video, onProgress);
        break;
      
      case 'image-preview':
        if (!inputs.image) {
          return NextResponse.json({ error: 'Image input required' }, { status: 400 });
        }
        result = await executeImagePreview(inputs.image, onProgress);
        break;
      
      case 'audio-preview':
        if (!inputs.audio) {
          return NextResponse.json({ error: 'Audio input required' }, { status: 400 });
        }
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
        // For tiles without specific implementation, return simulated success
        result = {
          success: true,
          message: `${tileType} executed (simulated)`,
          outputs: inputs,
          data: { simulated: true }
        };
    }

    return NextResponse.json({
      success: result.success,
      nodeId,
      tileType,
      ...result
    });

  } catch (error) {
    console.error('Execution error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
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
      // Output
      'video-output',
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
