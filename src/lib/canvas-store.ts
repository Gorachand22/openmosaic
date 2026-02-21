// OpenMosaic Canvas Store - State management with Zustand
import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { Node, Edge, Connection } from '@xyflow/react';
import type { TileData, TileStatus, Workflow } from './tile-types';
import { TILE_REGISTRY } from './tile-registry';

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

  // Undo/Redo
  undo: () => void;
  redo: () => void;
  saveToHistory: () => void;
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
      config: { ...(definition?.defaultConfig || {}) },
    } as TileData,
  };
}

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
  history: [],
  historyIndex: -1,

  // Node actions
  setNodes: (nodes) => {
    set({ nodes, isDirty: true });
  },

  setEdges: (edges) => {
    set({ edges, isDirty: true });
  },

  addNode: (type, position) => {
    const newNode = createNodeFromType(type, position);
    set((state) => {
      const newNodes = [...state.nodes, newNode];
      return { nodes: newNodes, isDirty: true };
    });
    get().saveToHistory();
    return newNode.id;
  },

  addNodeWithConnection: (type, position, connectToPrevious = false) => {
    const newNode = createNodeFromType(type, position);
    const state = get();
    
    set((state) => {
      const newNodes = [...state.nodes, newNode];
      return { nodes: newNodes, isDirty: true };
    });
    
    // If connectToPrevious is true, connect to the last added node
    if (connectToPrevious && state.nodes.length > 0) {
      const lastNode = state.nodes[state.nodes.length - 1];
      const newEdge: Edge = {
        id: `edge-${lastNode.id}-${newNode.id}`,
        source: lastNode.id,
        target: newNode.id,
        type: 'bezier',
        animated: true,
        style: { strokeWidth: 2, stroke: '#6366f1' },
      };
      set((state) => ({
        edges: [...state.edges, newEdge],
      }));
    }
    
    get().saveToHistory();
    return newNode.id;
  },

  connectNodesById: (sourceId, targetId) => {
    const newEdge: Edge = {
      id: `edge-${sourceId}-${targetId}-${Date.now()}`,
      source: sourceId,
      target: targetId,
      type: 'bezier',
      animated: true,
      style: { strokeWidth: 2, stroke: '#6366f1' },
    };

    set((state) => ({
      edges: [...state.edges, newEdge],
      isDirty: true,
    }));
    get().saveToHistory();
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
    get().saveToHistory();
  },

  updateNode: (nodeId, data) => {
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...data, config: { ...node.data.config, ...(data.config || {}) } } }
          : node
      ),
      isDirty: true,
    }));
  },

  deleteNode: (nodeId) => {
    set((state) => ({
      nodes: state.nodes.filter((node) => node.id !== nodeId),
      edges: state.edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
      selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
      isDirty: true,
    }));
    get().saveToHistory();
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
    get().saveToHistory();
  },

  disconnectNodes: (edgeId) => {
    set((state) => ({
      edges: state.edges.filter((edge) => edge.id !== edgeId),
      isDirty: true,
    }));
    get().saveToHistory();
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
      // Simulate execution (real implementation will call backend API)
      for (let i = 0; i <= 100; i += 10) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        set((state) => ({
          executionProgress: {
            ...state.executionProgress,
            [nodeId]: { nodeId, status: 'running', progress: i },
          },
        }));
      }

      // Mark as completed
      set((state) => ({
        executionProgress: {
          ...state.executionProgress,
          [nodeId]: { nodeId, status: 'completed', progress: 100 },
        },
      }));
      get().setNodeStatus(nodeId, 'completed');
    } catch (error) {
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
