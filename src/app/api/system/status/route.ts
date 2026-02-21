import { NextRequest, NextResponse } from 'next/server';
import { 
  ensureFolders, 
  checkSystemDependencies, 
  listFiles,
  FOLDERS 
} from '@/lib/tile-executor';

// Ensure folders exist on startup
ensureFolders().catch(console.error);

/**
 * GET /api/system/status
 * Check system dependencies and folder status
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (action === 'dependencies') {
    const deps = await checkSystemDependencies();
    return NextResponse.json({
      success: true,
      dependencies: deps,
      allInstalled: deps.ffmpeg.installed && deps.ytDlp.installed && deps.python.installed
    });
  }

  if (action === 'files') {
    const folder = searchParams.get('folder') as 'input' | 'output' | 'workflows';
    if (!folder || !['input', 'output', 'workflows'].includes(folder)) {
      return NextResponse.json({ error: 'Invalid folder' }, { status: 400 });
    }
    const files = await listFiles(folder);
    return NextResponse.json({ success: true, folder, files });
  }

  // Default: return folder paths
  return NextResponse.json({
    success: true,
    folders: {
      input: FOLDERS.INPUT,
      output: FOLDERS.OUTPUT,
      workflows: FOLDERS.WORKFLOWS,
      temp: FOLDERS.TEMP,
    },
    message: 'System ready. Check /api/system/status?action=dependencies for dependency status.'
  });
}
