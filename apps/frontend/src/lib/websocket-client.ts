import { useEffect, useRef, useCallback } from 'react';
import { useStore } from './store';
import ReconnectingWebSocket from 'reconnecting-websocket';

interface WebSocketMessage {
  type: string;
  payload: any;
}

export class WebSocketClient {
  private static instance: WebSocketClient;
  private socket: ReconnectingWebSocket | null = null;
  private messageHandlers: Map<string, Set<(payload: any) => void>> = new Map();
  private connectionPromise: Promise<void> | null = null;
  private resolveConnection: (() => void) | null = null;

  private constructor() {
    this.setupSocket();
  }

  public static getInstance(): WebSocketClient {
    if (!WebSocketClient.instance) {
      WebSocketClient.instance = new WebSocketClient();
    }
    return WebSocketClient.instance;
  }

  private setupSocket(): void {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4000';
    
    this.socket = new ReconnectingWebSocket(wsUrl, [], {
      connectionTimeout: 4000,
      maxRetries: 10,
      maxReconnectionDelay: 10000,
      minReconnectionDelay: 1000,
    });

    this.connectionPromise = new Promise((resolve) => {
      this.resolveConnection = resolve;
    });

    this.socket.addEventListener('open', this.handleOpen);
    this.socket.addEventListener('message', this.handleMessage);
    this.socket.addEventListener('close', this.handleClose);
    this.socket.addEventListener('error', this.handleError);
  }

  private handleOpen = () => {
    console.log('WebSocket connected');
    this.resolveConnection?.();
    
    // Authenticate the connection
    const token = useStore.getState().auth.accessToken;
    if (token) {
      this.send('authenticate', { token });
    }
  };

  private handleMessage = (event: MessageEvent) => {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      const handlers = this.messageHandlers.get(message.type);
      
      if (handlers) {
        handlers.forEach((handler) => handler(message.payload));
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  };

  private handleClose = () => {
    console.log('WebSocket disconnected');
    this.connectionPromise = new Promise((resolve) => {
      this.resolveConnection = resolve;
    });
  };

  private handleError = (error: Event) => {
    console.error('WebSocket error:', error);
  };

  public async send(type: string, payload: any): Promise<void> {
    await this.connectionPromise;
    
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type, payload }));
    } else {
      throw new Error('WebSocket is not connected');
    }
  }

  public subscribe(type: string, handler: (payload: any) => void): () => void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }
    
    this.messageHandlers.get(type)!.add(handler);
    
    return () => {
      const handlers = this.messageHandlers.get(type);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.messageHandlers.delete(type);
        }
      }
    };
  }

  public disconnect(): void {
    this.socket?.close();
  }
}

// React Hook for WebSocket subscriptions
export function useWebSocket(type: string, handler: (payload: any) => void) {
  const ws = useRef(WebSocketClient.getInstance());

  useEffect(() => {
    const unsubscribe = ws.current.subscribe(type, handler);
    return () => unsubscribe();
  }, [type, handler]);

  const send = useCallback(
    (payload: any) => ws.current.send(type, payload),
    [type]
  );

  return { send };
}

// Example usage:
// const { send } = useWebSocket('chat', (message) => {
//   console.log('Received chat message:', message);
// });
// send({ text: 'Hello!' });
