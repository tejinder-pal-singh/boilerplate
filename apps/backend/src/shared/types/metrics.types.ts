export type MetricType = 'counter' | 'gauge' | 'histogram' | 'summary';

export interface MetricLabels {
  [key: string]: string | number | boolean;
}

export interface MetricOptions {
  name: string;
  help: string;
  labelNames?: string[];
  buckets?: number[];
  percentiles?: number[];
  maxAgeSeconds?: number;
  ageBuckets?: number;
}

export interface MetricValue {
  value: number;
  labels?: MetricLabels;
  timestamp?: number;
}

export interface HistogramBucket {
  le: number;
  count: number;
}

export interface HistogramValue extends MetricValue {
  buckets: HistogramBucket[];
  sum: number;
  count: number;
}

export interface MetricsExporter {
  format: 'prometheus' | 'opentelemetry' | 'json';
  endpoint?: string;
  interval?: number;
  labels?: MetricLabels;
}

export interface ServiceMetrics {
  requestCount: number;
  requestDuration: HistogramValue;
  errorCount: number;
  activeConnections: number;
  memoryUsage: number;
  cpuUsage: number;
}

export interface DatabaseMetrics {
  queryCount: number;
  queryDuration: HistogramValue;
  connectionPoolSize: number;
  activeConnections: number;
  waitingQueries: number;
}
