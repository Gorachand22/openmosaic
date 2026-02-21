// OpenMosaic Workspace Store - Multi-workspace management
import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { persist } from 'zustand/middleware';
import type { Node, Edge } from '@xyflow/react';
import type { TileData } from './tile-types';

export interface Workspace {
  id: string;
  name: string;
  nodes: Node<TileData>[];
  edges: Edge[];
  createdAt: Date;
  updatedAt: Date;
  isDirty: boolean;
}

interface WorkspaceState {
  // All workspaces
  workspaces: Workspace[];
  activeWorkspaceId: string | null;

  // Actions
  createWorkspace: (name?: string) => string;
  switchWorkspace: (id: string) => void;
  updateWorkspace: (id: string, updates: Partial<Workspace>) => void;
  deleteWorkspace: (id: string) => void;
  renameWorkspace: (id: string, name: string) => void;
  
  // Get active workspace
  getActiveWorkspace: () => Workspace | null;
  
  // Save workspace to file
  saveWorkspaceToFile: (id: string) => Promise<{ success: boolean; path?: string; error?: string }>;
  
  // Load workspace from file
  loadWorkspaceFromFile: (filepath: string) => Promise<{ success: boolean; workspace?: Workspace; error?: string }>;
  
  // List saved workflows
  listSavedWorkflows: () => Promise<{ success: boolean; files?: string[]; error?: string }>;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      workspaces: [],
      activeWorkspaceId: null,

      createWorkspace: (name) => {
        const id = uuidv4();
        const workspace: Workspace = {
          id,
          name: name || `Workflow ${get().workspaces.length + 1}`,
          nodes: [],
          edges: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          isDirty: false,
        };
        set((state) => ({
          workspaces: [...state.workspaces, workspace],
          activeWorkspaceId: id,
        }));
        return id;
      },

      switchWorkspace: (id) => {
        set({ activeWorkspaceId: id });
      },

      updateWorkspace: (id, updates) => {
        set((state) => ({
          workspaces: state.workspaces.map((ws) =>
            ws.id === id
              ? { ...ws, ...updates, updatedAt: new Date(), isDirty: true }
              : ws
          ),
        }));
      },

      deleteWorkspace: (id) => {
        set((state) => {
          const newWorkspaces = state.workspaces.filter((ws) => ws.id !== id);
          let newActiveId = state.activeWorkspaceId;
          
          // If deleting active workspace, switch to another
          if (state.activeWorkspaceId === id) {
            newActiveId = newWorkspaces[0]?.id || null;
          }
          
          return {
            workspaces: newWorkspaces,
            activeWorkspaceId: newActiveId,
          };
        });
      },

      renameWorkspace: (id, name) => {
        set((state) => ({
          workspaces: state.workspaces.map((ws) =>
            ws.id === id ? { ...ws, name, updatedAt: new Date() } : ws
          ),
        }));
      },

      getActiveWorkspace: () => {
        const state = get();
        return state.workspaces.find((ws) => ws.id === state.activeWorkspaceId) || null;
      },

      saveWorkspaceToFile: async (id) => {
        try {
          const workspace = get().workspaces.find((ws) => ws.id === id);
          if (!workspace) {
            return { success: false, error: 'Workspace not found' };
          }

          const response = await fetch('/api/workflows/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(workspace),
          });

          const data = await response.json();
          
          if (data.success) {
            // Mark as not dirty
            set((state) => ({
              workspaces: state.workspaces.map((ws) =>
                ws.id === id ? { ...ws, isDirty: false } : ws
              ),
            }));
            return { success: true, path: data.path };
          }
          
          return { success: false, error: data.error };
        } catch (error) {
          return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          };
        }
      },

      loadWorkflowFromFile: async (filepath) => {
        try {
          const response = await fetch(`/api/workflows/load?path=${encodeURIComponent(filepath)}`);
          const data = await response.json();
          
          if (data.success && data.workflow) {
            // Add as new workspace
            const id = uuidv4();
            const workspace: Workspace = {
              ...data.workflow,
              id,
              isDirty: false,
              updatedAt: new Date(),
            };
            
            set((state) => ({
              workspaces: [...state.workspaces, workspace],
              activeWorkspaceId: id,
            }));
            
            return { success: true, workspace };
          }
          
          return { success: false, error: data.error };
        } catch (error) {
          return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          };
        }
      },

      listSavedWorkflows: async () => {
        try {
          const response = await fetch('/api/workflows/list');
          const data = await response.json();
          return { success: true, files: data.files };
        } catch (error) {
          return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          };
        }
      },
    }),
    {
      name: 'openmosaic-workspaces',
      partialize: (state) => ({
        workspaces: state.workspaces.map((ws) => ({
          ...ws,
          nodes: ws.nodes,
          edges: ws.edges,
        })),
        activeWorkspaceId: state.activeWorkspaceId,
      }),
    }
  )
);
