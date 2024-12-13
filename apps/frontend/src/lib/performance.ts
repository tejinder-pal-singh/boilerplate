import { WebVitals } from 'web-vitals';

export interface PerformanceMetrics {
  FCP: number;  // First Contentful Paint
  LCP: number;  // Largest Contentful Paint
  CLS: number;  // Cumulative Layout Shift
  FID: number;  // First Input Delay
  TTFB: number; // Time to First Byte
  INP: number;  // Interaction to Next Paint
}

export const measureWebVitals = async (): Promise<PerformanceMetrics> => {
  const { getFCP, getLCP, getCLS, getFID, getTTFB, getINP } = await import('web-vitals');
  
  return new Promise((resolve) => {
    const metrics: Partial<PerformanceMetrics> = {};
    let remainingMetrics = 6;

    const resolveIfComplete = () => {
      remainingMetrics--;
      if (remainingMetrics === 0) {
        resolve(metrics as PerformanceMetrics);
      }
    };

    getFCP((metric) => {
      metrics.FCP = metric.value;
      resolveIfComplete();
    });

    getLCP((metric) => {
      metrics.LCP = metric.value;
      resolveIfComplete();
    });

    getCLS((metric) => {
      metrics.CLS = metric.value;
      resolveIfComplete();
    });

    getFID((metric) => {
      metrics.FID = metric.value;
      resolveIfComplete();
    });

    getTTFB((metric) => {
      metrics.TTFB = metric.value;
      resolveIfComplete();
    });

    getINP((metric) => {
      metrics.INP = metric.value;
      resolveIfComplete();
    });
  });
};

export const reportPerformanceMetric = (metric: WebVitals) => {
  // Report to analytics
  if (process.env.NEXT_PUBLIC_ANALYTICS_ID) {
    window.gtag?.('event', metric.name, {
      value: Math.round(metric.value),
      event_category: 'Web Vitals',
      event_label: metric.id,
      non_interaction: true,
    });
  }

  // Report to custom endpoint
  fetch('/api/metrics', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: metric.name,
      value: metric.value,
      id: metric.id,
      timestamp: Date.now(),
    }),
  }).catch(console.error);
};

export const measureResourceTiming = () => {
  if (typeof window === 'undefined') return;

  const resources = performance.getEntriesByType('resource');
  const metrics = resources.reduce((acc, resource) => {
    const type = resource.initiatorType;
    if (!acc[type]) {
      acc[type] = {
        count: 0,
        totalSize: 0,
        totalDuration: 0,
      };
    }

    acc[type].count++;
    acc[type].totalDuration += resource.duration;
    
    // Get size if available
    if ('transferSize' in resource) {
      acc[type].totalSize += (resource as any).transferSize;
    }

    return acc;
  }, {} as Record<string, { count: number; totalSize: number; totalDuration: number }>);

  return metrics;
};

export const measureInteractions = () => {
  if (typeof window === 'undefined') return;

  const interactions: Array<{ name: string; startTime: number; duration: number }> = [];
  
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      interactions.push({
        name: entry.name,
        startTime: entry.startTime,
        duration: entry.duration,
      });
    }
  });

  observer.observe({ entryTypes: ['event'] });

  return () => observer.disconnect();
};

export const measureMemoryUsage = async () => {
  if (typeof window === 'undefined') return;

  if ('memory' in performance) {
    const memory = (performance as any).memory;
    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
    };
  }

  return null;
};
