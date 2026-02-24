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

    // Generate consistent filename based on ID to overwrite instead of duplicated files
    const safeId = workflow.id ? workflow.id.replace(/[^a-zA-Z0-9_-]/g, '') : Date.now();
    const filename = `workflow_${safeId}.json`;
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
