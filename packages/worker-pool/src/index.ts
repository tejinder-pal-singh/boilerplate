type WorkerStatus = 'idle' | 'busy' | 'error';
type TaskPriority = 'low' | 'medium' | 'high';

interface Task<T = any> {
  id: string;
  fn: () => Promise<T>;
  priority: TaskPriority;
  timeout?: number;
  retries?: number;
  onSuccess?: (result: T) => void;
  onError?: (error: Error) => void;
  onProgress?: (progress: number) => void;
}

interface WorkerInfo {
  id: string;
  status: WorkerStatus;
  taskCount: number;
  lastActive: Date;
  currentTask?: string;
  errors: Error[];
}

interface PoolMetrics {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageTaskTime: number;
  workerUtilization: number;
  queueLength: number;
  activeWorkers: number;
}

class Worker {
  private id: string;
  private status: WorkerStatus = 'idle';
  private taskCount: number = 0;
  private lastActive: Date = new Date();
  private currentTask?: string;
  private errors: Error[] = [];

  constructor(id: string) {
    this.id = id;
  }

  public async executeTask<T>(task: Task<T>): Promise<T> {
    this.status = 'busy';
    this.currentTask = task.id;
    this.lastActive = new Date();

    try {
      const result = await Promise.race([
        task.fn(),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('Task timeout')),
            task.timeout || 30000
          )
        ),
      ]);

      this.taskCount++;
      this.status = 'idle';
      this.currentTask = undefined;
      task.onSuccess?.(result);
      return result;
    } catch (error) {
      this.status = 'error';
      this.errors.push(error as Error);
      task.onError?.(error as Error);
      throw error;
    }
  }

  public getInfo(): WorkerInfo {
    return {
      id: this.id,
      status: this.status,
      taskCount: this.taskCount,
      lastActive: this.lastActive,
      currentTask: this.currentTask,
      errors: this.errors,
    };
  }

  public reset(): void {
    this.status = 'idle';
    this.currentTask = undefined;
    this.errors = [];
  }
}

class WorkerPool {
  private workers: Worker[] = [];
  private taskQueue: Task[] = [];
  private poolSize: number;
  private metrics: {
    startTime: Date;
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    taskTimes: number[];
  };

  constructor(poolSize: number) {
    this.poolSize = poolSize;
    this.metrics = {
      startTime: new Date(),
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      taskTimes: [],
    };

    for (let i = 0; i < poolSize; i++) {
      this.workers.push(new Worker(`worker-${i}`));
    }

    // Start task processing loop
    this.processQueue();
  }

  private async processQueue(): Promise<void> {
    while (true) {
      if (this.taskQueue.length === 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
        continue;
      }

      const availableWorker = this.workers.find(w => w.getInfo().status === 'idle');
      if (!availableWorker) {
        await new Promise(resolve => setTimeout(resolve, 100));
        continue;
      }

      // Sort queue by priority
      this.taskQueue.sort((a, b) => {
        const priorityMap = { high: 3, medium: 2, low: 1 };
        return priorityMap[b.priority] - priorityMap[a.priority];
      });

      const task = this.taskQueue.shift()!;
      const startTime = Date.now();

      try {
        await availableWorker.executeTask(task);
        this.metrics.taskTimes.push(Date.now() - startTime);
        this.metrics.completedTasks++;
      } catch (error) {
        this.metrics.failedTasks++;
        if (task.retries && task.retries > 0) {
          this.taskQueue.push({ ...task, retries: task.retries - 1 });
        }
      }
    }
  }

  public async addTask<T>(
    fn: () => Promise<T>,
    options: Partial<Omit<Task<T>, 'id' | 'fn'>> = {}
  ): Promise<T> {
    const task: Task<T> = {
      id: Math.random().toString(36).substr(2, 9),
      fn,
      priority: options.priority || 'medium',
      timeout: options.timeout,
      retries: options.retries,
      onSuccess: options.onSuccess,
      onError: options.onError,
      onProgress: options.onProgress,
    };

    this.metrics.totalTasks++;
    this.taskQueue.push(task);

    return new Promise((resolve, reject) => {
      task.onSuccess = result => {
        options.onSuccess?.(result);
        resolve(result);
      };
      task.onError = error => {
        options.onError?.(error);
        reject(error);
      };
    });
  }

