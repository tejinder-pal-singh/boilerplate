import { createContext, useContext, useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

interface Experiment {
  id: string;
  name: string;
  description: string;
  variants: Variant[];
  status: 'draft' | 'running' | 'paused' | 'completed';
  startDate?: Date;
  endDate?: Date;
  targetingRules?: TargetingRule[];
  metadata?: Record<string, any>;
}

interface Variant {
  id: string;
  name: string;
  weight: number;
  config: Record<string, any>;
}

interface TargetingRule {
  id: string;
  type: 'user' | 'group' | 'environment' | 'custom';
  condition: (context: any) => boolean;
}

interface ExperimentContext {
  userId?: string;
  groupId?: string;
  environment: string;
  [key: string]: any;
}

interface ExperimentResult {
  experimentId: string;
  variantId: string;
  userId?: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

class ExperimentManager {
  private static instance: ExperimentManager;
  private experiments: Map<string, Experiment> = new Map();
  private assignments: Map<string, string> = new Map();
  private context: ExperimentContext;
  private endpoint: string;
  private subscribers: Set<(experiments: Map<string, Experiment>) => void> = new Set();
  private storage: Storage;

  private constructor(endpoint: string, context: ExperimentContext) {
    this.endpoint = endpoint;
    this.context = context;
    this.storage = typeof localStorage !== 'undefined' ? localStorage : null;
    this.loadAssignments();
    this.fetchExperiments();
  }

  public static getInstance(
    endpoint: string,
    context: ExperimentContext
  ): ExperimentManager {
    if (!ExperimentManager.instance) {
      ExperimentManager.instance = new ExperimentManager(endpoint, context);
    }
    return ExperimentManager.instance;
  }

  private async fetchExperiments(): Promise<void> {
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(this.context),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch experiments');
      }

      const experiments: Experiment[] = await response.json();
      this.experiments = new Map(experiments.map(exp => [exp.id, exp]));
      this.notifySubscribers();
    } catch (error) {
      console.error('Error fetching experiments:', error);
    }
  }

  private notifySubscribers(): void {
    this.subscribers.forEach(callback => callback(this.experiments));
  }

  private loadAssignments(): void {
    if (!this.storage) return;

    try {
      const stored = this.storage.getItem('experiment_assignments');
      if (stored) {
        this.assignments = new Map(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading experiment assignments:', error);
    }
  }

  private saveAssignments(): void {
    if (!this.storage) return;

    try {
      const assignments = Array.from(this.assignments.entries());
      this.storage.setItem('experiment_assignments', JSON.stringify(assignments));
    } catch (error) {
      console.error('Error saving experiment assignments:', error);
    }
  }

  private isEligible(experiment: Experiment): boolean {
    // Check status
    if (experiment.status !== 'running') return false;

    // Check dates
    const now = new Date();
    if (experiment.startDate && now < experiment.startDate) return false;
    if (experiment.endDate && now > experiment.endDate) return false;

    // Check targeting rules
    if (experiment.targetingRules?.length) {
      return experiment.targetingRules.every(rule => {
        try {
          return rule.condition(this.context);
        } catch (error) {
          console.error(`Error evaluating targeting rule ${rule.id}:`, error);
          return false;
        }
      });
    }

    return true;
  }

  private assignVariant(experiment: Experiment): Variant {
    // Check for existing assignment
    const existingVariantId = this.assignments.get(experiment.id);
    if (existingVariantId) {
      const variant = experiment.variants.find(v => v.id === existingVariantId);
      if (variant) return variant;
    }

    // Calculate total weight
    const totalWeight = experiment.variants.reduce((sum, v) => sum + v.weight, 0);

    // Generate random number
    const hash = this.hashString(`${experiment.id}:${this.context.userId || ''}`);
    const random = (hash % 100) / 100;

    // Select variant based on weights
    let cumulative = 0;
    for (const variant of experiment.variants) {
      cumulative += variant.weight / totalWeight;
      if (random <= cumulative) {
        this.assignments.set(experiment.id, variant.id);
        this.saveAssignments();
        this.trackAssignment(experiment.id, variant.id);
        return variant;
      }
    }

    // Fallback to first variant
    const fallbackVariant = experiment.variants[0];
    this.assignments.set(experiment.id, fallbackVariant.id);
    this.saveAssignments();
    this.trackAssignment(experiment.id, fallbackVariant.id);
    return fallbackVariant;
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

  private async trackAssignment(experimentId: string, variantId: string): Promise<void> {
    const result: ExperimentResult = {
      experimentId,
      variantId,
      userId: this.context.userId,
      timestamp: Date.now(),
    };

    try {
      await fetch(`${this.endpoint}/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(result),
      });
    } catch (error) {
      console.error('Error tracking experiment assignment:', error);
    }
  }

  public getVariant(experimentId: string): Variant | null {
    const experiment = this.experiments.get(experimentId);
    if (!experiment || !this.isEligible(experiment)) return null;
    return this.assignVariant(experiment);
  }

  public getAllExperiments(): Experiment[] {
    return Array.from(this.experiments.values());
  }

  public subscribe(callback: (experiments: Map<string, Experiment>) => void): () => void {
    this.subscribers.add(callback);
    callback(this.experiments);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  public updateContext(newContext: Partial<ExperimentContext>): void {
    this.context = { ...this.context, ...newContext };
    this.fetchExperiments();
  }

  public clearAssignments(): void {
    this.assignments.clear();
    this.saveAssignments();
  }
}

// React Context
const ExperimentContext = createContext<ExperimentManager | null>(null);

// React Provider
export const ExperimentProvider: React.FC<{
  children: React.ReactNode;
  endpoint: string;
  context: ExperimentContext;
}> = ({ children, endpoint, context }) => {
  const manager = ExperimentManager.getInstance(endpoint, context);

  return (
    <ExperimentContext.Provider value={manager}>
      {children}
    </ExperimentContext.Provider>
  );
};

// React Hook
export function useExperiment(experimentId: string): Variant | null {
  const manager = useContext(ExperimentContext);
  const [variant, setVariant] = useState<Variant | null>(null);

  useEffect(() => {
    if (!manager) return;

    const unsubscribe = manager.subscribe(() => {
      setVariant(manager.getVariant(experimentId));
    });

    return unsubscribe;
  }, [manager, experimentId]);

  return variant;
}

// Experiment Component
export const Experiment: React.FC<{
  id,
  children,
}: {
  id: string;
  children: (variant: Variant) => React.ReactNode;
}) {
  const variant = useExperiment(id);
  return variant ? children(variant) : null;
}

export default ExperimentManager;
