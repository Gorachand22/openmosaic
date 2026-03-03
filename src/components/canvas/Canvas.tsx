'use client';

import { useCallback, useRef, DragEvent, useState, useEffect, KeyboardEvent } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useReactFlow,
  Panel,
  SelectionMode,
  type OnConnect,
  type OnNodesChange,
  type OnEdgesChange,
  type Connection,
  BackgroundVariant,
  type Node,
  type Edge,
  type OnSelectionChangeParams,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useCanvasStore } from '@/lib/canvas-store';
import type { TileData } from '@/lib/tile-types';
import { TileNode } from './TileNode';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn, getEdgeColor } from '@/lib/utils';
import { TILE_REGISTRY } from '@/lib/tile-registry';
import {
  Play,
  Square,
  Download,
  Undo,
  Redo,
  CheckCircle2,
  XCircle,
  Trash2,
  GripHorizontal,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useWorkspaceStore } from '@/lib/workspace-store';
import { v4 as uuidv4 } from 'uuid';

// Custom node types
const nodeTypes = {
  tile: TileNode as any,
};

interface CanvasProps {
  className?: string;
}

// Check if connection is valid
const isValidConnection = (connection: Connection, nodes: Node<TileData>[], edges: Edge[]): boolean => {
  const sourceNode = nodes.find(n => n.id === connection.source);
  const targetNode = nodes.find(n => n.id === connection.target);

  if (!sourceNode || !targetNode) return false;
  // Prevent self-connection
  if (connection.source === connection.target) return false;

  // Get tile definitions
  const sourceTileType = String(sourceNode.data?.tileType || sourceNode.data?.label).toLowerCase().replace(/\s+/g, '-');
  const targetTileType = String(targetNode.data?.tileType || targetNode.data?.label).toLowerCase().replace(/\s+/g, '-');

  const sourceDef = TILE_REGISTRY[sourceTileType];
  const targetDef = TILE_REGISTRY[targetTileType];

  if (!sourceDef || !targetDef) return true; // Allow if unknown

  // Find the output/input handle type
  const sourceOutput = sourceDef.outputs.find(o => o.id === connection.sourceHandle);
  const targetInput = targetDef.inputs.find(i => i.id === connection.targetHandle);

  // If no specific handle info, allow connection
  if (!sourceOutput || !targetInput) return true;

  // Check type compatibility
  const isTypeMatch =
    sourceOutput.type === targetInput.type ||
    targetInput.type === 'any' ||
    sourceOutput.type === 'any';

  return isTypeMatch;
};

