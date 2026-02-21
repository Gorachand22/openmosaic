// Test Suite for OpenMosaic AI Integration
// Run with: bun run src/scripts/test-ai.ts

import { OpenRouterClient } from '../lib/ai/openrouter-client';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(testName: string, passed: boolean, details?: string) {
  const icon = passed ? '✅' : '❌';
  const color = passed ? 'green' : 'red';
  log(`  ${icon} ${testName}`, color);
  if (details) {
    log(`     ${details}`, 'cyan');
  }
}

async function runTests() {
  log('\n🧪 OpenMosaic AI Integration Test Suite\n', 'blue');
  log('='.repeat(60), 'blue');

  // Initialize client
  const client = new OpenRouterClient();

  // Test 1: Connection Test
  log('\n📡 Test 1: OpenRouter Connection', 'yellow');
  try {
    const connectionTest = await client.testConnection();
    logTest('Connection to OpenRouter API', connectionTest.success, 
      connectionTest.success ? `Model: ${connectionTest.model}` : connectionTest.message);
  } catch (error) {
    logTest('Connection to OpenRouter API', false, String(error));
  }

  // Test 2: Chat Completion
  log('\n💬 Test 2: Basic Chat Completion', 'yellow');
  try {
    const response = await client.chatCompletion([
      { role: 'user', content: 'What is 2+2? Reply with just the number.' }
    ], { maxTokens: 10 });
    const isNumber = response.includes('4');
    logTest('Chat completion works', true, `Response: ${response.slice(0, 50)}...`);
    logTest('Response is correct', isNumber);
  } catch (error) {
    logTest('Chat completion', false, String(error));
  }

  // Test 3: Content Summarization
  log('\n📝 Test 3: Content Summarization', 'yellow');
  const sampleText = `
    Welcome to our tutorial on machine learning! Today we'll cover the basics of neural networks.
    Neural networks are inspired by the human brain and consist of layers of interconnected nodes.
    The input layer receives data, hidden layers process it, and the output layer gives predictions.
    Deep learning uses many hidden layers to learn complex patterns. Popular applications include
    image recognition, natural language processing, and self-driving cars. Let's dive into some
    practical examples using Python and TensorFlow. We'll start with a simple image classifier
    and gradually build up to more complex models.
  `;

  try {
    // Bullet style
    const bulletSummary = await client.summarizeContent(sampleText, 'bullet');
    logTest('Bullet summary generated', bulletSummary.length > 0, `${bulletSummary.slice(0, 100)}...`);

    // Paragraph style
    const paragraphSummary = await client.summarizeContent(sampleText, 'paragraph');
    logTest('Paragraph summary generated', paragraphSummary.length > 0, `${paragraphSummary.slice(0, 100)}...`);
  } catch (error) {
    logTest('Content summarization', false, String(error));
  }

  // Test 4: Video Content Analysis
  log('\n🎬 Test 4: Video Content Analysis', 'yellow');
  const videoTranscript = `
    [00:00] Hey everyone, welcome back to the channel! Today I'm going to show you 5 productivity hacks
    [00:15] that will completely transform how you work. Number one: the two-minute rule.
    [00:30] If something takes less than two minutes, do it immediately. This prevents small tasks
    [00:45] from piling up. Number two: time blocking. Schedule specific blocks for focused work.
    [01:00] Number three: the pomodoro technique. Work for 25 minutes, then take a 5-minute break.
    [01:20] Number four: eliminate decision fatigue. Plan your day the night before.
    [01:35] And number five: batch similar tasks together. This reduces context switching.
    [01:50] Let me know in the comments which hack you're going to try first!
  `;

  try {
    const analysis = await client.analyzeVideoContent(videoTranscript);
    logTest('Video analysis completed', analysis.topics.length > 0, 
      `Topics: ${analysis.topics.join(', ')}`);
    logTest('Mood detected', analysis.mood.length > 0, `Mood: ${analysis.mood}`);
    logTest('Key moments identified', analysis.keyMoments.length > 0, 
      `Moments: ${analysis.keyMoments.length}`);
    logTest('Suggested clips generated', analysis.suggestedClips.length > 0,
      `Clips: ${analysis.suggestedClips.length}`);
  } catch (error) {
    logTest('Video content analysis', false, String(error));
  }

  // Test 5: Instagram Clip Suggestions
  log('\n📱 Test 5: Instagram Clip Suggestions', 'yellow');
  try {
    const clips = await client.suggestInstagramClips(videoTranscript, 120);
    logTest('Instagram clips generated', clips.length > 0, `Found ${clips.length} clips`);
    
    if (clips.length > 0) {
      clips.slice(0, 3).forEach((clip, i) => {
        log(`     Clip ${i + 1}: ${clip.start}s - ${clip.end}s`, 'cyan');
        log(`     Title: ${clip.title}`, 'reset');
        log(`     Caption: ${clip.caption}`, 'reset');
      });
    }
  } catch (error) {
    logTest('Instagram clip suggestions', false, String(error));
  }

  // Test 6: Subtitle Generation
  log('\n📜 Test 6: Subtitle Generation', 'yellow');
  try {
    const subtitles = await client.generateSubtitles(
      "Welcome to OpenMosaic, the open-source AI video editor. Today we'll explore how to create amazing videos with just a few clicks.",
      15
    );
    logTest('SRT subtitles generated', subtitles.includes('-->'), 
      `${subtitles.slice(0, 150)}...`);
  } catch (error) {
    logTest('Subtitle generation', false, String(error));
  }

  // Test 7: Caption Styling
  log('\n✨ Test 7: Animated Caption Styling', 'yellow');
  try {
    const styledCaptions = await client.generateCaptionStyle(
      "This is an amazing feature that will change how you edit videos forever",
      'highlight'
    );
    logTest('Caption styling generated', styledCaptions.words.length > 0,
      `${styledCaptions.words.length} words with timing`);
  } catch (error) {
    logTest('Caption styling', false, String(error));
  }

  log('\n' + '='.repeat(60), 'blue');
  log('🎉 Test Suite Complete!\n', 'green');
}

// Run the tests
runTests().catch(console.error);
