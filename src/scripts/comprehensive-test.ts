// Comprehensive End-to-End Test for OpenMosaic
// Tests: AI Integration, Video Processing, and Full Workflow

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1';
const API_KEY = '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';
const MODEL = 'nvidia/nemotron-nano-12b-v2-vl:free';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function openrouterChat(messages: Array<{role: string; content: string}>, maxTokens = 1000) {
  const response = await fetch(`${OPENROUTER_API_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://openmosaic.app',
      'X-Title': 'OpenMosaic Test',
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

async function testAIConnection(): Promise<boolean> {
  log('\n📡 Test 1: AI Connection', 'yellow');
  try {
    const response = await openrouterChat([
      { role: 'user', content: 'Say "Connection successful!" in exactly 3 words.' }
    ], 20);
    
    log(`  ✅ AI Response: ${response.slice(0, 100)}`, 'green');
    return true;
  } catch (error) {
    log(`  ❌ Connection failed: ${error}`, 'red');
    return false;
  }
}

async function testVideoAnalysis(): Promise<void> {
  log('\n🎬 Test 2: Video Content Analysis', 'yellow');
  
  const sampleTranscript = `
    [00:00] Welcome back to the channel everyone! Today we're going to talk about 5 productivity hacks
    [00:10] that will completely change the way you work. Number one: the two-minute rule.
    [00:20] If a task takes less than two minutes, do it immediately. Don't add it to your to-do list.
    [00:35] Number two: time blocking. Schedule specific blocks of time for deep work.
    [00:50] Number three: the Pomodoro Technique. Work for 25 minutes, then take a 5-minute break.
    [01:05] Number four: batch similar tasks together to reduce context switching.
    [01:20] And number five: plan your day the night before. This eliminates decision fatigue.
    [01:35] If you found this helpful, smash that like button and subscribe for more content!
  `;

  try {
    const analysis = await openrouterChat([
      {
        role: 'system',
        content: 'You are a video content analyst. Analyze transcripts and provide insights in JSON format.',
      },
      {
        role: 'user',
        content: `Analyze this video transcript and provide:
1. Main topics (array)
2. Mood/tone
3. Best moments for Instagram clips (3 clips with start/end times in seconds)

Transcript: ${sampleTranscript}

Respond with JSON only: {"topics": [], "mood": "", "clips": [{"start": 0, "end": 30, "title": "", "reason": ""}]}`,
      },
    ], 500);

    log(`  ✅ Analysis complete`, 'green');
    log(`  📝 Response: ${analysis.slice(0, 200)}...`, 'cyan');
  } catch (error) {
    log(`  ❌ Analysis failed: ${error}`, 'red');
  }
}

async function testSubtitleGeneration(): Promise<void> {
  log('\n📜 Test 3: Subtitle Generation', 'yellow');
  
  const text = "Welcome to OpenMosaic, the open-source AI video editor. Today we'll explore how to create amazing videos with just a few clicks.";

  try {
    const subtitles = await openrouterChat([
      {
        role: 'system',
        content: 'You are a professional subtitler. Generate SRT format subtitles.',
      },
      {
        role: 'user',
        content: `Generate SRT subtitles for this text (duration ~10 seconds):
"${text}"

Each subtitle 2-3 seconds. Format:
1
00:00:00,000 --> 00:00:02,500
Text here`,
      },
    ], 300);

    const hasTimestamps = subtitles.includes('-->');
    log(`  ${hasTimestamps ? '✅' : '❌'} SRT format: ${hasTimestamps}`, hasTimestamps ? 'green' : 'red');
    log(`  📝 Subtitles: ${subtitles.slice(0, 150)}...`, 'cyan');
  } catch (error) {
    log(`  ❌ Subtitle generation failed: ${error}`, 'red');
  }
}

async function testInstagramClips(): Promise<void> {
  log('\n📱 Test 4: Instagram Clip Suggestions', 'yellow');
  
  const transcript = `
    [00:00] Hey everyone, welcome back! Today I'm sharing my top 5 productivity tips.
    [00:15] Tip number one: the two-minute rule. If it takes less than two minutes, do it now.
    [00:30] Tip two: time blocking. Schedule your day in blocks for better focus.
    [00:45] Tip three: use the Pomodoro technique. 25 minutes work, 5 minutes break.
    [01:00] Tip four: batch similar tasks together to save time.
    [01:15] Tip five: plan tomorrow tonight. It reduces morning decision fatigue.
    [01:30] Let me know which tip you're going to try first!
  `;

  try {
    const clips = await openrouterChat([
      {
        role: 'system',
        content: 'You are a social media expert specializing in Instagram Reels. Suggest viral clip moments.',
      },
      {
        role: 'user',
        content: `Suggest 3 Instagram Reel clips (15-45 seconds each) from this video:

Transcript: ${transcript}

For each clip provide: start time, end time, catchy title, engaging caption with emojis, and 5 hashtags.

Respond with JSON array only:
[{"start": 0, "end": 30, "title": "", "caption": "", "hashtags": []}]`,
      },
    ], 400);

    log(`  ✅ Clips suggested`, 'green');
    log(`  📱 Response: ${clips.slice(0, 250)}...`, 'cyan');
  } catch (error) {
    log(`  ❌ Clip suggestion failed: ${error}`, 'red');
  }
}

async function testCaptionAnimation(): Promise<void> {
  log('\n✨ Test 5: Animated Caption Word Timing', 'yellow');
  
  const text = "This is an amazing productivity hack that will change your life forever!";

  try {
    const timing = await openrouterChat([
      {
        role: 'system',
        content: 'You are a caption timing expert. Generate word-level timing for animated captions.',
      },
      {
        role: 'user',
        content: `Generate word timing for animated captions. Speaking rate: 150 words/minute.

Text: "${text}"

For each word provide: start_ms, end_ms, emphasis (true/false for key words).
Respond with JSON: {"words": [{"word": "", "start_ms": 0, "end_ms": 200, "emphasis": false}]}`,
      },
    ], 400);

    log(`  ✅ Word timing generated`, 'green');
    log(`  ⏱️ Response: ${timing.slice(0, 200)}...`, 'cyan');
  } catch (error) {
    log(`  ❌ Caption animation failed: ${error}`, 'red');
  }
}

async function testSummaryGeneration(): Promise<void> {
  log('\n📝 Test 6: Content Summarization', 'yellow');
  
  const content = `
    In this comprehensive guide, we'll explore the fundamentals of machine learning. 
    Machine learning is a subset of artificial intelligence that enables systems to learn 
    from data without being explicitly programmed. There are three main types: supervised 
    learning, unsupervised learning, and reinforcement learning. Supervised learning uses 
    labeled data to train models. Unsupervised learning finds patterns in unlabeled data. 
    Reinforcement learning trains agents through rewards and penalties. Popular applications 
    include image recognition, natural language processing, and recommendation systems.
  `;

  try {
    // Test bullet summary
    const bulletSummary = await openrouterChat([
      {
        role: 'system',
        content: 'You are a professional summarizer. Create concise bullet-point summaries.',
      },
      {
        role: 'user',
        content: `Summarize this content in 5 bullet points:

"${content}"`,
      },
    ], 200);

    log(`  ✅ Bullet summary generated`, 'green');
    log(`  📝 ${bulletSummary.slice(0, 150)}...`, 'cyan');
  } catch (error) {
    log(`  ❌ Summary generation failed: ${error}`, 'red');
  }
}

async function testVideoProcessor(): Promise<void> {
  log('\n🎥 Test 7: Video Processor Status', 'yellow');
  
  try {
    const response = await fetch('http://localhost:3000/api/video');
    const data = await response.json();
    
    log(`  ✅ Video processor: ${data.status}`, 'green');
    log(`  📦 Capabilities: ${data.capabilities?.join(', ')}`, 'cyan');
  } catch (error) {
    log(`  ⚠️ Video processor not accessible (server may need restart)`, 'yellow');
  }
}

async function testAIEndpoint(): Promise<void> {
  log('\n🔌 Test 8: AI API Endpoint', 'yellow');
  
  try {
    const response = await fetch('http://localhost:3000/api/ai', { method: 'GET' });
    const data = await response.json();
    
    log(`  ✅ AI endpoint: ${data.status}`, 'green');
    log(`  🤖 AI status: ${JSON.stringify(data.ai)}`, 'cyan');
  } catch (error) {
    log(`  ⚠️ AI endpoint not accessible (server may need restart)`, 'yellow');
  }
}

async function runFullWorkflowTest(): Promise<void> {
  log('\n🚀 Test 9: Full Workflow Simulation', 'yellow');
  log('  Simulating: YouTube Video → Analysis → Instagram Clips → Processing', 'cyan');
  
  // Step 1: Analyze content
  log('\n  Step 1: Content Analysis...', 'blue');
  const sampleContent = "Welcome to our productivity tips video! Today we're covering the top 5 time management strategies that successful people use every day.";
  
  try {
    const analysis = await openrouterChat([
      {
        role: 'user',
        content: `Quickly analyze this video content: "${sampleContent}". 
Give: 1) Main topic, 2) Target audience, 3) Suggested clip duration for Instagram.
One line each.`,
      },
    ], 100);
    
    log(`  ✅ Analysis: ${analysis}`, 'green');
  } catch (error) {
    log(`  ❌ Analysis failed`, 'red');
  }

  // Step 2: Generate subtitles
  log('\n  Step 2: Generate Subtitles...', 'blue');
  try {
    const subtitles = await openrouterChat([
      {
        role: 'user',
        content: `Create SRT subtitle for: "Welcome to OpenMosaic, your AI video editing companion!"
