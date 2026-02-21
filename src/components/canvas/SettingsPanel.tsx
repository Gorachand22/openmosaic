'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import {
  Settings,
  Sun,
  Moon,
  Monitor,
  CurvedConnector,
  Route,
  Grid3X3,
  Sparkles,
  Circle,
} from 'lucide-react';

export type ThemeMode = 'light' | 'dark' | 'system';
export type EdgeStyle = 'bezier' | 'smoothstep' | 'straight';

interface SettingsPanelProps {
  theme?: ThemeMode;
  onThemeChange?: (theme: ThemeMode) => void;
  edgeStyle?: EdgeStyle;
  onEdgeStyleChange?: (style: EdgeStyle) => void;
  snapToGrid?: boolean;
  onSnapToGridChange?: (snap: boolean) => void;
  showMinimap?: boolean;
  onShowMinimapChange?: (show: boolean) => void;
}

export function SettingsPanel({
  theme = 'dark',
  onThemeChange,
  edgeStyle = 'bezier',
  onEdgeStyleChange,
  snapToGrid = true,
  onSnapToGridChange,
  showMinimap = true,
  onShowMinimapChange,
}: SettingsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  const themeOptions: { value: ThemeMode; icon: React.ReactNode; label: string }[] = [
    { value: 'light', icon: <Sun className="h-4 w-4" />, label: 'Light' },
    { value: 'dark', icon: <Moon className="h-4 w-4" />, label: 'Dark' },
    { value: 'system', icon: <Monitor className="h-4 w-4" />, label: 'System' },
  ];

  const edgeOptions: { value: EdgeStyle; icon: React.ReactNode; label: string; description: string }[] = [
    { 
      value: 'bezier', 
      icon: <Circle className="h-4 w-4" />, 
      label: 'Smooth Curve',
      description: 'Beautiful curved connections'
    },
    { 
      value: 'smoothstep', 
      icon: <Route className="h-4 w-4" />, 
      label: 'Step',
      description: 'Right-angle connections'
    },
    { 
      value: 'straight', 
      icon: <Grid3X3 className="h-4 w-4" />, 
      label: 'Straight',
      description: 'Direct line connections'
    },
  ];

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="fixed bottom-4 left-4 z-40 h-10 w-10 rounded-full shadow-lg bg-background/90 border-border"
          title="Settings"
        >
          <Settings className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="start" side="top">
        <div className="space-y-6">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <Settings className="h-4 w-4" />
            <h3 className="font-semibold">Canvas Settings</h3>
          </div>

          {/* Theme */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Theme</Label>
            <div className="flex gap-2">
              {themeOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={theme === option.value ? 'default' : 'outline'}
                  size="sm"
                  className={cn(
                    'flex-1 flex flex-col items-center gap-1 h-auto py-2',
                    theme === option.value && 'bg-gradient-to-r from-blue-500 to-purple-500'
                  )}
                  onClick={() => onThemeChange?.(option.value)}
                >
                  {option.icon}
                  <span className="text-[10px]">{option.label}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Edge Style */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Connection Style</Label>
            <div className="space-y-2">
              {edgeOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={edgeStyle === option.value ? 'default' : 'ghost'}
                  className={cn(
                    'w-full justify-start h-auto py-2',
                    edgeStyle === option.value && 'bg-gradient-to-r from-blue-500 to-purple-500'
                  )}
                  onClick={() => onEdgeStyleChange?.(option.value)}
                >
                  <div className="flex items-center gap-3">
                    {option.icon}
                    <div className="text-left">
                      <div className="text-sm">{option.label}</div>
                      <div className={cn(
                        'text-[10px]',
                        edgeStyle === option.value ? 'text-white/70' : 'text-muted-foreground'
                      )}>
                        {option.description}
                      </div>
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </div>

          {/* Grid Options */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Grid & Display</Label>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm">Snap to Grid</p>
                  <p className="text-[10px] text-muted-foreground">Align nodes to grid</p>
                </div>
                <Switch
                  checked={snapToGrid}
                  onCheckedChange={onSnapToGridChange}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm">Show Minimap</p>
                  <p className="text-[10px] text-muted-foreground">Canvas overview</p>
                </div>
                <Switch
                  checked={showMinimap}
                  onCheckedChange={onShowMinimapChange}
                />
              </div>
            </div>
          </div>

          {/* Keyboard Shortcuts */}
          <div className="pt-2 border-t border-border">
            <p className="text-xs font-medium text-muted-foreground mb-2">Keyboard Shortcuts</p>
            <div className="grid grid-cols-2 gap-1 text-[10px] text-muted-foreground">
              <div>Delete - Remove selected</div>
              <div>Ctrl+Z - Undo</div>
              <div>Ctrl+Y - Redo</div>
              <div>Ctrl+A - Select all</div>
              <div>Ctrl+Drag - Box select</div>
              <div>Scroll - Zoom</div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
