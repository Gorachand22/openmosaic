import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

/**
 * OpenMosaic Agentic AI Pipeline - JARVIS
 * 
 * Primary: z-ai-web-dev-sdk (GLM models)
 * Fallback: OpenRouter API
 * 
 * This is an ACTIONABLE AGENT system that executes step by step
 */

const AGENT_SYSTEM_PROMPT = `You are Thena, the AI assistant for OpenMosaic - a world-class agentic AI video editing platform.

You are an ACTIONABLE AGENT. You EXECUTE tasks step by step, not just suggest.

## HOW TO RESPOND:
1. First, explain what you'll do in simple terms
2. Then output the steps as JSON

## OUTPUT FORMAT:
Always end with a STEPS block:

\`\`\`steps
{
  "clearCanvas": true,
  "steps": [
    {"action": "add_node", "tileType": "youtube-trigger", "description": "Adding YouTube input"},
    {"action": "add_node", "tileType": "clips", "description": "Adding clips extraction"},
    {"action": "add_node", "tileType": "reframe", "description": "Adding reframe for 9:16"},
    {"action": "add_node", "tileType": "cinematic-captions", "description": "Adding cinematic captions"}
  ]
}
\`\`\`

## TILE TYPES (use exact type name):

### INPUT:
- youtube-trigger: YouTube video import
- video-input: Upload video file
- image-input: Import images
- audio-input: Import audio
- text-input: Enter text

### CREATION:
- ai-avatar: Talking head avatar from text
- ai-broll: AI B-roll generation
- ai-content-generation: Full video from text
- ai-music: Background music generation
- ai-image: Generate images from text
- ai-video: Generate video from text

### ACTION:
- captions: Add subtitles
- cinematic-captions: Movie-style captions
- motion-graphics: Animated overlays
- reframe: Change aspect ratio (9:16, 16:9, 1:1)
- silence-removal: Remove silent parts
- clips: Extract highlights/viral clips
- montage: Combine multiple clips
- audio-enhance: Improve audio quality
- color-correction: Adjust colors
- intro: Add intro sequence
- outro: Add outro sequence

## EXAMPLE WORKFLOWS:

YouTube to Instagram Reels:
1. youtube-trigger → 2. clips → 3. reframe → 4. cinematic-captions

Video with Captions:
1. video-input → 2. captions

TikTok from Long Video:
1. video-input → 2. silence-removal → 3. clips → 4. reframe → 5. cinematic-captions

UGC Avatar Video:
1. text-input → 2. ai-avatar → 3. captions

IMPORTANT: 
- Each step adds ONE tile
- Tiles connect automatically to previous tile
- Keep it simple and focused
- Always provide steps JSON at the end`;

// Add a helper for generic OpenAI-compatible REST endpoints
async function fetchOpenAICompatible(url: string, apiKey: string, model: string, messages: any[]) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'OpenMosaic'
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 4096
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`HTTP ${res.status}: ${errText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content;
}

async function getAIResponse(messages: Array<{ role: string; content: string }>): Promise<{
  content: string;
  provider: string;
}> {
  let content: string | null = null;
  let provider = "unknown";

  // 1. Try Primary ZAI Provider
  try {
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: messages.map(m => ({ role: m.role as 'system' | 'user' | 'assistant', content: m.content })),
      temperature: 0.7,
      max_tokens: 4096,
    });
    content = completion.choices?.[0]?.message?.content;
    provider = "z-ai-web-dev-sdk (Local SDK proxy)";
    if (content) {
      console.log(`[Agent] Used Z-AI (primary)`);
      return { content, provider };
    }
  } catch (error) {
    console.warn(`[Agent] ZAI SDK failed: ${error}`);
    console.log(`[Agent] Attempting Fallback 1: Nvidia API`);

    // 2. Try Nvidia Endpoints Fallback
    try {
      if (!process.env.NV_API_KEY) throw new Error("Missing NV_API_KEY in .env");
      content = await fetchOpenAICompatible(
        'https://integrate.api.nvidia.com/v1/chat/completions',
        process.env.NV_API_KEY,
        'z-ai/glm5',
        messages
      );
      provider = "Nvidia (z-ai/glm5)";
      if (content) {
        console.log(`[Agent] Used Nvidia API`);
        return { content, provider };
      }
    } catch (nvError) {
      console.warn(`[Agent] Nvidia API failed: ${nvError}`);
      console.log(`[Agent] Attempting Fallback 2: OpenRouter Free`);

      // 3. Try OpenRouter Free Fallback
      try {
        if (!process.env.OPENROUTER_API_KEY) throw new Error("Missing OPENROUTER_API_KEY in .env");
        content = await fetchOpenAICompatible(
          'https://openrouter.ai/api/v1/chat/completions',
          process.env.OPENROUTER_API_KEY,
          'nvidia/nemotron-nano-12b-v2-vl:free',
          messages
        );
        provider = "OpenRouter (nvidia/nemotron-nano-12b-v2-vl:free)";
        if (content) {
          console.log(`[Agent] Used OpenRouter API`);
          return { content, provider };
        }
      } catch (orError) {
        console.warn(`[Agent] OpenRouter API failed: ${orError}`);
        console.log(`[Agent] Attempting Fallback 3: HuggingFace Target`);

        // 4. Try HuggingFace Tunnel Fallback
        try {
          if (!process.env.HF_TOKEN) throw new Error("Missing HF_TOKEN in .env");
          content = await fetchOpenAICompatible(
            'https://router.huggingface.co/v1/chat/completions',
            process.env.HF_TOKEN,
            'zai-org/GLM-5:together',
            messages
          );
          provider = "HuggingFace (zai-org/GLM-5:together)";
          if (content) {
            console.log(`[Agent] Used HuggingFace API`);
            return { content, provider };
          }
        } catch (hfError) {
          console.error(`[Agent] All backend providers failed permanently.`);
          throw new Error(`All fallback AI network providers have failed or timed out. Last error: ${hfError}`);
        }
      }
    }
  }

  throw new Error('All AI providers failed or returned empty content');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, context, action } = body;

    // Handle specific generation actions
    if (action === 'generate_video') {
      return await handleVideoGeneration(body);
    }
    if (action === 'generate_image') {
      return await handleImageGeneration(body);
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ success: false, error: "messages required" }, { status: 400 });
    }

    // Build context
    let contextStr = '';
    if (context?.canvas?.nodes?.length > 0) {
      contextStr = `\n\nCurrent Canvas State:
