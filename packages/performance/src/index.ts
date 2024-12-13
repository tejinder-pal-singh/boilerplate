import { ReportHandler } from 'web-vitals';

interface PerformanceMetric {
  name: string;
  value: number;
  delta: number;
  id: string;
  entries: PerformanceEntry[];
}

interface ResourceTiming {
  name: string;
  initiatorType: string;
  duration: number;
  transferSize: number;
  decodedBodySize: number;
  encodedBodySize: number;
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metricsQueue: PerformanceMetric[] = [];
  private flushInterval: number = 5000; // 5 seconds
  private endpoint: string;
  private batchSize: number = 50;
  private isReporting: boolean = false;

  private constructor(endpoint: string) {
    this.endpoint = endpoint;
    this.initWebVitals();
    this.initPerformanceObserver();
    this.startReporting();
  }

  public static getInstance(endpoint: string): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor(endpoint);
    }
    return PerformanceMonitor.instance;
  }

  private initWebVitals(): void {
    import('web-vitals').then(({ onCLS, onFID, onFCP, onLCP, onTTFB }) => {
      const reportHandler: ReportHandler = (metric) => {
        this.queueMetric({
          name: metric.name,
          value: metric.value,
          delta: metric.delta,
          id: metric.id,
          entries: metric.entries,
        });
      };

      onCLS(reportHandler);
      onFID(reportHandler);
      onFCP(reportHandler);
      onLCP(reportHandler);
      onTTFB(reportHandler);
    });
  }

  private initPerformanceObserver(): void {
    if (typeof window === 'undefined') return;

    // Resource timing
    const resourceObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries() as PerformanceResourceTiming[];
      entries.forEach((entry) => {
        this.queueMetric({
          name: 'resource-timing',
          value: entry.duration,
          delta: 0,
          id: entry.name,
          entries: [entry],
        });
      });
    });

    resourceObserver.observe({ entryTypes: ['resource'] });

    // Long tasks
    const longTaskObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        this.queueMetric({
          name: 'long-task',
          value: entry.duration,
          delta: 0,
          id: 'long-task-' + Date.now(),
          entries: [entry],
        });
      });
    });

    longTaskObserver.observe({ entryTypes: ['longtask'] });

    // Paint timing
    const paintObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        this.queueMetric({
          name: entry.name,
          value: entry.startTime,
          delta: 0,
          id: entry.name + '-' + Date.now(),
          entries: [entry],
        });
      });
    });

    paintObserver.observe({ entryTypes: ['paint'] });

    // Layout shifts
    const layoutShiftObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        this.queueMetric({
          name: 'layout-shift',
          value: (entry as any).value,
          delta: 0,
          id: 'layout-shift-' + Date.now(),
          entries: [entry],
        });
      });
    });

    layoutShiftObserver.observe({ entryTypes: ['layout-shift'] });
  }

  private queueMetric(metric: PerformanceMetric): void {
    this.metricsQueue.push(metric);
    
    if (this.metricsQueue.length >= this.batchSize) {
      this.flushMetrics();
    }
  }

  private async flushMetrics(): Promise<void> {
    if (this.metricsQueue.length === 0 || this.isReporting) return;

    this.isReporting = true;
    const metrics = [...this.metricsQueue];
    this.metricsQueue = [];

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          metrics,
          timestamp: Date.now(),
          url: window.location.href,
          userAgent: navigator.userAgent,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to report metrics');
      }
    } catch (error) {
      console.error('Error reporting metrics:', error);
      // Re-queue failed metrics
      this.metricsQueue = [...metrics, ...this.metricsQueue];
    } finally {
      this.isReporting = false;
    }
  }

  private startReporting(): void {
    setInterval(() => this.flushMetrics(), this.flushInterval);
  }

  public getResourceTimings(): ResourceTiming[] {
    const resources = performance.getEntriesByType('resource');
    return resources.map((entry) => ({
      name: entry.name,
      initiatorType: (entry as PerformanceResourceTiming).initiatorType,
      duration: entry.duration,
      transferSize: (entry as PerformanceResourceTiming).transferSize,
      decodedBodySize: (entry as PerformanceResourceTiming).decodedBodySize,
      encodedBodySize: (entry as PerformanceResourceTiming).encodedBodySize,
    }));
  }

  public clearMetrics(): void {
    performance.clearResourceTimings();
    this.metricsQueue = [];
  }

  public getMetricsQueue(): PerformanceMetric[] {
    return [...this.metricsQueue];
  }

  public setFlushInterval(interval: number): void {
    this.flushInterval = interval;
  }

  public setBatchSize(size: number): void {
    this.batchSize = size;
  }
}

// React Hook for performance monitoring
export function usePerformanceMonitoring(endpoint: string) {
  const monitor = PerformanceMonitor.getInstance(endpoint);

  return {
    getResourceTimings: () => monitor.getResourceTimings(),
    clearMetrics: () => monitor.clearMetrics(),
    getMetricsQueue: () => monitor.getMetricsQueue(),
    setFlushInterval: (interval: number) => monitor.setFlushInterval(interval),
    setBatchSize: (size: number) => monitor.setBatchSize(size),
  };
}

export default PerformanceMonitor;
