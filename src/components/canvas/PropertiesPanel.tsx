'use client';

import { useState, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useCanvasStore } from '@/lib/canvas-store';
import { TILE_REGISTRY } from '@/lib/tile-registry';
import { cn } from '@/lib/utils';
import {
  X,
  Play,
  Settings,
  Trash2,
  Copy,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Info,
} from 'lucide-react';

interface PropertiesPanelProps {
  className?: string;
}

export function PropertiesPanel({ className }: PropertiesPanelProps) {
  const { nodes, selectedNodeId, updateNode, deleteNode, executeNode, isExecuting } =
    useCanvasStore();

  // State to hold dynamically fetched dropdown options (e.g. cloned voices)
  const [dynamicOptions, setDynamicOptions] = useState<Record<string, { label: string, value: string }[]>>({});

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  const definition = selectedNode
    ? (TILE_REGISTRY[(selectedNode.data.tileType as string)] || TILE_REGISTRY[selectedNode.data.label.toLowerCase().replace(/\s+/g, '-')])
    : undefined;

  const config = selectedNode?.data?.config;

  // Fetch dynamic options on mount or node select
  useEffect(() => {
    if (!definition?.configOptions) return;

    definition.configOptions.forEach(async (opt) => {
      if (opt.options_endpoint && !dynamicOptions[opt.id]) {
        try {
          const res = await fetch(opt.options_endpoint);
          const data = await res.json();
          if (data.success && data.voices) {
            // Specific parsing for the proxy we just built
            const allOptions = [
              ...data.voices.cloned.map((v: any) => ({ ...v, label: `(Clone) ${v.label}` })),
              ...data.voices.system.map((v: any) => ({ ...v, label: `(System) ${v.label}` }))
            ];

            setDynamicOptions(prev => ({
              ...prev,
              [opt.id]: allOptions
            }));
          }
        } catch (e) {
          console.error(`Failed to fetch options for ${opt.id}:`, e);
        }
      }
    });
  }, [selectedNodeId, definition]);

  if (!selectedNode || !config || !definition) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center h-full p-6 text-center',
          className
        )}
      >
        <Settings className="h-12 w-12 text-muted-foreground/30 mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground">No Tile Selected</h3>
        <p className="text-sm text-muted-foreground/70 mt-2">
          Click on a tile in the canvas to view and edit its properties
        </p>
      </div>
    );
  }

  // Handle config change
  const handleConfigChange = (key: string, value: unknown) => {
    updateNode(selectedNodeId!, {
      config: { ...config, [key]: value } as any,
    });
  };

  // Render config field based on type
  const renderConfigField = (key: string, value: unknown, explicitConfig?: any) => {
    // 1. Check if the Tile definition has explicitly defined UI for this config key
    if (!explicitConfig) {
      explicitConfig = definition?.configOptions?.find((opt) => opt.id === key);
    }

    if (explicitConfig) {
      // Evaluate conditional visibility
      if (explicitConfig.showIf) {
        if (config[explicitConfig.showIf.field] !== explicitConfig.showIf.value) {
          return null; // Hide field
        }
      }

      // Reusable label with tooltip helper
      const LabelWithTooltip = () => (
        <div className="flex items-center gap-2 mb-2">
          <Label className="text-sm">{explicitConfig.label}</Label>
          {explicitConfig.description && (
            <div title={explicitConfig.description}>
              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
            </div>
          )}
        </div>
      );

      const isSelect = explicitConfig.type === 'select';
      const hasOptions = explicitConfig.options || dynamicOptions[explicitConfig.id];

      if (isSelect && hasOptions) {
        const selectOptions = explicitConfig.options || dynamicOptions[explicitConfig.id] || [];

        return (
          <div key={key} className="space-y-2">
            <LabelWithTooltip />
            <Select
              value={String(value)}
              onValueChange={(v) => handleConfigChange(key, v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {selectOptions.map((opt: any) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      }

      if (key === 'fileName' && (config as any).source === 'youtube') return null;
      if (key === 'youtubeUrl' && (config as any).source === 'upload') return null;

      if (explicitConfig.type === 'text') {
        return (
          <div key={key} className="space-y-2">
            <LabelWithTooltip />
            <Input
              value={String(value || '')}
              onChange={(e) => handleConfigChange(key, e.target.value)}
              placeholder={`Enter ${explicitConfig.label.toLowerCase()}...`}
            />
          </div>
        );
      }

      if (explicitConfig.type === 'file-upload') {
        const hasFile = typeof value === 'string' && value.length > 0;
        return (
          <div key={key} className="space-y-2">
            <LabelWithTooltip />

            {hasFile && (
              <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/30">
                <span className="text-sm font-medium truncate flex-1" title={value as string}>
                  {value}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => handleConfigChange(key, '')}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            <div className="flex gap-2 items-center">
              <Input
                type="file"
                className="cursor-pointer text-sm file:text-sm"
                accept={(explicitConfig as any).accept || '*/*'}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;

                  const formData = new FormData();
                  formData.append('file', file);

                  try {
                    const res = await fetch('/api/upload', {
                      method: 'POST',
                      body: formData
                    });
                    const data = await res.json();
                    if (data.success) {
                      const uploadedFilename = data.file?.filename || data.filename;
                      handleConfigChange(key, uploadedFilename);
                    } else {
                      alert('Upload failed: ' + (data.error || 'Unknown error'));
                    }
                  } catch (err) {
                    console.error('Upload error', err);
                    alert('Upload failed. See console.');
                  }
                }}
              />
            </div>
            {hasFile && (
              <p className="text-xs text-muted-foreground mt-1">
                Selecting a new file will replace the current one.
              </p>
            )}
          </div>
        );
      }

      if (explicitConfig.type === 'slider') {
        const numericValue = typeof value === 'number' ? value : explicitConfig.min ?? 0;
        return (
          <div key={key} className="space-y-4">
            <div className="flex items-center justify-between">
              <LabelWithTooltip />
              <span className="text-sm font-medium text-muted-foreground">{numericValue}</span>
            </div>
            <Slider
              value={[numericValue]}
              min={explicitConfig.min ?? 0}
              max={explicitConfig.max ?? 100}
              step={explicitConfig.step ?? 1}
              onValueChange={([v]) => handleConfigChange(key, v)}
            />
          </div>
        );
      }
    }

    // 2. Fallback to generic inference based on value type
    const fieldType = typeof value;

    // Boolean field
    if (fieldType === 'boolean') {
      return (
        <div key={key} className="flex items-center justify-between">
          <Label htmlFor={key} className="text-sm capitalize">
            {key.replace(/([A-Z])/g, ' $1').trim()}
          </Label>
          <Switch
            id={key}
            checked={value as boolean}
            onCheckedChange={(checked) => handleConfigChange(key, checked)}
          />
        </div>
      );
    }

    // Number field (slider for certain values)
    if (fieldType === 'number') {
      const numericValue = value as number;
      const isPercentage = key.toLowerCase().includes('volume') ||
        key.toLowerCase().includes('brightness') ||
        key.toLowerCase().includes('contrast') ||
        key.toLowerCase().includes('saturation') ||
        key.toLowerCase().includes('opacity') ||
        key.toLowerCase().includes('speed') ||
        key.toLowerCase().includes('pitch');

      const isTime = key.toLowerCase().includes('time') ||
        key.toLowerCase().includes('duration');

      if (isPercentage) {
        return (
          <div key={key} className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm capitalize">
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </Label>
              <span className="text-xs text-muted-foreground">{numericValue}%</span>
            </div>
            <Slider
              value={[numericValue]}
              min={0}
              max={200}
              step={1}
              onValueChange={([v]) => handleConfigChange(key, v)}
            />
          </div>
        );
      }

      if (isTime) {
        return (
          <div key={key} className="space-y-2">
            <Label className="text-sm capitalize">
              {key.replace(/([A-Z])/g, ' $1').trim()} (seconds)
            </Label>
            <Input
              type="number"
              value={numericValue}
              onChange={(e) => handleConfigChange(key, parseFloat(e.target.value) || 0)}
              step={0.1}
              min={0}
            />
          </div>
        );
      }

      return (
        <div key={key} className="space-y-2">
          <Label className="text-sm capitalize">
            {key.replace(/([A-Z])/g, ' $1').trim()}
          </Label>
          <Input
            type="number"
            value={numericValue}
            onChange={(e) => handleConfigChange(key, parseFloat(e.target.value) || 0)}
          />
        </div>
      );
    }

    // Select fields (model, format, etc.)
    if (key === 'model') {
      return (
        <div key={key} className="space-y-2">
          <Label className="text-sm capitalize">Model</Label>
          <Select
            value={String(value)}
            onValueChange={(v) => handleConfigChange(key, v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="whisper-1">Whisper (OpenAI)</SelectItem>
              <SelectItem value="gemini-pro">Gemini Pro</SelectItem>
              <SelectItem value="gpt-4">GPT-4</SelectItem>
              <SelectItem value="claude-3">Claude 3</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    }

    if (key === 'format') {
      const formatValue = (config as any).format;
      const formats = formatValue === 'srt' || formatValue === 'vtt' || formatValue === 'ass'
        ? ['srt', 'vtt', 'ass']
        : ['mp4', 'webm', 'mov'];

      return (
        <div key={key} className="space-y-2">
          <Label className="text-sm capitalize">Format</Label>
          <Select
            value={String(value)}
            onValueChange={(v) => handleConfigChange(key, v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {formats.map((f) => (
                <SelectItem key={f} value={f}>
                  {f.toUpperCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    if (key === 'resolution') {
      return (
        <div key={key} className="space-y-2">
          <Label className="text-sm capitalize">Resolution</Label>
          <Select
            value={String(value)}
            onValueChange={(v) => handleConfigChange(key, v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="4k">4K (3840x2160)</SelectItem>
              <SelectItem value="1080p">1080p (1920x1080)</SelectItem>
              <SelectItem value="720p">720p (1280x720)</SelectItem>
              <SelectItem value="480p">480p (854x480)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    }

    if (key === 'style') {
      return (
        <div key={key} className="space-y-2">
          <Label className="text-sm capitalize">Style</Label>
          <Select
            value={String(value)}
            onValueChange={(v) => handleConfigChange(key, v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bullet">Bullet Points</SelectItem>
              <SelectItem value="paragraph">Paragraph</SelectItem>
              <SelectItem value="chapter">Chapter</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    }

    // Text field
    if (key === 'content' || key === 'text') {
      return (
        <div key={key} className="space-y-2">
          <Label className="text-sm capitalize">
            {key.replace(/([A-Z])/g, ' $1').trim()}
          </Label>
          <Textarea
            value={String(value || '')}
            onChange={(e) => handleConfigChange(key, e.target.value)}
            rows={4}
            placeholder="Enter text..."
          />
        </div>
      );
    }

    // String fields
    if (fieldType === 'string' && value !== undefined && value !== null) {
      return (
        <div key={key} className="space-y-2">
          <Label className="text-sm capitalize">
            {key.replace(/([A-Z])/g, ' $1').trim()}
          </Label>
          <Input
            value={String(value)}
            onChange={(e) => handleConfigChange(key, e.target.value)}
          />
        </div>
      );
    }

    return null;
  };

  // Status icon
  const renderStatusIcon = () => {
    switch (selectedNode.data.status) {
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

  return (
    <div className={cn('flex flex-col h-full overflow-hidden', className)}>
      {/* Header */}
      <div className="p-4 border-b border-border/50 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">{selectedNode.data.label}</h2>
            {renderStatusIcon()}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => deleteNode(selectedNodeId!)}
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">{selectedNode.data.description}</p>
      </div>

      {/* Configuration */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 space-y-4">
          <div className="space-y-4">
            {definition?.configOptions?.map((opt) => renderConfigField(opt.id, config[opt.id] ?? definition.defaultConfig[opt.id] ?? '', opt))}
            {Object.entries(config)
              .filter(([key]) => !definition?.configOptions?.find((opt) => opt.id === key))
              .map(([key, value]) =>
                value !== undefined && value !== null ? renderConfigField(key, value) : null
              )}
          </div>
        </div>
      </ScrollArea>

      {/* Actions */}
      <div className="p-4 border-t border-border/50 space-y-2">
        <Button
          className="w-full"
          onClick={() => executeNode(selectedNodeId!)}
          disabled={isExecuting || selectedNode.data.status === 'processing'}
        >
          {selectedNode.data.status === 'processing' ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Run Tile
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
