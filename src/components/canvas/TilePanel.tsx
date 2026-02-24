'use client';

import { useState } from 'react';
import { DragEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { TILE_REGISTRY, getTilesByCategory } from '@/lib/tile-registry';
import type { TileDefinition } from '@/lib/tile-types';
import {
  Video,
  Image,
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
  Search,
  VolumeX,
  Captions,
  Plus,
  User,
  Film,
  Music2,
  Zap,
  Maximize,
  Square,
  Stamp,
  Palette,
  Volume2,
  Mic2,
  Upload,
  Youtube,
  Play,
} from 'lucide-react';

// Extended icon mapping
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Video,
  Image,
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
  Zap,
  Maximize,
  Square,
  Stamp,
  Palette,
  Volume2,
  Mic2,
  Upload,
  Youtube,
  Play,
};

// Category colors
const CATEGORY_STYLES = {
  input: {
    bg: 'bg-blue-500/10 hover:bg-blue-500/20',
    border: 'border-blue-500/30',
    icon: 'text-blue-400',
    text: 'text-blue-300',
  },
  action: {
    bg: 'bg-purple-500/10 hover:bg-purple-500/20',
    border: 'border-purple-500/30',
    icon: 'text-purple-400',
    text: 'text-purple-300',
  },
  output: {
    bg: 'bg-green-500/10 hover:bg-green-500/20',
    border: 'border-green-500/30',
    icon: 'text-green-400',
    text: 'text-green-300',
  },
  logic: {
    bg: 'bg-orange-500/10 hover:bg-orange-500/20',
    border: 'border-orange-500/30',
    icon: 'text-orange-400',
    text: 'text-orange-300',
  },
};

interface TilePanelProps {
  className?: string;
}

export function TilePanel({ className }: TilePanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('input');

  const onDragStart = (event: DragEvent<HTMLDivElement>, tileType: string) => {
    event.dataTransfer.setData('application/reactflow', tileType);
    event.dataTransfer.effectAllowed = 'move';
  };

  // Filter tiles based on search
  const filterTiles = (tiles: TileDefinition[]) => {
    if (!searchQuery) return tiles;
    return tiles.filter(
      (tile) =>
        tile.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tile.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  // Render tile item
  const renderTileItem = (tileType: string, tile: TileDefinition) => {
    const IconComponent = ICON_MAP[tile.icon] || Sparkles;
    const style = CATEGORY_STYLES[tile.category];

    return (
      <div
        key={tileType}
        draggable
        onDragStart={(e) => onDragStart(e, tileType)}
        className={cn(
          'flex items-center gap-3 p-3 rounded-lg border cursor-grab active:cursor-grabbing transition-all',
          style.bg,
          style.border
        )}
      >
        <div className={cn('p-2 rounded-md bg-background/50', style.icon)}>
          <IconComponent className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-foreground truncate">
            {tile.label}
          </h4>
          <p className="text-[10px] text-muted-foreground truncate">
            {tile.description}
          </p>
        </div>
      </div>
    );
  };

  const inputTiles = filterTiles(getTilesByCategory('input'));
  const actionTiles = filterTiles(getTilesByCategory('action'));
  const outputTiles = filterTiles(getTilesByCategory('output'));
  const logicTiles = filterTiles(getTilesByCategory('logic'));

  // Get current tab tiles
  const getCurrentTiles = () => {
    switch (activeTab) {
      case 'input': return inputTiles;
      case 'action': return actionTiles;
      case 'output': return outputTiles;
      case 'logic': return logicTiles;
      default: return inputTiles;
    }
  };

  const currentTiles = getCurrentTiles();

  return (
    <div className={cn('flex flex-col h-full bg-background/50 overflow-hidden', className)}>
      {/* Header - Fixed */}
      <div className="flex-shrink-0 p-4 border-b border-border/50">
        <h2 className="text-lg font-semibold text-foreground mb-3">Tiles</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tiles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-background/50"
          />
        </div>
      </div>

      {/* Tabs - Fixed */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="flex-shrink-0 grid grid-cols-4 m-2">
          <TabsTrigger value="input" className="text-xs">
            Input
          </TabsTrigger>
          <TabsTrigger value="action" className="text-xs">
            Action
          </TabsTrigger>
          <TabsTrigger value="output" className="text-xs">
            Output
          </TabsTrigger>
          <TabsTrigger value="logic" className="text-xs">
            Logic
          </TabsTrigger>
        </TabsList>

        {/* Scrollable Content - Use native scroll for better UX */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="p-2 space-y-2">
            {currentTiles.map((tile) => renderTileItem(tile.type, tile))}
          </div>
        </div>
      </Tabs>

      {/* Footer hint - Fixed */}
      <div className="flex-shrink-0 p-3 border-t border-border/50">
        <p className="text-[10px] text-muted-foreground text-center">
          Drag tiles to canvas to build your workflow
        </p>
      </div>
    </div>
  );
}
