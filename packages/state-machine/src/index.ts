import { createContext, useContext, useState, useEffect } from 'react';

type StateValue = string;
type EventType = string;
type Context = Record<string, any>;
type Guard = (context: Context, event: any) => boolean;
type Action = (context: Context, event: any) => void | Promise<void>;

interface Transition {
  target: StateValue;
  guards?: Guard[];
  actions?: Action[];
}

interface State {
  type: 'atomic' | 'compound' | 'parallel';
  initial?: StateValue;
  states?: Record<StateValue, State>;
  on?: Record<EventType, Transition | Transition[]>;
  entry?: Action[];
  exit?: Action[];
  invoke?: {
    src: (context: Context) => Promise<any>;
    onDone?: Transition;
    onError?: Transition;
  };
}

interface MachineConfig {
  id: string;
  initial: StateValue;
  context?: Context;
  states: Record<StateValue, State>;
}

interface StateNode {
  value: StateValue;
  context: Context;
  actions: Action[];
  guards: Guard[];
  history: Array<{ value: StateValue; context: Context }>;
}

class StateMachine {
  private config: MachineConfig;
  private currentState: StateNode;
  private subscribers: Set<(state: StateNode) => void>;
  private interpreter?: NodeJS.Timeout;
  private transitionQueue: Array<{ event: string; payload: any }> = [];
  private isProcessing: boolean = false;

  constructor(config: MachineConfig) {
    this.config = config;
    this.subscribers = new Set();
    this.currentState = {
      value: config.initial,
      context: config.context || {},
      actions: [],
      guards: [],
      history: [],
    };
  }

  private async executeActions(
    actions: Action[],
    context: Context,
    event: any
  ): Promise<void> {
    for (const action of actions) {
      await action(context, event);
    }
  }

  private evaluateGuards(guards: Guard[], context: Context, event: any): boolean {
    return guards.every(guard => guard(context, event));
  }

  private getStateConfig(value: StateValue): State {
    return this.config.states[value];
  }

  private async processTransitionQueue(): Promise<void> {
    if (this.isProcessing || this.transitionQueue.length === 0) return;

    this.isProcessing = true;
    const { event, payload } = this.transitionQueue.shift()!;

    try {
      await this.transition(event, payload);
    } finally {
      this.isProcessing = false;
      if (this.transitionQueue.length > 0) {
        await this.processTransitionQueue();
      }
    }
  }

  public async transition(event: string, payload?: any): Promise<void> {
    if (this.isProcessing) {
      this.transitionQueue.push({ event, payload });
      return;
    }

    const stateConfig = this.getStateConfig(this.currentState.value);
    const transitions = stateConfig.on?.[event];

    if (!transitions) return;

    const transitionList = Array.isArray(transitions) ? transitions : [transitions];

    for (const transition of transitionList) {
      if (
        transition.guards &&
        !this.evaluateGuards(transition.guards, this.currentState.context, payload)
      ) {
        continue;
      }

      // Execute exit actions
      if (stateConfig.exit) {
        await this.executeActions(
          stateConfig.exit,
          this.currentState.context,
          payload
        );
      }

      // Execute transition actions
      if (transition.actions) {
        await this.executeActions(
          transition.actions,
          this.currentState.context,
          payload
        );
      }

      // Update history
      this.currentState.history.push({
        value: this.currentState.value,
        context: { ...this.currentState.context },
      });

      // Update state
      const nextState = this.getStateConfig(transition.target);
      this.currentState.value = transition.target;

      // Execute entry actions
      if (nextState.entry) {
        await this.executeActions(
          nextState.entry,
          this.currentState.context,
          payload
        );
      }

      // Handle invocations
      if (nextState.invoke) {
        try {
          const result = await nextState.invoke.src(this.currentState.context);
          if (nextState.invoke.onDone) {
            await this.transition('done', result);
          }
        } catch (error) {
          if (nextState.invoke.onError) {
            await this.transition('error', error);
          }
        }
      }

      this.notify();
      break;
    }
  }

  private notify(): void {
    this.subscribers.forEach(subscriber => subscriber(this.currentState));
  }

  public subscribe(callback: (state: StateNode) => void): () => void {
    this.subscribers.add(callback);
    callback(this.currentState);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  public getState(): StateNode {
    return this.currentState;
  }

  public can(event: string): boolean {
    const stateConfig = this.getStateConfig(this.currentState.value);
    return !!stateConfig.on?.[event];
  }

  public matches(value: StateValue): boolean {
    return this.currentState.value === value;
  }

  public send(event: string, payload?: any): void {
    this.transition(event, payload);
  }

  public reset(): void {
    this.currentState = {
      value: this.config.initial,
      context: this.config.context || {},
      actions: [],
      guards: [],
      history: [],
    };
    this.notify();
  }

  public undo(): void {
    if (this.currentState.history.length === 0) return;

    const previous = this.currentState.history.pop()!;
    this.currentState.value = previous.value;
    this.currentState.context = { ...previous.context };
    this.notify();
  }
}

// React Context
const MachineContext = createContext<StateMachine | null>(null);

// React Provider
export const MachineProvider: React.FC<{
  children,
  config,
}: {
  children: React.ReactNode;
  config: MachineConfig;
}) {
  const [machine] = useState(() => new StateMachine(config));

  return (
    <MachineContext.Provider value={machine}>
      {children}
    </MachineContext.Provider>
  );
}

// React Hook
export function useMachine() {
  const machine = useContext(MachineContext);
  if (!machine) {
    throw new Error('useMachine must be used within a MachineProvider');
  }

  const [state, setState] = useState(machine.getState());

  useEffect(() => {
    return machine.subscribe(setState);
  }, [machine]);

  return {
    state,
    send: (event: string, payload?: any) => machine.send(event, payload),
    can: (event: string) => machine.can(event),
    matches: (value: StateValue) => machine.matches(value),
    reset: () => machine.reset(),
    undo: () => machine.undo(),
  };
}

export { StateMachine, type MachineConfig, type State, type Transition };

// Example usage:
// const machineConfig: MachineConfig = {
//   id: 'traffic-light',
//   initial: 'red',
//   context: { count: 0 },
//   states: {
//     red: {
//       on: {
//         NEXT: {
//           target: 'green',
//           actions: [(ctx) => ctx.count++],
//         },
//       },
//     },
//     yellow: {
//       on: {
//         NEXT: {
//           target: 'red',
//           guards: [(ctx) => ctx.count < 10],
//         },
//       },
//     },
//     green: {
//       on: {
//         NEXT: { target: 'yellow' },
//       },
//       invoke: {
//         src: async (ctx) => {
//           await new Promise(resolve => setTimeout(resolve, 1000));
//           return 'timeout';
//         },
//         onDone: { target: 'yellow' },
//       },
//     },
//   },
// };
export default ExperimentManager;
