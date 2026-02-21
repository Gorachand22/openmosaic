import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

/**
 * POST /api/generate/image
 * Generate an image from a text prompt
 * 
 * Request body:
 * - prompt: string (required) - Text description for image generation
 * - size: string (optional) - Image size, default: "1024x1024"
 *   Options: "1024x1024", "768x1344", "1344x768", "864x1152", "720x1440", "1152x864", "1440x720"
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, size = "1024x1024" } = body;

    // Validate required fields
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json(
        { success: false, error: "prompt is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    // Validate size
    const validSizes = ["1024x1024", "768x1344", "1344x768", "864x1152", "720x1440", "1152x864", "1440x720"];
    if (!validSizes.includes(size)) {
      return NextResponse.json(
        { success: false, error: `Invalid size. Must be one of: ${validSizes.join(", ")}` },
        { status: 400 }
      );
    }

    console.log(`[Image API] Generating image: "${prompt.substring(0, 50)}..." Size: ${size}`);

    // Create ZAI instance and generate image
    const zai = await ZAI.create();
    const response = await zai.images.generations.create({
      prompt: prompt.trim(),
      size: size as "1024x1024" | "768x1344" | "1344x768" | "864x1152" | "720x1440" | "1152x864" | "1440x720",
    });

    // Extract base64 image data
    const base64Data = response.data?.[0]?.base64;
    
    if (!base64Data) {
      console.error("[Image API] No image data in response");
      return NextResponse.json(
        { success: false, error: "No image data returned from AI service" },
        { status: 500 }
      );
    }

    console.log("[Image API] Image generated successfully");

    return NextResponse.json({
      success: true,
      base64: base64Data,
      prompt: prompt.trim(),
      size: size,
    });

  } catch (error: unknown) {
    console.error("[Image API] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Image generation failed";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * GET /api/generate/image
 * Returns API documentation
 */
export async function GET() {
  return NextResponse.json({
    endpoint: "/api/generate/image",
    method: "POST",
    description: "Generate an image from a text prompt",
    parameters: {
      prompt: {
        type: "string",
        required: true,
        description: "Text description for image generation",
      },
      size: {
        type: "string",
        required: false,
        default: "1024x1024",
        options: ["1024x1024", "768x1344", "1344x768", "864x1152", "720x1440", "1152x864", "1440x720"],
        description: "Output image size",
      },
    },
    response: {
      success: "boolean",
      base64: "string (base64 encoded PNG image)",
      prompt: "string",
      size: "string",
    },
    examples: {
      "Text to Image": {
        prompt: "A beautiful sunset over mountains",
        size: "1024x1024",
      },
      "Shorts/Reels (9:16)": {
        prompt: "A cat playing with a ball",
        size: "768x1344",
      },
      "YouTube (16:9)": {
        prompt: "Ocean waves at sunset",
        size: "1344x768",
      },
    },
  });
}
