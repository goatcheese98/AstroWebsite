export type WorkerTaskType = "image" | "sketch" | "diagram-render";

export interface WorkerTask {
  id: string;
  type: WorkerTaskType;
  chatId: string;
  messageId: string;
  payload: Record<string, unknown>;
  createdAt: number;
}

export interface WorkerTaskResult {
  taskId: string;
  status: "completed" | "failed";
  artifacts?: Array<Record<string, unknown>>;
  error?: string;
  completedAt: number;
}

export interface WorkerQueueAdapter {
  enqueue(task: WorkerTask): Promise<void>;
  poll(taskId: string): Promise<WorkerTaskResult | null>;
}
