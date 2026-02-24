// OpenMosaic Tile Types - Inspired by Mosaic.so
// This defines the complete tile system for the node-based video editing canvas

import type { Node, Edge } from '@xyflow/react';

// Base Tile Categories
export type TileCategory = 'input' | 'action' | 'output' | 'logic';

// Tile Status
export type TileStatus = 'idle' | 'processing' | 'completed' | 'error';

// Base Tile Data
export interface BaseTileData {
  [key: string]: unknown;
  label: string;
  category: TileCategory;
  status: TileStatus;
  description: string;
  icon: string;
  isConfigurable: boolean;
  config: Record<string, unknown>;
}

// Input Tiles
export interface VideoInputTileData extends BaseTileData {
  category: 'input';
  label: 'Video Input';
  icon: 'video';
  config: {
    source: 'upload' | 'url';
    fileUrl?: string;
    fileName?: string;
    duration?: number;
    resolution?: { width: number; height: number };
    fps?: number;
  };
}

export interface ImageInputTileData extends BaseTileData {
  category: 'input';
  label: 'Image Input';
  icon: 'image';
  config: {
    source: 'upload' | 'url';
    fileUrl?: string;
    fileName?: string;
    dimensions?: { width: number; height: number };
  };
}

export interface AudioInputTileData extends BaseTileData {
  category: 'input';
  label: 'Audio Input';
  icon: 'audio';
  config: {
    source: 'upload' | 'url' | 'generate';
    fileUrl?: string;
    fileName?: string;
    duration?: number;
  };
}

export interface TextInputTileData extends BaseTileData {
  category: 'input';
  label: 'Text Input';
  icon: 'text';
  config: {
    content: string;
    style?: {
      font?: string;
      size?: number;
      color?: string;
      position?: 'top' | 'center' | 'bottom';
    };
  };
}

// Action Tiles
export interface AITranscriptionTileData extends BaseTileData {
  category: 'action';
  label: 'AI Transcription';
  icon: 'transcription';
  config: {
    model: 'whisper-1' | 'gemini-pro';
    language?: string;
    outputFormat: 'srt' | 'vtt' | 'txt';
    timestamps: boolean;
  };
}

export interface AISummaryTileData extends BaseTileData {
  category: 'action';
  label: 'AI Summary';
  icon: 'sparkles';
  config: {
    model: 'gemini-pro' | 'gpt-4' | 'claude-3';
    maxLength: number;
    style: 'bullet' | 'paragraph' | 'chapter';
  };
}

export interface AICaptionTileData extends BaseTileData {
  category: 'action';
  label: 'AI Captions';
  icon: 'captions';
  config: {
    model: 'whisper-1' | 'gemini-pro';
    style: 'highlight' | 'minimal' | 'animated';
    wordHighlight: boolean;
    maxWordsPerLine: number;
  };
}

export interface AIVoiceoverTileData extends BaseTileData {
  category: 'action';
  label: 'AI Voiceover';
  icon: 'mic';
  config: {
    voice: string;
    speed: number;
    pitch: number;
    text?: string;
  };
}

export interface VideoTrimmerTileData extends BaseTileData {
  category: 'action';
  label: 'Video Trimmer';
  icon: 'scissors';
  config: {
    startTime: number;
    endTime: number;
    removeSilence: boolean;
    silenceThreshold: number;
  };
}

export interface VideoEffectsTileData extends BaseTileData {
  category: 'action';
  label: 'Video Effects';
  icon: 'effects';
  config: {
    brightness: number;
    contrast: number;
    saturation: number;
    blur: number;
    filters: string[];
  };
}

export interface AudioEffectsTileData extends BaseTileData {
  category: 'action';
  label: 'Audio Effects';
  icon: 'audio-effects';
  config: {
    volume: number;
    fadeIn: number;
    fadeOut: number;
    noiseReduction: boolean;
    normalize: boolean;
  };
}

export interface OverlayTileData extends BaseTileData {
  category: 'action';
  label: 'Overlay';
  icon: 'layers';
  config: {
    type: 'image' | 'text' | 'logo';
    position: { x: number; y: number };
    size: { width: number; height: number };
    opacity: number;
  };
}

export interface TextOverlayTileData extends BaseTileData {
  category: 'action';
  label: 'Text Overlay';
  icon: 'type';
  config: {
    text: string;
    font: string;
    size: number;
    color: string;
    backgroundColor: string;
    position: 'top' | 'center' | 'bottom';
    animation: 'none' | 'fade' | 'slide' | 'typewriter';
  };
}

// Output Tiles
export interface VideoOutputTileData extends BaseTileData {
  category: 'output';
  label: 'Video Output';
  icon: 'download';
  config: {
    format: 'mp4' | 'webm' | 'mov';
    resolution: '1080p' | '720p' | '4k';
    quality: 'high' | 'medium' | 'low';
    fps: number;
  };
}

export interface AudioOutputTileData extends BaseTileData {
  category: 'output';
  label: 'Audio Output';
  icon: 'audio-download';
  config: {
    format: 'mp3' | 'wav' | 'aac';
    quality: 'high' | 'medium' | 'low';
  };
}

export interface SubtitleOutputTileData extends BaseTileData {
  category: 'output';
  label: 'Subtitle Output';
  icon: 'file-text';
  config: {
    format: 'srt' | 'vtt' | 'ass';
    language: string;
  };
}

// Logic Tiles
export interface BranchTileData extends BaseTileData {
  category: 'logic';
  label: 'Branch';
  icon: 'git-branch';
  config: {
    condition: string;
    branches: number;
  };
}

export interface MergeTileData extends BaseTileData {
  category: 'logic';
  label: 'Merge';
  icon: 'git-merge';
  config: {
    mode: 'sequence' | 'parallel';
  };
}

// Union type for all tiles
export type TileData =
  | VideoInputTileData
  | ImageInputTileData
  | AudioInputTileData
  | TextInputTileData
  | AITranscriptionTileData
  | AISummaryTileData
  | AICaptionTileData
  | AIVoiceoverTileData
  | VideoTrimmerTileData
  | VideoEffectsTileData
  | AudioEffectsTileData
  | OverlayTileData
  | TextOverlayTileData
  | VideoOutputTileData
  | AudioOutputTileData
  | SubtitleOutputTileData
  | BranchTileData
  | MergeTileData;

// Node type for the canvas
export type TileNode = Node<TileData>;

// Edge type for connections
export type TileEdge = Edge;

// Workflow/Project type
export interface Workflow {
  id: string;
  name: string;
  description: string;
  nodes: TileNode[];
  edges: TileEdge[];
  createdAt: Date;
  updatedAt: Date;
}

// Execution result
export interface ExecutionResult {
  nodeId: string;
  status: 'success' | 'error';
  output?: unknown;
  error?: string;
  duration: number;
}

// Tile Port types for connections
export type PortType = 'video' | 'audio' | 'image' | 'text' | 'data' | 'any';

export interface TilePort {
  id: string;
  type: PortType;
  label: string;
  required?: boolean;
  description?: string;
}

// Tile Definition for registry
export interface TileDefinition {
  type: string;
  category: TileCategory;
  label: string;
  description: string;
  icon: string;
  defaultConfig: Record<string, unknown>;
  inputs: TilePort[];
  outputs: TilePort[];
  isConfigurable: boolean;
}
