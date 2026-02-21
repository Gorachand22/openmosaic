import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

/**
 * POST /api/generate/multi-image-video
 * Generate a video from MULTIPLE images (keyframe animation)
 * 
 * Use case: Character + Object interaction
 * Example: 
 *   - Image 1: A man sitting
 *   - Image 2: A tea cup
 *   - Prompt: "Man drinking tea"
 *   - Result: Animated video of man drinking tea
 * 
 * Request body:
 * - prompt: string (required) - Describes the action/animation
 * - images: string[] (required) - Array of base64 data URLs or image URLs
 *   - 1 image: Single image animation
 *   - 2 images: Start and end frame interpolation (RECOMMENDED for interactions)
 * - size: string (optional) - Video size, default: "768x1344"
 * - duration: number (optional) - 5 or 10 seconds, default: 5
 * - quality: string (optional) - "speed" or "quality", default: "speed"
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      prompt, 
      images,
      size = "768x1344", 
      duration = 5,
      quality = "speed",
    } = body;

    // Validate prompt
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json(
        { success: false, error: "prompt is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    // Validate images array
    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json(
        { success: false, error: "images array is required with at least one image" },
        { status: 400 }
      );
    }

    // Validate each image
    for (let i = 0; i < images.length; i++) {
      if (typeof images[i] !== "string" || !images[i].trim()) {
        return NextResponse.json(
          { success: false, error: `Image at index ${i} is invalid` },
          { status: 400 }
        );
      }
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

    console.log(`[Multi-Image-Video API] Starting generation with ${images.length} images`);
    console.log(`[Multi-Image-Video API] Prompt: "${prompt.substring(0, 50)}..." Size: ${size} Duration: ${duration}s`);

    // Create ZAI instance
    const zai = await ZAI.create();

    // Create video generation task with multiple images
    const response = await zai.video.generations.create({
      prompt: prompt.trim(),
      image_url: images, // Pass array of images for keyframe interpolation
      size: size as "768x1344" | "1344x768" | "1024x1024" | "864x1152" | "720x1440" | "1152x864" | "1440x720",
      duration: duration,
      quality: quality as "speed" | "quality",
      fps: 30,
    });

    const taskId = response.id;

    if (!taskId) {
      console.error("[Multi-Image-Video API] No task ID in response");
      return NextResponse.json(
        { success: false, error: "No task ID returned from AI service" },
        { status: 500 }
      );
    }

    console.log(`[Multi-Image-Video API] Task created: ${taskId}`);

    return NextResponse.json({
      success: true,
      taskId: taskId,
      status: response.task_status || "PROCESSING",
      prompt: prompt.trim(),
      imageCount: images.length,
      size: size,
      duration: duration,
      quality: quality,
    });

  } catch (error: unknown) {
    console.error("[Multi-Image-Video API] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Video generation failed";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * GET /api/generate/multi-image-video
 * Returns API documentation
 */
export async function GET() {
  return NextResponse.json({
    endpoint: "/api/generate/multi-image-video",
    method: "POST",
    description: "Generate a video from multiple images (keyframe animation) - Perfect for character + object interactions",
    useCases: [
      {
        name: "Character-Object Interaction",
        images: ["Character image", "Object image"],
        prompt: "Character interacting with object",
        example: {
          image1: "A man sitting in a chair",
          image2: "A tea cup on a table", 
          prompt: "The man picks up the tea cup and drinks",
        }
      },
      {
        name: "Scene Transition",
        images: ["Start scene", "End scene"],
        prompt: "Smooth transition between scenes",
      },
      {
        name: "Single Image Animation",
        images: ["One image"],
        prompt: "Animate this image with motion",
      }
    ],
    parameters: {
      prompt: {
        type: "string",
        required: true,
        description: "Describes the action/animation to create",
      },
      images: {
        type: "string[]",
        required: true,
        description: "Array of base64 data URLs or image URLs. Use 2 images for best results (start + end frames)",
      },
      size: {
        type: "string",
        required: false,
        default: "768x1344",
        options: ["768x1344", "1344x768", "1024x1024", "864x1152"],
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
    },
    response: {
      success: "boolean",
      taskId: "string - Use with /api/generate/status to check progress",
      status: "string - PROCESSING, SUCCESS, or FAIL",
      imageCount: "number - Number of images used",
    },
    example: {
      request: {
        prompt: "A man drinking tea from a cup",
        images: [
          "data:image/png;base64,iVBORw0KGgo...",
          "data:image/png;base64,iVBORw0KGgo..."
        ],
        size: "768x1344",
        duration: 5,
        quality: "speed"
      }
    },
  });
}
