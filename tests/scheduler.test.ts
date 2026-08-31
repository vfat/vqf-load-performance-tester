import { describe, it, expect } from 'vitest';
import { TaskScheduler } from '../src/lib/server/scheduler.js';

describe('TaskScheduler (TDD-001)', () => {
  it('should execute enqueued tasks and return their results', async () => {
    const scheduler = new TaskScheduler({ concurrency: 2 });
    
    const task1 = scheduler.enqueue(async () => {
      return 'result-1';
    });
    const task2 = scheduler.enqueue(async () => {
      return 'result-2';
    });

    const [res1, res2] = await Promise.all([task1, task2]);
    expect(res1).toBe('result-1');
    expect(res2).toBe('result-2');
  });

  it('should enforce concurrency limit', async () => {
    const scheduler = new TaskScheduler({ concurrency: 2 });
    let maxConcurrent = 0;
    let currentConcurrent = 0;

    const createTask = (durationMs: number) => {
      return scheduler.enqueue(async () => {
        currentConcurrent++;
        if (currentConcurrent > maxConcurrent) {
          maxConcurrent = currentConcurrent;
        }
        await new Promise((resolve) => setTimeout(resolve, durationMs));
        currentConcurrent--;
        return true;
      });
    };

    const tasks = [
      createTask(50),
      createTask(50),
      createTask(50),
      createTask(50)
    ];

    await Promise.all(tasks);
    expect(maxConcurrent).toBe(2);
    expect(scheduler.pendingCount).toBe(0);
    expect(scheduler.activeCount).toBe(0);
  });

  it('should abort pending tasks when abort() is called', async () => {
    const scheduler = new TaskScheduler({ concurrency: 1 });
    
    const task1 = scheduler.enqueue(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
      return 'task-1';
    });

    const task2 = scheduler.enqueue(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
      return 'task-2';
    });

    const task3 = scheduler.enqueue(async () => {
      return 'task-3';
    });

    // Attach rejection assertions immediately to avoid unhandled rejection warning
    const expectTask2Rejects = expect(task2).rejects.toThrow('User emergency stop');
    const expectTask3Rejects = expect(task3).rejects.toThrow('User emergency stop');

    // Abort after tasks are enqueued
    scheduler.abort('User emergency stop');

    const res1 = await task1;
    expect(res1).toBe('task-1');

    await expectTask2Rejects;
    await expectTask3Rejects;
    expect(scheduler.pendingCount).toBe(0);
  });
});