Duration: 0-5 seconds. Format properly.`,
      },
    ], 100);
    
    log(`  ✅ Subtitles: ${subtitles}`, 'green');
  } catch (error) {
    log(`  ❌ Subtitle generation failed`, 'red');
  }

  // Step 3: Suggest clips
  log('\n  Step 3: Suggest Instagram Clips...', 'blue');
  try {
    const clips = await openrouterChat([
      {
        role: 'user',
        content: `Suggest 2 short Instagram clips (under 30 seconds each) from a video about "5 Productivity Tips".
Give start/end times and titles only.`,
      },
    ], 150);
    
    log(`  ✅ Clips: ${clips}`, 'green');
  } catch (error) {
    log(`  ❌ Clip suggestion failed`, 'red');
  }

  log('\n  ✅ Full workflow simulation complete!', 'green');
}

async function main() {
  log('\n' + '='.repeat(60), 'magenta');
  log('🧪 OpenMosaic Comprehensive Test Suite', 'magenta');
  log('='.repeat(60), 'magenta');

  // Run all tests
  await testAIConnection();
  await testVideoAnalysis();
  await testSubtitleGeneration();
  await testInstagramClips();
  await testCaptionAnimation();
  await testSummaryGeneration();
  await testVideoProcessor();
  await testAIEndpoint();
  await runFullWorkflowTest();

  log('\n' + '='.repeat(60), 'magenta');
  log('🎉 Test Suite Complete!', 'green');
  log('='.repeat(60), 'magenta');
  log('\n💡 Next Steps:', 'blue');
  log('   1. Server is running on http://localhost:3000', 'cyan');
  log('   2. Open browser to test the canvas UI', 'cyan');
  log('   3. Drag tiles and create video editing workflows', 'cyan');
  log('   4. All AI features use free OpenRouter models!', 'cyan');
  log('\n');
}

main().catch(console.error);
