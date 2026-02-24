// OpenMosaic Canvas Store - State management with Zustand
import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { Node, Edge, Connection } from '@xyflow/react';
import type { TileData, TileStatus, Workflow } from './tile-types';
import { TILE_REGISTRY } from './tile-registry';
import { useWorkspaceStore } from './workspace-store';

interface ExecutionProgress {
  nodeId: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  progress: number;
  message?: string;
}

interface CanvasState {
  // Workflow metadata
  workflowId: string;
  workflowName: string;
  isDirty: boolean;

  // Canvas state
  nodes: Node<TileData>[];
  edges: Edge[];
  selectedNodeId: string | null;

  // Execution state
  isExecuting: boolean;
  executionProgress: Record<string, ExecutionProgress>;
  executionResults: Record<string, unknown>;

  // Undo/Redo
  history: { nodes: Node<TileData>[]; edges: Edge[] }[];
  historyIndex: number;

  // Settings state
  edgeStyle: 'bezier' | 'smoothstep' | 'straight';
  snapToGrid: boolean;
  showMinimap: boolean;

  // Actions
  setNodes: (nodes: Node<TileData>[]) => void;
  setEdges: (edges: Edge[]) => void;
  addNode: (type: string, position: { x: number; y: number }) => string;
  addNodeWithConnection: (type: string, position: { x: number; y: number }, connectToPrevious?: boolean) => string;
  updateNode: (nodeId: string, data: Partial<TileData>) => void;
  deleteNode: (nodeId: string) => void;
  selectNode: (nodeId: string | null) => void;
  connectNodes: (connection: Connection) => void;
  connectNodesById: (sourceId: string, targetId: string) => void;
  disconnectNodes: (edgeId: string) => void;
  clearCanvas: () => void;

  // Workflow actions
  newWorkflow: () => void;
  loadWorkflow: (workflow: Workflow) => void;
  saveWorkflow: () => Workflow;
  setWorkflowName: (name: string) => void;

  // Execution actions
  executeNode: (nodeId: string) => Promise<void>;
  executeAll: () => Promise<void>;
  stopExecution: () => void;
  setNodeStatus: (nodeId: string, status: TileStatus) => void;

  // Settings actions
  setEdgeStyle: (style: 'bezier' | 'smoothstep' | 'straight') => void;
  setSnapToGrid: (snap: boolean) => void;
  setShowMinimap: (show: boolean) => void;
}

// Helper to create a node from type
function createNodeFromType(type: string, position: { x: number; y: number }): Node<TileData> {
  const definition = TILE_REGISTRY[type];
  if (!definition) {
    console.warn(`Unknown tile type: ${type}, using fallback`);
  }

  return {
    id: uuidv4(),
    type: 'tile',
    position,
    data: {
      tileType: type,
      label: definition?.label || type,
      category: (definition?.category || 'action') as TileData['category'],
      status: 'idle',
      description: definition?.description || '',
      icon: definition?.icon || 'Sparkles',
      isConfigurable: definition?.isConfigurable ?? true,
      config: { ...(definition?.defaultConfig || {}) } as any,
    } as unknown as TileData,
  };
}

// Helper to sync canvas state to the active workspace
const syncToWorkspace = (state: CanvasState) => {
  const wsState = useWorkspaceStore.getState();
  if (wsState.activeWorkspaceId) {
    wsState.updateWorkspace(wsState.activeWorkspaceId, {
      nodes: state.nodes,
      edges: state.edges,
      isDirty: true,
    });
  }
};

