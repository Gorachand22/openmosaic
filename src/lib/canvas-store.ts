// OpenMosaic Canvas Store - State management with Zustand
import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { type Node, type Edge, type Connection, applyNodeChanges, applyEdgeChanges } from '@xyflow/react';
import type { TileData, TileStatus, Workflow } from './tile-types';
// @ts-ignore
import objectHash from 'object-hash';
import { TILE_REGISTRY } from './tile-registry';
import { useWorkspaceStore } from './workspace-store';
import { getEdgeColor } from './utils';

export type EdgeStyle = 'bezier' | 'step' | 'straight';

interface ExecutionProgress {
  nodeId: string;
  status: 'pending' | 'running' | 'completed' | 'error' | 'cached';
  progress: number;
  message?: string;
}

export type ExecutionStatus = 'idle' | 'running' | 'completed' | 'error' | 'cached';

interface ExecutionCache {
  hash: string;
  timestamp: number;
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
  executionHashes: Record<string, ExecutionCache>;

  // Undo/Redo
  history: { nodes: Node<TileData>[]; edges: Edge[] }[];
  historyIndex: number;

  // Settings state
  edgeStyle: 'bezier' | 'smoothstep' | 'straight';
  snapToGrid: boolean;
  showMinimap: boolean;

  // Actions
  onNodesChange: (changes: import('@xyflow/react').NodeChange[]) => void;
  onEdgesChange: (changes: import('@xyflow/react').EdgeChange[]) => void;
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
  executionHashes: {},

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
  onNodesChange: (changes) => {
    const state = get();
    const newNodes = applyNodeChanges(changes, state.nodes) as Node<TileData>[];
    set({ nodes: newNodes, isDirty: true });
    syncToWorkspace(get());
  },

  onEdgesChange: (changes) => {
    const state = get();
    const newEdges = applyEdgeChanges(changes, state.edges);
    set({ edges: newEdges, isDirty: true });
    syncToWorkspace(get());
  },

  setNodes: (nodes) => {
    set({ nodes, isDirty: true });
    syncToWorkspace(get());
  },

  setEdges: (edges) => {
    // Repaint all edges based on their current connection Types
    const recoloredEdges = edges.map(edge => {
      const edgeColor = getEdgeColor(edge.source, edge.sourceHandle);
      return {
        ...edge,
        style: { ...edge.style, stroke: edgeColor }
      };
    });
    set({ edges: recoloredEdges, isDirty: true });
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
      let edgeColor = '#6b7280'; // Default gray 'any'
      const tileType = lastNode.data.tileType || lastNode.data.label;
      const tileDef = Object.values(TILE_REGISTRY).find(
        t => t.type === tileType || t.label === tileType
      );
      if (tileDef && tileDef.outputs.length > 0) {
        edgeColor = getEdgeColor(lastNode.id, tileDef.outputs[0].id);
      }

      const newEdge: Edge = {
        id: `edge-${lastNode.id}-${newNode.id}`,
        source: lastNode.id,
        target: newNode.id,
        sourceHandle: tileDef?.outputs[0]?.id,
        targetHandle: TILE_REGISTRY[newNode.data.tileType as string]?.inputs[0]?.id, // Attempt to connect to first input
        type: state.edgeStyle,
        animated: true,
        style: { strokeWidth: 2, stroke: edgeColor },
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
        id: `edge - ${sourceId} -${targetId} `,
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
      executionHashes: {},
    });

