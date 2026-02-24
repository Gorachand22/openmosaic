'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  MessageCircle, X, Send, Loader2, Sparkles, Trash2,
  Copy, Check, Bot, Zap, CheckCircle2, Circle, Play
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCanvasStore } from '@/lib/canvas-store';
import { useWorkspaceStore } from '@/lib/workspace-store';
import { TILE_REGISTRY } from '@/lib/tile-registry';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

interface AgentStep {
  id: string;
  action: 'add_node' | 'connect' | 'configure';
  description: string;
  tileType?: string;
  sourceId?: string;
  targetId?: string;
  config?: Record<string, unknown>;
  status: 'pending' | 'running' | 'completed';
}

interface ConversationMemory {
  messages: Message[];
  context: {
    currentWorkflow: string;
    selectedTile: string | null;
    recentActions: string[];
  };
}

export function FloatingChatbot() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [memory, setMemory] = useState<ConversationMemory>({
    messages: [],
    context: {
      currentWorkflow: 'Untitled Workflow',
      selectedTile: null,
      recentActions: [],
    },
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { nodes, edges, addNodeWithConnection, clearCanvas, connectNodesById } = useCanvasStore();
  const { activeWorkspaceId } = useWorkspaceStore();

  // Load memory from localStorage
  useEffect(() => {
    if (!activeWorkspaceId) return;
    const savedMemory = localStorage.getItem(`openmosaic-chat-memory-${activeWorkspaceId}`);
    if (savedMemory) {
      try {
        const parsed = JSON.parse(savedMemory);
        setMemory(parsed);
        if (parsed.messages?.length > 0) {
          const messagesWithDates = parsed.messages.map((m: Message) => ({
            ...m,
            timestamp: new Date(m.timestamp),
          }));
          setMessages(messagesWithDates);
        }
      } catch (e) {
        console.error('Failed to load memory:', e);
      }
    } else {
      // Clear memory if switching to a new tab without history
      setMessages([]);
      setMemory({
        messages: [],
        context: {
          currentWorkflow: 'Untitled Workflow',
          selectedTile: null,
          recentActions: [],
        },
      });
    }
  }, [activeWorkspaceId]);

  // Save memory to localStorage
  useEffect(() => {
    if (!activeWorkspaceId) return;
    if (messages.length > 0) {
      const newMemory: ConversationMemory = {
        messages,
        context: {
          currentWorkflow: 'Untitled Workflow',
          selectedTile: null,
          recentActions: memory.context.recentActions.slice(-10),
        },
      };
      localStorage.setItem(`openmosaic-chat-memory-${activeWorkspaceId}`, JSON.stringify(newMemory));
      setMemory(newMemory);
    }
  }, [messages, activeWorkspaceId]);

  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Execute agent steps one by one
  const executeSteps = async (steps: AgentStep[], clearExisting: boolean = false) => {
    if (clearExisting) {
      clearCanvas();
      await new Promise(r => setTimeout(r, 200));
    }

    setIsExecuting(true);
    const nodeIds: Record<string, string> = {};
    let previousNodeId: string | null = null;

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      setCurrentStep(step.description);

      // Add thinking message
      setMessages(prev => [...prev, {
        id: `step-${i}-thinking`,
        role: 'system',
        content: `🔄 ${step.description}...`,
        timestamp: new Date(),
      }]);

      await new Promise(r => setTimeout(r, 500)); // Visual feedback delay

      if (step.action === 'add_node' && step.tileType) {
        // Calculate position based on step index
        const row = Math.floor(i / 3);
        const col = i % 3;
        const position = { x: 100 + col * 300, y: 100 + row * 180 };

        // Add node with connection to previous
        const nodeId = addNodeWithConnection(
          step.tileType,
          position,
          previousNodeId !== null
        );
        nodeIds[step.tileType] = nodeId;
        previousNodeId = nodeId;
      }

      // Remove thinking message and add completed
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== `step-${i}-thinking`);
        return [...filtered, {
          id: `step-${i}-done`,
          role: 'system',
          content: `✅ ${step.description}`,
          timestamp: new Date(),
        }];
      });

      await new Promise(r => setTimeout(r, 300)); // Delay between steps
    }

    setCurrentStep(null);
    setIsExecuting(false);

    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'assistant',
      content: '🎉 Workflow created successfully! Your tiles are now on the canvas and connected. You can click Run All to execute.',
      timestamp: new Date(),
    }]);
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const canvasContext = {
        nodes: nodes.map(n => ({ id: n.id, type: n.data?.tileType, label: n.data?.label })),
        edges: edges.map(e => ({ source: e.source, target: e.target })),
      };

      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.concat(userMessage).map((m) => ({
            role: m.role,
            content: m.content,
          })),
          context: {
            ...memory.context,
            canvas: canvasContext,
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.message,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);

        // If agent returns steps, execute them
        if (data.steps && Array.isArray(data.steps) && data.steps.length > 0) {
          await executeSteps(data.steps, data.clearCanvas || false);
        }
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: '❌ Sorry, I encountered an error. Please try again.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearMemory = () => {
    if (activeWorkspaceId) {
      localStorage.removeItem(`openmosaic-chat-memory-${activeWorkspaceId}`);
    }
    const greeting: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: '🧠 Memory cleared! How can I help you create your next workflow?',
      timestamp: new Date(),
    };
    setMessages([greeting]);
    setMemory({
      messages: [],
      context: {
        currentWorkflow: 'Untitled Workflow',
        selectedTile: null,
        recentActions: [],
      },
    });
  };

  const copyMessage = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const quickPrompts = [
    'Create Instagram clips from YouTube',
    'Add cinematic captions to video',
    'Remove silence and add B-roll',
  ];

  // MINIMIZED STATE
  if (!isExpanded) {
    return (
      <Button
        onClick={() => setIsExpanded(true)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 transition-transform hover:scale-110"
        size="icon"
      >
        <MessageCircle className="h-6 w-6 text-white" />
        <span className="sr-only">Open AI Assistant</span>
      </Button>
    );
  }

  // EXPANDED STATE
  return (
    <Card
      className="fixed bottom-6 right-6 z-50 flex flex-col shadow-2xl rounded-2xl overflow-hidden border border-border/50 bg-background"
      style={{ width: 420, height: 580 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border/50 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-white" />
          <div>
            <h3 className="font-semibold text-white text-sm">AI Agent</h3>
            <span className="text-[10px] text-white/70">Powered by GLM</span>
          </div>
          {isExecuting && (
            <Badge variant="secondary" className="text-[10px] bg-white/20 text-white">
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              Executing...
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={clearMemory}
            className="h-7 w-7 text-white/80 hover:text-white hover:bg-white/20"
            title="Clear memory"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsExpanded(false)}
            className="h-7 w-7 text-white/80 hover:text-white hover:bg-white/20"
            title="Minimize"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Current Step Indicator */}
      {currentStep && (
        <div className="px-3 py-2 bg-purple-500/10 border-b border-purple-500/20">
          <div className="flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>{currentStep}</span>
          </div>
        </div>
      )}

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden p-3"
      >
        <div className="space-y-3">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <Sparkles className="h-8 w-8 mx-auto mb-3 text-purple-500" />
              <p className="text-sm text-muted-foreground">
                👋 Welcome! I'm your agentic AI assistant.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                I'll break down tasks and build workflows step by step.
              </p>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'flex',
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              <div
                className={cn(
                  'max-w-[90%] rounded-2xl px-3 py-2 text-sm relative group',
                  message.role === 'user'
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-br-md'
                    : message.role === 'system'
                      ? message.content.includes('✅')
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded-md'
                        : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded-md'
                      : 'bg-muted rounded-bl-md'
                )}
              >
                {message.role === 'assistant' && (
                  <Bot className="h-3 w-3 mb-1 text-purple-500" />
                )}
                <div className="whitespace-pre-wrap break-words pr-6">{message.content}</div>
                <div
                  className={cn(
                    'text-[9px] mt-1',
                    message.role === 'user' ? 'text-white/60' : 'text-muted-foreground'
                  )}
                >
                  {(() => {
                    const ts = message.timestamp instanceof Date ? message.timestamp : new Date(message.timestamp);
                    return isNaN(ts.getTime()) ? 'Now' : ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  })()}
                </div>

                {/* Copy button */}
                {message.role !== 'system' && (
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyMessage(message.id, message.content)}
                      className="h-5 w-5"
                    >
                      {copiedId === message.id ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl rounded-bl-md px-3 py-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Quick Prompts */}
      {messages.length <= 2 && !isExecuting && (
        <div className="px-3 pb-2 border-t border-border/30 pt-2 shrink-0">
          <p className="text-[10px] text-muted-foreground mb-1.5">Quick actions:</p>
          <div className="flex flex-wrap gap-1">
            {quickPrompts.map((prompt) => (
              <Button
                key={prompt}
                variant="outline"
                size="sm"
                onClick={() => {
                  setInput(prompt);
                  inputRef.current?.focus();
                }}
                className="h-6 text-[10px] rounded-full px-2"
              >
                {prompt}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-border/50 shrink-0">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me to create a workflow..."
            className="flex-1 rounded-full h-9 text-sm"
            disabled={isLoading || isExecuting}
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading || isExecuting}
            className="rounded-full h-9 w-9 p-0 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
