// OpenRouter AI Client - Free AI Models Integration
// Using OpenRouter API with nvidia/nemotron-nano-12b-v2-vl:free model

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1';
const OPENROUTER_API_KEY = '';
const DEFAULT_MODEL = 'nvidia/nemotron-nano-12b-v2-vl:free';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatCompletionResponse {
  id: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class OpenRouterClient {
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(apiKey?: string, model?: string) {
    this.apiKey = apiKey || OPENROUTER_API_KEY;
    this.model = model || DEFAULT_MODEL;
    this.baseUrl = OPENROUTER_API_URL;
  }

  async chatCompletion(messages: ChatMessage[], options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }): Promise<string> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://openmosaic.app',
        'X-Title': 'OpenMosaic - AI Video Editor',
      },
      body: JSON.stringify({
        model: options?.model || this.model,
        messages,
        temperature: options?.temperature || 0.7,
        max_tokens: options?.maxTokens || 4096,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
    }

    const data: ChatCompletionResponse = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  // Video content analysis
  async analyzeVideoContent(transcript: string): Promise<{
    topics: string[];
    mood: string;
    keyMoments: Array<{ timestamp: string; description: string }>;
    suggestedClips: Array<{ start: number; end: number; reason: string }>;
  }> {
    const response = await this.chatCompletion([
      {
        role: 'system',
        content: `You are a professional video content analyst. Analyze video transcripts and provide structured insights for content creators. Always respond in valid JSON format.`,
      },
      {
        role: 'user',
        content: `Analyze this video transcript and provide:
1. Main topics (array of strings)
2. Overall mood/tone (string)
3. Key moments with timestamps (array of objects with timestamp and description)
4. Suggested clips for social media (array of objects with start seconds, end seconds, and reason)

Transcript:
"${transcript}"

Respond ONLY with valid JSON in this exact format:
{
  "topics": ["topic1", "topic2"],
  "mood": "energetic/professional/casual/etc",
  "keyMoments": [{"timestamp": "00:00", "description": "description"}],
  "suggestedClips": [{"start": 0, "end": 30, "reason": "Hook moment"}]
}`,
      },
    ], { temperature: 0.5 });

    try {
      return JSON.parse(response);
    } catch {
      return {
        topics: ['Video content'],
        mood: 'informative',
        keyMoments: [],
        suggestedClips: [],
      };
    }
  }

  // Generate Instagram-optimized clips
  async suggestInstagramClips(transcript: string, duration: number): Promise<Array<{
    start: number;
    end: number;
    title: string;
    caption: string;
    hashtags: string[];
  }>> {
    const response = await this.chatCompletion([
      {
        role: 'system',
        content: `You are a social media content expert specializing in Instagram Reels and TikTok. You know how to identify viral moments and create engaging short-form content. Always respond in valid JSON format.`,
      },
      {
        role: 'user',
        content: `Given a video transcript (${duration} seconds total), identify the best moments for Instagram Reels (15-60 seconds each).

Transcript:
"${transcript}"

Suggest 3-5 clips. For each clip provide:
- start: start time in seconds
- end: end time in seconds  
- title: catchy title for the clip
- caption: engaging Instagram caption
- hashtags: array of relevant hashtags

Respond ONLY with valid JSON array:
[
  {
    "start": 10,
    "end": 45,
    "title": "Amazing Tip!",
    "caption": "This will change everything 🔥",
    "hashtags": ["#viral", "#tips"]
  }
]`,
      },
    ], { temperature: 0.7 });

    try {
      return JSON.parse(response);
    } catch {
      return [];
    }
  }

  // Generate SRT subtitles
  async generateSubtitles(transcript: string, duration: number): Promise<string> {
    const response = await this.chatCompletion([
      {
        role: 'system',
        content: `You are a professional subtitler. Generate perfectly timed SRT format subtitles. Each subtitle should be 1-5 seconds, with maximum 42 characters per line (2 lines max).`,
      },
      {
        role: 'user',
        content: `Generate SRT format subtitles for this transcript. Video duration: ${duration} seconds.

Transcript:
"${transcript}"

Rules:
1. Each subtitle: 1-5 seconds
2. Max 42 chars per line, 2 lines max
3. Proper timing format (00:00:00,000 --> 00:00:00,000)
4. Numbered sequentially

Output ONLY valid SRT format.`,
      },
    ], { temperature: 0.3 });

    return response;
  }

  // Generate animated caption style
  async generateCaptionStyle(text: string, style: 'highlight' | 'minimal' | 'animated'): Promise<{
    words: Array<{ word: string; start: number; end: number; emphasis: boolean }>;
    style: string;
  }> {
    const response = await this.chatCompletion([
      {
        role: 'system',
        content: `You are a caption styling expert for social media videos. Generate word-level timing for animated captions. Always respond in valid JSON format.`,
      },
      {
        role: 'user',
        content: `Generate word-level timing for animated captions.

Text: "${text}"
Style: ${style}

Estimate ~150 words per minute speaking rate. For each word provide:
- word: the word
- start: start time in milliseconds
- end: end time in milliseconds
- emphasis: boolean (true for key words)

Respond ONLY with valid JSON:
{
  "words": [{"word": "Hello", "start": 0, "end": 300, "emphasis": false}],
  "style": "${style}"
}`,
      },
    ], { temperature: 0.3 });

    try {
      return JSON.parse(response);
    } catch {
      return { words: [], style };
    }
  }

  // Summarize content
  async summarizeContent(text: string, style: 'bullet' | 'paragraph' | 'chapter'): Promise<string> {
    const stylePrompts = {
      bullet: 'Create a concise bullet-point summary. Each bullet should be informative and actionable.',
      paragraph: 'Create a compelling paragraph summary that captures the essence and key points.',
      chapter: 'Divide into chapters with timestamps. Format: [00:00] Chapter Title - Description',
    };

    return this.chatCompletion([
      {
        role: 'system',
        content: 'You are a professional content summarizer who creates clear, engaging summaries that capture key points effectively.',
      },
      {
        role: 'user',
        content: `${stylePrompts[style]}

Summarize the following content:
"${text}"`,
      },
    ], { temperature: 0.5 });
  }

  // Test connection
  async testConnection(): Promise<{ success: boolean; message: string; model: string }> {
    try {
      const response = await this.chatCompletion([
        { role: 'user', content: 'Say "OpenRouter connection successful!" and nothing else.' },
      ], { maxTokens: 50 });

      return {
        success: response.includes('successful'),
        message: response,
        model: this.model,
      };
    } catch (error) {
      return {
        success: false,
        message: String(error),
        model: this.model,
      };
    }
  }
}

// Export singleton instance
export const openRouterClient = new OpenRouterClient();
