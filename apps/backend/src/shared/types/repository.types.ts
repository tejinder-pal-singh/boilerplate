import { FindOptionsWhere, FindOptionsOrder, FindOptionsSelect, FindOptionsRelations } from 'typeorm';

export interface QueryOptions<T> {
  where?: FindOptionsWhere<T>;
  order?: FindOptionsOrder<T>;
  select?: FindOptionsSelect<T>;
  relations?: FindOptionsRelations<T>;
  skip?: number;
  take?: number;
  withDeleted?: boolean;
}

export interface BulkCreateOptions<T> {
  entities: T[];
  chunk?: number;
}

export interface BulkUpdateOptions<T> {
  where: FindOptionsWhere<T>;
  data: Partial<T>;
}

export interface BulkDeleteOptions<T> {
  where: FindOptionsWhere<T>;
  soft?: boolean;
}

export interface TransactionContext {
  manager: any; // EntityManager type from TypeORM
  queryRunner: any; // QueryRunner type from TypeORM
}

export interface RepositoryTransaction {
  start(): Promise<TransactionContext>;
  commit(context: TransactionContext): Promise<void>;
  rollback(context: TransactionContext): Promise<void>;
}

export interface IndexConfig {
  name: string;
  columns: string[];
  unique?: boolean;
  sparse?: boolean;
  where?: string;
}

export interface TableConfig {
  name: string;
  schema?: string;
  indices?: IndexConfig[];
  uniques?: string[][];
  checks?: Array<{
    name: string;
    expression: string;
  }>;
}
