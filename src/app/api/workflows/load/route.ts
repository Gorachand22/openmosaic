import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import path from 'path';
import { FOLDERS } from '@/lib/tile-executor';

/**
 * GET /api/workflows/load
 * Load a workflow from the workflows folder
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filepath = searchParams.get('path');
    
    if (!filepath) {
      return NextResponse.json({ error: 'Path parameter required' }, { status: 400 });
    }
    
    // Security: ensure path doesn't escape workflows folder
    const resolved = path.resolve(filepath);
    if (!resolved.startsWith(FOLDERS.WORKFLOWS)) {
      // If it's just a filename, prepend the workflows folder
      const fullpath = path.join(FOLDERS.WORKFLOWS, path.basename(filepath));
      const content = await readFile(fullpath, 'utf-8');
      const workflow = JSON.parse(content);
      return NextResponse.json({ success: true, workflow, path: fullpath });
    }
    
    const content = await readFile(resolved, 'utf-8');
    const workflow = JSON.parse(content);
    
    return NextResponse.json({ success: true, workflow, path: resolved });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
