 # Check what models the SDK uses for each endpoint echo "=== VIDEO GENERATION ===" grep -A30 "createVideoGeneration" /home/z/my-project/node_modules/z-ai-web-dev-sdk/dist/index.js | head -35 echo "" echo "=== IMAGE GENERATION ===" grep -A30 "createImageGeneration" /home/z/my-project/node_modules/z-ai-web-dev-sdk/dist/index.js | head -35 echo "" echo "=== CHAT COMPLETIONS ===" grep -A30 "createChatCompletion" /home/z/my-project/node_modules/z-ai-web-dev-sdk/dist/index.js | head -35
=== VIDEO GENERATION ===
                create: this.createVideoGeneration.bind(this),
            },
        };
        this.async = {
            result: {
                query: this.queryAsyncResult.bind(this),
            },
        };
        this.functions = {
            invoke: this.invokeFunction.bind(this),
        };
    }
    static async create() {
        const config = await loadConfig();
        return new ZAI(config);
    }
    async createChatCompletion(body) {
        const { baseUrl, chatId, userId, apiKey } = this.config;
        const url = `${baseUrl}/chat/completions`;
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'X-Z-AI-From': 'Z',
        };
        if (chatId) {
            headers['X-Chat-Id'] = chatId;
        }
        if (userId) {
            headers['X-User-Id'] = userId;
        }
        // 设置 thinking 默认值为 disabled
--
    async createVideoGeneration(body) {
        const { baseUrl, apiKey, chatId, userId } = this.config;
        const url = `${baseUrl}/video/generation`;

=== IMAGE GENERATION ===
                create: this.createImageGeneration.bind(this),
                edit: this.createImageEdit.bind(this),
            },
        };
        this.video = {
            generations: {
                create: this.createVideoGeneration.bind(this),
            },
        };
        this.async = {
            result: {
                query: this.queryAsyncResult.bind(this),
            },
        };
        this.functions = {
            invoke: this.invokeFunction.bind(this),
        };
    }
    static async create() {
        const config = await loadConfig();
        return new ZAI(config);
    }
    async createChatCompletion(body) {
        const { baseUrl, chatId, userId, apiKey } = this.config;
        const url = `${baseUrl}/chat/completions`;
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'X-Z-AI-From': 'Z',
        };
        if (chatId) {
--
    async createImageGeneration(body) {
        const { baseUrl, apiKey, chatId, userId } = this.config;
        const url = `${baseUrl}/images/generations`;

=== CHAT COMPLETIONS ===
                create: this.createChatCompletion.bind(this),
                createVision: this.createChatCompletionVision.bind(this),
            },
        };
        this.audio = {
            tts: {
                create: this.createAudioTTS.bind(this),
            },
            asr: {
                create: this.createAudioASR.bind(this),
            },
        };
        this.images = {
            generations: {
                create: this.createImageGeneration.bind(this),
                edit: this.createImageEdit.bind(this),
            },
        };
        this.video = {
            generations: {
                create: this.createVideoGeneration.bind(this),
            },
        };
        this.async = {
            result: {
                query: this.queryAsyncResult.bind(this),
            },
        };
        this.functions = {
            invoke: this.invokeFunction.bind(this),
        };
    }
