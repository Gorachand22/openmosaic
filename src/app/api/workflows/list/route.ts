import { NextResponse } from 'next/server';
import { readdir, stat } from 'fs/promises';
import path from 'path';
import { FOLDERS } from '@/lib/tile-executor';

/**
 * GET /api/workflows/list
 * List all saved workflows
 */
export async function GET() {
  try {
    const files = await readdir(FOLDERS.WORKFLOWS);
    
    const workflows = await Promise.all(
      files
        .filter((f) => f.endsWith('.json'))
        .map(async (filename) => {
          const filepath = path.join(FOLDERS.WORKFLOWS, filename);
          const stats = await stat(filepath);
          
          // Try to read workflow name
          let name = filename;
          try {
            const content = await import('fs/promises').then((fs) => fs.readFile(filepath, 'utf-8'));
            const data = JSON.parse(content);
            name = data.name || filename;
          } catch {
            // Ignore parse errors
          }
          
          return {
            filename,
            path: filepath,
            name,
            modified: stats.mtime,
            size: stats.size,
          };
        })
    );
    
    // Sort by modified date (newest first)
    workflows.sort((a, b) => b.modified.getTime() - a.modified.getTime());
    
    return NextResponse.json({
      success: true,
      folder: FOLDERS.WORKFLOWS,
      count: workflows.length,
      files: workflows,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
