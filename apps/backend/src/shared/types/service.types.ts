import { DeepPartial, FindOptionsWhere } from 'typeorm';
import { PaginationParams, PaginationMeta } from './api.types';

export interface ServiceOptions {
  relations?: string[];
  select?: string[];
  withDeleted?: boolean;
}

export interface FindAllOptions<T> extends ServiceOptions {
  pagination?: PaginationParams;
  where?: FindOptionsWhere<T>;
}

export interface ServiceResult<T> {
  data: T;
  meta?: PaginationMeta;
}

export interface CreateOptions<T> extends ServiceOptions {
  data: DeepPartial<T>;
}

export interface UpdateOptions<T> extends ServiceOptions {
  data: DeepPartial<T>;
  where: FindOptionsWhere<T>;
}

export interface DeleteOptions<T> extends ServiceOptions {
  where: FindOptionsWhere<T>;
  soft?: boolean;
}

export interface BaseServiceMethods<T> {
  findAll(options?: FindAllOptions<T>): Promise<ServiceResult<T[]>>;
  findOne(where: FindOptionsWhere<T>, options?: ServiceOptions): Promise<T>;
  create(options: CreateOptions<T>): Promise<T>;
  update(options: UpdateOptions<T>): Promise<T>;
  delete(options: DeleteOptions<T>): Promise<boolean>;
}

export interface TransactionOptions {
  isolationLevel?: 'READ UNCOMMITTED' | 'READ COMMITTED' | 'REPEATABLE READ' | 'SERIALIZABLE';
  timeout?: number;
}
