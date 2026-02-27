'use client';

import { memo, useState, useEffect } from 'react';
import { Handle, Position, NodeResizer, type NodeProps } from '@xyflow/react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import type { TileData, TileNode as TileNodeType } from '@/lib/tile-types';
import { TILE_REGISTRY } from '@/lib/tile-registry';
import { useCanvasStore, type ExecutionStatus } from '@/lib/canvas-store';
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
  CheckCircle,
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
  Circle,
  RefreshCw,
  XCircle,
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
  'relative w-full h-full min-w-[200px] rounded-xl border border-border/50 bg-background/95 dark:bg-[#0a0a0a]/95 backdrop-blur-md shadow-xl transition-all duration-300 cursor-pointer group hover:shadow-2xl',
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

const statusColors: Record<ExecutionStatus, { border: string; bg: string; text: string; icon: React.ReactNode }> = {
  idle: { border: 'border-slate-200 dark:border-slate-800', bg: 'bg-white dark:bg-slate-900', text: 'text-slate-500', icon: <Circle className="h-4 w-4" /> },
  running: { border: 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]', bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-500', icon: <RefreshCw className="h-4 w-4 animate-spin" /> },
  completed: { border: 'border-green-500', bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-500', icon: <CheckCircle className="h-4 w-4" /> },
  cached: { border: 'border-green-500', bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-500', icon: <CheckCircle className="h-4 w-4" /> },
  error: { border: 'border-red-500', bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-500', icon: <XCircle className="h-4 w-4" /> },
};

type TileNodeProps = NodeProps<TileNodeType>;

// Preview renderer component
function PreviewRenderer({ tileType, data, nodeId }: { tileType: string; data: any; nodeId: string }) {
  const { executionResults } = useCanvasStore();
  const result = executionResults[nodeId] as any;

  // Handler for downloading JSON metadata
  const handleDownloadJson = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const blob = new Blob([outputText || ''], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `openmosaic-data-${nodeId.substring(0, 6)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download JSON:", err);
    }
  };

  let outputUrl = '';
  let outputText = '';

  // 1. Try to pull actual generated media or text from execution results
  if (result && result.outputs) {
    const o = result.outputs;
    if (o.video?.url || o.video?.path) outputUrl = o.video.url || o.video.path;
    else if (o.image?.url || o.image?.path) outputUrl = o.image.url || o.image.path;
    else if (o.audio?.url || o.audio?.path) outputUrl = o.audio.url || o.audio.path;

    if (o.text !== undefined) {
      if (typeof o.text === 'object' && o.text !== null && 'data' in o.text) {
        outputText = typeof o.text.data === 'string' ? o.text.data : JSON.stringify(o.text.data, null, 2);
      } else if (typeof o.text === 'string') {
        outputText = o.text;
      } else {
        outputText = JSON.stringify(o.text, null, 2);
      }
    }

    if (o.json !== undefined) {
      if (typeof o.json === 'object' && o.json !== null && 'data' in o.json) {
        outputText = typeof o.json.data === 'string' ? o.json.data : JSON.stringify(o.json.data, null, 2);
      } else if (typeof o.json === 'string') {
        try {
          outputText = JSON.stringify(JSON.parse(o.json), null, 2);
        } catch (e) {
          outputText = o.json;
        }
      } else {
        outputText = JSON.stringify(o.json, null, 2);
      }
    }
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
      <div className="mt-2 rounded overflow-hidden bg-black flex-1 min-h-0">
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
      <div className="mt-2 rounded overflow-hidden bg-muted flex-1 min-h-0">
        {outputUrl ? (
          <img
            src={outputUrl}
            alt="Preview"
            className="w-full h-full object-contain"
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
      <div className="mt-2 flex-1 min-h-0 rounded bg-muted p-2 overflow-auto">
        <pre className="text-[10px] text-muted-foreground whitespace-pre-wrap font-mono h-full">
          {outputText || data.config?.content || 'No text output'}
        </pre>
      </div>
    );
  }

  // JSON Preview
  if (tileType === 'json-preview') {
    return (
      <div className="mt-2 flex-1 min-h-0 rounded bg-black/90 p-3 overflow-auto max-w-full w-full h-full relative group/json">
        <code className="text-[11px] text-green-400 whitespace-pre font-mono block min-w-max h-full">
          {outputText || data.config?.content || 'No JSON output'}
        </code>
        {outputText && (
          <Button
            size="icon"
            variant="secondary"
            className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover/json:opacity-100 transition-opacity bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-none"
            onClick={handleDownloadJson}
            title="Download JSON"
          >
            <Download className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  }

  return null;
}

function TileNodeComponent(props: TileNodeProps) {
  const { selected, id } = props;
  const data: any = props.data;
  const [showInfo, setShowInfo] = useState(false);
  const { nodeExecutionProgress } = useCanvasStore();
  const progress = nodeExecutionProgress?.[id];
  const isCached = progress?.status === 'cached';
  const isCompleted = progress?.status === 'completed';

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
      case 'cached': // Added cached status indicator
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
      <NodeResizer
        minWidth={250}
        minHeight={150}
        isVisible={selected}
        lineClassName="!border-transparent"
        handleClassName="h-3 w-3 bg-primary rounded-sm border-0 pointer-events-auto"
      />
      {/* Input Handles */}
      {definition?.inputs?.map((input, index) => renderInputHandle(input, index))}

      {/* Node Content */}
      <div className="p-3 w-full h-full flex flex-col">
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
