type Operator =
  | '='
  | '!='
  | '>'
  | '>='
  | '<'
  | '<='
  | 'LIKE'
  | 'IN'
  | 'NOT IN'
  | 'BETWEEN'
  | 'IS NULL'
  | 'IS NOT NULL';

type JoinType = 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';

type OrderDirection = 'ASC' | 'DESC';

interface WhereCondition {
  field: string;
  operator: Operator;
  value: any;
  isOr?: boolean;
}

interface JoinClause {
  table: string;
  type: JoinType;
  on: {
    leftField: string;
    operator: Operator;
    rightField: string;
  };
}

interface OrderByClause {
  field: string;
  direction: OrderDirection;
}

interface GroupByClause {
  fields: string[];
  having?: WhereCondition[];
}

interface QueryOptions {
  distinct?: boolean;
  limit?: number;
  offset?: number;
}

class QueryBuilder {
  private table: string = '';
  private alias: string = '';
  private selectedFields: string[] = ['*'];
  private whereConditions: WhereCondition[] = [];
  private joinClauses: JoinClause[] = [];
  private orderByClauses: OrderByClause[] = [];
  private groupByClause?: GroupByClause;
  private queryOptions: QueryOptions = {};
  private parameters: any[] = [];
  private parameterIndex: number = 1;

  constructor(table?: string) {
    if (table) {
      this.table = table;
    }
  }

  public from(table: string, alias?: string): this {
    this.table = table;
    if (alias) {
      this.alias = alias;
    }
    return this;
  }

  public select(...fields: string[]): this {
    this.selectedFields = fields.length > 0 ? fields : ['*'];
    return this;
  }

  public distinct(): this {
    this.queryOptions.distinct = true;
    return this;
  }

  public where(
    field: string,
    operator: Operator,
    value: any,
    isOr: boolean = false
  ): this {
    this.whereConditions.push({ field, operator, value, isOr });
    return this;
  }

  public orWhere(field: string, operator: Operator, value: any): this {
    return this.where(field, operator, value, true);
  }

  public whereIn(field: string, values: any[]): this {
    return this.where(field, 'IN', values);
  }

  public whereBetween(field: string, range: [any, any]): this {
    return this.where(field, 'BETWEEN', range);
  }

  public whereNull(field: string): this {
    return this.where(field, 'IS NULL', null);
  }

  public whereNotNull(field: string): this {
    return this.where(field, 'IS NOT NULL', null);
  }

  public join(
    table: string,
    leftField: string,
    operator: Operator,
    rightField: string,
    type: JoinType = 'INNER'
  ): this {
    this.joinClauses.push({
      table,
      type,
      on: { leftField, operator, rightField },
    });
    return this;
  }

  public leftJoin(
    table: string,
    leftField: string,
    operator: Operator,
    rightField: string
  ): this {
    return this.join(table, leftField, operator, rightField, 'LEFT');
  }

  public rightJoin(
    table: string,
    leftField: string,
    operator: Operator,
    rightField: string
  ): this {
    return this.join(table, leftField, operator, rightField, 'RIGHT');
  }

  public orderBy(field: string, direction: OrderDirection = 'ASC'): this {
    this.orderByClauses.push({ field, direction });
    return this;
  }

  public groupBy(fields: string | string[], having?: WhereCondition[]): this {
    this.groupByClause = {
      fields: Array.isArray(fields) ? fields : [fields],
      having,
    };
    return this;
  }

  public limit(limit: number): this {
    this.queryOptions.limit = limit;
    return this;
  }

  public offset(offset: number): this {
    this.queryOptions.offset = offset;
    return this;
  }

  public getParameters(): any[] {
    return this.parameters;
  }

  private addParameter(value: any): string {
    this.parameters.push(value);
    return `$${this.parameterIndex++}`;
  }

  private buildSelect(): string {
    const distinct = this.queryOptions.distinct ? 'DISTINCT ' : '';
    return `SELECT ${distinct}${this.selectedFields.join(', ')}`;
  }

