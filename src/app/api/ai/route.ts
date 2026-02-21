import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { OpenRouterClient } from '@/lib/ai/openrouter-client';

/**
 * AI Processing API
 * 
 * Primary: z-ai-web-dev-sdk (Z-AI models)
 * Fallback: OpenRouter API
 */

// Initialize OpenRouter client as fallback
const openRouterClient = new OpenRouterClient();

// Helper function to use Z-AI as primary with OpenRouter fallback
async function chatCompletion(messages: Array<{ role: string; content: string }>): Promise<string> {
  try {
    // Try Z-AI first (primary)
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: messages.map(m => ({ role: m.role as 'system' | 'user' | 'assistant', content: m.content })),
      temperature: 0.7,
    });
    
    const content = completion.choices?.[0]?.message?.content;
    if (content) {
      console.log('[AI API] Used Z-AI (primary)');
      return content;
    }
  } catch (error) {
    console.warn('[AI API] Z-AI failed, falling back to OpenRouter:', error);
  }

  // Fallback to OpenRouter
  console.log('[AI API] Using OpenRouter (fallback)');
  return openRouterClient.chatCompletion(messages);
}

// AI Processing with Z-AI primary, OpenRouter fallback
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data, config } = body;

    console.log(`[AI API] Processing: ${type}`);

    switch (type) {
      case 'transcription': {
        const { text } = data;
        const { language = 'auto' } = config || {};

        const response = await chatCompletion([
          {
            role: 'system',
            content: `You are a professional video transcription assistant. Generate accurate transcriptions with timestamps.
Format each line as: [MM:SS] transcribed text
Include natural pauses and punctuation.`,
          },
          {
            role: 'user',
            content: `Transcribe the following text as if it were spoken content with timestamps every 5-10 seconds:

"${text}"

Generate a realistic transcription with proper timing.`,
          },
        ]);

        return NextResponse.json({
          success: true,
          result: {
            transcript: response,
            language: language === 'auto' ? 'en' : language,
            duration: text.length * 0.05,
          },
        });
      }

      case 'summary': {
        const { text } = data;
        const { maxLength = 500, style = 'bullet' } = config || {};

        const summary = await openRouterClient.summarizeContent(text, style);

        return NextResponse.json({
          success: true,
          result: {
            summary,
            wordCount: text.split(/\s+/).length,
            style,
          },
        });
      }

      case 'captions': {
        const { text } = data;
        const { maxWordsPerLine = 4, duration = 30 } = config || {};

        const captions = await openRouterClient.generateSubtitles(text, duration);

        return NextResponse.json({
          success: true,
          result: {
            captions,
            format: 'srt',
            wordCount: text.split(/\s+/).length,
          },
        });
      }

      case 'instagram-clips': {
        const { transcript, duration } = data;

        const clips = await openRouterClient.suggestInstagramClips(transcript, duration);

        return NextResponse.json({
          success: true,
          result: {
            clips,
            totalDuration: duration,
          },
        });
      }

      case 'content-analysis': {
        const { text } = data;

        const analysis = await openRouterClient.analyzeVideoContent(text);

        return NextResponse.json({
          success: true,
          result: analysis,
        });
      }

      case 'caption-style': {
        const { text } = data;
        const { style = 'highlight' } = config || {};

        const styledCaptions = await openRouterClient.generateCaptionStyle(text, style);

        return NextResponse.json({
          success: true,
          result: styledCaptions,
        });
      }

      case 'voiceover-script': {
        const { text, duration = 60 } = data;
        const { voice = 'alloy', speed = 1.0 } = config || {};

        const script = await chatCompletion([
          {
            role: 'system',
            content: 'You are a professional scriptwriter. Create engaging voiceover scripts optimized for text-to-speech.',
          },
          {
            role: 'user',
            content: `Create a voiceover script for:
Duration: ${duration} seconds
Speed: ${speed}x

Content: "${text}"

Include pacing hints like [PAUSE], [EMPHASIS], [FASTER], [SLOWER]`,
          },
        ]);

        return NextResponse.json({
          success: true,
          result: {
            script,
            estimatedDuration: duration,
            voice,
            speed,
          },
        });
      }

      case 'workflow-suggest': {
        const { description, platform } = data;

        const suggestion = await chatCompletion([
          {
            role: 'system',
            content: `You are a workflow designer for OpenMosaic, a video editing platform.
Generate workflow suggestions as JSON with tiles and connections.
Available tiles: video-input, image-input, audio-input, text-input, youtube-input,
ai-avatar, ai-broll, ai-voiceover, ai-music, ai-content-generation, ai-transcription,
ai-summary, ai-augment, cinematic-captions, ai-captions, captions-emojis, captions,
motion-graphics, rough-cut, clips, montage, reframe, silence-removal, intro, outro,
watermark, color-correction, mirror, audio-enhance, voice, video-trimmer, video-effects,
audio-effects, text-overlay, image-overlay, concatenate, video-output, audio-output,
subtitle-output, destination, branch, merge.`,
          },
          {
            role: 'user',
            content: `Create a workflow for: ${description}
Platform: ${platform || 'general'}

Respond with a JSON workflow suggestion.`,
          },
        ]);

        return NextResponse.json({
          success: true,
          result: {
            suggestion,
            platform: platform || 'general',
          },
        });
      }

      case 'test': {
        // Test both providers
        let zaiStatus = { success: false, error: 'Not tested' };
        let openRouterStatus = { success: false, error: 'Not tested' };

        try {
          const zai = await ZAI.create();
          const testCompletion = await zai.chat.completions.create({
            messages: [{ role: 'user', content: 'Say "OK"' }],
            max_tokens: 10,
          });
          zaiStatus = { 
            success: !!testCompletion.choices?.[0]?.message?.content, 
            error: null,
            provider: 'z-ai-web-dev-sdk'
          };
        } catch (error: unknown) {
          zaiStatus = { 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error',
            provider: 'z-ai-web-dev-sdk'
          };
        }

        try {
          openRouterStatus = await openRouterClient.testConnection();
        } catch (error: unknown) {
          openRouterStatus = { 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error',
            provider: 'openrouter'
          };
        }

        return NextResponse.json({
          success: zaiStatus.success || openRouterStatus.success,
          result: {
            primary: zaiStatus,
            fallback: openRouterStatus,
          },
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown AI action type: ${type}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[AI API] Error:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

// GET endpoint for testing
export async function GET() {
  try {
    // Test both providers
    let zaiStatus = { success: false, error: 'Not tested' };
    let openRouterStatus = { success: false, error: 'Not tested' };

    try {
      const zai = await ZAI.create();
      const testCompletion = await zai.chat.completions.create({
        messages: [{ role: 'user', content: 'Say "OK"' }],
        max_tokens: 10,
      });
      zaiStatus = { 
        success: !!testCompletion.choices?.[0]?.message?.content, 
        error: null,
        provider: 'z-ai-web-dev-sdk'
      };
    } catch (error: unknown) {
      zaiStatus = { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: 'z-ai-web-dev-sdk'
      };
    }

    try {
      openRouterStatus = await openRouterClient.testConnection();
    } catch (error: unknown) {
      openRouterStatus = { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: 'openrouter'
      };
    }

    return NextResponse.json({
      status: 'ok',
      providers: {
        primary: zaiStatus,
        fallback: openRouterStatus,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: String(error),
    });
  }
}
