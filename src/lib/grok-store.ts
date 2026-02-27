import { v4 as uuidv4 } from 'uuid';

export type GrokTaskStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface GrokTask {
  id: string;
  prompt: string;
  mode: 'textToImage' | 'textToVideo' | 'imageToVideo';
  aspectRatio?: string;
  status: GrokTaskStatus;
  result?: {
    type: 'image' | 'video';
    dataBase64?: string;
    error?: string;
  };
  createdAt: number;
}

// Use global to survive Next.js HMR
const globalAny: any = global;
if (!globalAny.__GROK_TASKS__) {
  globalAny.__GROK_TASKS__ = new Map<string, GrokTask>();
}

export const grokTasks: Map<string, GrokTask> = globalAny.__GROK_TASKS__;

export function addGrokTask(task: Omit<GrokTask, 'id' | 'status' | 'createdAt'>): string {
  const id = uuidv4();
  grokTasks.set(id, {
    ...task,
    id,
    status: 'pending',
    createdAt: Date.now()
  });
  return id;
}

export function getPendingTasks(): GrokTask[] {
  return Array.from(grokTasks.values()).filter(t => t.status === 'pending');
}

export function claimTasks(): GrokTask[] {
  const pending = getPendingTasks();
  for (const task of pending) {
    task.status = 'running';
  }
  return pending;
}

export function completeTask(id: string, result: GrokTask['result']) {
  const task = grokTasks.get(id);
  if (task) {
    task.status = result?.error ? 'failed' : 'completed';
    task.result = result;
  }
}

export async function waitForGrokTask(id: string, timeoutMs: number = 300000): Promise<GrokTask> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    const task = grokTasks.get(id);
    if (!task) throw new Error("Task not found");
    // Ensure we don't get stuck in running forever if the extension crashed. 
    // We check for completed or failed
    if (task.status === 'completed' || task.status === 'failed') {
      return task;
    }
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Timeout - mark as failed
  const taskFinal = grokTasks.get(id);
  if (taskFinal) {
    taskFinal.status = 'failed';
    taskFinal.result = { type: taskFinal.mode.includes('Video') ? 'video' : 'image', error: 'Timeout waiting for Grok extension' };
  }
  throw new Error("Grok task timed out waiting for extension");
}