  private buildFrom(): string {
    return `FROM ${this.table}${this.alias ? ` AS ${this.alias}` : ''}`;
  }

  private buildJoins(): string {
    return this.joinClauses
      .map(
        join =>
          `${join.type} JOIN ${join.table} ON ${join.on.leftField} ${join.on.operator} ${join.on.rightField}`
      )
      .join(' ');
  }

  private buildWhere(): string {
    if (this.whereConditions.length === 0) return '';

    const conditions = this.whereConditions.map((condition, index) => {
      const connector = index === 0 ? 'WHERE' : condition.isOr ? 'OR' : 'AND';
      const { field, operator, value } = condition;

      if (operator === 'IS NULL' || operator === 'IS NOT NULL') {
        return `${connector} ${field} ${operator}`;
      }

      if (operator === 'IN' || operator === 'NOT IN') {
        const values = (value as any[]).map(v => this.addParameter(v));
        return `${connector} ${field} ${operator} (${values.join(', ')})`;
      }

      if (operator === 'BETWEEN') {
        const [start, end] = value as [any, any];
        return `${connector} ${field} BETWEEN ${this.addParameter(start)} AND ${this.addParameter(end)}`;
      }

      return `${connector} ${field} ${operator} ${this.addParameter(value)}`;
    });

    return conditions.join(' ');
  }

  private buildGroupBy(): string {
    if (!this.groupByClause) return '';

    let sql = `GROUP BY ${this.groupByClause.fields.join(', ')}`;

    if (this.groupByClause.having && this.groupByClause.having.length > 0) {
      const having = this.groupByClause.having
        .map((condition, index) => {
          const connector = index === 0 ? 'HAVING' : condition.isOr ? 'OR' : 'AND';
          return `${connector} ${condition.field} ${condition.operator} ${this.addParameter(condition.value)}`;
        })
        .join(' ');
      sql += ` ${having}`;
    }

    return sql;
  }

  private buildOrderBy(): string {
    if (this.orderByClauses.length === 0) return '';

    const orderBy = this.orderByClauses
      .map(clause => `${clause.field} ${clause.direction}`)
      .join(', ');

    return `ORDER BY ${orderBy}`;
  }

  private buildLimit(): string {
    const { limit, offset } = this.queryOptions;
    if (!limit) return '';

    let sql = `LIMIT ${limit}`;
    if (offset) {
      sql += ` OFFSET ${offset}`;
    }
    return sql;
  }

  public toSQL(): { text: string; values: any[] } {
    this.parameters = [];
    this.parameterIndex = 1;

    const parts = [
      this.buildSelect(),
      this.buildFrom(),
      this.buildJoins(),
      this.buildWhere(),
      this.buildGroupBy(),
      this.buildOrderBy(),
      this.buildLimit(),
    ].filter(Boolean);

    return {
      text: parts.join(' '),
      values: this.parameters,
    };
  }

  public clone(): QueryBuilder {
    const clone = new QueryBuilder();
    Object.assign(clone, JSON.parse(JSON.stringify(this)));
    return clone;
  }
}

export {
  QueryBuilder,
  type Operator,
  type JoinType,
  type OrderDirection,
  type WhereCondition,
  type JoinClause,
  type OrderByClause,
  type GroupByClause,
  type QueryOptions,
};

// Example usage:
// const query = new QueryBuilder('users')
//   .select('id', 'name', 'email')
//   .where('age', '>', 18)
//   .orWhere('role', '=', 'admin')
//   .leftJoin('orders', 'users.id', '=', 'orders.user_id')
//   .groupBy(['role'], [{ field: 'count(*)', operator: '>', value: 5 }])
//   .orderBy('name', 'ASC')
//   .limit(10)
//   .offset(20);
//
// const { text, values } = query.toSQL();
export default ExperimentManager;