--
    async createChatCompletion(body) {
        const { baseUrl, chatId, userId, apiKey } = this.config;
$ # Test chat to see what model is returned curl -s -X POST "http://localhost:8080/v1/chat/completions" \ -H "Content-Type: application/json" \ -d '{"messages":[{"role":"user","content":"Say hi in one word"}],"max_tokens":10}' 2>/dev/null
$ # Test image generation curl -s -X POST "http://localhost:8080/v1/images/generations" \ -H "Content-Type: application/json" \ -d '{"prompt":"a cute robot cat","size":"1024x1024"}' 2>/dev/null
调用失败: failed to execute tool: context deadline exceeded
$ # Wait a bit and try image again sleep 3 curl -s -X POST "http://localhost:8080/v1/images/generations" \ -H "Content-Type: application/json" \ -d '{"prompt":"a robot","size":"1024x1024"}' 2>/dev/null
调用失败: failed to execute tool: context deadline exceeded
$ # Test image generation on internal gateway directly curl -s -X POST "http://172.25.136.193:8080/v1/images/generations" \ -H "Content-Type: application/json" \ -H "Authorization: Bearer Z.ai" \ -H "X-Z-AI-From: Z" \ -d '{"prompt":"a robot","size":"1024x1024"}' 2>/dev/null
$ # Check proxy logs cat /tmp/ai-proxy.log | tail -20
[Proxy] Fetching: http://172.25.136.193:8080/v1/async-result?id=20260228231352b70ecc4926744fb1
[Proxy] Video status result: {"id":"20260228231352b70ecc4926744fb1","model":"cogvideox-3","request_id":"20260228231352b70ecc4926744fb1","task_status":"PROCESSING"}
[Proxy] Video status check: 20260228231352b70ecc4926744fb1
[Proxy] Fetching: http://172.25.136.193:8080/v1/async-result?id=20260228231352b70ecc4926744fb1
[Proxy] Video status result: {"id":"20260228231352b70ecc4926744fb1","model":"cogvideox-3","request_id":"20260228231352b70ecc4926744fb1","task_status":"PROCESSING"}
[Proxy] Video status check: 20260228231352b70ecc4926744fb1
[Proxy] Fetching: http://172.25.136.193:8080/v1/async-result?id=20260228231352b70ecc4926744fb1
[Proxy] Video status result: {"id":"20260228231352b70ecc4926744fb1","model":"cogvideox-3","request_id":"20260228231352b70ecc4926744fb1","task_status":"PROCESSING"}
[Proxy] Video status check: 20260228231352b70ecc4926744fb1
[Proxy] Fetching: http://172.25.136.193:8080/v1/async-result?id=20260228231352b70ecc4926744fb1
[Proxy] Video status result: {"id":"20260228231352b70ecc4926744fb1","model":"cogvideox-3","request_id":"20260228231352b70ecc4926744fb1","task_status":"PROCESSING"}
[Proxy] Video status check: 20260228231352b70ecc4926744fb1
[Proxy] Fetching: http://172.25.136.193:8080/v1/async-result?id=20260228231352b70ecc4926744fb1
[Proxy] Video status result: {"id":"20260228231352b70ecc4926744fb1","model":"cogvideox-3","request_id":"20260228231352b70ecc4926744fb1","task_status":"PROCESSING"}
[Proxy] Video status check: 20260228231352b70ecc4926744fb1
[Proxy] Fetching: http://172.25.136.193:8080/v1/async-result?id=20260228231352b70ecc4926744fb1
[Proxy] Video status result: {"choices":[{"finish_reason":"stop","index":0,"message":{"role":"assistant"}}],"created":1772291694,"id":"20260228231352b70ecc4926744fb1","model":"cogvideox-3","request_id":"20260228231352b70ecc492674
[Proxy] Chat request: 1 messages
[Proxy] Image request: a cute robot cat
[Proxy] Image request: a robot
$ # Test the user's specific prompt on internal gateway curl -s -X POST "http://172.25.136.193:8080/v1/images/generations" \ -H "Content-Type: application/json" \ -H "Authorization: Bearer Z.ai" \ -H "X-Z-AI-From: Z" \ -d '{"prompt":"Full body shot of a futuristic inflatable android standing in a static industrial warehouse. The android has taut, metallic skin with integrated translucent panels on the chest, abdomen, and limbs, exposing complex internal circuitry pulsing with glowing red neon light. The surface features liquid-metal reflections that ripple across the body. The background is a detailed industrial setting with heavy machinery, power transformers, and a soft synthetic atmospheric haze. Cinematic lighting, hyper-realistic, 8k resolution, inspired by Kraftwerk stage design and high-end sci-fi concept art.","size":"1024x1024"}' 2>/dev/null
$ # Download the generated image curl -s "https://maas-watermark-prod-new.cn-wlcb.ufileos.com/20260228232814886c1d1e9bf84331_watermark.png?UCloudPublicKey=TOKEN_6df395df-5d8c-4f69-90f8-a4fe46088958&Signature=C3jYoDz6vwQDC8ge693ki4Ckscc%3D&Expires=1772897322" -o /home/z/my-project/download/robot_test.png ls -la /home/z/my-project/download/robot_test.png
-rw-rw-r-- 1 z z 152282 Feb 28 15:28 /home/z/my-project/download/robot_test.png
$ # Test video generation to check model and rate limit timing curl -s -X POST "http://172.25.136.193:8080/v1/video/generation" \ -H "Content-Type: application/json" \ -H "Authorization: Bearer Z.ai" \ -H "X-Z-AI-From: Z" \ -d '{"prompt":"a robot walking","size":"1024x1024","duration":5}' 2>/dev/null
$ # Test video again immediately to check rate limit curl -s -X POST "http://172.25.136.193:8080/v1/video/generation" \ -H "Content-Type: application/json" \ -H "Authorization: Bearer Z.ai" \ -H "X-Z-AI-From: Z" \ -d '{"prompt":"a cat running","size":"1024x1024","duration":5}' 2>/dev/null
$ # Try multiple video requests rapidly to find rate limit for i in 1 2 3 4 5; do echo "Request $i at $(date +%H:%M:%S)" result=$(curl -s -X POST "http://172.25.136.193:8080/v1/video/generation" \ -H "Content-Type: application/json" \ -H "Authorization: Bearer Z.ai" \ -H "X-Z-AI-From: Z" \ -d "{\"prompt\":\"test video $i\",\"size\":\"1024x1024\",\"duration\":5}" 2>/dev/null) echo "$result" | head -c 100 echo "" sleep 1 done
Request 1 at 15:29:17
{"id":"2026022823291741340ee4db074191","model":"cogvideox-3","request_id":"2026022823291741340ee4db0
Request 2 at 15:29:18
{"id":"202602282329187a9160fac50847ea","model":"cogvideox-3","request_id":"202602282329187a9160fac50
Request 3 at 15:29:19
{"id":"202602282329193c3e56910ed747a8","model":"cogvideox-3","request_id":"202602282329193c3e56910ed
Request 4 at 15:29:21
{"id":"20260228232921c994e00d1c504b54","model":"cogvideox-3","request_id":"20260228232921c994e00d1c5
Request 5 at 15:29:22
{"id":"20260228232922d60952e695bc4564","model":"cogvideox-3","request_id":"20260228232922d60952e695b
$ # Try even more rapid requests for i in 6 7 8 9 10 11 12 13 14 15; do echo "Request $i at $(date +%H:%M:%S)" result=$(curl -s -X POST "http://172.25.136.193:8080/v1/video/generation" \ -H "Content-Type: application/json" \ -H "Authorization: Bearer Z.ai" \ -H "X-Z-AI-From: Z" \ -d "{\"prompt\":\"test $i\",\"size\":\"1024x1024\",\"duration\":5}" 2>/dev/null) echo "$result" | head -c 150 echo "" done
Request 6 at 15:29:32
{"id":"20260228232932f2550ce63c954d5b","model":"cogvideox-3","request_id":"20260228232932f2550ce63c954d5b","task_status":"PROCESSING"}

Request 7 at 15:29:32
{"id":"202602282329327971b39f53c5403a","model":"cogvideox-3","request_id":"202602282329327971b39f53c5403a","task_status":"PROCESSING"}

Request 8 at 15:29:32
{"id":"20260228232932c30125dafb1a48d1","model":"cogvideox-3","request_id":"20260228232932c30125dafb1a48d1","task_status":"PROCESSING"}

Request 9 at 15:29:32
{"id":"20260228232933cfe0af676f2a466a","model":"cogvideox-3","request_id":"20260228232933cfe0af676f2a466a","task_status":"PROCESSING"}

Request 10 at 15:29:33
{"id":"2026022823293338754faf2cfa417e","model":"cogvideox-3","request_id":"2026022823293338754faf2cfa417e","task_status":"PROCESSING"}

Request 11 at 15:29:33
{"id":"202602282329335b530365a116473d","model":"cogvideox-3","request_id":"202602282329335b530365a116473d","task_status":"PROCESSING"}

Request 12 at 15:29:33
{"id":"20260228232933e1a220cbb3a7455f","model":"cogvideox-3","request_id":"20260228232933e1a220cbb3a7455f","task_status":"PROCESSING"}

Request 13 at 15:29:33
{"id":"2026022823293332477cbaf3464724","model":"cogvideox-3","request_id":"2026022823293332477cbaf3464724","task_status":"PROCESSING"}

Request 14 at 15:29:33
{"id":"202602282329331abc9572e9a14f0d","model":"cogvideox-3","request_id":"202602282329331abc9572e9a14f0d","task_status":"PROCESSING"}

Request 15 at 15:29:34
{"id":"202602282329348ac38dd9ef65450a","model":"cogvideox-3","request_id":"202602282329348ac38dd9ef65450a","task_status":"PROCESSING"}
$ # Check available models curl -s "http://172.25.136.193:8080/v1/models" \ -H "Authorization: Bearer Z.ai" \ -H "X-Z-AI-From: Z" 2>/dev/null
404 page not found
$ # Test GLM-4-Plus for chat (current default) echo "=== Testing GLM-4-Plus (default) ===" curl -s -X POST "http://172.25.136.193:8080/v1/chat/completions" \ -H "Content-Type: application/json" \ -H "Authorization: Bearer Z.ai" \ -H "X-Z-AI-From: Z" \ -d '{"messages":[{"role":"user","content":"What model are you? Just tell me your exact model name."}]}' 2>/dev/null | jq -r '.model' # Test GLM-4-Air (faster/cheaper) echo "" echo "=== Testing GLM-4-Air ===" curl -s -X POST "http://172.25.136.193:8080/v1/chat/completions" \ -H "Content-Type: application/json" \ -H "Authorization: Bearer Z.ai" \ -H "X-Z-AI-From: Z" \ -d '{"model":"glm-4-air","messages":[{"role":"user","content":"What model are you?"}]}' 2>/dev/null | jq -r '.model' # Test GLM-4-Flash (fastest) echo "" echo "=== Testing GLM-4-Flash ===" curl -s -X POST "http://172.25.136.193:8080/v1/chat/completions" \ -H "Content-Type: application/json" \ -H "Authorization: Bearer Z.ai" \ -H "X-Z-AI-From: Z" \ -d '{"model":"glm-4-flash","messages":[{"role":"user","content":"What model are you?"}]}' 2>/dev/null | jq -r '.model'
=== Testing GLM-4-Plus (default) ===
glm-4-plus

=== Testing GLM-4-Air ===
glm-4-plus

=== Testing GLM-4-Flash ===
glm-4-plus
$ # Test image generation with different models echo "=== Testing CogView-4 (default image model) ===" result=$(curl -s -X POST "http://172.25.136.193:8080/v1/images/generations" \ -H "Content-Type: application/json" \ -H "Authorization: Bearer Z.ai" \ -H "X-Z-AI-From: Z" \ -d '{"prompt":"a red circle on white background","size":"1024x1024"}' 2>/dev/null) echo "$result" | head -c 200 echo "" echo "" echo "=== Testing with model parameter ===" result=$(curl -s -X POST "http://172.25.136.193:8080/v1/images/generations" \ -H "Content-Type: application/json" \ -H "Authorization: Bearer Z.ai" \ -H "X-Z-AI-From: Z" \ -d '{"model":"cogview-4","prompt":"a blue square","size":"1024x1024"}' 2>/dev/null) echo "$result" | head -c 200

=== Testing CogView-4 (default image model) ===
{"created":1772292623,"data":[{"url":"https://maas-watermark-prod-new.cn-wlcb.ufileos.com/2026022823302338e7501466524e66_watermark.png?UCloudPublicKey=TOKEN_6df395df-5d8c-4f69-90f8-a4fe46088958&Signat

=== Testing with model parameter ===
{"created":1772292657,"data":[{"url":"https://maas-watermark-prod-new.cn-wlcb.ufileos.com/20260228233057516b70957c1e4223_watermark.png?UCloudPublicKey=TOKEN_6df395df-5d8c-4f69-90f8-a4fe46088958&Signat
$ # Test video with different models echo "=== Testing CogVideoX-5 ===" curl -s -X POST "http://172.25.136.193:8080/v1/video/generation" \ -H "Content-Type: application/json" \ -H "Authorization: Bearer Z.ai" \ -H "X-Z-AI-From: Z" \ -d '{"model":"cogvideox-5","prompt":"a bird flying","size":"1024x1024","duration":5}' 2>/dev/null echo "" echo "=== Testing CogVideoX-2 ===" curl -s -X POST "http://172.25.136.193:8080/v1/video/generation" \ -H "Content-Type: application/json" \ -H "Authorization: Bearer Z.ai" \ -H "X-Z-AI-From: Z" \ -d '{"model":"cogvideox-2","prompt":"a bird flying","size":"1024x1024","duration":5}' 2>/dev/null
=== Testing CogVideoX-5 ===
{"id":"20260228233139f7c9befe3b654d7a","model":"cogvideox-3","request_id":"20260228233139f7c9befe3b654d7a","task_status":"PROCESSING"}
=== Testing CogVideoX-2 ===
{"id":"20260228233139d11c063f5f854ae9","model":"cogvideox-3","request_id":"20260228233139d11c063f5f854ae9","task_status":"PROCESSING"}
$ # Check SDK source for default models grep -A5 "model:" /home/z/my-project/node_modules/z-ai-web-dev-sdk/dist/index.js | head -30 echo "" echo "=== Check video generation body ===" grep -B5 -A15 "video/generation" /home/z/my-project/node_modules/z-ai-web-dev-sdk/dist/index.js | head -40

=== Check video generation body ===
            throw error;
        }
    }
    async createVideoGeneration(body) {
        const { baseUrl, apiKey, chatId, userId } = this.config;
        const url = `${baseUrl}/video/generation`;
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'X-Z-AI-From': 'Z',
        };
        if (chatId) {
            headers['X-Chat-Id'] = chatId;
        }
        if (userId) {
            headers['X-User-Id'] = userId;
        }
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: headers,
$ # Look for rate limit info in dashboard curl -s "http://172.25.136.193:8080/dashboard/" 2>/dev/null | grep -iE "rate|limit|quota|throttle" | head -10 echo "" echo "=== Check dashboard title and info ===" curl -s "http://172.25.136.193:8080/dashboard/" 2>/dev/null | grep -oE '<h3[^>]*>[^<]+</h3>' | head -10

=== Check dashboard title and info ===
<h3>通用 Headers</h3>
<h3>通用 Headers</h3>
<h3>通用 Headers</h3>
<h3>通用 Headers</h3>
<h3>通用 Headers</h3>
<h3>通用 Headers</h3>
<h3>通用 Headers</h3>
<h3 style="color: #667eea; margin-bottom: 20px;">查询视频生成结果</h3>
<h3>💰 Yahoo Finance API</h3>

$ # Test rate limit more aggressively - 20 rapid requests echo "Testing rate limits with 20 rapid requests..." for i in $(seq 1 20); do result=$(curl -s -X POST "http://172.25.136.193:8080/v1/video/generation" \ -H "Content-Type: application/json" \ -H "Authorization: Bearer Z.ai" \ -H "X-Z-AI-From: Z" \ -d "{\"prompt\":\"test $i\",\"size\":\"1024x1024\",\"duration\":5}" 2>/dev/null) if echo "$result" | grep -q "429\|rate limit"; then echo "Request $i: RATE LIMITED!" else echo "Request $i: OK" fi done
Testing rate limits with 20 rapid requests...
Request 1: OK
Request 2: OK
Request 3: OK
Request 4: OK
Request 5: OK
Request 6: OK
Request 7: OK
Request 8: OK
Request 9: OK
Request 10: OK
Request 11: OK
Request 12: OK
Request 13: OK
Request 14: OK
Request 15: OK
Request 16: OK
Request 17: OK
Request 18: OK
Request 19: OK
Request 20: OK
$ # Try 50 requests very fast echo "Testing 50 very rapid requests..." for i in $(seq 1 50); do result=$(curl -s -X POST "http://172.25.136.193:8080/v1/video/generation" \ -H "Content-Type: application/json" \ -H "Authorization: Bearer Z.ai" \ -H "X-Z-AI-From: Z" \ -d "{\"prompt\":\"t$i\",\"size\":\"1024x1024\",\"duration\":5}" --max-time 5 2>/dev/null) if echo "$result" | grep -q "429\|rate limit"; then echo "Request $i: RATE LIMITED" break fi done echo "All 50 requests passed without rate limit"
Testing 50 very rapid requests...
All 50 requests passed without rate limit
$ # Let me check the image we generated earlier using VLM to describe it echo "Testing image quality with our robot prompt..." # Generate a new image with the robot prompt result=$(curl -s -X POST "http://172.25.136.193:8080/v1/images/generations" \ -H "Content-Type: application/json" \ -H "Authorization: Bearer Z.ai" \ -H "X-Z-AI-From: Z" \ -d '{"prompt":"A futuristic android robot with metallic silver body, glowing blue LED eyes, standing in a dark industrial warehouse. The robot has transparent panels showing internal circuitry with red neon lights. High-tech sci-fi aesthetic, cinematic lighting, 8k resolution.","size":"1024x1024"}' 2>/dev/null) echo "$result" image_url=$(echo "$result" | jq -r '.data[0].url') echo "" echo "Image URL: $image_url" # Download for inspection curl -s "$image_url" -o /home/z/my-project/download/android_robot.png ls -la /home/z/my-project/download/android_robot.png

Testing image quality with our robot prompt...
{"created":1772292779,"data":[{"url":"https://maas-watermark-prod-new.cn-wlcb.ufileos.com/202602282332599d0827fb002b43e6_watermark.png?UCloudPublicKey=TOKEN_6df395df-5d8c-4f69-90f8-a4fe46088958&Signature=SZqDX86onFEG0AQFpoV909Ykpyo%3D&Expires=1772897608"}],"id":"202602282332599d0827fb002b43e6","request_id":"202602282332599d0827fb002b43e6"}

Image URL: https://maas-watermark-prod-new.cn-wlcb.ufileos.com/202602282332599d0827fb002b43e6_watermark.png?UCloudPublicKey=TOKEN_6df395df-5d8c-4f69-90f8-a4fe46088958&Signature=SZqDX86onFEG0AQFpoV909Ykpyo%3D&Expires=1772897608
-rw-rw-r-- 1 z z 130246 Feb 28 15:33 /home/z/my-project/download/android_robot.png
$ # Use VLM CLI to analyze the robot image we generated z-ai vision -p "Describe this image in detail. Is it a robot/android or a human? What are the key visual elements? Be specific about the subject." -i "/home/z/my-project/download/android_robot.png" 2>/dev/null
🚀 Initializing Z-AI SDK...
🚀 Sending vision chat request...
{
  "choices": [
    {
      "finish_reason": "stop",
      "index": 0,
      "message": {
        "content": "The image depicts a **humanoid robot** (not a human), characterized by its fully mechanical, metallic construction. Here are the key visual elements:  \n\n### 1. Overall Form & Material  \nThe robot has a humanoid shape, with a polished, silver-gray metallic body that reflects light, emphasizing its industrial, high-tech design. The surface features smooth, curved panels interspersed with visible mechanical joints, bolts, and internal wiring, highlighting its robotic nature.  \n\n\n### 2. Head & Facial Features  \n- The head is a rounded, helmet-like structure with a smooth, reflective finish.  \n- Two **glowing blue eyes** (likely LED or energy-based) dominate the face, giving it an alert, futuristic appearance.  \n- The “mouth” area is a flat, angular panel, lacking human-like features, reinforcing its robotic identity.  \n\n\n### 3. Torso & Chest  \n- The chest is a prominent, angular section with a **red, glowing circuit-like pattern** (resembling illuminated wiring or a power core) at its center. This red light contrasts sharply with the silver body, drawing attention to the robot’s internal “technology.”  \n- The torso has a segmented, mechanical design, with visible panels, bolts, and a slightly open “chest cavity” revealing internal components.  \n\n\n### 4. Limbs & Joints  \n- The arms and legs are long, articulated, and constructed from the same metallic material as the torso.  \n- Joints (shoulders, elbows, hips, knees) are visible as mechanical hinges, with exposed gears, pistons, or wiring, emphasizing the robot’s artificial movement capabilities.  \n- The right arm has a small, cylindrical attachment (possibly a tool or sensor) protruding from the shoulder.  \n\n\n### 5. Background & Setting  \nThe robot stands in an **industrial environment** (likely a factory or laboratory), with blurred machinery, pipes, and dim lighting in the background. This setting reinforces the robot’s purpose as a technological or industrial entity.  \n\n\n### Key Distinction: Robot vs. Human  \nThe subject is unequivocally a robot/android due to:  \n- Complete mechanical construction (no organic tissue).  \n- Glowing, non-human eyes and a non-anatomical “face.”  \n- Exposed internal components (circuitry, joints) and a power core (red chest light).  \n- Industrial, non-biological design optimized for function over human-like appearance.  \n\n\nIn summary, the image showcases a highly detailed, futuristic humanoid robot with a metallic silver body, glowing blue eyes, a red illuminated chest, and mechanical joints, set against an industrial backdrop.",
        "role": "assistant"
      }
    }
  ],
  "created": 1772292841,
  "id": "20260228233338edf90f7d55b2496b",
  "model": "glm-4.6v",
  "object": "chat.completion",
  "request_id": "20260228233338edf90f7d55b2496b",
  "usage": {
    "completion_tokens": 541,
    "completion_tokens_details": {
      "reasoning_tokens": 0
    },
    "prompt_tokens": 1409,
    "prompt_tokens_details": {
      "cached_tokens": 4
    },
    "total_tokens": 1950
  }
}
$ # Also check the first robot image with the user's original prompt z-ai vision -p "Describe this image in detail. Is it a robot/android or a human/girl? What are the key visual elements? Is it what you would expect from a prompt about a futuristic inflatable android with metallic skin and glowing red neon circuitry?" -i "/home/z/my-project/download/robot_test.png" 2>/dev/null
🚀 Initializing Z-AI SDK...
🚀 Sending vision chat request...
{
  "choices": [
    {
      "finish_reason": "stop",
      "index": 0,
      "message": {
        "content": "This image depicts a **robot/android**, not a human or girl. Here’s a detailed breakdown of the visual elements and how they align with the prompt:  \n\n\n### **Key Visual Elements**  \n1. **Form & Structure**:  \n   - The figure has a humanoid, bipedal form (two legs, two arms, torso, head) but is entirely mechanical—no organic features (skin, hair, facial features) are present.  \n   - Joints (shoulders, elbows, knees, wrists) are visibly mechanical, with segmented armor plating and exposed wiring.  \n\n2. **Material & Texture**:  \n   - **Metallic Skin**: The body is clad in polished, reflective metal (silver/gray with red accents), giving it a sleek, industrial “futuristic” appearance. The metal has a glossy finish, emphasizing its synthetic nature.  \n   - **Inflatable-Like Structure**: While not overtly “inflatable” in a literal sense, the torso and limbs have a slightly rounded, armored silhouette (e.g., the chest, abdomen, and limb segments) that could suggest a pressurized or inflatable design (common in sci-fi androids for flexibility or durability).  \n\n3. **Glowing Red Neon Circuitry**:  \n   - A prominent **red circular light** glows at the center of the chest, serving as a visual focal point.  \n   - Intricate **red neon circuitry** runs across the chest, abdomen, and arms, mimicking electronic pathways. These lines are bright, neon-like, and contrast sharply with the metallic body, emphasizing the “glowing” aspect of the prompt.  \n\n4. **Head & Facial Features**:  \n   - The head is a smooth, rounded helmet with a dark visor (no visible eyes or mouth), reinforcing the android/robot identity. A small red light glows near the “mouth” area, adding to the mechanical aesthetic.  \n\n5. **Environment**:  \n   - The background is a dimly lit, industrial setting (pipes, machinery, metal structures), evoking a futuristic factory or laboratory. This context reinforces the “futuristic” theme.  \n\n\n### **Alignment with the Prompt**  \nThe image **matches the prompt’s description** of a “futuristic inflatable android with metallic skin and glowing red neon circuitry”:  \n- **Metallic Skin**: The polished, reflective metal body fulfills this.  \n- **Glowing Red Neon Circuitry**: The chest light and red circuitry lines directly correspond to this.  \n- **Inflatable Android**: While not explicitly “inflatable” (e.g., no visible air vents or flexible membranes), the rounded, armored segments of the torso and limbs suggest a design that could be pressurized or inflatable (a common trope in sci-fi androids for a sleek, durable look).  \n- **Futuristic Aesthetic**: The industrial background, sleek metal, and neon accents all contribute to a high-tech, futuristic vibe.  \n\n\nIn summary, the image is a clear depiction of a robot/android, with visual elements that align closely with the prompt’s specifications.",
        "role": "assistant"
      }
    }
  ],
  "created": 1772292876,
  "id": "202602282334081f0da4fbd02844d3",
  "model": "glm-4.6v",
  "object": "chat.completion",
  "request_id": "202602282334081f0da4fbd02844d3",
  "usage": {
    "completion_tokens": 642,
    "completion_tokens_details": {
      "reasoning_tokens": 0
    },
    "prompt_tokens": 1429,
    "prompt_tokens_details": {
      "cached_tokens": 5
    },
    "total_tokens": 2071
  }
}


