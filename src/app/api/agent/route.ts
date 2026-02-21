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

const AGENT_SYSTEM_PROMPT = `You are JARVIS, the AI assistant for OpenMosaic - a world-class agentic AI video editing platform.

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
    {"action": "add_node", "tileType": "cinematic-captions", "description": "Adding cinematic captions"},
    {"action": "add_node", "tileType": "destination", "description": "Adding Instagram destination"}
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

### OUTPUT:
- video-output: Export video file
- destination: Publish to social platform

## EXAMPLE WORKFLOWS:

YouTube to Instagram Reels:
1. youtube-trigger → 2. clips → 3. reframe → 4. cinematic-captions → 5. destination

Video with Captions:
1. video-input → 2. captions → 3. video-output

TikTok from Long Video:
1. video-input → 2. silence-removal → 3. clips → 4. reframe → 5. cinematic-captions → 6. destination

UGC Avatar Video:
1. text-input → 2. ai-avatar → 3. captions → 4. destination

IMPORTANT: 
- Each step adds ONE tile
- Tiles connect automatically to previous tile
- Keep it simple and focused
- Always provide steps JSON at the end`;

const OPENROUTER_CONFIG = {
  baseUrl: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY || '',
  model: process.env.OPENROUTER_MODEL || 'nvidia/nemotron-nano-12b-v2-vl:free',
};

async function getAIResponse(messages: Array<{ role: string; content: string }>): Promise<{
  content: string;
  provider: string;
}> {
  // Try Z-AI first
  try {
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: messages.map(m => ({ role: m.role as 'system' | 'user' | 'assistant', content: m.content })),
      temperature: 0.7,
      max_tokens: 4096,
    });

    const content = completion.choices?.[0]?.message?.content;
    if (content) {
      console.log('[Agent] Used Z-AI (primary)');
      return { content, provider: 'z-ai-web-dev-sdk' };
    }
  } catch (error) {
    console.warn('[Agent] Z-AI failed, using OpenRouter fallback');
  }

  // OpenRouter fallback
  if (!OPENROUTER_CONFIG.apiKey) {
    throw new Error('No AI provider available');
  }

  try {
    const response = await fetch(`${OPENROUTER_CONFIG.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_CONFIG.apiKey}`,
        'HTTP-Referer': 'https://openmosaic.app',
      },
      body: JSON.stringify({
        model: OPENROUTER_CONFIG.model,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        temperature: 0.7,
        max_tokens: 4096,
      }),
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (content) {
      console.log('[Agent] Used OpenRouter (fallback)');
      return { content, provider: 'openrouter' };
    }
  } catch (error) {
    console.error('[Agent] OpenRouter failed:', error);
  }

  throw new Error('All AI providers failed');
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
        steps = stepsData.steps || [];
        clearCanvas = stepsData.clearCanvas ?? true;
        
        // Add unique IDs to steps
        steps = steps.map((step: { action: string; tileType?: string; description: string }, index: number) => ({
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
