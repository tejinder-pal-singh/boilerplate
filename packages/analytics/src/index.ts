import { v4 as uuidv4 } from 'uuid';

interface AnalyticsEvent {
  eventName: string;
  properties: Record<string, any>;
  timestamp: number;
  sessionId: string;
  userId?: string;
}

interface AnalyticsConfig {
  endpoint: string;
  batchSize?: number;
  flushInterval?: number;
  samplingRate?: number;
  debug?: boolean;
}

class Analytics {
  private static instance: Analytics;
  private endpoint: string;
  private batchSize: number;
  private flushInterval: number;
  private samplingRate: number;
  private debug: boolean;
  private eventQueue: AnalyticsEvent[] = [];
  private sessionId: string;
  private userId?: string;
  private isReporting: boolean = false;

  private constructor(config: AnalyticsConfig) {
    this.endpoint = config.endpoint;
    this.batchSize = config.batchSize || 50;
    this.flushInterval = config.flushInterval || 5000;
    this.samplingRate = config.samplingRate || 1;
    this.debug = config.debug || false;
    this.sessionId = this.getSessionId();
    
    this.startReporting();
    this.initializePageTracking();
  }

  public static getInstance(config: AnalyticsConfig): Analytics {
    if (!Analytics.instance) {
      Analytics.instance = new Analytics(config);
    }
    return Analytics.instance;
  }

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('analytics_session_id');
    if (!sessionId) {
      sessionId = uuidv4();
      sessionStorage.setItem('analytics_session_id', sessionId);
    }
    return sessionId;
  }

  private shouldSampleEvent(): boolean {
    return Math.random() < this.samplingRate;
  }

  private initializePageTracking(): void {
    if (typeof window === 'undefined') return;

    // Track page views
    this.trackEvent('page_view', {
      path: window.location.pathname,
      referrer: document.referrer,
    });

    // Track navigation
    const pushState = history.pushState;
    history.pushState = (...args) => {
      pushState.apply(history, args);
      this.trackPageView();
    };

    window.addEventListener('popstate', () => {
      this.trackPageView();
    });

    // Track user engagement
    let lastActivityTime = Date.now();
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    
    activityEvents.forEach(eventType => {
      window.addEventListener(eventType, () => {
        const now = Date.now();
        if (now - lastActivityTime > 30000) { // 30 seconds threshold
          this.trackEvent('user_engagement', {
            duration: now - lastActivityTime,
          });
        }
        lastActivityTime = now;
      });
    });
  }

  private trackPageView(): void {
    this.trackEvent('page_view', {
      path: window.location.pathname,
      referrer: document.referrer,
    });
  }

  public setUserId(userId: string): void {
    this.userId = userId;
    this.trackEvent('user_identified', { userId });
  }

  public trackEvent(eventName: string, properties: Record<string, any> = {}): void {
    if (!this.shouldSampleEvent()) return;

    const event: AnalyticsEvent = {
      eventName,
      properties: {
        ...properties,
        url: window.location.href,
        userAgent: navigator.userAgent,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        viewportSize: `${window.innerWidth}x${window.innerHeight}`,
      },
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
    };

    if (this.debug) {
      console.log('Analytics Event:', event);
    }

    this.eventQueue.push(event);

    if (this.eventQueue.length >= this.batchSize) {
      this.flushEvents();
    }
  }

  private async flushEvents(): Promise<void> {
    if (this.eventQueue.length === 0 || this.isReporting) return;

    this.isReporting = true;
    const events = [...this.eventQueue];
    this.eventQueue = [];

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          events,
          timestamp: Date.now(),
          sessionId: this.sessionId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to report events');
      }
    } catch (error) {
      console.error('Error reporting events:', error);
      // Re-queue failed events
      this.eventQueue = [...events, ...this.eventQueue];
    } finally {
      this.isReporting = false;
    }
  }

  private startReporting(): void {
    setInterval(() => this.flushEvents(), this.flushInterval);

    // Flush events before page unload
    window.addEventListener('beforeunload', () => {
      this.flushEvents();
    });
  }

  public getEventQueue(): AnalyticsEvent[] {
    return [...this.eventQueue];
  }

  public clearEventQueue(): void {
    this.eventQueue = [];
  }

  public setConfig(config: Partial<AnalyticsConfig>): void {
    if (config.batchSize) this.batchSize = config.batchSize;
    if (config.flushInterval) this.flushInterval = config.flushInterval;
    if (config.samplingRate) this.samplingRate = config.samplingRate;
    if (config.debug !== undefined) this.debug = config.debug;
  }
}

// React Hook for analytics
export function useAnalytics(config: AnalyticsConfig) {
  const analytics = Analytics.getInstance(config);

  return {
    trackEvent: (eventName: string, properties?: Record<string, any>) => 
      analytics.trackEvent(eventName, properties),
    setUserId: (userId: string) => analytics.setUserId(userId),
    getEventQueue: () => analytics.getEventQueue(),
    clearEventQueue: () => analytics.clearEventQueue(),
    setConfig: (config: Partial<AnalyticsConfig>) => analytics.setConfig(config),
  };
}

export default Analytics;
