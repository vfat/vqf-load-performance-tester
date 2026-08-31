export interface TaskSchedulerOptions {
  concurrency?: number;
}

interface QueuedTask<T> {
  taskFn: () => Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: any) => void;
}

export class TaskScheduler {
  private concurrency: number;
  private queue: QueuedTask<any>[] = [];
  private runningCount = 0;
  private aborted = false;
  private abortReason: string | null = null;

  constructor(options: TaskSchedulerOptions = {}) {
    this.concurrency = Math.max(1, options.concurrency ?? 2);
  }

  get activeCount(): number {
    return this.runningCount;
  }

  get pendingCount(): number {
    return this.queue.length;
  }

  get isAborted(): boolean {
    return this.aborted;
  }

  enqueue<T>(taskFn: () => Promise<T>): Promise<T> {
    if (this.aborted) {
      return Promise.reject(new Error(this.abortReason || 'Task scheduler is aborted'));
    }

    return new Promise<T>((resolve, reject) => {
      this.queue.push({ taskFn, resolve, reject });
      this.processNext();
    });
  }

  abort(reason = 'Task scheduler aborted'): void {
    this.aborted = true;
    this.abortReason = reason;

    // Drain and reject all pending tasks
    while (this.queue.length > 0) {
      const item = this.queue.shift();
      if (item) {
        item.reject(new Error(reason));
      }
    }
  }

  private async processNext(): Promise<void> {
    if (this.aborted || this.runningCount >= this.concurrency || this.queue.length === 0) {
      return;
    }

    const nextItem = this.queue.shift();
    if (!nextItem) return;

    this.runningCount++;

    try {
      const result = await nextItem.taskFn();
      nextItem.resolve(result);
    } catch (error) {
      nextItem.reject(error);
    } finally {
      this.runningCount--;
      this.processNext();
    }
  }
}
