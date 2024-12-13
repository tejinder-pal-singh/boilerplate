import { EventEmitter } from '@/packages/event-system';

type MessageHandler = (data: any) => void | Promise<void>;
type ErrorHandler = (error: Error) => void;
type ConnectionHandler = () => void;

interface WebSocketOptions {
  reconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  pingInterval?: number;
  pongTimeout?: number;
  protocols?: string | string[];
  headers?: Record<string, string>;
  autoConnect?: boolean;
}

interface SubscriptionOptions {
  once?: boolean;
  filter?: (data: any) => boolean;
  transform?: (data: any) => any;
}

class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private options: Required<WebSocketOptions>;
  private reconnectAttempts: number = 0;
  private pingTimer?: NodeJS.Timeout;
  private pongTimer?: NodeJS.Timeout;
  private reconnectTimer?: NodeJS.Timeout;
  private eventEmitter: EventEmitter;
  private messageHandlers: Map<string, Set<{
    handler: MessageHandler;
    options: SubscriptionOptions;
  }>> = new Map();

  constructor(url: string, options: WebSocketOptions = {}) {
    this.url = url;
    this.options = {
      reconnect: true,
      reconnectInterval: 1000,
      maxReconnectAttempts: 5,
      pingInterval: 30000,
      pongTimeout: 5000,
      protocols: [],
      headers: {},
      autoConnect: true,
      ...options,
    };
    this.eventEmitter = new EventEmitter();

    if (this.options.autoConnect) {
      this.connect();
    }
  }

  public connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    try {
      this.ws = new WebSocket(this.url, this.options.protocols);
      this.setupEventListeners();
      this.startPingInterval();
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  private setupEventListeners(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.eventEmitter.emit('connect', null);
    };

    this.ws.onclose = () => {
      this.eventEmitter.emit('disconnect', null);
      this.handleReconnect();
    };

    this.ws.onerror = (event) => {
      this.handleError(new Error('WebSocket error'));
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        const { type, data } = message;

        if (type === 'pong') {
          this.handlePong();
          return;
        }

        const handlers = this.messageHandlers.get(type);
        if (handlers) {
          handlers.forEach(({ handler, options }) => {
            if (options.filter && !options.filter(data)) return;
            const transformedData = options.transform ? options.transform(data) : data;
            handler(transformedData);
            if (options.once) {
              this.unsubscribe(type, handler);
            }
          });
        }

        this.eventEmitter.emit('message', message);
      } catch (error) {
        this.handleError(error as Error);
      }
    };
  }

  private startPingInterval(): void {
    this.pingTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send('ping');
        this.pongTimer = setTimeout(() => {
          this.handlePongTimeout();
        }, this.options.pongTimeout);
      }
    }, this.options.pingInterval);
  }

  private handlePong(): void {
    if (this.pongTimer) {
      clearTimeout(this.pongTimer);
      this.pongTimer = undefined;
    }
  }

  private handlePongTimeout(): void {
    this.close();
    this.handleReconnect();
  }

  private handleReconnect(): void {
    if (
      !this.options.reconnect ||
      this.reconnectAttempts >= this.options.maxReconnectAttempts
    ) {
      return;
    }

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, this.options.reconnectInterval);
  }

  private handleError(error: Error): void {
    this.eventEmitter.emit('error', error);
  }

  public subscribe(
    type: string,
    handler: MessageHandler,
    options: SubscriptionOptions = {}
  ): () => void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }

    const handlers = this.messageHandlers.get(type)!;
    const entry = { handler, options };
    handlers.add(entry);

    return () => this.unsubscribe(type, handler);
  }

  public unsubscribe(type: string, handler: MessageHandler): void {
    const handlers = this.messageHandlers.get(type);
    if (!handlers) return;

    handlers.forEach((entry) => {
      if (entry.handler === handler) {
        handlers.delete(entry);
      }
    });

    if (handlers.size === 0) {
      this.messageHandlers.delete(type);
    }
  }

  public send(type: string, data?: any): void {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }

    this.ws.send(JSON.stringify({ type, data }));
  }

  public close(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
    }
    if (this.pongTimer) {
      clearTimeout(this.pongTimer);
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.ws?.close();
    this.ws = null;
  }

  public onConnect(handler: ConnectionHandler): () => void {
    return this.eventEmitter.on('connect', handler).unsubscribe;
  }

  public onDisconnect(handler: ConnectionHandler): () => void {
    return this.eventEmitter.on('disconnect', handler).unsubscribe;
  }

  public onError(handler: ErrorHandler): () => void {
    return this.eventEmitter.on('error', handler).unsubscribe;
  }

  public onMessage(handler: MessageHandler): () => void {
    return this.eventEmitter.on('message', handler).unsubscribe;
  }

  public getState(): {
    connected: boolean;
    reconnecting: boolean;
    reconnectAttempts: number;
  } {
    return {
      connected: this.ws?.readyState === WebSocket.OPEN,
      reconnecting: this.reconnectAttempts > 0,
      reconnectAttempts: this.reconnectAttempts,
    };
  }
}

// React integration
import { createContext, useContext, useState, useEffect } from 'react';

const WebSocketContext = createContext<WebSocketClient | null>(null);

export const WebSocketProvider: React.FC<{
  children,
  url,
  options,
}: {
  children: React.ReactNode;
  url: string;
  options?: WebSocketOptions;
}): JSX.Element {
  const [client] = useState(() => new WebSocketClient(url, options));

  useEffect(() => {
    return () => {
      client.close();
    };
  }, [client]);

  return (
    <WebSocketContext.Provider value={client}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const client = useContext(WebSocketContext);
  if (!client) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }

  const [state, setState] = useState(client.getState());

  useEffect(() => {
    const unsubscribeConnect = client.onConnect(() => {
      setState(client.getState());
    });

    const unsubscribeDisconnect = client.onDisconnect(() => {
      setState(client.getState());
    });

    return () => {
      unsubscribeConnect();
      unsubscribeDisconnect();
    };
  }, [client]);

  return {
    state,
    send: client.send.bind(client),
    subscribe: client.subscribe.bind(client),
    close: client.close.bind(client),
    connect: client.connect.bind(client),
  };
}

export { WebSocketClient, type WebSocketOptions, type SubscriptionOptions };

// Example usage:
// const client = new WebSocketClient('ws://localhost:8080', {
//   reconnect: true,
//   pingInterval: 5000,
// });
//
// client.subscribe('chat', (message) => {
//   console.log('Chat message:', message);
// }, {
//   filter: (msg) => msg.room === 'general',
//   transform: (msg) => ({ ...msg, timestamp: new Date() }),
// });
//
// client.onConnect(() => {
//   console.log('Connected!');
//   client.send('chat', { text: 'Hello!' });
// });
//
// // React usage
// function ChatComponent() {
//   const { state, send, subscribe } = useWebSocket();
//
//   useEffect(() => {
//     const unsubscribe = subscribe('chat', (message) => {
//       console.log('New message:', message);
//     });
//
//     return unsubscribe;
//   }, []);
//
//   const sendMessage = () => {
//     send('chat', { text: 'Hello!' });
//   };
//
//   return (
//     <div>
//       <div>Status: {state.connected ? 'Connected' : 'Disconnected'}</div>
//       <button onClick={sendMessage}>Send Message</button>
//     </div>
//   );
// }
export default ExperimentManager;
