'use client';

import { memo, useState, useEffect } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import type { TileData, TileNode as TileNodeType } from '@/lib/tile-types';
import { TILE_REGISTRY } from '@/lib/tile-registry';
import { useCanvasStore } from '@/lib/canvas-store';
import {
  Video,
  Image as ImageIcon,
  Music,
  Type,
  FileText,
  Sparkles,
  Mic,
  Scissors,
  Wand2,
  Sliders,
  Layers,
  Download,
  GitBranch,
  GitMerge,
  Play,
  Loader2,
  CheckCircle2,
  AlertCircle,
  VolumeX,
  Captions,
  Plus,
  Info,
  User,
  Film,
  Music2,
  Smile,
  Zap,
  Maximize,
  Square,
  Stamp,
  Palette,
  FlipHorizontal,
  Volume2,
  Mic2,
  Upload,
  Youtube,
  Cpu,
  Code,
  Gauge,
  Rewind,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// Extended icon mapping
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Video,
  Image: ImageIcon,
  Music,
  Type,
  FileText,
  Sparkles,
  Mic,
  Scissors,
  Wand2,
  Sliders,
  Layers,
  Download,
  GitBranch,
  GitMerge,
  VolumeX,
  Captions,
  Plus,
  User,
  Film,
  Music2,
  Smile,
  Zap,
  Maximize,
  Square,
  Stamp,
  Palette,
  FlipHorizontal,
  Volume2,
  Mic2,
  Upload,
  Youtube,
  Cpu,
  Code,
  Gauge,
  Rewind,
  Play,
};

// Tile node style variants
const tileVariants = cva(
  'relative min-w-[200px] max-w-[280px] rounded-xl border border-border/50 bg-background/95 dark:bg-[#0a0a0a]/95 backdrop-blur-md shadow-xl transition-all duration-300 cursor-pointer group hover:shadow-2xl',
  {
    variants: {
      category: {
        input: 'border-blue-500/30 hover:border-blue-500/80 hover:shadow-[0_0_20px_rgba(59,130,246,0.2)]',
        action: 'border-purple-500/30 hover:border-purple-500/80 hover:shadow-[0_0_20px_rgba(168,85,247,0.2)]',
        output: 'border-green-500/30 hover:border-green-500/80 hover:shadow-[0_0_20px_rgba(34,197,94,0.2)]',
        logic: 'border-orange-500/30 hover:border-orange-500/80 hover:shadow-[0_0_20px_rgba(249,115,22,0.2)]',
      },
      status: {
        idle: 'opacity-100',
        processing: 'animate-pulse border-yellow-500',
        completed: 'border-green-500',
        error: 'border-red-500',
      },
      selected: {
        true: 'ring-2 ring-primary ring-offset-2 ring-offset-background',
        false: '',
      },
    },
    defaultVariants: {
      status: 'idle',
      selected: false,
    },
  }
);

// Type colors for handles
const TYPE_COLORS: Record<string, { bg: string; border: string; label: string }> = {
  video: { bg: 'bg-blue-500', border: 'border-blue-400', label: 'Video' },
  audio: { bg: 'bg-green-500', border: 'border-green-400', label: 'Audio' },
  image: { bg: 'bg-pink-500', border: 'border-pink-400', label: 'Image' },
  text: { bg: 'bg-yellow-500', border: 'border-yellow-400', label: 'Text' },
  any: { bg: 'bg-gray-500', border: 'border-gray-400', label: 'Any' },
};

type TileNodeProps = NodeProps<TileNodeType>;

