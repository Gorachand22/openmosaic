export { };

// Simple Quick Test for OpenRouter API
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1';
const TEST_API_KEY = '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';

async function quickTest() {
  console.log('🧪 Quick OpenRouter Test...\n');

  try {
    const response = await fetch(`${OPENROUTER_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TEST_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://openmosaic.app',
        'X-Title': 'OpenMosaic Test',
      },
      body: JSON.stringify({
        model: 'nvidia/nemotron-nano-12b-v2-vl:free',
        messages: [
          { role: 'user', content: 'Say "Hello from OpenRouter!" and nothing else.' }
        ],
        max_tokens: 50,
      }),
    });

    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));

    if (data.choices?.[0]?.message?.content) {
      console.log('\n✅ SUCCESS! AI Response:', data.choices[0].message.content);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

quickTest();
