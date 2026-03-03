// OpenMosaic Tile Registry
// All tiles properly documented with inputs, outputs, and configurations

import type { TileDefinition } from './tile-types';

// Type definitions for better type safety
type DataType = 'video' | 'audio' | 'image' | 'text' | 'any';

interface TileInput {
  id: string;
  type: DataType;
  label: string;
  required?: boolean;
  description?: string;
}

interface TileOutput {
  id: string;
  type: DataType;
  label: string;
  description?: string;
}

export const TILE_REGISTRY: Record<string, TileDefinition> = {
  // ============ INPUT TILES ============

  'video-input': {
    type: 'video-input',
    category: 'input',
    label: 'Video Input',
    description: 'Upload local video or paste link (YouTube, etc.) - Max 20 GB, 300 min',
    icon: 'Video',
    defaultConfig: {
      source: 'upload',
      fileName: '',
      youtubeUrl: '',
      subtitleLanguage: 'en,hi',
      separateAudio: true,
    },
    inputs: [],
    outputs: [
      { id: 'video', type: 'video', label: 'Video Path', description: 'Raw video without audio' },
      { id: 'audio', type: 'audio', label: 'Audio Path', description: 'Extracted audio track' },
      { id: 'text', type: 'text', label: 'Subtitles', description: 'YouTube transcript/subtitles' },
      { id: 'metadata', type: 'any', label: 'Metadata', description: 'Video metadata (FPS, Duration, Aspect Ratio)' },
    ],
    configOptions: [
      {
        id: 'source',
        label: 'Source',
        type: 'select',
        options: [
          { value: 'upload', label: 'File Upload' },
          { value: 'youtube', label: 'YouTube Link' }
        ]
      },
      {
        id: 'fileName',
        label: 'Upload Video',
        type: 'file-upload',
        accept: 'video/*'
      },
      {
        id: 'youtubeUrl',
        label: 'YouTube URL',
        type: 'text',
        showIf: { field: 'source', value: 'youtube' }
      },
      {
        id: 'separateAudio',
        label: 'Separate Audio & Video',
        type: 'boolean'
      },
    ],
    isConfigurable: true,
  },

  'image-input': {
    type: 'image-input',
    category: 'input',
    label: 'Image Input',
    description: 'Import images for overlays, thumbnails, or AI processing',
    icon: 'Image',
    defaultConfig: {
      fileName: '',
    },
    inputs: [],
    outputs: [{ id: 'image', type: 'image', label: 'Image path', description: 'Imported image path' }],
    configOptions: [
      {
        id: 'fileName',
        label: 'Upload Image',
        type: 'file-upload',
        accept: 'image/*'
      }
    ],
    isConfigurable: true,
  },

  'audio-input': {
    type: 'audio-input',
    category: 'input',
    label: 'Audio Input',
    description: 'Upload audio files for music, voiceovers, or sound effects',
    icon: 'Music',
    defaultConfig: {
      fileName: '',
    },
    inputs: [],
    outputs: [{ id: 'audio', type: 'audio', label: 'Audio path', description: 'Audio track path' }],
    configOptions: [
      {
        id: 'fileName',
        label: 'Upload Audio',
        type: 'file-upload',
        accept: 'audio/*'
      }
    ],
    isConfigurable: true,
  },

  'text-input': {
    type: 'text-input',
    category: 'input',
    label: 'Text Input',
    description: 'Enter text for scripts, captions, prompts, or AI processing',
    icon: 'Type',
    defaultConfig: {
      content: '',
    },
    inputs: [],
    outputs: [{ id: 'text', type: 'text', label: 'Text', description: 'Text content' }],
    isConfigurable: true,
  },

  // ============ AI GENERATION TILES ============



  'ai-image': {
    type: 'ai-image',
    category: 'action',
    label: 'AI Image',
    description: 'Generate images from text prompts',
    icon: 'Image',
    defaultConfig: {
      prompt: '',
      style: 'realistic',
      aspectRatio: '16:9',
      quality: 'high',
    },
    inputs: [
      { id: 'text', type: 'text', label: 'Prompt', required: true, description: 'Image description' },
    ],
    outputs: [
      { id: 'image', type: 'image', label: 'Image Path', description: 'AI-generated image path' },
    ],
    configOptions: [
      {
        id: 'aspectRatio',
        label: 'Aspect Ratio',
        type: 'select',
        options: [
          { value: '16:9', label: '16:9 (Landscape - YouTube)' },
          { value: '9:16', label: '9:16 (Portrait - TikTok/Reels)' },
          { value: '1:1', label: '1:1 (Square - Instagram)' },
          { value: '4:5', label: '4:5 (Standard Portrait)' }
        ]
      },
      {
        id: 'style',
        label: 'Style',
        type: 'select',
        options: [
          { value: 'realistic', label: 'Realistic' },
          { value: 'anime', label: 'Anime' },
          { value: '3d-render', label: '3D Render' },
          { value: 'digital-art', label: 'Digital Art' }
        ]
      }
    ],
    isConfigurable: true,
  },

  'ai-video': {
    type: 'ai-video',
    category: 'action',
    label: 'AI Video',
    description: 'Generate video clips from text or images',
    icon: 'Video',
    defaultConfig: {
      prompt: '',
      duration: 5,
      aspectRatio: '16:9',
      style: 'cinematic',
      quality: 'speed',
    },
    inputs: [
      { id: 'text', type: 'text', label: 'Prompt', required: true, description: 'Video description' },
      { id: 'image', type: 'image', label: 'Start Image', required: false, description: 'Image to animate' },
    ],
    outputs: [
      { id: 'video', type: 'video', label: 'Video Path', description: 'AI-generated video clip path' },
    ],
    configOptions: [
      {
        id: 'duration',
        label: 'Duration (Seconds)',
        type: 'select',
        options: [
          { value: '5', label: '5 Seconds' },
          { value: '10', label: '10 Seconds' }
        ]
      },
      {
        id: 'aspectRatio',
        label: 'Aspect Ratio',
        type: 'select',
        options: [
          { value: '16:9', label: '16:9 (Landscape)' },
          { value: '9:16', label: '9:16 (Portrait)' },
          { value: '1:1', label: '1:1 (Square)' }
        ]
      },
      {
        id: 'style',
        label: 'Style',
        type: 'select',
        options: [
          { value: 'cinematic', label: 'Cinematic' },
          { value: 'anime', label: 'Anime' },
          { value: '3d-render', label: '3D Render' }
        ]
      }
    ],
    isConfigurable: true,
  },

  // ============ ACTION TILES ============

  'captions': {
    type: 'captions',
    category: 'action',
    label: 'Captions',
    description: 'Dynamic, stylized subtitles with word highlighting',
    icon: 'Captions',
    defaultConfig: {
      style: 'highlight',
      baseColor: '#FFFFFF',
      highlightColor: '#FFFF00',
      strokeColor: '#000000',
      font: 'Inter',
      fontSize: 48,
      verticalPosition: 'bottom',
      wordsPerCaption: 4,
      animation: 'fade',
      showBackground: true,
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    inputs: [
      { id: 'video', type: 'video', label: 'Video', required: true, description: 'Video to caption' },
      { id: 'text', type: 'text', label: 'Transcript', required: false, description: 'Optional transcript' },
    ],
    outputs: [
      { id: 'video', type: 'video', label: 'Captioned Video', description: 'Video with captions' },
      { id: 'text', type: 'text', label: 'SRT', description: 'SRT subtitle file' },
    ],
    isConfigurable: true,
  },

  'voice': {
    type: 'voice',
    category: 'action',
    label: 'Voice TTS',
    description: 'Clone and generate speech using audio.z.ai AI models',
    icon: 'Mic2',
    defaultConfig: {
      voice_id: '',
      speed: 1.0,
      volume: 1.0,
    },
    inputs: [
      { id: 'text', type: 'text', label: 'Script', required: true, description: 'Text to synthesize into speech' },
    ],
    outputs: [
      { id: 'audio', type: 'audio', label: 'Generated Audio', description: 'Synthesized voice track' },
    ],
    configOptions: [
      {
        id: 'voice_id',
        label: 'Select Voice',
        description: 'Choose a system or cloned voice profile',
        type: 'select',
        // Instructs the UI to fetch options dynamically from our proxy
        options_endpoint: '/api/voices'
      },
      {
        id: 'speed',
        label: 'Speech Rate',
        description: 'Adjust the playback speed',
        type: 'slider',
        min: 0.5,
        max: 2.0,
        step: 0.1,
      },
      {
        id: 'volume',
        label: 'Volume',
        description: 'Adjust the output volume',
        type: 'slider',
        min: 0,
        max: 10,
        step: 1,
      }
    ],
    isConfigurable: true,
  },



  'clips': {
    type: 'clips',
    category: 'action',
    label: 'Clips',
    description: 'Extract short-form highlight clips from video',
    icon: 'Film',
    defaultConfig: {
      mode: 'ai-suggested',
      clipCount: 5,
      minDuration: 15,
      maxDuration: 60,
      aspectRatio: '9:16',
      targetPlatform: 'instagram',
    },
    inputs: [
      { id: 'video', type: 'video', label: 'Video', required: true, description: 'Source video' },
      { id: 'text', type: 'text', label: 'Timestamps', required: false, description: 'Manual timestamps' },
    ],
    outputs: [
      { id: 'video', type: 'video', label: 'Clips', description: 'Extracted clips' },
    ],
    isConfigurable: true,
  },

  // ============ NEW TOOL NODES ============

  'sox-audio': {
    type: 'sox-audio',
    category: 'action',
    label: 'SoX Audio',
    description: 'Professional audio processing: normalize, noise reduction, EQ, reverb, fade, trim, pitch, tempo',
    icon: 'Sliders',
    defaultConfig: {
      operation: 'normalize',
      // Normalize
      normalizeDb: -3,
      // Noise Reduction
      noiseFloor: -50,
      // Fade
      fadeIn: 2,
      fadeOut: 2,
      // Trim
      trimStart: 0,
      trimEnd: 0,
      // Reverb
      reverberance: 50,
      roomScale: 100,
      stereoDepth: 100,
      // Pitch Shift (semitones)
      pitchShift: 0,
      // Tempo (percent: 100=normal, 120=20% faster)
      tempo: 100,
      // Equalizer
      eqFrequency: 1000,
      eqWidth: 1.0,
      eqGain: 0,
    },
    configOptions: [
      {
        id: 'operation',
        label: 'Operation',
        description: 'Select the audio manipulation type',
        type: 'select',
        options: [
          { value: 'normalize', label: 'Normalize (Fix Volume Level)' },
          { value: 'noise-reduction', label: 'Noise Reduction' },
          { value: 'fade', label: 'Fade In / Fade Out' },
          { value: 'trim', label: 'Trim (Cut Start/End)' },
          { value: 'reverb', label: 'Add Reverb' },
          { value: 'pitch', label: 'Pitch Shift (Semitones)' },
          { value: 'tempo', label: 'Change Tempo (No Pitch Change)' },
          { value: 'equalizer', label: 'Equalizer (EQ Band)' },
        ]
      },
      { id: 'normalizeDb', label: 'Target dB', description: 'Target volume level (e.g. -3 for standard digital audio)', type: 'number', showIf: { field: 'operation', value: 'normalize' } },
      { id: 'noiseFloor', label: 'Noise Floor dB', description: 'Threshold to filter out background hum/hiss (-50 is moderate)', type: 'number', showIf: { field: 'operation', value: 'noise-reduction' } },
      { id: 'fadeIn', label: 'Fade In (s)', description: 'Duration of fade-up at start of audio', type: 'number', showIf: { field: 'operation', value: 'fade' } },
      { id: 'fadeOut', label: 'Fade Out (s)', description: 'Duration of fade-down at end of audio', type: 'number', showIf: { field: 'operation', value: 'fade' } },
      { id: 'trimStart', label: 'Trim Start (s)', description: 'Seconds to remove from the beginning', type: 'number', showIf: { field: 'operation', value: 'trim' } },
      { id: 'trimEnd', label: 'Duration (s)', description: 'Keep only this many second (0 = to the end)', type: 'number', showIf: { field: 'operation', value: 'trim' } },
      { id: 'reverberance', label: 'Reverberance (0-100)', description: 'How long the reverb tail lasts', type: 'number', showIf: { field: 'operation', value: 'reverb' } },
      { id: 'roomScale', label: 'Room Scale (0-100)', description: 'Simulated physical size of the acoustic room', type: 'number', showIf: { field: 'operation', value: 'reverb' } },
      { id: 'stereoDepth', label: 'Stereo Depth (0-100)', description: 'Stereo width spread of the reverb effect', type: 'number', showIf: { field: 'operation', value: 'reverb' } },
      { id: 'pitchShift', label: 'Pitch Shift', description: 'Semitones shift (+12 is an octave up, negative is down)', type: 'number', showIf: { field: 'operation', value: 'pitch' } },
      { id: 'tempo', label: 'Tempo %', description: 'Percentage speed (100 = normal, 200 = double speed)', type: 'number', showIf: { field: 'operation', value: 'tempo' } },
      { id: 'eqFrequency', label: 'EQ Frequency (Hz)', description: 'Target middle frequency to boost/cut', type: 'number', showIf: { field: 'operation', value: 'equalizer' } },
      { id: 'eqWidth', label: 'EQ Width (Q)', description: 'Quality factor / bandwidth size of EQ curve', type: 'number', showIf: { field: 'operation', value: 'equalizer' } },
      { id: 'eqGain', label: 'EQ Gain (dB)', description: 'Gain relative to standard (positive to boost bass/treble)', type: 'number', showIf: { field: 'operation', value: 'equalizer' } },
    ],
    inputs: [
      { id: 'audio', type: 'audio', label: 'Audio path', required: true, description: 'Input audio file' },
    ],
    outputs: [
      { id: 'audio', type: 'audio', label: 'Audio path', description: 'Processed audio file' },
    ],
    isConfigurable: true,
  },



  'image-magick': {
    type: 'image-magick',
    category: 'action',
    label: 'ImageMagick',
    description: 'Professional image editing: resize, crop, rotate, blur, sharpen, brightness, format convert',
    icon: 'Edit',
    defaultConfig: {
      operation: 'resize',
      // Resize
      width: 1920,
      height: 1080,
      maintainAspect: true,
      // Crop
      cropX: 0,
      cropY: 0,
      cropWidth: 1280,
      cropHeight: 720,
      // Rotate
      degrees: 90,
      // Blur / Sharpen
      blurRadius: 5,
      sharpenRadius: 2,
      sharpenSigma: 1.0,
      // Brightness / Contrast (-100 to +100)
      brightness: 0,
      contrast: 0,
      // Convert
      outputFormat: 'jpg',
      // Border
      borderSize: 10,
      borderColor: '#000000',
    },
    configOptions: [
      {
        id: 'operation',
        label: 'Operation',
        description: 'Select the image edit type',
        type: 'select',
        options: [
          { value: 'resize', label: 'Resize' },
          { value: 'crop', label: 'Crop' },
          { value: 'rotate', label: 'Rotate' },
          { value: 'flip', label: 'Flip Horizontal' },
          { value: 'flop', label: 'Flip Vertical' },
          { value: 'blur', label: 'Blur' },
          { value: 'sharpen', label: 'Sharpen' },
          { value: 'brightness-contrast', label: 'Brightness & Contrast' },
          { value: 'grayscale', label: 'Convert to Grayscale' },
          { value: 'convert-format', label: 'Convert Format' },
          { value: 'border', label: 'Add Border' },
        ]
      },
      { id: 'width', label: 'Width (px)', description: 'Target width for image', type: 'number', showIf: { field: 'operation', value: 'resize' } },
      { id: 'height', label: 'Height (px)', description: 'Target height for image', type: 'number', showIf: { field: 'operation', value: 'resize' } },
      { id: 'maintainAspect', label: 'Maintain Aspect Ratio', description: 'Prevent image stretching', type: 'boolean', showIf: { field: 'operation', value: 'resize' } },

      { id: 'cropX', label: 'Crop X offset', description: 'Starting X coordinate from top left', type: 'number', showIf: { field: 'operation', value: 'crop' } },
      { id: 'cropY', label: 'Crop Y offset', description: 'Starting Y coordinate from top left', type: 'number', showIf: { field: 'operation', value: 'crop' } },
      { id: 'cropWidth', label: 'Crop Width', description: 'Ending width of the crop', type: 'number', showIf: { field: 'operation', value: 'crop' } },
      { id: 'cropHeight', label: 'Crop Height', description: 'Ending height of the crop', type: 'number', showIf: { field: 'operation', value: 'crop' } },

      { id: 'degrees', label: 'Rotation Degrees', description: 'Rotate clockwise', type: 'number', showIf: { field: 'operation', value: 'rotate' } },

      { id: 'blurRadius', label: 'Blur Radius', description: 'Intensity of Gaussian blur', type: 'number', showIf: { field: 'operation', value: 'blur' } },

      { id: 'sharpenRadius', label: 'Sharpen Radius', description: 'Radius of sharpening filter', type: 'number', showIf: { field: 'operation', value: 'sharpen' } },
      { id: 'sharpenSigma', label: 'Sharpen Sigma', description: 'Standard deviation (1.0 is default)', type: 'number', showIf: { field: 'operation', value: 'sharpen' } },

      { id: 'brightness', label: 'Brightness', description: 'Brightness filter (-100 to +100)', type: 'number', showIf: { field: 'operation', value: 'brightness-contrast' } },
      { id: 'contrast', label: 'Contrast', description: 'Contrast filter (-100 to +100)', type: 'number', showIf: { field: 'operation', value: 'brightness-contrast' } },

      {
        id: 'outputFormat',
        label: 'Output Format',
        description: 'New format for exported file',
        type: 'select',
        showIf: { field: 'operation', value: 'convert-format' },
        options: [
          { value: 'jpg', label: 'JPG' },
          { value: 'png', label: 'PNG' },
          { value: 'webp', label: 'WebP' },
          { value: 'bmp', label: 'BMP' },
        ]
      },

      { id: 'borderSize', label: 'Border Size (px)', description: 'Thickness of solid border to add', type: 'number', showIf: { field: 'operation', value: 'border' } },
      { id: 'borderColor', label: 'Border Color', description: 'Color hex code for border', type: 'color', showIf: { field: 'operation', value: 'border' } },
    ],
    inputs: [
      { id: 'image', type: 'image', label: 'Image path', required: true, description: 'Input image' },
    ],
    outputs: [
      { id: 'image', type: 'image', label: 'Image path', description: 'Processed image' },
    ],
    isConfigurable: true,
  },

  'd3-chart': {
    type: 'd3-chart',
    category: 'action',
    label: 'D3 Chart',
    description: 'Generate beautiful data visualizations: Bar, Line, Pie, Scatter, Area charts as PNG images',
    icon: 'BarChart2',
    defaultConfig: {
      chartType: 'bar',
      title: 'My Chart',
      xLabel: 'X Axis',
      yLabel: 'Y Axis',
      width: 1280,
      height: 720,
      colorScheme: 'blue',
      sampleData: '[{"label":"A","value":10},{"label":"B","value":25},{"label":"C","value":15}]',
    },
    configOptions: [
      {
        id: 'chartType',
        label: 'Chart Type',
        type: 'select',
        options: [
          { value: 'bar', label: 'Bar Chart' },
          { value: 'line', label: 'Line Chart' },
          { value: 'pie', label: 'Pie Chart' },
          { value: 'scatter', label: 'Scatter Plot' },
          { value: 'area', label: 'Area Chart' },
        ]
      },
      { id: 'title', label: 'Chart Title', type: 'text' },
      { id: 'xLabel', label: 'X Axis Label', type: 'text' },
      { id: 'yLabel', label: 'Y Axis Label', type: 'text' },
      { id: 'width', label: 'Width (px)', type: 'number' },
      { id: 'height', label: 'Height (px)', type: 'number' },
      {
        id: 'colorScheme',
        label: 'Color Scheme',
        type: 'select',
        options: [
          { value: 'blue', label: 'Blue' },
          { value: 'green', label: 'Green' },
          { value: 'red', label: 'Red' },
          { value: 'purple', label: 'Purple' },
          { value: 'orange', label: 'Orange' },
          { value: 'rainbow', label: 'Rainbow' },
        ]
      },
    ],
    inputs: [
      { id: 'text', type: 'text', label: 'JSON Data', required: false, description: 'Array of {label, value} objects as JSON' },
    ],
    outputs: [
      { id: 'image', type: 'image', label: 'Chart Image', description: 'Generated chart as PNG' },
    ],
    isConfigurable: true,
  },


  // ============ LOGIC TILES ============

  'branch': {
    type: 'branch',
    category: 'logic',
    label: 'Branch',
    description: 'Create multiple processing branches',
    icon: 'GitBranch',
    defaultConfig: { branches: 2, mode: 'parallel' },
    inputs: [{ id: 'input', type: 'any', label: 'Input', required: true }],
    outputs: [
      { id: 'branch1', type: 'any', label: 'Branch 1' },
      { id: 'branch2', type: 'any', label: 'Branch 2' },
    ],
    isConfigurable: true,
  },

  'merge': {
    type: 'merge',
    category: 'logic',
    label: 'Merge',
    description: 'Combine multiple branches back together',
    icon: 'GitMerge',
    defaultConfig: { mode: 'sequential' },
    inputs: [
      { id: 'input1', type: 'any', label: 'Input 1', required: true },
      { id: 'input2', type: 'any', label: 'Input 2', required: false },
    ],
    outputs: [{ id: 'output', type: 'any', label: 'Output' }],
    isConfigurable: true,
  },

  // ============ PREVIEW TILES ============

  'video-preview': {
    type: 'video-preview',
    category: 'output',
    label: 'Video Preview',
    description: 'Preview video output in the canvas',
    icon: 'Play',
    defaultConfig: { autoplay: false, muted: true, loop: true },
    inputs: [{ id: 'video', type: 'video', label: 'Video', required: true }],
    outputs: [],
    isConfigurable: true,
  },

  'image-preview': {
    type: 'image-preview',
    category: 'output',
    label: 'Image Preview',
    description: 'Preview image output in the canvas',
    icon: 'Image',
    defaultConfig: {},
    inputs: [{ id: 'image', type: 'image', label: 'Image', required: true }],
    outputs: [],
    isConfigurable: false,
  },

  'audio-preview': {
    type: 'audio-preview',
    category: 'output',
    label: 'Audio Preview',
    description: 'Preview audio output with waveform',
    icon: 'Music',
    defaultConfig: { autoplay: false },
    inputs: [{ id: 'audio', type: 'audio', label: 'Audio', required: true }],
    outputs: [],
    isConfigurable: true,
  },

  'text-preview': {
    type: 'text-preview',
    category: 'output',
    label: 'Text Preview',
    description: 'Display text output (transcripts, etc.)',
    icon: 'FileText',
    defaultConfig: { maxLines: 50 },
    inputs: [{ id: 'text', type: 'text', label: 'Text', required: true }],
    outputs: [],
    isConfigurable: true,
  },

  'json-preview': {
    type: 'json-preview',
    category: 'output',
    label: 'JSON Preview',
    description: 'Display structured JSON data (metadata, transcripts, etc.)',
    icon: 'Code',
    defaultConfig: {},
    inputs: [{ id: 'json', type: 'any', label: 'Data', required: true }],
    outputs: [],
    isConfigurable: true,
  },

  // ============ ANIMATION TILES ============

  'manim': {
    type: 'manim',
    category: 'action',
    label: 'Manim Animation',
    description: 'Create mathematical animations with Manim (Python)',
    icon: 'Cpu',
    defaultConfig: {
      script: '# Example: Create a circle\ncircle = Circle()\nself.play(Create(circle))\nself.wait(1)',
      quality: 'l',
      format: 'mp4',
    },
    inputs: [{ id: 'text', type: 'text', label: 'Script', required: false, description: 'Python Manim code' }],
    outputs: [{ id: 'video', type: 'video', label: 'Video Path', description: 'Generated animation video path' }],
    configOptions: [
      {
        id: 'script',
        label: 'Manim Python Script',
        description: 'Write the body of the construct() method. Each line will be executed inside a Scene class.',
        type: 'textarea',
      },
      {
        id: 'quality',
        label: 'Render Quality',
        description: 'Higher quality = longer render time',
        type: 'select',
        options: [
          { value: 'l', label: 'Low (480p 15fps) – Fast' },
          { value: 'm', label: 'Medium (720p 30fps)' },
          { value: 'h', label: 'High (1080p 60fps)' },
          { value: 'p', label: 'Production (1440p 60fps)' },
          { value: 'k', label: '4K (2160p 60fps) – Slow' },
        ]
      },
      {
        id: 'format',
        label: 'Output Format',
        type: 'select',
        options: [
          { value: 'mp4', label: 'MP4 (H.264)' },
          { value: 'gif', label: 'GIF (Animated)' },
          { value: 'webm', label: 'WebM' },
        ]
      },
    ],
    isConfigurable: true,
  },

  'remotion': {
    type: 'remotion',
    category: 'action',
    label: 'Remotion Video',
    description: 'Create programmatic videos with Remotion (React)',
    icon: 'Code',
    defaultConfig: {
      composition: 'Hello World',
      durationInFrames: 150,
      fps: 30,
      width: 1080,
      height: 1920,
    },
    inputs: [
      { id: 'text', type: 'text', label: 'Composition', required: false, description: 'Composition name or code' },
      { id: 'image', type: 'image', label: 'Background', required: false },
    ],
    outputs: [{ id: 'video', type: 'video', label: 'Video', description: 'Generated Remotion video' }],
    isConfigurable: true,
  },

  // ============ TRANSCRIPTION TILE ============



  // ============ SPEED TILE ============

  'speed': {
    type: 'speed',
    category: 'action',
    label: 'Speed',
    description: 'Change video playback speed',
    icon: 'Gauge',
    defaultConfig: {
      speed: '1.5',
      preserveAudio: true,
      pitchCorrection: true,
    },
    configOptions: [
      {
        id: 'speed',
        type: 'select',
        label: 'Speed Multiplier',
        options: [
          { value: '0.25', label: '0.25x' },
          { value: '0.5', label: '0.5x' },
          { value: '0.75', label: '0.75x' },
          { value: '1.0', label: '1.0x (Normal)' },
          { value: '1.25', label: '1.25x' },
          { value: '1.5', label: '1.5x' },
          { value: '2.0', label: '2.0x' },
          { value: '3.0', label: '3.0x' },
          { value: '4.0', label: '4.0x' },
        ]
      },
      { id: 'preserveAudio', type: 'boolean', label: 'Preserve Audio' },
      { id: 'pitchCorrection', type: 'boolean', label: 'Apply Pitch Correction' },
    ],
    inputs: [{ id: 'video', type: 'video', label: 'Video path', required: true }],
    outputs: [{ id: 'video', type: 'video', label: 'Video path', description: 'Speed-adjusted video' }],
    isConfigurable: true,
  },

  // ============ REVERSE TILE ============

  'reverse': {
    type: 'reverse',
    category: 'action',
    label: 'Reverse',
    description: 'Reverse video and/or audio playback',
    icon: 'Rewind',
    defaultConfig: {
      reverseVideo: true,
      reverseAudio: true,
    },
    inputs: [{ id: 'video', type: 'video', label: 'Video path', required: true }],
    outputs: [{ id: 'video', type: 'video', label: 'Video path', description: 'Reversed video' }],
    isConfigurable: true,
  },

  // ============ UTILITY TILES ============

  'merge-video': {
    type: 'merge-video',
    category: 'logic',
    label: 'Merge Video',
    description: 'Concatenate multiple videos consecutively',
    icon: 'Layers',
    defaultConfig: { transition: 'none' },
    inputs: [
      { id: 'video1', type: 'video', label: 'Video 1', required: true },
      { id: 'video2', type: 'video', label: 'Video 2', required: true },
      { id: 'video3', type: 'video', label: 'Video 3', required: false },
    ],
    outputs: [{ id: 'video', type: 'video', label: 'Merged Video', description: 'Combined video' }],
    isConfigurable: true,
  },

  'split-video': {
    type: 'split-video',
    category: 'action',
    label: 'Split Video',
    description: 'Split a video into two segments at a timestamp',
    icon: 'Scissors',
    defaultConfig: { splitTime: 5 },
    inputs: [{ id: 'video', type: 'video', label: 'Video path', required: true }],
    outputs: [
      { id: 'video1', type: 'video', label: 'Part 1 path', description: 'First segment' },
      { id: 'video2', type: 'video', label: 'Part 2 path', description: 'Second segment' },
    ],
    isConfigurable: true,
  },
};

// ============ HELPER FUNCTIONS ============

export function getTilesByCategory(category: string): TileDefinition[] {
  return Object.values(TILE_REGISTRY).filter((tile) => tile.category === category);
}

export function getInputTiles(): TileDefinition[] {
  return getTilesByCategory('input');
}

export function getActionTiles(): TileDefinition[] {
  return getTilesByCategory('action');
}

export function getOutputTiles(): TileDefinition[] {
  return getTilesByCategory('output');
}

export function getLogicTiles(): TileDefinition[] {
  return getTilesByCategory('logic');
}

export function getTileDefinition(type: string): TileDefinition | undefined {
  return TILE_REGISTRY[type];
}

export function getCreationTiles(): TileDefinition[] {
  const creationTypes = ['ai-music', 'ai-image', 'ai-video'];
  return creationTypes.map(type => TILE_REGISTRY[type]).filter(Boolean);
}

export function getTilesForPlatform(platform: 'youtube' | 'instagram' | 'tiktok' | 'twitter'): TileDefinition[] {
  const platformTiles: Record<string, string[]> = {
    youtube: ['video-input', 'captions', 'whisper-transcribe'],
    instagram: ['video-input', 'reframe', 'clips'],
    tiktok: ['video-input', 'reframe'],
    twitter: ['video-input', 'clips', 'captions'],
  };
  return platformTiles[platform]?.map(type => TILE_REGISTRY[type]).filter(Boolean) || [];
}
