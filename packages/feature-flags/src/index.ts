import { createContext, useContext, useEffect, useState } from 'react';

interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  rules?: FeatureRule[];
  dependencies?: string[];
  rolloutPercentage?: number;
  startDate?: Date;
  endDate?: Date;
  metadata?: Record<string, any>;
}

interface FeatureRule {
  id: string;
  type: 'user' | 'group' | 'environment' | 'custom';
  condition: (context: any) => boolean;
  priority: number;
}

interface FeatureContext {
  userId?: string;
  groupId?: string;
  environment: string;
  [key: string]: any;
}

class FeatureManager {
  private static instance: FeatureManager;
  private flags: Map<string, FeatureFlag> = new Map();
  private context: FeatureContext;
  private endpoint: string;
  private pollingInterval: number;
  private subscribers: Set<(flags: Map<string, FeatureFlag>) => void> = new Set();
  private cache: Map<string, { result: boolean; timestamp: number }> = new Map();
  private cacheTimeout: number = 5 * 60 * 1000; // 5 minutes

  private constructor(endpoint: string, context: FeatureContext, pollingInterval: number = 60000) {
    this.endpoint = endpoint;
    this.context = context;
    this.pollingInterval = pollingInterval;
    this.startPolling();
  }

  public static getInstance(
    endpoint: string,
    context: FeatureContext,
    pollingInterval?: number
  ): FeatureManager {
    if (!FeatureManager.instance) {
      FeatureManager.instance = new FeatureManager(endpoint, context, pollingInterval);
    }
    return FeatureManager.instance;
  }

  private async fetchFlags(): Promise<void> {
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(this.context),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch feature flags');
      }

      const flags: FeatureFlag[] = await response.json();
      const newFlags = new Map(flags.map(flag => [flag.id, flag]));
      
      this.flags = newFlags;
      this.notifySubscribers();
      this.cache.clear();
    } catch (error) {
      console.error('Error fetching feature flags:', error);
    }
  }

  private startPolling(): void {
    this.fetchFlags();
    setInterval(() => this.fetchFlags(), this.pollingInterval);
  }

  private notifySubscribers(): void {
    this.subscribers.forEach(callback => callback(this.flags));
  }

  public subscribe(callback: (flags: Map<string, FeatureFlag>) => void): () => void {
    this.subscribers.add(callback);
    callback(this.flags);
    
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private evaluateRule(rule: FeatureRule): boolean {
    try {
      return rule.condition(this.context);
    } catch (error) {
      console.error(`Error evaluating rule ${rule.id}:`, error);
      return false;
    }
  }

  private checkDependencies(flag: FeatureFlag): boolean {
    if (!flag.dependencies?.length) return true;
    
    return flag.dependencies.every(depId => this.isEnabled(depId));
  }

  private isInRolloutPercentage(flag: FeatureFlag): boolean {
    if (!flag.rolloutPercentage) return true;
    
    const hash = this.hashString(`${flag.id}:${this.context.userId || ''}`);
    const percentage = (hash % 100) + 1;
    
    return percentage <= flag.rolloutPercentage;
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  public isEnabled(flagId: string): boolean {
    const cached = this.cache.get(flagId);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.result;
    }

    const flag = this.flags.get(flagId);
    if (!flag) return false;

    // Check if flag is globally enabled
    if (!flag.enabled) return false;

    // Check date constraints
    const now = new Date();
    if (flag.startDate && now < flag.startDate) return false;
    if (flag.endDate && now > flag.endDate) return false;

    // Check dependencies
    if (!this.checkDependencies(flag)) return false;

    // Check rollout percentage
    if (!this.isInRolloutPercentage(flag)) return false;

    // Evaluate rules in priority order
    if (flag.rules?.length) {
      const sortedRules = [...flag.rules].sort((a, b) => b.priority - a.priority);
      for (const rule of sortedRules) {
        const result = this.evaluateRule(rule);
        if (result !== null) {
          this.cache.set(flagId, { result, timestamp: Date.now() });
          return result;
        }
      }
    }

    const result = flag.enabled;
    this.cache.set(flagId, { result, timestamp: Date.now() });
    return result;
  }

  public getFlag(flagId: string): FeatureFlag | undefined {
    return this.flags.get(flagId);
  }

  public getAllFlags(): FeatureFlag[] {
    return Array.from(this.flags.values());
  }

  public updateContext(newContext: Partial<FeatureContext>): void {
    this.context = { ...this.context, ...newContext };
    this.cache.clear();
    this.fetchFlags();
  }

  public setCacheTimeout(timeout: number): void {
    this.cacheTimeout = timeout;
  }
}

// React Context
const FeatureFlagContext = createContext<FeatureManager | null>(null);

// React Provider
export const FeatureFlagProvider: React.FC<{
  children,
  endpoint,
  context,
  pollingInterval,
}: {
  children: React.ReactNode;
  endpoint: string;
  context: FeatureContext;
  pollingInterval?: number;
}) {
  const manager = FeatureManager.getInstance(endpoint, context, pollingInterval);

  return (
    <FeatureFlagContext.Provider value={manager}>
      {children}
    </FeatureFlagContext.Provider>
  );
}

// React Hook
export function useFeatureFlag(flagId: string): boolean {
  const manager = useContext(FeatureFlagContext);
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    if (!manager) return;

    const unsubscribe = manager.subscribe(() => {
      setIsEnabled(manager.isEnabled(flagId));
    });

    return unsubscribe;
  }, [manager, flagId]);

  return isEnabled;
}

// Feature Flag Component
export const FeatureFlag: React.FC<{
  flag,
  children,
  fallback = null,
}: {
  flag: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const isEnabled = useFeatureFlag(flag);
  return isEnabled ? children : fallback;
}

export default FeatureManager;