// Preview renderer component
function PreviewRenderer({ tileType, data, nodeId }: { tileType: string; data: any; nodeId: string }) {
  const { executionResults } = useCanvasStore();
  const result = executionResults[nodeId] as any;

  let outputUrl = '';
  let outputText = '';

  // 1. Try to pull actual generated media or text from execution results
  if (result && result.outputs) {
    const o = result.outputs;
    if (o.video?.url || o.video?.path) outputUrl = o.video.url || o.video.path;
    else if (o.image?.url || o.image?.path) outputUrl = o.image.url || o.image.path;
    else if (o.audio?.url || o.audio?.path) outputUrl = o.audio.url || o.audio.path;

    if (o.text?.data) outputText = o.text.data;
  }

  // 2. Fallback to statically configured data if no execution result exists yet
  if (!outputUrl) {
    outputUrl = data.config?.outputUrl || data.config?.videoUrl || data.config?.imageUrl || data.config?.audioUrl;
  }
  if (!outputText) {
    outputText = data.config?.outputText || data.config?.transcript || data.config?.content;
  }

  // Video Preview
  if (tileType === 'video-preview' || (tileType === 'video-output' && outputUrl)) {
    return (
      <div className="mt-2 rounded overflow-hidden bg-black aspect-video">
        {outputUrl ? (
          <video
            src={outputUrl}
            controls
            className="w-full h-full object-contain"
            muted
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <Play className="h-8 w-8 opacity-50" />
          </div>
        )}
      </div>
    );
  }

  // Image Preview
  if (tileType === 'image-preview' || (tileType === 'thumbnail' && outputUrl)) {
    return (
      <div className="mt-2 rounded overflow-hidden bg-muted">
        {outputUrl ? (
          <img
            src={outputUrl}
            alt="Preview"
            className="w-full object-contain max-h-40"
          />
        ) : (
          <div className="flex items-center justify-center h-24 text-muted-foreground">
            <ImageIcon className="h-8 w-8 opacity-50" />
          </div>
        )}
      </div>
    );
  }

  // Audio Preview
  if (tileType === 'audio-preview') {
    return (
      <div className="mt-2 rounded bg-muted p-2">
        {outputUrl ? (
          <audio src={outputUrl} controls className="w-full h-8" />
        ) : (
          <div className="flex items-center justify-center h-8 text-muted-foreground">
            <Music className="h-4 w-4 opacity-50" />
          </div>
        )}
      </div>
    );
  }

  // Text Preview
  if (tileType === 'text-preview' || tileType === 'transcribe') {
    return (
      <div className="mt-2 rounded bg-muted p-2 max-h-32 overflow-y-auto">
        <pre className="text-[10px] text-muted-foreground whitespace-pre-wrap font-mono">
          {outputText || data.config?.content || 'No text output'}
        </pre>
      </div>
    );
  }

  return null;
}

