// OpenMosaic Tile Registry - Based on Mosaic.so Documentation
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
  // Bring media into the workflow

  'video-input': {
    type: 'video-input',
    category: 'input',
    label: 'Video Input',
    description: 'Upload local video or paste link (YouTube, etc.) - Max 20 GB, 300 min',
    icon: 'Video',
    defaultConfig: {
      source: 'upload', // 'upload' | 'youtube'
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
        type: 'string',
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
      source: 'upload',
      fileName: '',
      dimensions: undefined,
    },
    inputs: [],
    outputs: [{ id: 'image', type: 'image', label: 'Image path', description: 'Imported image path' }],
    configOptions: [
      {
        id: 'source',
        label: 'Source',
        type: 'select',
        options: [
          { value: 'upload', label: 'File Upload' }
        ]
      },
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
      source: 'upload',
      fileName: undefined,
      duration: undefined,
    },
    inputs: [],
    outputs: [{ id: 'audio', type: 'audio', label: 'Audio path', description: 'Audio track path' }],
    configOptions: [
      {
        id: 'source',
        label: 'Source',
        type: 'select',
        options: [
          { value: 'upload', label: 'File Upload' }
        ]
      },
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
      format: 'plain', // 'plain' | 'markdown' | 'srt'
    },
    inputs: [],
    outputs: [{ id: 'text', type: 'text', label: 'Text', description: 'Text content' }],
    isConfigurable: true,
  },

  // ============ CREATION TILES ============
  // Generate new media from scratch



  'ai-augment': {
    type: 'ai-augment',
    category: 'action',
    label: 'AI Augment',
    description: 'AI visual transformations on short video segments',
    icon: 'Wand2',
    defaultConfig: {
      enhancement: 'auto', // 'auto' | 'cinematic' | 'vibrant' | 'dramatic'
      intensity: 50,
      stylePrompt: '',
      preserveOriginal: true,
    },
    inputs: [
      { id: 'video', type: 'video', label: 'Video', required: true, description: 'Video segment to augment' },
    ],
    outputs: [
      { id: 'video', type: 'video', label: 'Augmented Video', description: 'Visually enhanced video' },
    ],
    isConfigurable: true,
  },



  'ai-music': {
    type: 'ai-music',
    category: 'action',
    label: 'AI Music',
    description: 'Original, copyright-safe background music track',
    icon: 'Music2',
    defaultConfig: {
      intelligentAnalysis: true,
      prompt: '',
      genre: 'electronic', // 'electronic' | 'orchestral' | 'acoustic' | 'hiphop' | 'ambient'
      mood: 'upbeat', // 'upbeat' | 'calm' | 'dramatic' | 'happy' | 'sad'
      intensity: 50,
      bpm: 120,
      style: '',
      startTime: 0,
      endTime: 60,
      fadeIn: 2,
      fadeOut: 2,
    },
    inputs: [
      { id: 'video', type: 'video', label: 'Video', required: false, description: 'Video to analyze for timing' },
      { id: 'text', type: 'text', label: 'Prompt', required: false, description: 'Music description' },
    ],
    outputs: [
      { id: 'audio', type: 'audio', label: 'Music Track', description: 'Generated background music' },
    ],
    isConfigurable: true,
  },

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
      quality: 'speed', // 'speed' | 'quality'
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
          { value: 'cinematic', label: 'Cinematic' },
          { value: 'anime', label: 'Anime' },
          { value: '3d-render', label: '3D Render' }
        ]
      },
      {
        id: 'quality',
        label: 'Quality',
        type: 'select',
        options: [
          { value: 'quality', label: 'High Quality' },
          { value: 'speed', label: 'Fast Generation (Speed)' }
        ]
      }
    ],
    isConfigurable: true,
  },

  // ============ ACTION TILES ============
  // Modify existing media

  'captions': {
    type: 'captions',
    category: 'action',
    label: 'Captions',
    description: 'Dynamic, stylized subtitles with word highlighting',
    icon: 'Captions',
    defaultConfig: {
      style: 'highlight', // 'basic' | 'highlight' | 'cinematic' | 'social'
      baseColor: '#FFFFFF',
      highlightColor: '#FFFF00',
      strokeColor: '#000000',
      font: 'Inter',
      fontSize: 48,
      verticalPosition: 'bottom', // 'top' | 'middle' | 'bottom'
      wordsPerCaption: 4,
      animation: 'fade', // 'none' | 'fade' | 'slide' | 'pop'
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



  'rough-cut': {
    type: 'rough-cut',
    category: 'action',
    label: 'Rough Cut',
    description: 'Condensed video with filler/silence removed based on prompt',
    icon: 'Scissors',
    defaultConfig: {
      creativeIntent: '', // Required - describes what to keep
      removeFiller: true,
      removeSilence: true,
      removeRepetitions: true,
      targetDuration: undefined, // Optional target length
      preserveStructure: true,
    },
    inputs: [
      { id: 'video', type: 'video', label: 'Video', required: true, description: 'Raw video' },
      { id: 'text', type: 'text', label: 'Intent', required: true, description: 'Creative intent prompt' },
    ],
    outputs: [
      { id: 'video', type: 'video', label: 'Edited Video', description: 'Condensed video' },
    ],
    isConfigurable: true,
  },

  'montage': {
    type: 'montage',
    category: 'action',
    label: 'Montage',
    description: 'Stitched montage with rhythm, pacing, and style',
    icon: 'Layers',
    defaultConfig: {
      stylePrompt: '', // Required
      audioTrack: undefined,
      targetBpm: undefined,
      transitionStyle: 'cut', // 'cut' | 'fade' | 'dissolve' | 'wipe'
      beatSync: true,
      colorGrade: 'match', // 'match' | 'cinematic' | 'vibrant'
    },
    inputs: [
      { id: 'video', type: 'video', label: 'Videos', required: true, description: 'One or more video clips' },
      { id: 'audio', type: 'audio', label: 'Audio Track', required: false, description: 'Background music' },
      { id: 'text', type: 'text', label: 'Style', required: true, description: 'Style prompt' },
    ],
    outputs: [
      { id: 'video', type: 'video', label: 'Montage', description: 'Stitched montage video' },
    ],
    isConfigurable: true,
  },

  'voice': {
    type: 'voice',
    category: 'action',
    label: 'Voice',
    description: 'Dubbed/modified audio with lip-synced visuals',
    icon: 'Mic2',
    defaultConfig: {
      targetLanguage: 'en',
      preserveBackgroundAudio: true,
      lipSync: true,
      safewords: [], // Words not to translate
      translationDictionary: {}, // Custom translations
      voiceStyle: 'preserve', // 'preserve' | 'natural' | 'professional'
    },
    inputs: [
      { id: 'video', type: 'video', label: 'Video', required: true, description: 'Video to dub' },
      { id: 'text', type: 'text', label: 'Translation', required: false, description: 'Optional translation' },
    ],
    outputs: [
      { id: 'video', type: 'video', label: 'Dubbed Video', description: 'Video with new voice' },
    ],
    isConfigurable: true,
  },

  'audio-enhance': {
    type: 'audio-enhance',
    category: 'action',
    label: 'Audio Enhance',
    description: 'One-click audio cleanup - noise reduction, clarity, levels',
    icon: 'Volume2',
    defaultConfig: {
      // No settings needed - one-click enhancement
      noiseReduction: true,
      speechClarity: true,
      levelBalancing: true,
      backgroundNoiseRemoval: true,
    },
    inputs: [
      { id: 'video', type: 'video', label: 'Video', required: true, description: 'Video to enhance' },
    ],
    outputs: [
      { id: 'video', type: 'video', label: 'Enhanced Video', description: 'Video with clean audio' },
    ],
    isConfigurable: true,
  },

  'reframe': {
    type: 'reframe',
    category: 'action',
    label: 'Reframe',
    description: 'Change aspect ratio for different platforms',
    icon: 'Maximize',
    defaultConfig: {
      targetRatio: '9:16', // '9:16' | '16:9' | '1:1' | '4:5'
      mode: 'auto', // 'auto' | 'face-track' | 'center' | 'manual'
      padding: 'blur', // 'blur' | 'color' | 'stretch'
      backgroundColor: '#000000',
      faceTracking: true,
    },
    inputs: [
      { id: 'video', type: 'video', label: 'Video', required: true, description: 'Video to reframe' },
    ],
    outputs: [
      { id: 'video', type: 'video', label: 'Reframed Video', description: 'Video in new aspect ratio' },
    ],
    isConfigurable: true,
  },

  'silence-removal': {
    type: 'silence-removal',
    category: 'action',
    label: 'Silence Removal',
    description: 'Remove silent sections from video',
    icon: 'VolumeX',
    defaultConfig: {
      threshold: -40, // dB
      minDuration: 0.5, // seconds
      padding: 0.1, // seconds to keep around speech
      keepShortSilences: false,
      keepMusic: true,
    },
    inputs: [
      { id: 'video', type: 'video', label: 'Video', required: true, description: 'Video to process' },
    ],
    outputs: [
      { id: 'video', type: 'video', label: 'Video', description: 'Video without silence' },
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
      mode: 'ai-suggested', // 'manual' | 'ai-suggested' | 'silence-based'
      clipCount: 5,
      minDuration: 15, // seconds
      maxDuration: 60, // seconds
      aspectRatio: '9:16',
      targetPlatform: 'instagram', // 'instagram' | 'tiktok' | 'youtube' | 'twitter'
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

  'intro': {
    type: 'intro',
    category: 'action',
    label: 'Intro',
    description: 'Add professional intro sequence with branding',
    icon: 'Play',
    defaultConfig: {
      template: 'minimal', // 'minimal' | 'bold' | 'cinematic' | 'custom'
      duration: 5,
      text: '',
      logo: undefined,
      logoPosition: 'center',
      animation: 'fade',
      music: true,
      backgroundColor: '#000000',
    },
    inputs: [
      { id: 'video', type: 'video', label: 'Video', required: true, description: 'Main video' },
      { id: 'image', type: 'image', label: 'Logo', required: false, description: 'Logo image' },
    ],
    outputs: [
      { id: 'video', type: 'video', label: 'Video with Intro', description: 'Video with intro' },
    ],
    isConfigurable: true,
  },

  'outro': {
    type: 'outro',
    category: 'action',
    label: 'Outro',
    description: 'Add professional outro with call-to-action',
    icon: 'Square',
    defaultConfig: {
      template: 'subscribe', // 'subscribe' | 'credits' | 'social' | 'custom'
      duration: 10,
      text: 'Thanks for watching!',
      showSubscribe: true,
      showSocialLinks: true,
      socialLinks: { youtube: '', instagram: '', twitter: '' },
      animation: 'fade',
    },
    inputs: [
      { id: 'video', type: 'video', label: 'Video', required: true, description: 'Main video' },
    ],
    outputs: [
      { id: 'video', type: 'video', label: 'Video with Outro', description: 'Video with outro' },
    ],
    isConfigurable: true,
  },

  'watermark': {
    type: 'watermark',
    category: 'action',
    label: 'Watermark',
    description: 'Add watermark or logo overlay to video',
    icon: 'Stamp',
    defaultConfig: {
      image: undefined,
      position: 'bottom-right',
      size: 15, // percentage
      opacity: 80,
      margin: 20,
      animation: 'none', // 'none' | 'fade' | 'slide'
    },
    inputs: [
      { id: 'video', type: 'video', label: 'Video', required: true, description: 'Video to watermark' },
      { id: 'image', type: 'image', label: 'Watermark', required: false, description: 'Watermark image' },
    ],
    outputs: [
      { id: 'video', type: 'video', label: 'Watermarked Video', description: 'Video with watermark' },
    ],
    isConfigurable: true,
  },

  'color-correction': {
    type: 'color-correction',
    category: 'action',
    label: 'Color Correction',
    description: 'Professional color grading and correction',
    icon: 'Palette',
    defaultConfig: {
      preset: 'cinematic', // 'cinematic' | 'vibrant' | 'vintage' | 'custom'
      brightness: 0,
      contrast: 0,
      saturation: 0,
      temperature: 0,
      tint: 0,
      highlights: 0,
      shadows: 0,
      lut: undefined, // LUT file URL
    },
    inputs: [
      { id: 'video', type: 'video', label: 'Video', required: true, description: 'Video to correct' },
    ],
    outputs: [
      { id: 'video', type: 'video', label: 'Corrected Video', description: 'Color-corrected video' },
    ],
    isConfigurable: true,
  },

  'concatenate': {
    type: 'concatenate',
    category: 'action',
    label: 'Concatenate',
    description: 'Join multiple video clips together',
    icon: 'Plus',
    defaultConfig: {
      transition: 'none', // 'none' | 'fade' | 'dissolve' | 'wipe'
      transitionDuration: 0.5,
      audioHandling: 'keep-all', // 'keep-all' | 'first-only' | 'mix'
    },
    inputs: [
      { id: 'video1', type: 'video', label: 'Video 1', required: true },
      { id: 'video2', type: 'video', label: 'Video 2', required: true },
    ],
    outputs: [
      { id: 'video', type: 'video', label: 'Combined Video', description: 'Concatenated video' },
    ],
    isConfigurable: true,
  },

  'text-overlay': {
    type: 'text-overlay',
    category: 'action',
    label: 'Text Overlay',
    description: 'Add text overlays with animations',
    icon: 'Type',
    defaultConfig: {
      text: '',
      font: 'Inter',
      fontSize: 48,
      color: '#FFFFFF',
      backgroundColor: 'rgba(0,0,0,0.5)',
      position: 'bottom',
      animation: 'none',
      duration: 'full', // 'full' | number of seconds
    },
    inputs: [
      { id: 'video', type: 'video', label: 'Video', required: true },
      { id: 'text', type: 'text', label: 'Text', required: false },
    ],
    outputs: [
      { id: 'video', type: 'video', label: 'Video', description: 'Video with text overlay' },
    ],
    isConfigurable: true,
  },

  'image-overlay': {
    type: 'image-overlay',
    category: 'action',
    label: 'Image Overlay',
    description: 'Add image overlays and stickers',
    icon: 'Layers',
    defaultConfig: {
      position: { x: 50, y: 50 }, // percentage
      size: 20, // percentage
      opacity: 100,
      maintainAspect: true,
      animation: 'none',
    },
    inputs: [
      { id: 'video', type: 'video', label: 'Video', required: true },
      { id: 'image', type: 'image', label: 'Image', required: true },
    ],
    outputs: [
      { id: 'video', type: 'video', label: 'Video', description: 'Video with image overlay' },
    ],
    isConfigurable: true,
  },

  // ============ OUTPUT TILES ============
  // Export or publish results

  'video-output': {
    type: 'video-output',
    category: 'output',
    label: 'Video Output',
    description: 'Export processed video in various formats',
    icon: 'Download',
    defaultConfig: {
      format: 'mp4', // 'mp4' | 'webm' | 'mov' | 'gif'
      resolution: '1080p', // '720p' | '1080p' | '4k'
      quality: 'high', // 'low' | 'medium' | 'high'
      fps: 30,
      codec: 'h264', // 'h264' | 'h265' | 'vp9'
    },
    inputs: [
      { id: 'video', type: 'video', label: 'Video', required: true },
    ],
    outputs: [],
    isConfigurable: true,
  },

  'audio-output': {
    type: 'audio-output',
    category: 'output',
    label: 'Audio Output',
    description: 'Export audio in various formats',
    icon: 'Download',
    defaultConfig: {
      format: 'mp3', // 'mp3' | 'wav' | 'aac' | 'flac'
      quality: 'high',
      sampleRate: 44100,
    },
    inputs: [
      { id: 'audio', type: 'audio', label: 'Audio', required: true },
    ],
    outputs: [],
    isConfigurable: true,
  },

  'destination': {
    type: 'destination',
    category: 'output',
    label: 'Destination',
    description: 'Publish directly to social platforms',
    icon: 'Upload',
    defaultConfig: {
      mode: 'review', // 'review' | 'publish-immediately' | 'export-only'
      platforms: [], // 'youtube' | 'instagram' | 'tiktok' | 'twitter' | 'facebook' | 'linkedin'
      title: '',
      description: '',
      tags: [],
      aiCaptions: true, // Generate captions for posts
      scheduledTime: undefined,
      thumbnail: undefined,
    },
    inputs: [
      { id: 'video', type: 'video', label: 'Video', required: true },
      { id: 'text', type: 'text', label: 'Post Content', required: false },
    ],
    outputs: [],
    isConfigurable: true,
  },

  // ============ LOGIC TILES ============
  // Control flow and branching

  'branch': {
    type: 'branch',
    category: 'logic',
    label: 'Branch',
    description: 'Create multiple processing branches',
    icon: 'GitBranch',
    defaultConfig: {
      branches: 2,
      mode: 'parallel', // 'parallel' | 'conditional'
    },
    inputs: [
      { id: 'input', type: 'any', label: 'Input', required: true },
    ],
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
    defaultConfig: {
      mode: 'sequential', // 'sequential' | 'parallel'
    },
    inputs: [
      { id: 'input1', type: 'any', label: 'Input 1', required: true },
      { id: 'input2', type: 'any', label: 'Input 2', required: false },
    ],
    outputs: [
      { id: 'output', type: 'any', label: 'Output' },
    ],
    isConfigurable: true,
  },

  // ============ PREVIEW TILES ============
  // Display media like ComfyUI preview nodes

  'video-preview': {
    type: 'video-preview',
    category: 'output',
    label: 'Video Preview',
    description: 'Preview video output in the canvas',
    icon: 'Play',
    defaultConfig: {
      autoplay: false,
      muted: true,
      loop: true,
    },
    inputs: [
      { id: 'video', type: 'video', label: 'Video', required: true },
    ],
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
    inputs: [
      { id: 'image', type: 'image', label: 'Image', required: true },
    ],
    outputs: [],
    isConfigurable: false,
  },

  'audio-preview': {
    type: 'audio-preview',
    category: 'output',
    label: 'Audio Preview',
    description: 'Preview audio output with waveform',
    icon: 'Music',
    defaultConfig: {
      autoplay: false,
    },
    inputs: [
      { id: 'audio', type: 'audio', label: 'Audio', required: true },
    ],
    outputs: [],
    isConfigurable: true,
  },

  'text-preview': {
    type: 'text-preview',
    category: 'output',
    label: 'Text Preview',
    description: 'Display text output (transcripts, etc.)',
    icon: 'FileText',
    defaultConfig: {
      maxLines: 50,
    },
    inputs: [
      { id: 'text', type: 'text', label: 'Text', required: true },
    ],
    outputs: [],
    isConfigurable: true,
  },

  'json-preview': {
    type: 'json-preview',
    category: 'output',
    label: 'JSON Preview',
    description: 'Display structured JSON data (metadata, etc.)',
    icon: 'Code',
    defaultConfig: {},
    inputs: [
      { id: 'json', type: 'any', label: 'Data', required: true },
    ],
    outputs: [],
    isConfigurable: true,
  },

  // ============ ANIMATION TILES ============
  // Manim and Remotion for animations

  'manim': {
    type: 'manim',
    category: 'action',
    label: 'Manim Animation',
    description: 'Create mathematical animations with Manim (Python)',
    icon: 'Cpu',
    defaultConfig: {
      script: '# Example: Create a circle\ncircle = Circle()\nself.play(Create(circle))\nself.wait(1)',
      quality: 'p', // 'l'=480p, 'm'=720p, 'p'=1080p, 'k'=4k
      format: 'mp4',
    },
    inputs: [
      { id: 'text', type: 'text', label: 'Script', required: false, description: 'Python Manim code' },
    ],
    outputs: [
      { id: 'video', type: 'video', label: 'Animation', description: 'Generated animation video' },
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
    outputs: [
      { id: 'video', type: 'video', label: 'Video', description: 'Generated Remotion video' },
    ],
    isConfigurable: true,
  },

  // ============ TRANSCRIPTION TILE ============

  'transcribe': {
    type: 'transcribe',
    category: 'action',
    label: 'Transcribe',
    description: 'Transcribe audio/video to text using Whisper',
    icon: 'Mic',
    defaultConfig: {
      language: 'en',
      model: 'base', // 'tiny', 'base', 'small', 'medium', 'large'
      outputFormat: 'srt', // 'srt' | 'txt' | 'json'
    },
    inputs: [
      { id: 'video', type: 'video', label: 'Video', required: false },
      { id: 'audio', type: 'audio', label: 'Audio', required: false },
    ],
    outputs: [
      { id: 'text', type: 'text', label: 'Transcript', description: 'Transcribed text' },
    ],
    isConfigurable: true,
  },

  // ============ THUMBNAIL TILE ============

  'thumbnail': {
    type: 'thumbnail',
    category: 'action',
    label: 'Thumbnail',
    description: 'Generate or extract video thumbnail',
    icon: 'Image',
    defaultConfig: {
      mode: 'extract', // 'extract' | 'generate'
      timestamp: 0, // seconds
      prompt: '', // for generation
      width: 1280,
      height: 720,
    },
    inputs: [
      { id: 'video', type: 'video', label: 'Video', required: false },
      { id: 'text', type: 'text', label: 'Prompt', required: false },
    ],
    outputs: [
      { id: 'image', type: 'image', label: 'Thumbnail', description: 'Generated thumbnail' },
    ],
    isConfigurable: true,
  },

  // ============ GREEN SCREEN TILE ============

  'green-screen': {
    type: 'green-screen',
    category: 'action',
    label: 'Green Screen',
    description: 'Remove or replace green/blue screen background',
    icon: 'Layers',
    defaultConfig: {
      keyColor: 'green', // 'green' | 'blue' | 'custom'
      customColor: '#00ff00',
      threshold: 50,
      edgeSoftness: 10,
      backgroundImage: '',
    },
    inputs: [
      { id: 'video', type: 'video', label: 'Video', required: true },
      { id: 'image', type: 'image', label: 'Background', required: false },
    ],
    outputs: [
      { id: 'video', type: 'video', label: 'Video', description: 'Video with replaced background' },
    ],
    isConfigurable: true,
  },

  // ============ SPEED TILE ============

  'speed': {
    type: 'speed',
    category: 'action',
    label: 'Speed',
    description: 'Change video playback speed',
    icon: 'Gauge',
    defaultConfig: {
      speed: 1.0, // 0.5 = half speed, 2.0 = double speed
      preserveAudio: true,
      pitchCorrection: true,
    },
    configOptions: [
      { id: 'speed', type: 'number', label: 'Speed Multiplier' },
      { id: 'preserveAudio', type: 'boolean', label: 'Preserve Audio' },
      { id: 'pitchCorrection', type: 'boolean', label: 'Apply Pitch Correction' },
    ],
    inputs: [
      { id: 'video', type: 'video', label: 'Video path', required: true },
    ],
    outputs: [
      { id: 'video', type: 'video', label: 'Video path', description: 'Speed-adjusted video' },
    ],
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
    inputs: [
      { id: 'video', type: 'video', label: 'Video path', required: true },
    ],
    outputs: [
      { id: 'video', type: 'video', label: 'Video path', description: 'Reversed video' },
    ],
    isConfigurable: true,
  },
  // ============ UTILITY TILES ============

  'merge-video': {
    type: 'merge-video',
    category: 'logic',
    label: 'Merge Video',
    description: 'Concatenate multiple videos consecutively',
    icon: 'Layers',
    defaultConfig: {
      transition: 'none', // 'none' | 'fade' | 'crossfade'
    },
    inputs: [
      { id: 'video1', type: 'video', label: 'Video 1', required: true },
      { id: 'video2', type: 'video', label: 'Video 2', required: true },
      { id: 'video3', type: 'video', label: 'Video 3', required: false },
    ],
    outputs: [
      { id: 'video', type: 'video', label: 'Merged Video', description: 'Combined video' },
    ],
    isConfigurable: true,
  },

  'split-video': {
    type: 'split-video',
    category: 'action',
    label: 'Split Video',
    description: 'Split a video into two segments at a timestamp',
    icon: 'Scissors',
    defaultConfig: {
      splitTime: 5, // Split at 5 seconds
    },
    inputs: [
      { id: 'video', type: 'video', label: 'Video path', required: true },
    ],
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
  const creationTypes = [
    'ai-augment', 'ai-music', 'ai-image', 'ai-video'
  ];
  return creationTypes.map(type => TILE_REGISTRY[type]).filter(Boolean);
}

export function getTilesForPlatform(platform: 'youtube' | 'instagram' | 'tiktok' | 'twitter'): TileDefinition[] {
  const platformTiles: Record<string, string[]> = {
    youtube: ['video-input', 'captions', 'intro', 'outro', 'thumbnail', 'destination'],
    instagram: ['video-input', 'reframe', 'clips', 'destination'],
    tiktok: ['video-input', 'reframe', 'destination'],
    twitter: ['video-input', 'clips', 'captions', 'destination'],
  };

  return platformTiles[platform]?.map(type => TILE_REGISTRY[type]).filter(Boolean) || [];
}