function CanvasInner({ className }: CanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const clipboardRef = useRef<Node<TileData>[]>([]);
  const { screenToFlowPosition } = useReactFlow();
  const [connectionStatus, setConnectionStatus] = useState<'valid' | 'invalid' | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<string[]>([]);
  const [activeConnectionColor, setActiveConnectionColor] = useState<string>('#6366f1');

  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    setNodes,
    setEdges,
    addNode,
    connectNodes,
    selectNode,
    executeAll,
    stopExecution,
    isExecuting,
    saveWorkflow,
    workflowName,
    isDirty: canvasIsDirty,
    deleteNode,
    disconnectNodes,
    edgeStyle,
    snapToGrid,
    showMinimap,
  } = useCanvasStore();

  const activeWorkspace = useWorkspaceStore((state) =>
    state.workspaces.find((ws) => ws.id === state.activeWorkspaceId)
  );

  const displayWorkflowName = activeWorkspace?.name || workflowName;
  const isDirty = activeWorkspace?.isDirty || canvasIsDirty;

  // Track selection changes
  const onSelectionChange = useCallback(
    (params: OnSelectionChangeParams) => {
      const selectedNodes = params.nodes.map(n => n.id);
      const selectedEdges = params.edges.map(e => e.id);
      setSelectedNodeIds(selectedNodes);
      setSelectedEdgeIds(selectedEdges);
      // Also update store selection
      if (selectedNodes.length === 1) {
        selectNode(selectedNodes[0]);
      } else {
        selectNode(null);
      }
    },
    [selectNode]
  );

  // Restore canvas layout from persisted workspace on initial page load (Reloading with 'R')
  const isHydrated = useRef(false);
  useEffect(() => {
    if (!isHydrated.current) {
      const workspaceStore = useWorkspaceStore.getState();
      const currentWorkspace = workspaceStore.workspaces.find((ws) => ws.id === workspaceStore.activeWorkspaceId);

      if (currentWorkspace) {
        setNodes(currentWorkspace.nodes || []);
        setEdges(currentWorkspace.edges || []);
      } else if (workspaceStore.workspaces.length === 0) {
        workspaceStore.createWorkspace(); // Initialize a blank workspace if completely empty
      }
      isHydrated.current = true;
    }
  }, [setNodes, setEdges]);

  // Handle new connections with validation
  const onConnect = useCallback(
    (connection: Connection | Edge) => {
      // For validation, we treat Edge as Connection
      if (isValidConnection(connection as Connection, nodes, edges)) {
        connectNodes(connection as Connection);
        setConnectionStatus('valid');
        setTimeout(() => setConnectionStatus(null), 1500);
      } else {
        setConnectionStatus('invalid');
        setConnectionError('Connection types do not match!');
        setTimeout(() => {
          setConnectionStatus(null);
          setConnectionError(null);
        }, 2000);
      }
    },
    [connectNodes, nodes, edges]
  );

  // Validate connection while dragging
  const onConnectStart = useCallback((event: any, params: { nodeId: string | null; handleId: string | null; handleType: string | null }) => {
    setConnectionStatus(null);
    setConnectionError(null);

    // Find color based on source node and handle
    let color = '#6366f1';
    if (params.nodeId) {
      color = getEdgeColor(params.nodeId, params.handleId);
    }
    setActiveConnectionColor(color);
  }, []);

  const onConnectEnd = useCallback(() => {
    setTimeout(() => {
      setConnectionStatus(null);
      setConnectionError(null);
    }, 500);
  }, []);

  // Handle node click
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: typeof nodes[0]) => {
      selectNode(node.id);
    },
    [selectNode]
  );

  // Handle canvas click (deselect)
  const onPaneClick = useCallback(() => {
    selectNode(null);
    setSelectedNodeIds([]);
  }, [selectNode]);

  // Handle drag over for dropping tiles
  const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Handle drop for adding new tiles
  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      const tileType = event.dataTransfer.getData('application/reactflow');
      if (!tileType) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      addNode(tileType, position);
    },
    [screenToFlowPosition, addNode]
  );

  // Delete selected nodes and edges
  const deleteSelectedElements = useCallback(() => {
    if (selectedNodeIds.length > 0) {
      selectedNodeIds.forEach(nodeId => {
        deleteNode(nodeId);
      });
      setSelectedNodeIds([]);
    }
    if (selectedEdgeIds.length > 0) {
      selectedEdgeIds.forEach(edgeId => {
        disconnectNodes(edgeId);
      });
      setSelectedEdgeIds([]);
    }
  }, [selectedNodeIds, selectedEdgeIds, deleteNode, disconnectNodes]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      const isInputFocused = ['INPUT', 'TEXTAREA'].includes(
        (document.activeElement?.tagName || '')
      );

      if (isInputFocused) return;

      // Delete selected nodes and edges with Delete or Backspace
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        deleteSelectedElements();
      }

      // Select all with Ctrl+A
      if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
        event.preventDefault();
        const allNodeIds = nodes.map(n => n.id);
        setSelectedNodeIds(allNodeIds);
        setNodes(nodes.map(n => ({ ...n, selected: true })));
      }

      // Copy with Ctrl+C
      if ((event.ctrlKey || event.metaKey) && event.key === 'c') {
        const selectedNodes = nodes.filter(n => selectedNodeIds.includes(n.id));
        if (selectedNodes.length > 0) {
          clipboardRef.current = JSON.parse(JSON.stringify(selectedNodes));
        }
      }

      // Paste with Ctrl+V
      if ((event.ctrlKey || event.metaKey) && event.key === 'v') {
        if (clipboardRef.current.length > 0) {
          const newNodes = clipboardRef.current.map(copiedNode => {
            return {
              ...copiedNode,
              id: uuidv4(),
              position: {
                x: copiedNode.position.x + 50,
                y: copiedNode.position.y + 50
              },
              selected: true,
            };
          });

          setNodes([...nodes.map(n => ({ ...n, selected: false })), ...newNodes]);
          setSelectedNodeIds(newNodes.map(n => n.id));

          // Update clipboard with the new pasted nodes so holding Ctrl+V cascades them beautifully
          clipboardRef.current = JSON.parse(JSON.stringify(newNodes));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteSelectedElements, nodes, selectedNodeIds, setNodes]);

  // Alt+Drag duplication
  const onNodeDragStart = useCallback(
    (event: React.MouseEvent, node: Node, activeNodes: Node[]) => {
      if (event.altKey) {
        // Clone the dragged node(s) and leave them at the original position while you drag the original
        const clonedNodes = activeNodes.map((activeNode) => ({
          ...activeNode,
          id: uuidv4(),
          selected: false,
          position: { x: activeNode.position.x, y: activeNode.position.y },
          data: JSON.parse(JSON.stringify(activeNode.data)),
        }));
        setNodes([...nodes, ...clonedNodes]);
      }
    },
    [nodes, setNodes]
  );

  // Export workflow as JSON
  const handleExport = () => {
    const workflow = saveWorkflow();
    const blob = new Blob([JSON.stringify(workflow, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${workflowName.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div ref={reactFlowWrapper} className={cn('h-full w-full relative', className)}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        onNodeClick={onNodeClick}
        onNodeDragStart={onNodeDragStart}
        onPaneClick={onPaneClick}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onSelectionChange={onSelectionChange}
        nodeTypes={nodeTypes}
        fitView
        snapToGrid={snapToGrid}
        snapGrid={[15, 15]}
        // Multi-select only with Ctrl pressed, otherwise pan with left mouse
        selectionMode={SelectionMode.Partial}
        selectionOnDrag
        panOnDrag={true}
        selectionKeyCode={['Control', 'Meta']}
        // Smooth bezier edges
        defaultEdgeOptions={{
          type: edgeStyle,
          animated: true,
          style: { strokeWidth: 2 },
        }}
        connectionLineStyle={{
          strokeWidth: 2,
          stroke: connectionStatus === 'invalid' ? '#ef4444' : activeConnectionColor, // Use dynamic color
          strokeDasharray: connectionStatus === 'invalid' ? '5,5' : 'none',
        }}
        connectionLineType={edgeStyle as any}
        isValidConnection={(connection) => isValidConnection(connection as any, nodes, edges)}
        proOptions={{ hideAttribution: true }}
        className="bg-background"
        deleteKeyCode={['Delete', 'Backspace']}
        multiSelectionKeyCode={['Shift']}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="hsl(var(--border))"
        />
        <Controls className="bg-background/90 border border-border rounded-lg shadow-lg" />


        {/* Top Toolbar - Draggable */}
        <Panel position="top-center" className="flex items-center gap-2 pointer-events-none pt-4">
          <motion.div
            drag
            dragMomentum={false}
            whileDrag={{ scale: 1.02, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)" }}
            className="bg-background/95 backdrop-blur border border-border rounded-xl shadow-lg px-4 py-2 flex items-center gap-4 cursor-move pointer-events-auto"
          >
            <GripHorizontal className="h-4 w-4 text-muted-foreground/50 mx-[-8px]" />
            {/* Workflow Name */}
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                OpenMosaic
              </h1>
              <span className="text-muted-foreground">|</span>
              <span className="text-sm font-medium">{displayWorkflowName}</span>
              {isDirty && (
                <Badge variant="secondary" className="text-[10px]">
                  Unsaved
                </Badge>
              )}
            </div>

            <span className="text-muted-foreground">|</span>

            {/* Delete selected (only show when nodes selected) */}
            {selectedNodeIds.length > 0 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20"
                  onClick={deleteSelectedElements}
                  title="Delete selected (Delete)"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Badge variant="outline" className="text-[10px]">
                  {selectedNodeIds.length} selected
                </Badge>
                <span className="text-muted-foreground">|</span>
              </>
            )}

            {/* Execution Controls */}
            <div className="flex items-center gap-1">
              {isExecuting ? (
                <Button variant="destructive" size="sm" onClick={stopExecution}>
                  <Square className="h-4 w-4 mr-1" />
                  Stop
                </Button>
              ) : (
                <Button
                  variant="default"
                  size="sm"
                  onClick={executeAll}
                  className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                >
                  <Play className="h-4 w-4 mr-1" />
                  Run All
                </Button>
              )}
            </div>

            <span className="text-muted-foreground">|</span>

            {/* Save/Export */}
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleExport} title="Export JSON">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        </Panel>

        {/* Stats Panel */}
        <Panel position="bottom-center">
          <div className="bg-background/90 border border-border rounded-lg shadow-lg px-3 py-1.5 flex items-center gap-3 text-[11px] text-muted-foreground">
            <span>{nodes.length} tiles</span>
            <span>•</span>
            <span>{edges.length} connections</span>
            <span>•</span>
            <span>In: {nodes.filter((n) => n.data?.category === 'input').length}</span>
            <span>•</span>
            <span>Act: {nodes.filter((n) => n.data?.category === 'action').length}</span>
            <span>•</span>
            <span>Out: {nodes.filter((n) => n.data?.category === 'output').length}</span>
          </div>
        </Panel>

        {/* Connection Status Toast */}
        {connectionStatus && (
          <Panel position="top-right" className="mt-16">
            <div className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg text-sm font-medium",
              connectionStatus === 'valid'
                ? "bg-green-500/90 text-white"
                : "bg-red-500/90 text-white"
            )}>
              {connectionStatus === 'valid' ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Connected!
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4" />
                  {connectionError || 'Invalid connection'}
                </>
              )}
            </div>
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
}

// Wrap with ReactFlowProvider
export function Canvas(props: CanvasProps) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  );
}