function TileNodeComponent(props: TileNodeProps) {
  const { selected, id } = props;
  const data: any = props.data;
  const [showInfo, setShowInfo] = useState(false);

  // Get the tile definition from registry
  const tileType = data.tileType || data.label.toLowerCase().replace(/\s+/g, '-');
  const definition = TILE_REGISTRY[tileType];
  const IconComponent = ICON_MAP[data.icon] || ICON_MAP[tileType.split('-')[0]] || Sparkles;

  // Status indicator
  const renderStatusIndicator = () => {
    switch (data.status) {
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  // Category badge colors
  const categoryColors = {
    input: 'bg-blue-500/20 text-blue-400',
    action: 'bg-purple-500/20 text-purple-400',
    output: 'bg-green-500/20 text-green-400',
    logic: 'bg-orange-500/20 text-orange-400',
  };

  // Render input handle with tooltip
  const renderInputHandle = (input: { id: string; type: string; label: string; required?: boolean }, index: number) => {
    const typeColor = TYPE_COLORS[input.type] || TYPE_COLORS.any;
    const topPercent = ((index + 1) / ((definition?.inputs?.length || 1) + 1)) * 100;

    return (
      <TooltipProvider key={`input-${input.id}`}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Handle
              type="target"
              position={Position.Left}
              id={input.id}
              className={cn(
                'w-3.5 h-3.5 border-2 transition-all hover:scale-125',
                typeColor.bg,
                typeColor.border,
                '!left-[-8px]'
              )}
              style={{ top: `${topPercent}%` }}
            />
          </TooltipTrigger>
          <TooltipContent side="left" className="text-xs">
            <div className="flex items-center gap-2">
              <span className={cn('w-2 h-2 rounded-full', typeColor.bg)} />
              <span className="font-medium">{input.label}</span>
              <span className="text-muted-foreground">({typeColor.label})</span>
              {input.required && <Badge variant="destructive" className="text-[8px] h-4">Required</Badge>}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  // Render output handle with tooltip
  const renderOutputHandle = (output: { id: string; type: string; label: string }, index: number) => {
    const typeColor = TYPE_COLORS[output.type] || TYPE_COLORS.any;
    const topPercent = ((index + 1) / ((definition?.outputs?.length || 1) + 1)) * 100;

    return (
      <TooltipProvider key={`output-${output.id}`}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Handle
              type="source"
              position={Position.Right}
              id={output.id}
              className={cn(
                'w-3.5 h-3.5 border-2 transition-all hover:scale-125',
                typeColor.bg,
                typeColor.border,
                '!right-[-8px]'
              )}
              style={{ top: `${topPercent}%` }}
            />
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs">
            <div className="flex items-center gap-2">
              <span className={cn('w-2 h-2 rounded-full', typeColor.bg)} />
              <span className="font-medium">{output.label}</span>
              <span className="text-muted-foreground">({typeColor.label})</span>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <div className={cn(tileVariants({ category: data.category, status: data.status, selected }))}>
      {/* Input Handles */}
      {definition?.inputs?.map((input, index) => renderInputHandle(input, index))}

      {/* Node Content */}
      <div className="p-3">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <div
            className={cn(
              'p-1.5 rounded-md',
              categoryColors[data.category]
            )}
          >
            <IconComponent className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-foreground truncate">
              {data.label}
            </h3>
            <p className="text-[10px] text-muted-foreground truncate">
              {data.description?.slice(0, 30) || definition?.description?.slice(0, 30)}...
            </p>
          </div>
          {renderStatusIndicator()}

          {/* Info Button */}
          <Popover open={showInfo} onOpenChange={setShowInfo}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowInfo(true);
                }}
              >
                <Info className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-3" align="end">
              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold text-sm">{definition?.label || data.label}</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {definition?.description || data.description}
                  </p>
                </div>

                {/* Inputs */}
                {definition?.inputs && definition.inputs.length > 0 && (
                  <div>
                    <h5 className="text-xs font-medium text-muted-foreground mb-1">Inputs:</h5>
                    <div className="space-y-1">
                      {definition.inputs.map((input) => (
                        <div key={input.id} className="flex items-center gap-2 text-xs">
                          <span className={cn('w-2 h-2 rounded-full', TYPE_COLORS[input.type]?.bg || 'bg-gray-500')} />
                          <span>{input.label}</span>
                          <span className="text-muted-foreground">({TYPE_COLORS[input.type]?.label || 'Any'})</span>
                          {input.required && <Badge variant="outline" className="text-[8px] h-3 px-1">Required</Badge>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Outputs */}
                {definition?.outputs && definition.outputs.length > 0 && (
                  <div>
                    <h5 className="text-xs font-medium text-muted-foreground mb-1">Outputs:</h5>
                    <div className="space-y-1">
                      {definition.outputs.map((output) => (
                        <div key={output.id} className="flex items-center gap-2 text-xs">
                          <span className={cn('w-2 h-2 rounded-full', TYPE_COLORS[output.type]?.bg || 'bg-gray-500')} />
                          <span>{output.label}</span>
                          <span className="text-muted-foreground">({TYPE_COLORS[output.type]?.label || 'Any'})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Connection Tips */}
                <div className="pt-2 border-t border-border">
                  <p className="text-[10px] text-muted-foreground">
                    💡 Drag from an output handle to an input handle with matching type to connect.
                  </p>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Category Badge */}
        <div className="flex items-center justify-between">
          <span
            className={cn(
              'text-[10px] px-2 py-0.5 rounded-full font-medium',
              categoryColors[data.category]
            )}
          >
            {data.category}
          </span>
          <div className="flex items-center gap-1">
            {/* Input/Output indicators */}
            {definition?.inputs && definition.inputs.length > 0 && (
              <Badge variant="outline" className="text-[8px] h-4 px-1">
                {definition.inputs.length} in
              </Badge>
            )}
            {definition?.outputs && definition.outputs.length > 0 && (
              <Badge variant="outline" className="text-[8px] h-4 px-1">
                {definition.outputs.length} out
              </Badge>
            )}
          </div>
        </div>

        {/* Preview for output tiles */}
        <PreviewRenderer tileType={tileType} data={data} nodeId={id} />
      </div>

      {/* Output Handles */}
      {definition?.outputs?.map((output, index) => renderOutputHandle(output, index))}
    </div>
  );
}

export const TileNode = memo(TileNodeComponent);
