import { NextRequest, NextResponse } from 'next/server';
import type { Node, Edge } from '@xyflow/react';
import type { TileData } from '@/lib/tile-types';

// Workflow execution engine
// This handles the execution flow of tiles in topological order

interface ExecutionNode {
  id: string;
  type: string;
  data: TileData;
  inputs: string[];
  outputs: string[];
}

// Topological sort to determine execution order
function getExecutionOrder(nodes: Node<TileData>[], edges: Edge[]): string[] {
  const order: string[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const adjacencyList = new Map<string, string[]>();

  // Build adjacency list
  nodes.forEach((node) => {
    adjacencyList.set(node.id, []);
  });

  edges.forEach((edge) => {
    const targets = adjacencyList.get(edge.source) || [];
    targets.push(edge.target);
    adjacencyList.set(edge.source, targets);
  });

  // DFS for topological sort
  function visit(nodeId: string) {
    if (visited.has(nodeId)) return;
    if (visiting.has(nodeId)) {
      throw new Error(`Cycle detected in workflow at node ${nodeId}`);
    }

    visiting.add(nodeId);

    // Visit dependencies first (nodes that this node depends on)
    const dependencies = edges
      .filter((e) => e.target === nodeId)
      .map((e) => e.source);

    for (const dep of dependencies) {
      visit(dep);
    }

    visiting.delete(nodeId);
    visited.add(nodeId);
    order.push(nodeId);
  }

  // Visit all nodes
  for (const node of nodes) {
    visit(node.id);
  }

  return order;
}

// Process individual tile
async function processTile(
  node: Node<TileData>,
  inputs: Map<string, unknown>,
  config: Record<string, unknown>
): Promise<unknown> {
  const tileType = node.data.label.toLowerCase().replace(/\s+/g, '-');

  switch (tileType) {
    case 'video-input': {
      return {
        type: 'video',
        url: config.fileUrl,
        duration: config.duration || 0,
        resolution: config.resolution || { width: 1920, height: 1080 },
      };
    }

    case 'audio-input': {
      return {
        type: 'audio',
        url: config.fileUrl,
        duration: config.duration || 0,
      };
    }

    case 'text-input': {
      return {
        type: 'text',
        content: config.content || '',
        style: config.style,
      };
    }

    case 'ai-transcription': {
      const audioInput = inputs.get('audio') as { url?: string } | undefined;
      return {
        type: 'text',
        transcript: `[Transcribed content from ${audioInput?.url || 'audio'}]`,
        format: config.outputFormat || 'srt',
      };
    }

    case 'ai-summary': {
      const textInput = inputs.get('text') as { content?: string } | undefined;
      return {
        type: 'text',
        summary: `Summary of: ${textInput?.content?.slice(0, 100) || 'text'}...`,
      };
    }

    case 'ai-captions': {
      const videoInput = inputs.get('video') as { url?: string } | undefined;
      return {
        type: 'video',
        url: videoInput?.url,
        captions: true,
        style: config.style,
      };
    }

    case 'video-trimmer': {
      const videoInput = inputs.get('video') as { url?: string; duration?: number } | undefined;
      return {
        type: 'video',
        url: videoInput?.url,
        startTime: config.startTime || 0,
        endTime: config.endTime || videoInput?.duration || 0,
      };
    }

    case 'video-effects': {
      const videoInput = inputs.get('video') as { url?: string } | undefined;
      return {
        type: 'video',
        url: videoInput?.url,
        effects: {
          brightness: config.brightness,
          contrast: config.contrast,
          saturation: config.saturation,
          filters: config.filters,
        },
      };
    }

    case 'text-overlay': {
      const videoInput = inputs.get('video') as { url?: string } | undefined;
      const textInput = inputs.get('text') as { content?: string } | undefined;
      return {
        type: 'video',
        url: videoInput?.url,
        overlay: {
          text: textInput?.content || config.text || '',
          position: config.position,
          animation: config.animation,
        },
      };
    }

    case 'concatenate': {
      const video1 = inputs.get('video1') as { url?: string } | undefined;
      const video2 = inputs.get('video2') as { url?: string } | undefined;
      return {
        type: 'video',
        sources: [video1?.url, video2?.url].filter(Boolean),
        transition: config.transition,
      };
    }

    case 'video-output': {
      const videoInput = inputs.get('video') as { url?: string } | undefined;
      return {
        type: 'output',
        format: config.format,
        resolution: config.resolution,
        quality: config.quality,
        sourceUrl: videoInput?.url,
      };
    }

    case 'branch': {
      const input = inputs.get('input');
      return {
        type: 'branch',
        branches: config.branches || 2,
        data: input,
      };
    }

    case 'merge': {
      const input1 = inputs.get('input1');
      const input2 = inputs.get('input2');
      return {
        type: 'merged',
        inputs: [input1, input2].filter(Boolean),
        mode: config.mode,
      };
    }

    default:
      return { type: 'unknown', config };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nodes, edges, startFrom } = body;

    if (!nodes || !Array.isArray(nodes)) {
      return NextResponse.json(
        { success: false, error: 'Invalid workflow: nodes array required' },
        { status: 400 }
      );
    }

    // Get execution order
    const executionOrder = getExecutionOrder(nodes, edges);
    const results = new Map<string, unknown>();
    const executionLog: Array<{
      nodeId: string;
      status: 'success' | 'error' | 'skipped';
      duration: number;
      output?: unknown;
      error?: string;
    }> = [];

    // Start execution from specific node or beginning
    const startIndex = startFrom ? executionOrder.indexOf(startFrom) : 0;
    const nodesToExecute = executionOrder.slice(Math.max(0, startIndex));

    for (const nodeId of nodesToExecute) {
      const node = nodes.find((n: Node<TileData>) => n.id === nodeId);
      if (!node) continue;

      const startTime = Date.now();

      try {
        // Gather inputs from connected nodes
        const inputs = new Map<string, unknown>();
        const incomingEdges = edges.filter((e: Edge) => e.target === nodeId);

        for (const edge of incomingEdges) {
          const sourceResult = results.get(edge.source);
          if (sourceResult) {
            inputs.set(edge.sourceHandle || 'default', sourceResult);
          }
        }

        // Process the tile
        const output = await processTile(node, inputs, node.data.config);
        results.set(nodeId, output);

        executionLog.push({
          nodeId,
          status: 'success',
          duration: Date.now() - startTime,
          output: output,
        });
      } catch (error) {
        executionLog.push({
          nodeId,
          status: 'error',
          duration: Date.now() - startTime,
          error: String(error),
        });

        // Continue with next node even if one fails
        continue;
      }
    }

    return NextResponse.json({
      success: true,
      executionOrder,
      executionLog,
      results: Object.fromEntries(results),
      summary: {
        totalNodes: nodesToExecute.length,
        successful: executionLog.filter((l) => l.status === 'success').length,
        failed: executionLog.filter((l) => l.status === 'error').length,
        skipped: executionLog.filter((l) => l.status === 'skipped').length,
      },
    });
  } catch (error) {
    console.error('Workflow execution error:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

// GET endpoint for execution status
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const executionId = searchParams.get('id');

  if (!executionId) {
    return NextResponse.json(
      { success: false, error: 'Execution ID required' },
      { status: 400 }
    );
  }

  // In a real implementation, this would check the status of a running execution
  return NextResponse.json({
    success: true,
    executionId,
    status: 'completed',
    progress: 100,
  });
}
