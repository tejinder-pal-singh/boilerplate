export interface WsClient {
  id: string;
  userId?: string;
}

export interface WsMessage<T = unknown> {
  event: string;
  data: T;
}

export interface WsError {
  code: string;
  message: string;
  details?: unknown;
}

export interface WsResponse<T = unknown> {
  status: 'success' | 'error';
  data?: T;
  error?: WsError;
}

export enum WsEvents {
  CONNECTION = 'connection',
  DISCONNECT = 'disconnect',
  ERROR = 'error',
  JOIN_ROOM = 'joinRoom',
  LEAVE_ROOM = 'leaveRoom',
  MESSAGE = 'message',
}
