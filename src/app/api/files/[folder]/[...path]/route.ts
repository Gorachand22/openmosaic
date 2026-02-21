import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import path from 'path';
import { FOLDERS } from '@/lib/tile-executor';

/**
 * GET /api/files/[folder]/[...path]
 * Serve files from input, output, or workflows folder
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ folder: string; path: string[] }> }
) {
  try {
    const { folder, path: filePath } = await params;

    // Validate folder
    const validFolders = ['input', 'output', 'workflows', 'temp'];
    if (!validFolders.includes(folder)) {
      return NextResponse.json({ error: 'Invalid folder' }, { status: 400 });
    }

    // Build file path
    const folderPath = FOLDERS[folder.toUpperCase() as keyof typeof FOLDERS];
    const fullPath = path.join(folderPath, ...filePath);

    // Security: ensure path doesn't escape the folder
    const resolved = path.resolve(fullPath);
    if (!resolved.startsWith(folderPath)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Check if file exists
    try {
      await stat(fullPath);
    } catch {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Read and serve file
    const fileBuffer = await readFile(fullPath);
    const ext = path.extname(fullPath).toLowerCase();

    // Determine content type
    const contentTypes: Record<string, string> = {
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.mov': 'video/quicktime',
      '.avi': 'video/x-msvideo',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.aac': 'audio/aac',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.json': 'application/json',
      '.txt': 'text/plain',
      '.srt': 'text/plain',
    };

    const contentType = contentTypes[ext] || 'application/octet-stream';

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${path.basename(fullPath)}"`,
      },
    });
  } catch (error) {
    console.error('File serve error:', error);
    return NextResponse.json(
      { error: 'Failed to serve file' },
      { status: 500 }
    );
  }
}
