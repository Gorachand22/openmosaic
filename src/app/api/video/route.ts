import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);

const PYTHON_PATH = path.join(process.cwd(), 'venv', 'bin', 'python3');
const VIDEO_PROCESSOR = path.join(process.cwd(), 'scripts', 'python', 'video_processor.py');

async function runVideoCommand(command: string, args: Record<string, unknown>) {
  const argsJson = JSON.stringify(args).replace(/'/g, "'\\''");
  const cmd = `${PYTHON_PATH} ${VIDEO_PROCESSOR} ${command} '${argsJson}'`;
  
  try {
    const { stdout, stderr } = await execAsync(cmd, {
      maxBuffer: 50 * 1024 * 1024, // 50MB buffer
      timeout: 300000, // 5 minutes timeout
    });
    
    if (stderr && !stdout) {
      return { success: false, error: stderr };
    }
    
    return JSON.parse(stdout);
  } catch (error) {
    console.error('Video processing error:', error);
    return { success: false, error: String(error) };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    console.log(`[Video API] Processing: ${action}`);

    let result;

    switch (action) {
      case 'download': {
        result = await runVideoCommand('download', {
          url: params.url,
          output_path: params.output_path,
        });
        break;
      }

      case 'info': {
        result = await runVideoCommand('info', {
          file_path: params.file_path,
        });
        break;
      }

      case 'trim': {
        result = await runVideoCommand('trim', {
          input_path: params.input_path,
          output_path: params.output_path,
          start: params.start || 0,
          end: params.end || 30,
        });
        break;
      }

      case 'split_instagram': {
        result = await runVideoCommand('split_instagram', {
          input_path: params.input_path,
          clips: params.clips || [],
        });
        break;
      }

      case 'add_subtitles': {
        result = await runVideoCommand('add_subtitles', {
          input_path: params.input_path,
          srt_path: params.srt_path,
          output_path: params.output_path,
        });
        break;
      }

      case 'create_srt': {
        result = await runVideoCommand('create_srt', {
          segments: params.segments || [],
          output_path: params.output_path,
        });
        break;
      }

      case 'effects': {
        result = await runVideoCommand('effects', {
          input_path: params.input_path,
          output_path: params.output_path,
          brightness: params.brightness || 1.0,
          contrast: params.contrast || 1.0,
          saturation: params.saturation || 1.0,
        });
        break;
      }

      case 'text_overlay': {
        result = await runVideoCommand('text_overlay', {
          input_path: params.input_path,
          text: params.text,
          output_path: params.output_path,
          position: params.position || 'bottom',
          font_size: params.font_size || 48,
          color: params.color || 'white',
          bg_color: params.bg_color || 'black@0.5',
        });
        break;
      }

      case 'concatenate': {
        result = await runVideoCommand('concatenate', {
          video_paths: params.video_paths || [],
          output_path: params.output_path,
        });
        break;
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('[Video API] Error:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

// GET endpoint to check video processor status
export async function GET() {
  const pythonExists = fs.existsSync(PYTHON_PATH);
  const processorExists = fs.existsSync(VIDEO_PROCESSOR);
  
  return NextResponse.json({
    status: 'ok',
    videoProcessor: {
      python: pythonExists ? 'installed' : 'not found',
      processor: processorExists ? 'available' : 'not found',
    },
    capabilities: [
      'download',
      'info',
      'trim',
      'split_instagram',
      'add_subtitles',
      'create_srt',
      'effects',
      'text_overlay',
      'concatenate',
    ],
  });
}
