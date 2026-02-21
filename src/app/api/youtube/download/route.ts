import { NextRequest, NextResponse } from 'next/server';
import { downloadYouTubeVideo, checkYtDlp } from '@/lib/tile-executor';

/**
 * POST /api/youtube/download
 * Download a YouTube video
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, filename } = body;

    if (!url) {
      return NextResponse.json({ error: 'YouTube URL is required' }, { status: 400 });
    }

    // Validate YouTube URL
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|v\/)|youtu\.be\/)[\w-]+/;
    if (!youtubeRegex.test(url)) {
      return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
    }

    // Check yt-dlp first
    const ytDlpCheck = await checkYtDlp();
    if (!ytDlpCheck.installed) {
      return NextResponse.json({
        error: ytDlpCheck.error,
        hint: 'Install yt-dlp: pip install yt-dlp OR brew install yt-dlp'
      }, { status: 500 });
    }

    // Download the video
    const result = await downloadYouTubeVideo(url, filename);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('YouTube download error:', error);
    return NextResponse.json(
      { error: `YouTube download failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

/**
 * GET /api/youtube/download
 * Check if yt-dlp is installed
 */
export async function GET() {
  const result = await checkYtDlp();
  return NextResponse.json({
    installed: result.installed,
    version: result.version,
    error: result.error,
    hint: result.error ? 'Install yt-dlp: pip install yt-dlp OR brew install yt-dlp' : null
  });
}
