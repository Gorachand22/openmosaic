import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";
import fs from 'fs';
import path from 'path';

/**
 * POST /api/generate/status
 * Check the status of a video generation task
 * 
 * Request body:
 * - taskId: string (required) - The task ID returned from video generation
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskId } = body;

    if (!taskId || typeof taskId !== "string" || !taskId.trim()) {
      return NextResponse.json(
        { success: false, error: "taskId is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    console.log(`[Status API] Checking status for task: ${taskId}`);

    // Create config bypass because the SDK's internal `.check` and query logic are either broken or hallucinated when hitting the proxy
    const configData = fs.readFileSync(path.join(process.cwd(), '.z-ai-config'), 'utf-8');
    const zaiConfig = JSON.parse(configData);

    // Fetch proxy directly to avoid SDK generating a 400 Bad Request
    const pollRes = await fetch(`${zaiConfig.baseUrl}/video/generations/${taskId.trim()}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${zaiConfig.apiKey}` }
    });

    if (!pollRes.ok) {
      throw new Error(`Polling failed with status ${pollRes.status}: ${await pollRes.text()}`);
    }

    const result = await pollRes.json();

    const status = result.task_status || result.status;
    const videoUrl = result.video_url || result.output?.video_url;
    const base64Video = result.base64 || result.output?.base64;

    console.log(`[Status API] Task ${taskId}: ${status}`);

    return NextResponse.json({
      success: true,
      taskId: taskId,
      status: status,
      videoUrl: videoUrl,
      base64: base64Video,
      progress: result.progress || (status === "SUCCESS" ? 100 : status === "PROCESSING" ? 50 : 0),
    });

  } catch (error: unknown) {
    console.error("[Status API] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Status check failed";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * GET /api/generate/status
 * Returns API documentation
 */
export async function GET() {
  return NextResponse.json({
    endpoint: "/api/generate/status",
    method: "POST",
    description: "Check the status of a video generation task",
    parameters: {
      taskId: {
        type: "string",
        required: true,
        description: "The task ID returned from video generation",
      },
    },
    response: {
      success: "boolean",
      taskId: "string",
      status: "string - PROCESSING, SUCCESS, or FAIL",
      videoUrl: "string (optional) - URL to download the video when complete",
      base64: "string (optional) - Base64 encoded video data when complete",
      progress: "number - 0-100 progress percentage",
    },
    example: {
      request: {
        taskId: "task_abc123"
      },
      response: {
        success: true,
        taskId: "task_abc123",
        status: "SUCCESS",
        videoUrl: "https://...",
        progress: 100
      }
    }
  });
}
