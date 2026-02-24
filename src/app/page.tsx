'use client';

import { useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCanvasStore } from '@/lib/canvas-store';
import { useWorkspaceStore } from '@/lib/workspace-store';
import { TilePanel } from '@/components/canvas/TilePanel';
import { PropertiesPanel } from '@/components/canvas/PropertiesPanel';
import { FloatingChatbot } from '@/components/canvas/FloatingChatbot';
import { SettingsPanel } from '@/components/canvas/SettingsPanel';
import { WorkspaceTabs } from '@/components/canvas/WorkspaceTabs';
import { TemplatesModal } from '@/components/canvas/TemplatesModal';
import { Toaster } from '@/components/ui/sonner';
import { Menu, X, ChevronLeft, ChevronRight, Settings2 } from 'lucide-react';
import { useState } from 'react';

// Dynamically import Canvas to avoid SSR issues
const Canvas = dynamic(
  () => import('@/components/canvas/Canvas').then((mod) => mod.Canvas),
  { ssr: false }
);

export default function OpenMosaicPage() {
  const { workflowName, setWorkflowName, isDirty } = useCanvasStore();
  const { workspaces, activeWorkspaceId, createWorkspace, getActiveWorkspace } = useWorkspaceStore();
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);

  // Create initial workspace if none exists after hydration
  useEffect(() => {
    const timer = setTimeout(() => {
      const state = useWorkspaceStore.getState();
      if (state.workspaces.length === 0) {
        state.createWorkspace('Untitled Workflow');
      }
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const activeWorkspace = getActiveWorkspace();

  // Handle R key reload shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key.toLowerCase() === 'r' &&
        !e.ctrlKey &&
        !e.metaKey &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        window.location.reload();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <header className="h-14 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center">
              <span className="text-white font-bold text-lg">M</span>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                OpenMosaic
              </h1>
              <p className="text-[10px] text-muted-foreground -mt-1">
                Agentic AI Video Editor
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Actions */}
          <Button
            variant="ghost"
            size="sm"
            className="hidden sm:flex bg-gradient-to-r hover:from-blue-500/10 hover:to-purple-500/10 hover:text-purple-400 transition-all font-medium"
            onClick={() => setIsTemplatesOpen(true)}
          >
            Templates
          </Button>

          {/* GitHub Link */}
          <a
            href="https://github.com/Gorachand22/openmosaic"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:block"
          >
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="currentColor"
              >
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            </Button>
          </a>
        </div>
      </header >

      {/* Workspace Tabs */}
      < WorkspaceTabs />

      {/* Main Content */}
      < main className="flex-1 flex overflow-hidden" >
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Left Panel - Tiles */}
          <ResizablePanel
            defaultSize={18}
            minSize={12}
            maxSize={25}
            collapsible
            collapsedSize={0}
            onCollapse={() => setLeftPanelCollapsed(true)}
            onExpand={() => setLeftPanelCollapsed(false)}
            className={!leftPanelCollapsed ? 'border-r border-border/50' : ''}
          >
            {!leftPanelCollapsed && <TilePanel className="h-full" />}
          </ResizablePanel>

          {/* Left Collapse Toggle */}
          {leftPanelCollapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 z-50 h-8 w-8 bg-background/90 border border-border shadow-sm"
              onClick={() => setLeftPanelCollapsed(false)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}

          <ResizableHandle withHandle />

          {/* Center Panel - Canvas */}
          <ResizablePanel defaultSize={64} minSize={40}>
            <Canvas className="h-full w-full" />
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Right Panel - Properties */}
          <ResizablePanel
            defaultSize={18}
            minSize={15}
            maxSize={30}
            collapsible
            collapsedSize={0}
            onCollapse={() => setRightPanelCollapsed(true)}
            onExpand={() => setRightPanelCollapsed(false)}
            className={!rightPanelCollapsed ? 'border-l border-border/50' : ''}
          >
            {!rightPanelCollapsed && <PropertiesPanel className="h-full" />}
          </ResizablePanel>

          {/* Right Collapse Toggle */}
          {rightPanelCollapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 z-50 h-8 w-8 bg-background/90 border border-border shadow-sm"
              onClick={() => setRightPanelCollapsed(false)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
        </ResizablePanelGroup>
      </main >

      {/* Footer */}
      < footer className="h-8 border-t border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-4 text-[10px] text-muted-foreground" >
        <div className="flex items-center gap-4">
          <span>OpenMosaic v0.2.0</span>
          <span>•</span>
          <span className="hidden sm:inline">
            Input/Output folders • yt-dlp • ffmpeg
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden sm:inline">
            AI: z-ai-web-dev-sdk
          </span>
          <span>•</span>
          <a
            href="https://github.com/Gorachand22/openmosaic"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            GitHub
          </a>
        </div>
      </footer >

      {/* Floating AI Chatbot */}
      < FloatingChatbot />

      {/* Settings Panel - Bottom Left */}
      < SettingsPanel />

      <TemplatesModal
        isOpen={isTemplatesOpen}
        onClose={() => setIsTemplatesOpen(false)}
      />

      <Toaster />
    </div >
  );
}
