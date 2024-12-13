import { ErrorResponse } from './error.types';

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ErrorResponse;
  meta?: PaginationMeta;
}

export interface ListResponse<T> extends ApiResponse<T[]> {
  meta: PaginationMeta;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface SearchParams extends PaginationParams {
  query?: string;
  filters?: Record<string, unknown>;
}

export interface FileUploadResponse {
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  url: string;
}

export interface BatchOperationResponse {
  success: boolean;
  totalProcessed: number;
  successCount: number;
  failureCount: number;
  errors?: Array<{
    id: string | number;
    error: ErrorResponse;
  }>;
}
