'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useWorkspaceStore } from '@/lib/workspace-store';
import { cn } from '@/lib/utils';
import {
  Plus,
  X,
  MoreHorizontal,
  Save,
  Download,
  Upload,
  FolderOpen,
  FileJson,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

export function WorkspaceTabs() {
  const {
    workspaces,
    activeWorkspaceId,
    createWorkspace,
    switchWorkspace,
    deleteWorkspace,
    renameWorkspace,
    saveWorkspaceToFile,
    loadWorkflowFromFile,
    listSavedWorkflows,
  } = useWorkspaceStore();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [savedWorkflows, setSavedWorkflows] = useState<Array<{
    filename: string;
    name: string;
    modified: Date;
  }>>([]);
  const [loading, setLoading] = useState(false);

  const handleCreateWorkspace = () => {
    createWorkspace();
  };

  const handleSwitchWorkspace = (id: string) => {
    switchWorkspace(id);
  };

  const handleDeleteWorkspace = (id: string) => {
    if (workspaces.length === 1) {
      toast.error('Cannot delete the last workspace');
      return;
    }
    deleteWorkspace(id);
    toast.success('Workspace closed');
  };

  const handleStartRename = (id: string, name: string) => {
    setEditingId(id);
    setEditName(name);
  };

  const handleSaveRename = () => {
    if (editingId && editName.trim()) {
      renameWorkspace(editingId, editName.trim());
    }
    setEditingId(null);
    setEditName('');
  };

  const handleSave = async (id: string) => {
    setSaving(id);
    const result = await saveWorkspaceToFile(id);
    setSaving(null);
    
    if (result.success) {
      toast.success(`Workflow saved: ${result.path}`);
    } else {
      toast.error(`Save failed: ${result.error}`);
    }
  };

  const handleOpenLoadDialog = async () => {
    setLoading(true);
    const result = await listSavedWorkflows();
    setLoading(false);
    
    if (result.success && result.files) {
      setSavedWorkflows(result.files as Array<{ filename: string; name: string; modified: Date }>);
    }
    setShowLoadDialog(true);
  };

  const handleLoad = async (filename: string) => {
    const result = await loadWorkflowFromFile(filename);
    
    if (result.success) {
      toast.success('Workflow loaded');
      setShowLoadDialog(false);
    } else {
      toast.error(`Load failed: ${result.error}`);
    }
  };

  const activeWorkspace = workspaces.find((ws) => ws.id === activeWorkspaceId);

  return (
    <div className="flex items-center gap-1 px-2 py-1 bg-muted/30 border-b border-border/50 overflow-x-auto">
      {/* Workspace tabs */}
      {workspaces.map((workspace) => (
        <div
          key={workspace.id}
          className={cn(
            'group flex items-center gap-1 px-3 py-1.5 rounded-t-md cursor-pointer transition-colors min-w-[100px] max-w-[200px]',
            workspace.id === activeWorkspaceId
              ? 'bg-background border-t border-l border-r border-border'
              : 'bg-muted/50 hover:bg-muted'
          )}
          onClick={() => handleSwitchWorkspace(workspace.id)}
        >
          {editingId === workspace.id ? (
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleSaveRename}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveRename()}
              className="h-5 text-xs px-1"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="text-xs font-medium truncate flex-1">
              {workspace.name}
              {workspace.isDirty && <span className="text-yellow-500 ml-1">●</span>}
            </span>
          )}
          
          {/* Tab actions */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4"
              onClick={(e) => {
                e.stopPropagation();
                handleSave(workspace.id);
              }}
              title="Save"
            >
              {saving === workspace.id ? (
                <Loader2 className="h-2.5 w-2.5 animate-spin" />
              ) : (
                <Save className="h-2.5 w-2.5" />
              )}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-2.5 w-2.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={() => handleStartRename(workspace.id, workspace.name)}>
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSave(workspace.id)}>
                  <Save className="h-3 w-3 mr-2" />
                  Save to File
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleDeleteWorkspace(workspace.id)}
                  className="text-red-500"
                >
                  <X className="h-3 w-3 mr-2" />
                  Close
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      ))}

      {/* New workspace button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        onClick={handleCreateWorkspace}
        title="New Workflow"
      >
        <Plus className="h-3 w-3" />
      </Button>

      {/* Load workflow button */}
      <Dialog open={showLoadDialog} onOpenChange={setShowLoadDialog}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleOpenLoadDialog}
            title="Open Workflow"
          >
            <FolderOpen className="h-3 w-3" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileJson className="h-4 w-4" />
              Open Workflow
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : savedWorkflows.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No saved workflows found.
                <br />
                Save a workflow first to see it here.
              </div>
            ) : (
              savedWorkflows.map((wf) => (
                <div
                  key={wf.filename}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => handleLoad(wf.filename)}
                >
                  <div>
                    <p className="font-medium text-sm">{wf.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(wf.modified).toLocaleString()}
                    </p>
                  </div>
                  <Upload className="h-4 w-4 text-muted-foreground" />
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