- ${context.canvas.nodes.length} tiles on canvas
- Tiles: ${context.canvas.nodes.map((n: { type: string; label: string }) => n.label || n.type).join(', ')}
- ${context.canvas.edges?.length || 0} connections`;
    } else {
      contextStr = '\n\nCurrent Canvas: Empty (no tiles)';
    }

    const chatMessages = [
      { role: 'system', content: AGENT_SYSTEM_PROMPT + contextStr },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    const { content, provider } = await getAIResponse(chatMessages);

    // Extract steps JSON
    const stepsMatch = content.match(/```steps\n([\s\S]*?)```/);

    let steps = null;
    let clearCanvas = false;

    if (stepsMatch) {
      try {
        const stepsData = JSON.parse(stepsMatch[1]);
        const parsedSteps = stepsData.steps || [];
        clearCanvas = stepsData.clearCanvas ?? true;

        // Add unique IDs to steps
        steps = parsedSteps.map((step: any, index: number) => ({
          ...step,
          id: `step-${index}-${Date.now()}`,
          status: 'pending',
        }));
      } catch (e) {
        console.error('[Agent] Failed to parse steps:', e);
      }
    }

    // Remove the steps JSON from message for cleaner display
    let cleanMessage = content.replace(/```steps\n[\s\S]*?```/g, '').trim();

    return NextResponse.json({
      success: true,
      message: cleanMessage,
      provider,
      steps,
      clearCanvas,
    });

  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed' },
      { status: 500 }
    );
  }
}

async function handleVideoGeneration(body: { prompt: string; imageUrl?: string; size?: string; duration?: number }) {
  try {
    const { prompt, imageUrl, size = '768x1344', duration = 5 } = body;
    const zai = await ZAI.create();

    const params: Record<string, unknown> = { prompt, size, duration, quality: 'speed', fps: 30 };
    if (imageUrl) params.image_url = imageUrl;

    const task = await zai.video.generations.create(params);

    return NextResponse.json({
      success: true,
      taskId: task.id,
      status: task.task_status || 'PROCESSING',
      provider: 'z-ai-web-dev-sdk',
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Video gen failed' },
      { status: 500 }
    );
  }
}

async function handleImageGeneration(body: { prompt: string; size?: string }) {
  try {
    const { prompt, size = '1024x1024' } = body;
    const zai = await ZAI.create();
    const response = await zai.images.generations.create({ prompt, size: size as '1024x1024' });

    return NextResponse.json({
      success: true,
      base64: response.data?.[0]?.base64,
      provider: 'z-ai-web-dev-sdk',
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Image gen failed' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    name: 'OpenMosaic Agent (JARVIS)',
    version: '3.0',
    capabilities: ['workflow_creation', 'step_by_step_execution', 'video_generation', 'image_generation', 'intelligent_editing'],
    providers: { primary: 'z-ai-web-dev-sdk', fallback: 'openrouter' },
  });
}