export const useCanvasStore = create<CanvasState>((set, get) => ({
  // Initial state
  workflowId: uuidv4(),
  workflowName: 'Untitled Workflow',
  isDirty: false,
  nodes: [],
  edges: [],
  selectedNodeId: null,
  isExecuting: false,
  executionProgress: {},
  executionResults: {},

  // Settings initial state
  edgeStyle: 'bezier',
  snapToGrid: true,
  showMinimap: true,
  history: [],
  historyIndex: -1,

  // Settings actions
  setEdgeStyle: (style) => set({ edgeStyle: style }),
  setSnapToGrid: (snap) => set({ snapToGrid: snap }),
  setShowMinimap: (show) => set({ showMinimap: show }),

  // Node actions
  setNodes: (nodes) => {
    set({ nodes, isDirty: true });
    syncToWorkspace(get());
  },

  setEdges: (edges) => {
    set({ edges, isDirty: true });
    syncToWorkspace(get());
  },

  addNode: (type, position) => {
    const newNode = createNodeFromType(type, position);
    set((state) => ({ nodes: [...state.nodes, newNode], isDirty: true }));

    syncToWorkspace(get());
    return newNode.id;
  },

  addNodeWithConnection: (type, position, connectToPrevious = false) => {
    const newNode = createNodeFromType(type, position);
    const state = get();

    set((state) => ({ nodes: [...state.nodes, newNode], isDirty: true }));

    // If connectToPrevious is true, connect to the last added node
    if (connectToPrevious && state.nodes.length > 0) {
      const lastNode = state.nodes[state.nodes.length - 1];
      const newEdge: Edge = {
        id: `edge-${lastNode.id}-${newNode.id}`,
        source: lastNode.id,
        target: newNode.id,
        type: state.edgeStyle,
        animated: true,
        style: { strokeWidth: 2, stroke: '#6366f1' },
      };
      set((state) => ({
        edges: [...state.edges, newEdge],
      }));
    }


    syncToWorkspace(get());
    return newNode.id;
  },

  connectNodesById: (sourceId, targetId) => {
    set((state) => {
      const newEdge: Edge = {
        id: `edge-${sourceId}-${targetId}`,
        source: sourceId,
        target: targetId,
        type: state.edgeStyle,
        animated: true,
        style: { strokeWidth: 2 }
      };
      return {
        edges: [...state.edges, newEdge],
        isDirty: true
      };
    });

    syncToWorkspace(get());
  },

  clearCanvas: () => {
    set({
      nodes: [],
      edges: [],
      selectedNodeId: null,
      isDirty: true,
      executionProgress: {},
      executionResults: {},
    });

    syncToWorkspace(get());
  },

  updateNode: (nodeId, data) => {
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === nodeId
          ? ({ ...node, data: { ...node.data, ...data, config: { ...node.data.config, ...(data.config || {}) } } } as any)
          : node
      ),
      isDirty: true,
    }));
    syncToWorkspace(get());
  },

  deleteNode: (nodeId) => {
    set((state) => {
      const newResults = { ...state.executionResults };
      const newProgress = { ...state.executionProgress };
      delete newResults[nodeId];
      delete newProgress[nodeId];

      return {
        nodes: state.nodes.filter((node) => node.id !== nodeId),
        edges: state.edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
        selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
        executionResults: newResults,
        executionProgress: newProgress,
        isDirty: true,
      };
    });

    syncToWorkspace(get());
  },

  selectNode: (nodeId) => {
    set({ selectedNodeId: nodeId });
  },

  connectNodes: (connection) => {
    if (!connection.source || !connection.target) return;

    const newEdge: Edge = {
      id: `edge-${connection.source}-${connection.target}-${Date.now()}`,
      source: connection.source,
      target: connection.target,
      sourceHandle: connection.sourceHandle || undefined,
      targetHandle: connection.targetHandle || undefined,
      type: 'bezier',
      animated: true,
      style: { strokeWidth: 2, stroke: '#6366f1' },
    };

    set((state) => ({
      edges: [...state.edges, newEdge],
      isDirty: true,
    }));

  },

  disconnectNodes: (edgeId) => {
    set((state) => {
      const edgeToDisconnect = state.edges.find((e) => e.id === edgeId);
      const newResults = { ...state.executionResults };
      const newProgress = { ...state.executionProgress };

      if (edgeToDisconnect) {
        // Invalidate the target node since its input changed
        delete newResults[edgeToDisconnect.target];
        delete newProgress[edgeToDisconnect.target];
      }

      return {
        edges: state.edges.filter((edge) => edge.id !== edgeId),
        executionResults: newResults,
        executionProgress: newProgress,
        isDirty: true,
      };
    });
  },

  // Workflow actions
  newWorkflow: () => {
    set({
      workflowId: uuidv4(),
      workflowName: 'Untitled Workflow',
      nodes: [],
      edges: [],
      selectedNodeId: null,
      isDirty: false,
      history: [],
      historyIndex: -1,
      executionProgress: {},
      executionResults: {},
    });
  },

  loadWorkflow: (workflow) => {
    set({
      workflowId: workflow.id,
      workflowName: workflow.name,
      nodes: workflow.nodes,
      edges: workflow.edges,
      selectedNodeId: null,
      isDirty: false,
      history: [{ nodes: workflow.nodes, edges: workflow.edges }],
      historyIndex: 0,
    });
  },

  saveWorkflow: () => {
    const state = get();
    return {
      id: state.workflowId,
      name: state.workflowName,
      description: '',
      nodes: state.nodes,
      edges: state.edges,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  },

  setWorkflowName: (name) => {
    set({ workflowName: name, isDirty: true });
  },

  // Execution actions
  executeNode: async (nodeId) => {
    const node = get().nodes.find((n) => n.id === nodeId);
    if (!node) return;

    set((state) => ({
      isExecuting: true,
      executionProgress: {
        ...state.executionProgress,
        [nodeId]: { nodeId, status: 'running', progress: 0 },
      },
    }));

    // Update node status to processing
    get().setNodeStatus(nodeId, 'processing');

    try {
      // Gather inputs from connected nodes
      const state = get();
      const incomingEdges = state.edges.filter(e => e.target === nodeId);
      const inputs: Record<string, any> = {};

      for (const edge of incomingEdges) {
        const sourceResult = state.executionResults[edge.source] as any;
        if (sourceResult?.outputs) {
          // If we connected from a specific handle, try to get that specific output
          if (edge.sourceHandle && sourceResult.outputs[edge.sourceHandle]) {
            inputs[edge.sourceHandle] = sourceResult.outputs[edge.sourceHandle].data || sourceResult.outputs[edge.sourceHandle].url || sourceResult.outputs[edge.sourceHandle].path;
          } else {
            // Otherwise just grab the first available output or merge them
            const firstKey = Object.keys(sourceResult.outputs)[0];
            if (firstKey) {
              // usually the output is .data for text, or .url/.path for media
              inputs[firstKey] = sourceResult.outputs[firstKey].data || sourceResult.outputs[firstKey].url || sourceResult.outputs[firstKey].path;
            }
          }
        }
      }

      // Special case: for text inputs, the output is just the config.content 
      // but in the actual tile-executor it returns it in outputs.text.data.

      // Update progress to show we started
      set((state) => ({
        executionProgress: {
          ...state.executionProgress,
          [nodeId]: { nodeId, status: 'running', progress: 50 },
        },
      }));

      // Call the real backend execution API
      const response = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodeId,
          tileType: node.data.tileType,
          config: node.data.config,
          inputs
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Execution failed');
      }

      // Mark as completed and save results
      set((state) => ({
        executionProgress: {
          ...state.executionProgress,
          [nodeId]: { nodeId, status: 'completed', progress: 100 },
        },
        executionResults: {
          ...state.executionResults,
          [nodeId]: result
        }
      }));

      get().setNodeStatus(nodeId, 'completed');
    } catch (error) {
      console.error(`Execution error for node ${nodeId}:`, error);
      set((state) => ({
        executionProgress: {
          ...state.executionProgress,
          [nodeId]: { nodeId, status: 'error', progress: 0, message: String(error) },
        },
      }));
      get().setNodeStatus(nodeId, 'error');
    }
  },

  executeAll: async () => {
    const { nodes, edges } = get();

    // Find execution order using topological sort
    const executionOrder: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    function visit(nodeId: string) {
      if (visited.has(nodeId)) return;
      if (visiting.has(nodeId)) throw new Error('Cycle detected');

      visiting.add(nodeId);

      // Find nodes that this node depends on
      const dependencies = edges
        .filter((e) => e.target === nodeId)
        .map((e) => e.source);

      for (const dep of dependencies) {
        visit(dep);
      }

      visiting.delete(nodeId);
      visited.add(nodeId);
      executionOrder.push(nodeId);
    }

    // Visit all nodes
    for (const node of nodes) {
      visit(node.id);
    }

    // Execute in order
    for (const nodeId of executionOrder) {
      await get().executeNode(nodeId);
    }

    set({ isExecuting: false });
  },

  stopExecution: () => {
    set({ isExecuting: false });
  },

  setNodeStatus: (nodeId, status) => {
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, status } } : node
      ),
    }));
  },

  // Undo/Redo
  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      set({
        nodes: prev.nodes,
        edges: prev.edges,
        historyIndex: historyIndex - 1,
      });
    }
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      set({
        nodes: next.nodes,
        edges: next.edges,
        historyIndex: historyIndex + 1,
      });
    }
  },

  saveToHistory: () => {
    const { nodes, edges, history, historyIndex } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ nodes: [...nodes], edges: [...edges] });
    set({
      history: newHistory.slice(-50), // Keep last 50 states
      historyIndex: Math.min(newHistory.length - 1, 49),
    });
  },
}));
