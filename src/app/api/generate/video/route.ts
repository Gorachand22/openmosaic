import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

/**
 * POST /api/generate/video
 * Generate a video from text prompt or image
 * 
 * Request body:
 * - prompt: string (required) - Text description for video generation
 * - size: string (optional) - Video size, default: "768x1344"
 *   Options: "768x1344", "1344x768", "1024x1024", "864x1152", "720x1440", "1152x864", "1440x720"
 * - duration: number (optional) - Video duration in seconds: 5 or 10, default: 5
 * - quality: string (optional) - "speed" or "quality", default: "speed"
 * - imageUrl: string (optional) - Base64 data URL or URL of input image for image-to-video
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      prompt, 
      size = "768x1344", 
      duration = 5, 
      quality = "speed",
      imageUrl 
    } = body;

    // Validate required fields
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json(
        { success: false, error: "prompt is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    // Validate size
    const validSizes = ["768x1344", "1344x768", "1024x1024", "864x1152", "720x1440", "1152x864", "1440x720"];
    if (!validSizes.includes(size)) {
      return NextResponse.json(
        { success: false, error: `Invalid size. Must be one of: ${validSizes.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate duration
    if (![5, 10].includes(duration)) {
      return NextResponse.json(
        { success: false, error: "duration must be 5 or 10" },
        { status: 400 }
      );
    }

    // Validate quality
    if (!["speed", "quality"].includes(quality)) {
      return NextResponse.json(
        { success: false, error: "quality must be 'speed' or 'quality'" },
        { status: 400 }
      );
    }

    const isImageToVideo = imageUrl && typeof imageUrl === "string" && imageUrl.trim();
    
    console.log(`[Video API] Starting ${isImageToVideo ? 'image-to-video' : 'text-to-video'} generation`);
    console.log(`[Video API] Prompt: "${prompt.substring(0, 50)}..." Size: ${size} Duration: ${duration}s Quality: ${quality}`);

    // Create ZAI instance
    const zai = await ZAI.create();

    // Build request parameters
    const params: Record<string, unknown> = {
      prompt: prompt.trim(),
      size: size,
      duration: duration,
      quality: quality,
      fps: 30,
    };

    // Add image_url for image-to-video
    if (isImageToVideo) {
      params.image_url = imageUrl.trim();
    }

    // Create video generation task
    const task = await zai.video.generations.create(params);

    const taskId = task.id;
    
    if (!taskId) {
      console.error("[Video API] No task ID in response");
      return NextResponse.json(
        { success: false, error: "No task ID returned from AI service" },
        { status: 500 }
      );
    }

    console.log(`[Video API] Task created: ${taskId}, Status: ${task.task_status}`);

    return NextResponse.json({
      success: true,
      taskId: taskId,
      status: task.task_status || "PROCESSING",
      prompt: prompt.trim(),
      size: size,
      duration: duration,
      quality: quality,
      mode: isImageToVideo ? "image-to-video" : "text-to-video",
    });

  } catch (error: unknown) {
    console.error("[Video API] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Video generation failed";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * GET /api/generate/video
 * Returns API documentation
 */
export async function GET() {
  return NextResponse.json({
    endpoint: "/api/generate/video",
    method: "POST",
    description: "Generate a video from text prompt or image",
    parameters: {
      prompt: {
        type: "string",
        required: true,
        description: "Text description for video generation",
      },
      size: {
        type: "string",
        required: false,
        default: "768x1344",
        options: ["768x1344", "1344x768", "1024x1024", "864x1152", "720x1440", "1152x864", "1440x720"],
        description: "Output video size",
      },
      duration: {
        type: "number",
        required: false,
        default: 5,
        options: [5, 10],
        description: "Video duration in seconds",
      },
      quality: {
        type: "string",
        required: false,
        default: "speed",
        options: ["speed", "quality"],
        description: "Generation quality mode",
      },
      imageUrl: {
        type: "string",
        required: false,
        description: "Base64 data URL or URL of input image for image-to-video generation",
      },
    },
    response: {
      success: "boolean",
      taskId: "string - Use with /api/generate/status to check progress",
      status: "string - PROCESSING, SUCCESS, or FAIL",
      prompt: "string",
      size: "string",
      duration: "number",
      quality: "string",
      mode: "string - 'text-to-video' or 'image-to-video'",
    },
    examples: {
      "Text to Video (Shorts/Reels)": {
        prompt: "A man dancing in a bar",
        size: "768x1344",
        duration: 5,
        quality: "speed",
      },
      "Text to Video (YouTube)": {
        prompt: "Ocean waves at sunset",
        size: "1344x768",
        duration: 10,
        quality: "quality",
      },
      "Image to Video": {
        prompt: "Animate this image with gentle motion",
        imageUrl: "data:image/png;base64,...",
        size: "768x1344",
        duration: 5,
        quality: "speed",
      },
    },
    sizeGuide: {
      "Shorts/Reels/TikTok": "768x1344 (9:16 vertical)",
      "YouTube": "1344x768 (16:9 landscape)",
      "Instagram Feed": "1024x1024 (1:1 square)",
      "Instagram Portrait": "864x1152 (3:4 portrait)",
    },
  });
}
