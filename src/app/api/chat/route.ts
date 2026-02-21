import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

/**
 * POST /api/chat
 * Agentic AI Chat with workflow creation capabilities
 * 
 * Uses z-ai-web-dev-sdk (GLM) as primary provider
 */

const SYSTEM_PROMPT = `You are an AI agent for OpenMosaic, an open-source agentic AI video editing platform.

You are an ACTIONABLE AGENT. This means you don't just suggest - you can CREATE workflows on the user's canvas.

## Your Capabilities:
1. Create complete workflows by outputting JSON in code blocks
2. Explain how tiles work and what they do
3. Help troubleshoot video editing workflows
4. Suggest improvements to existing workflows

## Available Tiles with Inputs/Outputs:

### INPUT TILES (produce outputs, no inputs required):
- **video-input**: Outputs: video, audio | Upload/import video files
- **image-input**: Outputs: image | Import images for overlays
- **audio-input**: Outputs: audio | Upload audio files
- **text-input**: Outputs: text | Enter text for captions/scripts
- **youtube-input**: Outputs: video, audio | Download from YouTube

### ACTION TILES (transform inputs to outputs):
- **ai-avatar**: Inputs: text, audio → Outputs: video | Generate AI avatar videos
- **ai-broll**: Inputs: text, video → Outputs: video | Generate B-roll footage
- **ai-voiceover**: Inputs: text → Outputs: audio | Text-to-speech voiceover
- **ai-music**: Inputs: text, video → Outputs: audio | Generate background music
- **ai-transcription**: Inputs: audio → Outputs: text | Speech to text
- **ai-summary**: Inputs: text → Outputs: text | Summarize content
- **ai-captions**: Inputs: video, audio → Outputs: video | Auto-generate captions
- **cinematic-captions**: Inputs: video, text → Outputs: video | Movie-style captions
- **captions-emojis**: Inputs: video, text → Outputs: video | Captions with emojis
- **motion-graphics**: Inputs: video → Outputs: video | Add animated graphics
- **clips**: Inputs: video, text → Outputs: video | Extract clips
- **montage**: Inputs: video, audio → Outputs: video | Create montage sequence
- **reframe**: Inputs: video → Outputs: video | Change aspect ratio (9:16, 16:9, 1:1)
- **silence-removal**: Inputs: video, audio → Outputs: video, audio | Remove silence
- **intro**: Inputs: video → Outputs: video | Add intro sequence
- **outro**: Inputs: video → Outputs: video | Add outro with CTA
- **watermark**: Inputs: video, image → Outputs: video | Add watermark
- **color-correction**: Inputs: video → Outputs: video | Color grading
- **audio-enhance**: Inputs: audio → Outputs: audio | Enhance audio quality
- **video-trimmer**: Inputs: video → Outputs: video | Cut/trim video
- **video-effects**: Inputs: video → Outputs: video | Visual effects
- **concatenate**: Inputs: video1, video2 → Outputs: video | Join videos

### OUTPUT TILES (consume inputs, no outputs):
- **video-output**: Inputs: video | Export video file
- **audio-output**: Inputs: audio | Export audio file
- **destination**: Inputs: video | Publish to social platforms

## Connection Rules:
- Output types must match input types
- video can connect to video inputs
- audio can connect to audio inputs
- text can connect to text inputs
- image can connect to image inputs

## Workflow Format:
When creating a workflow, ALWAYS output JSON in this exact format:

\`\`\`workflow
{
  "tiles": [
    {"type": "youtube-input", "label": "Source Video", "config": {"url": "YOUTUBE_URL"}},
    {"type": "ai-transcription", "label": "Transcribe"},
    {"type": "clips", "label": "Extract Clips", "config": {"mode": "ai-suggested"}},
    {"type": "cinematic-captions", "label": "Add Captions", "config": {"style": "cinematic"}},
    {"type": "reframe", "label": "Instagram Format", "config": {"targetRatio": "9:16"}},
    {"type": "video-output", "label": "Export", "config": {"format": "mp4", "resolution": "1080x1920"}}
  ],
  "connections": [
    {"from": "youtube-input", "to": "ai-transcription"},
    {"from": "youtube-input", "to": "clips"},
    {"from": "ai-transcription", "to": "clips"},
    {"from": "clips", "to": "cinematic-captions"},
    {"from": "cinematic-captions", "to": "reframe"},
    {"from": "reframe", "to": "video-output"}
  ]
}
\`\`\`

## Guidelines:
1. Always include all necessary tiles - from input to output
2. Number the tiles in logical processing order
3. Make connections that follow the data flow
4. Include config options when relevant (URLs, durations, styles)
5. Use descriptive labels that help the user understand the workflow

## Current Context:
The user has access to the canvas. When you provide a workflow, they can click "Create Workflow on Canvas" to automatically add and connect all the tiles.

Remember: You are an ACTIONABLE agent. Provide workflows that can be directly executed on the canvas!`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, context } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { success: false, error: "messages array is required" },
        { status: 400 }
      );
    }

    console.log(`[Chat API] Processing ${messages.length} messages`);

    // Create ZAI instance (uses GLM models)
    const zai = await ZAI.create();

    // Build messages array with system prompt
    const chatMessages = [
      { role: "system", content: SYSTEM_PROMPT },
    ];

    // Add context if provided
    if (context) {
      let contextStr = "\n## Current Canvas State:\n";
      if (context.canvas?.nodes?.length > 0) {
        contextStr += `Nodes on canvas: ${context.canvas.nodes.map((n: { type: string; label: string }) => n.type).join(', ')}\n`;
      }
      if (context.canvas?.edges?.length > 0) {
        contextStr += `Connections: ${context.canvas.edges.length} connections\n`;
      }
      contextStr += `Current workflow: ${context.currentWorkflow || 'Untitled'}\n`;
      contextStr += `Recent actions: ${context.recentActions?.slice(-3).join(', ') || 'None'}\n`;
      
      chatMessages.push({
        role: "system" as const,
        content: contextStr
      });
    }

    // Add user messages
    messages.forEach((m: { role: string; content: string }) => {
      chatMessages.push({
        role: m.role as "user" | "assistant",
        content: m.content
      });
    });

    // Create chat completion
    const completion = await zai.chat.completions.create({
      messages: chatMessages,
      temperature: 0.7,
      max_tokens: 4096,
    });

    const responseContent = completion.choices?.[0]?.message?.content;

    if (!responseContent) {
      return NextResponse.json(
        { success: false, error: "No response from AI" },
        { status: 500 }
      );
    }

    console.log(`[Chat API] Response generated successfully`);

    return NextResponse.json({
      success: true,
      message: responseContent,
      provider: "z-ai-web-dev-sdk",
      usage: completion.usage,
    });

  } catch (error: unknown) {
    console.error("[Chat API] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Chat failed";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * GET /api/chat
 * Returns API documentation
 */
export async function GET() {
  return NextResponse.json({
    endpoint: "/api/chat",
    method: "POST",
    description: "Agentic AI chat for workflow creation - powered by z-ai-web-dev-sdk (GLM)",
    capabilities: [
      "Create complete workflows with tiles and connections",
      "Explain how tiles work and connect",
      "Suggest improvements to existing workflows",
      "Context-aware with canvas state",
      "Memory persistence across sessions"
    ],
    parameters: {
      messages: {
        type: "array",
        required: true,
        description: "Array of chat messages with role and content"
      },
      context: {
        type: "object",
        required: false,
        description: "Current canvas and workflow context"
      }
    },
    response: {
      success: "boolean",
      message: "string - AI response with optional workflow JSON",
      provider: "string - z-ai-web-dev-sdk"
    }
  });
}