    syncToWorkspace(get());
  },

  updateNode: (nodeId, data) => {
    set((state) => {
      // Invalidate the cache for the specific node that was updated
      const newHashes = { ...state.executionHashes };
      delete newHashes[nodeId];

      return {
        nodes: state.nodes.map((node) =>
          node.id === nodeId
            ? ({ ...node, data: { ...node.data, ...data, config: { ...node.data.config, ...(data.config || {}) } } } as any)
            : node
        ),
        executionHashes: newHashes,
        isDirty: true,
      };
    });
    syncToWorkspace(get());
  },

  deleteNode: (nodeId) => {
    set((state) => {
      const newResults = { ...state.executionResults };
      const newProgress = { ...state.executionProgress };
      const newHashes = { ...state.executionHashes };
      delete newResults[nodeId];
      delete newProgress[nodeId];
      delete newHashes[nodeId];

      return {
        nodes: state.nodes.filter((node) => node.id !== nodeId),
        edges: state.edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
        selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
        executionResults: newResults,
        executionProgress: newProgress,
        executionHashes: newHashes,
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

    const edgeColor = getEdgeColor(connection.source, connection.sourceHandle);

    const newEdge: Edge = {
      id: `edge - ${connection.source} -${connection.target} -${Date.now()} `,
      source: connection.source,
      target: connection.target,
      sourceHandle: connection.sourceHandle || undefined,
      targetHandle: connection.targetHandle || undefined,
      type: 'bezier',
      animated: true,
      style: { strokeWidth: 2, stroke: edgeColor },
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
      const newHashes = { ...state.executionHashes };

      if (edgeToDisconnect) {
        // Invalidate the target node since its input changed
        delete newResults[edgeToDisconnect.target];
        delete newProgress[edgeToDisconnect.target];
        delete newHashes[edgeToDisconnect.target];
      }

      return {
        edges: state.edges.filter((edge) => edge.id !== edgeId),
        executionResults: newResults,
        executionProgress: newProgress,
        executionHashes: newHashes,
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
      executionHashes: {},
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

    const state = get();
    // Gather inputs from connected nodes
    const incomingEdges = state.edges.filter(e => e.target === nodeId);
    const inputs: Record<string, any> = {};

    for (const edge of incomingEdges) {
      const sourceResult = state.executionResults[edge.source] as any;
      if (sourceResult?.outputs) {
        if (edge.sourceHandle) {
          const outData = sourceResult.outputs[edge.sourceHandle];
          if (outData) {
            inputs[edge.targetHandle || edge.sourceHandle] = outData.data || outData.url || outData.path;
          } else {
            inputs[edge.targetHandle || edge.sourceHandle] = null;
          }
        } else {
          const firstKey = Object.keys(sourceResult.outputs)[0];
          if (firstKey) {
            const outData = sourceResult.outputs[firstKey];
            inputs[edge.targetHandle || firstKey] = outData.data || outData.url || outData.path;
          }
        }
      }
    }

    // COMFY UI CACHING LOGIC: Determine Execution Hash based on node configuration and incoming dependencies
    const nodeHashPayload = {
      tileType: node.data.tileType,
      config: node.data.config,
      inputs: inputs
    };

    // Hash the configuration signature
    const currentHash = objectHash(nodeHashPayload);

    // If the node has previously run successfully AND the hash is identical, skip execution entirely
    const existingCache = state.executionHashes[nodeId];
    if (existingCache && existingCache.hash === currentHash && state.executionResults[nodeId] && !(state.executionResults[nodeId] as any).error) {
      console.log(`[Cache Hit] Node ${nodeId} execution skipped, dependencies unchanged.`);
      set((state) => ({
        executionProgress: {
          ...state.executionProgress,
          [nodeId]: { nodeId, status: 'cached', progress: 100 },
        },
      }));
      get().setNodeStatus(nodeId, 'completed');
      return;
    }

    set((state) => ({
      isExecuting: true,
      executionProgress: {
        ...state.executionProgress,
        [nodeId]: { nodeId, status: 'running', progress: 0 },
      },
    }));

    // Update node status to processing
    // Update node status to processing
    get().setNodeStatus(nodeId, 'processing');

    try {

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

      if (!response.ok) {
        throw new Error(`Execution failed: ${response.statusText} `);
      }

      if (!response.body) {
        throw new Error('ReadableStream not supported by browser.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let finalResult: any = null;
      let buffer = '';

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          buffer += decoder.decode(value, { stream: true });

          const blocks = buffer.split('\n\n');
          // keep the last incomplete chunk in the buffer
          buffer = blocks.pop() || '';

          for (const block of blocks) {
            const lines = block.split('\n');
            const eventLine = lines.find(l => l.startsWith('event: '));
            const dataLine = lines.find(l => l.startsWith('data: '));

            if (eventLine && dataLine) {
              const eventType = eventLine.replace('event: ', '').trim();
              try {
                const eventData = JSON.parse(dataLine.replace('data: ', '').trim());

                if (eventType === 'progress') {
                  set((state) => ({
                    executionProgress: {
                      ...state.executionProgress,
                      [nodeId]: { nodeId, status: 'running', progress: eventData.progress, message: eventData.message },
                    },
                  }));
                } else if (eventType === 'executing') {
                  set((state) => ({
                    executionProgress: {
                      ...state.executionProgress,
                      [nodeId]: { nodeId, status: 'running', progress: eventData.progress || 0 },
                    },
                  }));
                } else if (eventType === 'executed') {
                  finalResult = eventData;
                } else if (eventType === 'error') {
                  throw new Error(eventData.error || 'Execution stream error');
                }
              } catch (e) {
                console.error('Error parsing SSE data line', e);
              }
            }
          }
        }
      }

      const result = finalResult;

      if (!result || !result.success) {
        throw new Error(result?.error || 'Execution failed without returning success flag');
      }

      // Mark as completed and save results and cache hash 
      set((state) => ({
        executionProgress: {
          ...state.executionProgress,
          [nodeId]: { nodeId, status: 'completed', progress: 100 },
        },
        executionResults: {
          ...state.executionResults,
          [nodeId]: result
        },
        executionHashes: {
          ...state.executionHashes,
          [nodeId]: { nodeId, hash: currentHash, timestamp: Date.now() }
        }
      }));

      get().setNodeStatus(nodeId, 'completed');
    } catch (error) {
      console.error(`Execution error for node ${nodeId}: `, error);
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
      // Check if any dependencies failed
      const nodeDependencies = edges
        .filter((e) => e.target === nodeId)
        .map((e) => e.source);

      const hasFailedDependency = nodeDependencies.some(
        (depId) => get().executionProgress[depId]?.status === 'error'
      );

      if (hasFailedDependency) {
        set((state) => ({
          executionProgress: {
            ...state.executionProgress,
            [nodeId]: { nodeId, status: 'error', progress: 0, message: 'Upstream dependency failed' },
          },
        }));
        get().setNodeStatus(nodeId, 'error');
        continue;
      }

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
