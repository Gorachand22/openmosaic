# OpenMosaic v0.2.0 - Complete Setup Guide

## 📦 What's New

### Backend Architecture (ComfyUI-inspired)
- **Input folder**: Upload files here (`/input`)
- **Output folder**: Generated files saved here (`/output`)
- **Workflows folder**: Saved workflows (`/workflows`)
- **Temp folder**: Temporary processing files (`/temp`)

### System Dependencies
- **yt-dlp**: Download YouTube videos
- **ffmpeg**: Video processing (reframe, clips, captions)
- **Python**: Optional for advanced processing

### Multi-Workspace Support
- Create multiple workflows (tabs)
- Save/load workflows to files
- Auto-persist in browser

---

## 🛠️ Prerequisites for Windows

### 1. Install Node.js
1. Go to: https://nodejs.org/
2. Download **LTS version** (v20.x or higher)
3. Run installer, check "Automatically install the necessary tools"
4. Restart terminal after installation

### 2. Install Bun (Recommended)
```powershell
powershell -c "irm bun.sh/install.ps1 | iex"
```

### 3. Install ffmpeg (Required for video processing)
```powershell
# Using winget (Windows 10/11)
winget install ffmpeg

# OR using Chocolatey
choco install ffmpeg

# OR download from: https://ffmpeg.org/download.html
```

### 4. Install yt-dlp (Required for YouTube downloads)
```powershell
# Using pip (Python required)
pip install yt-dlp

# OR using winget
winget install yt-dlp

# OR download from: https://github.com/yt-dlp/yt-dlp
```

---

## 📥 Extract and Setup

### Step 1: Extract the tarball
- Use 7-Zip or WinRAR to extract `openmosaic.tar.gz`
- Or use command: `tar -xzvf openmosaic.tar.gz`

### Step 2: Open terminal in project folder
```cmd
cd C:\path\to\my-project
```

### Step 3: Install dependencies
```cmd
bun install
```

### Step 4: Create environment file (.env)
```env
# AI Provider - Already configured!
# z-ai-web-dev-sdk works out of the box

# Optional: OpenRouter fallback
OPENROUTER_API_KEY=your_key_here
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
```

### Step 5: Run the development server
```cmd
bun run dev
```

### Step 6: Open in browser
Go to: **http://localhost:3000**

---

## 📁 Folder Structure

```
my-project/
├── input/              # Upload files here
│   └── your_video.mp4
├── output/             # Generated files appear here
│   └── clip_1.mp4
├── workflows/          # Saved workflows
│   └── my_workflow.json
├── temp/               # Temporary processing files
├── src/
│   ├── app/
│   │   └── api/
│   │       ├── upload/         # File upload API
│   │       ├── youtube/        # YouTube download API
│   │       ├── workflows/      # Save/load workflows
│   │       ├── system/         # System status
│   │       └── files/          # Serve files
│   └── lib/
│       ├── tile-executor.ts    # Tile execution engine
│       ├── canvas-store.ts     # Canvas state
│       └── workspace-store.ts  # Multi-workspace
└── package.json
```

---

## 🎯 API Endpoints

### Check System Status
```
GET /api/system/status
GET /api/system/status?action=dependencies
GET /api/system/status?action=files&folder=input
```

### Upload Files
```
POST /api/upload
Content-Type: multipart/form-data
file: [your file]
```

### Download YouTube Video
```
POST /api/youtube/download
Content-Type: application/json
{
  "url": "https://youtube.com/watch?v=xxx",
  "filename": "optional_filename.mp4"
}
```

### Workflows
```
POST /api/workflows/save   # Save workflow
GET /api/workflows/list    # List saved workflows
GET /api/workflows/load?path=workflow.json  # Load workflow
```

### Serve Files
```
GET /api/files/input/filename.mp4
GET /api/files/output/clip_1.mp4
```

---

## 🎮 How to Use

### Multi-Workspace (Tabs)
1. Click **+** button next to tabs to create new workflow
2. Click tab name to rename
3. Click **📁** to load saved workflow
4. Click **💾** to save workflow to file

### Video Input Tile
1. Drag **Video Input** tile to canvas
2. Click the tile to configure
3. **Option A**: Upload a file (saved to /input folder)
4. **Option B**: Paste YouTube URL (downloaded with yt-dlp)

### YouTube Download
1. Drag **YouTube Trigger** tile
2. Paste URL in config panel
3. Click **Run All** to execute
4. Video downloads to /input folder

### Video Processing
1. Connect tiles in sequence:
   - Video Input → Reframe → Cinematic Captions → Video Output
2. Each tile processes and passes to next
3. Output saved to /output folder

### Keyboard Shortcuts
| Key | Action |
|-----|--------|
| Ctrl+Drag | Box select nodes |
| Delete | Remove selected |
| Ctrl+Z | Undo |
| Ctrl+Y | Redo |
| Ctrl+A | Select all |

---

## 🔧 Troubleshooting

### "yt-dlp not installed"
```cmd
pip install yt-dlp
# OR
winget install yt-dlp
```

### "ffmpeg not installed"
```cmd
winget install ffmpeg
# OR download from https://ffmpeg.org
```

### "Port 3000 in use"
```cmd
npx kill-port 3000
# OR use different port
PORT=3001 bun run dev
```

### Videos not processing
1. Check ffmpeg is installed: `ffmpeg -version`
2. Check file exists in /input folder
3. Check console for errors (F12)

---

## 🤖 z-ai-web-dev-sdk

The AI SDK is **pre-installed and configured**. No additional setup needed!

### Capabilities:
- **Chat Completions**: AI agent conversations
- **Image Generation**: Create images from text
- **Video Generation**: Generate videos from text/images
- **Web Search**: Real-time information retrieval

### Usage Example:
```typescript
import ZAI from 'z-ai-web-dev-sdk';

const zai = await ZAI.create();

// Chat
const completion = await zai.chat.completions.create({
  messages: [{ role: 'user', content: 'Hello!' }],
});

// Image
const image = await zai.images.generations.create({
  prompt: 'A beautiful sunset',
  size: '1024x1024',
});

// Video
const video = await zai.video.generations.create({
  prompt: 'A cat playing',
  duration: 5,
});
```

---

## 🚀 Quick Start

```cmd
# 1. Navigate to project
cd my-project

# 2. Install
bun install

# 3. Run
bun run dev

# 4. Open browser
# http://localhost:3000

# 5. Create workflow
# - Click AI Agent button
# - Type: "Download this YouTube video: https://youtube.com/watch?v=xxx"
# - Watch tiles being added automatically!
```

---

## 📊 System Check

After starting the server, check system status:
```
http://localhost:3000/api/system/status?action=dependencies
```

Expected response:
```json
{
  "success": true,
  "dependencies": {
    "ytDlp": { "installed": true, "version": "2024.x.x" },
    "ffmpeg": { "installed": true, "version": "6.x" },
    "python": { "installed": true, "version": "3.x" }
  },
  "allInstalled": true
}
```

---

## 🎬 Example Workflows

### YouTube to Instagram Reels
```
YouTube Trigger → Clips (viral) → Reframe (9:16) → Cinematic Captions → Destination
```

### Video with Captions
```
Video Input → Captions → Video Output
```

### UGC Avatar Video
```
Text Input → AI Avatar → Captions → Destination
```

---

Enjoy creating with OpenMosaic! 🎉
