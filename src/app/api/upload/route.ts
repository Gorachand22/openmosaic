import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { FOLDERS, ensureFolders } from '@/lib/tile-executor';

// Ensure folders exist
ensureFolders().catch(console.error);

/**
 * POST /api/upload
 * Upload a file to the input folder
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const filename = formData.get('filename') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Generate filename
    const originalName = file.name || 'uploaded_file';
    const finalFilename = filename || originalName;

    // Save to input folder
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filepath = path.join(FOLDERS.INPUT, finalFilename);

    await writeFile(filepath, buffer);

    // Get file stats
    const { stat } = await import('fs/promises');
    const stats = await stat(filepath);

    return NextResponse.json({
      success: true,
      file: {
        filename: finalFilename,
        originalName: originalName,
        path: filepath,
        url: `/api/files/input/${finalFilename}`,
        size: stats.size,
        sizeMB: (stats.size / (1024 * 1024)).toFixed(2),
        type: file.type,
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

/**
 * GET /api/upload
 * List uploaded files
 */
export async function GET() {
  try {
    const { readdir, stat } = await import('fs/promises');
    const files = await readdir(FOLDERS.INPUT);

    const fileInfos = await Promise.all(
      files.map(async (filename) => {
        const filepath = path.join(FOLDERS.INPUT, filename);
        const stats = await stat(filepath);
        return {
          filename,
          path: filepath,
          url: `/api/files/input/${filename}`,
          size: stats.size,
          sizeMB: (stats.size / (1024 * 1024)).toFixed(2),
          modified: stats.mtime,
        };
      })
    );

    return NextResponse.json({
      success: true,
      folder: 'input',
      count: fileInfos.length,
      files: fileInfos,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to list files' }, { status: 500 });
  }
}
