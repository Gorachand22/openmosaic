import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readdir } from 'fs/promises';
import path from 'path';
import { FOLDERS } from '@/lib/tile-executor';

/**
 * POST /api/workflows/save
 * Save a workflow to the workflows folder
 */
export async function POST(request: NextRequest) {
  try {
    const workflow = await request.json();
    
    // Generate filename
    const filename = `${workflow.name || 'workflow'}_${Date.now()}.json`
      .replace(/[^a-zA-Z0-9_.-]/g, '_');
    const filepath = path.join(FOLDERS.WORKFLOWS, filename);
    
    // Save workflow
    await writeFile(filepath, JSON.stringify(workflow, null, 2));
    
    return NextResponse.json({
      success: true,
      path: filepath,
      filename,
      message: `Workflow saved: ${filename}`,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