  public getMetrics(): PoolMetrics {
    const now = Date.now();
    const totalTime = now - this.metrics.startTime.getTime();
    const averageTaskTime =
      this.metrics.taskTimes.length > 0
        ? this.metrics.taskTimes.reduce((a, b) => a + b, 0) /
          this.metrics.taskTimes.length
        : 0;

    const activeWorkers = this.workers.filter(
      w => w.getInfo().status === 'busy'
    ).length;

    return {
      totalTasks: this.metrics.totalTasks,
      completedTasks: this.metrics.completedTasks,
      failedTasks: this.metrics.failedTasks,
      averageTaskTime,
      workerUtilization: activeWorkers / this.poolSize,
      queueLength: this.taskQueue.length,
      activeWorkers,
    };
  }

  public getWorkerInfo(): WorkerInfo[] {
    return this.workers.map(worker => worker.getInfo());
  }

  public resize(newSize: number): void {
    if (newSize > this.poolSize) {
      for (let i = this.poolSize; i < newSize; i++) {
        this.workers.push(new Worker(`worker-${i}`));
      }
    } else if (newSize < this.poolSize) {
      this.workers = this.workers.slice(0, newSize);
    }
    this.poolSize = newSize;
  }

  public reset(): void {
    this.workers.forEach(worker => worker.reset());
    this.taskQueue = [];
    this.metrics = {
      startTime: new Date(),
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      taskTimes: [],
    };
  }
}

// React integration
import { createContext, useContext, useState, useEffect } from 'react';

const WorkerPoolContext = createContext<WorkerPool | null>(null);

export const WorkerPoolProvider: React.FC<{
  children,
  poolSize,
}: {
  children: React.ReactNode;
  poolSize: number;
}): JSX.Element {
  const [pool] = useState(() => new WorkerPool(poolSize));

  return (
    <WorkerPoolContext.Provider value={pool}>
      {children}
    </WorkerPoolContext.Provider>
  );
}

export function useWorkerPool() {
  const pool = useContext(WorkerPoolContext);
  if (!pool) {
    throw new Error('useWorkerPool must be used within a WorkerPoolProvider');
  }

  const [metrics, setMetrics] = useState<PoolMetrics>(pool.getMetrics());

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(pool.getMetrics());
    }, 1000);

    return () => clearInterval(interval);
  }, [pool]);

  return {
    addTask: pool.addTask.bind(pool),
    getMetrics: () => metrics,
    getWorkerInfo: pool.getWorkerInfo.bind(pool),
    resize: pool.resize.bind(pool),
    reset: pool.reset.bind(pool),
  };
}

export {
  WorkerPool,
  type Task,
  type WorkerInfo,
  type PoolMetrics,
  type TaskPriority,
};

// Example usage:
// const pool = new WorkerPool(4);
//
// // Add a task
// await pool.addTask(
//   async () => {
//     // Simulate work
//     await new Promise(resolve => setTimeout(resolve, 1000));
//     return 'Task completed';
//   },
//   {
//     priority: 'high',
//     timeout: 5000,
//     retries: 3,
//     onProgress: (progress) => console.log('Progress:', progress),
//   }
// );
//
// // React usage
// function MyComponent() {
//   const { addTask, getMetrics } = useWorkerPool();
//   const metrics = getMetrics();
//
//   const handleClick = async () => {
//     try {
//       const result = await addTask(
//         async () => {
//           // Do some work
//           return 'Success';
//         },
//         { priority: 'high' }
//       );
//       console.log('Task result:', result);
//     } catch (error) {
//       console.error('Task failed:', error);
//     }
//   };
//
//   return (
//     <div>
//       <button onClick={handleClick}>Run Task</button>
//       <div>Active Workers: {metrics.activeWorkers}</div>
//       <div>Queue Length: {metrics.queueLength}</div>
//     </div>
//   );
// }
export default ExperimentManager;
