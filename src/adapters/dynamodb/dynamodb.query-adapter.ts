import {
  AttributeValue,
  DynamoDBClient,
  GetItemCommand,
  GetItemInput,
  QueryCommand,
  QueryCommandOutput,
  QueryInput,
  ScanCommand,
  ScanCommandOutput,
  ScanInput,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { CrudRequestWhere, CrudRequestWhereField, CrudRequestWhereOperator } from '../../models/crud-request-where';
import { CrudRequest, CrudRequestOrder, ParsedRequestSelect } from '../../models/crud-request';
import { QueryAdapter } from '../../models/query-adapter';
import { GetManyResult } from '../../models/get-many-result';
import { FieldPath } from '../../models/field-path';
import { pathEquals, pathParse } from '../../utils/field-path';
import { ensureArray, ensureEmpty } from '../../utils/functions';

export interface DynamoDBQueryAdapterOptions {
  /**
   * The DynamoDB client
   */
  client: DynamoDBClient;

  /**
   * The DynamoDB table name
   */
  tableName: string;

  /**
   * The table partition key
   */
  partitionKey: string;

  /**
   * The table sort key
   */
  sortKey?: string;
}

/**
 * Represents a generic DynamoDB query
 */
export type DynamoDBQuery = Partial<GetItemInput> & Partial<ScanInput> & Partial<QueryInput>;

/**
 * Represents a command input that is either a DynamoDB Query or a DynamoDB Scan
 */
export type QueryOrScanInput = { query: QueryInput, scan: undefined } | { scan: ScanInput, query: undefined };

export interface DynamoDBQueryContext {
  /**
   * Whether the query should split partition keys from the filter expressions to the key parameter
   */
  allowKeySplitting: boolean;

  /**
   * The key parameter
   */
  key?: Record<string, unknown>;
}

/**
 * Adapts queries to DynamoDB query builder object.
 *
 * Not supported:
 * - Ordering by any other field except the sort key
 * - Page
 * - Offset
 * - Relations
 *
 * The ordering only works for the sort key and in query operations.
 * It's ignored in scan operations.
 */
export class DynamoDBQueryAdapter implements QueryAdapter<DynamoDBQuery> {

  protected readonly partitionKey: FieldPath;
  protected readonly sortKey?: FieldPath;

  constructor(
    protected readonly options: DynamoDBQueryAdapterOptions,
  ) {
    this.partitionKey = pathParse(options.partitionKey);
    this.sortKey = options.sortKey ? pathParse(options.sortKey) : undefined;
  }

  /**
   * @inheritDoc
   */
  public build(baseQuery: DynamoDBQuery, request: CrudRequest): DynamoDBQuery {
    const result = this.buildQueryOrScan(baseQuery, request);

    return result.query || result.scan;
  }

  /**
   * @inheritDoc
   */
  public async getMany<E>(baseQuery: DynamoDBQuery, request: CrudRequest): Promise<GetManyResult<E>> {
    const queryOrScan = this.buildQueryOrScan(baseQuery, request);

    let output: QueryCommandOutput | ScanCommandOutput;

    if (queryOrScan.query)
      output = await this.options.client.send(new QueryCommand(queryOrScan.query));
    else
      output = await this.options.client.send(new ScanCommand(queryOrScan.scan));

    const data = output.Items?.map(item => this.unmarshall<E>(item));

    return {
      data: data || [],
      total: 0,
      pageCount: 0,
      count: 0,
      page: 0,
    };
  }

  /**
   * @inheritDoc
   */
  public async getOne<E>(baseQuery: GetItemInput, request: CrudRequest): Promise<E | null> {
    const query = this.buildGetItem(baseQuery, request);

    const result = await this.options.client.send(new GetItemCommand(query));

    if (!result.Item)
      return null;

    return this.unmarshall<E>(result.Item);
  }

  /**
   * Creates a DynamoDB Query or Scan input, based on whether the partition key is present in the where conditions
   *
   * @param baseQuery The base query
   * @param request The crud request
   */
  public buildQueryOrScan(
    baseQuery: Partial<QueryInput> | Partial<ScanInput>,
    request: CrudRequest,
  ): QueryOrScanInput {
    const query: QueryInput & ScanInput = {
      ...baseQuery,
      TableName: baseQuery.TableName || this.options.tableName,
    };
    const ctx: DynamoDBQueryContext = { allowKeySplitting: true };

    this.adaptProjection(query, request.select);
    this.adaptFilter(query, ctx, request.where);
    this.adaptOrder(query, request.order);
    this.adaptLimit(query, request.limit);

    if (ctx.key)
      this.adaptKeyExpression(query, ctx.key);

    if (query.KeyConditionExpression)
      return { query, scan: undefined };

    return { scan: query, query: undefined };
  }

  /**
   * Creates a DynamoDB Query input
   *
   * @param baseQuery The base query
   * @param request The crud request
   */
  public buildQuery(baseQuery: Partial<QueryInput>, request: CrudRequest): QueryInput {
    const query: QueryInput = {
      ...baseQuery,
      TableName: baseQuery.TableName || this.options.tableName,
    };
    const ctx: DynamoDBQueryContext = { allowKeySplitting: true };

    this.adaptProjection(query, request.select);
    this.adaptFilter(query, ctx, request.where);
    this.adaptOrder(query, request.order);
    this.adaptLimit(query, request.limit);

    if (ctx.key)
      this.adaptKeyExpression(query, ctx.key);

    return query;
  }

  /**
   * Creates a DynamoDB Scan input
   *
   * @param baseQuery The base query
   * @param request The crud request
   */
  public buildScan(baseQuery: Partial<ScanInput>, request: CrudRequest): ScanInput {
    const scan: ScanInput = {
      ...baseQuery,
      TableName: baseQuery.TableName || this.options.tableName,
    };
    const ctx: DynamoDBQueryContext = { allowKeySplitting: false };

    this.adaptProjection(scan, request.select);
    this.adaptFilter(scan, ctx, request.where);
    this.adaptLimit(scan, request.limit);

    return scan;
  }

  /**
   * Creates a DynamoDB GetItem input
   *
   * @param baseQuery The base query
   * @param request The crud request
   */
  public buildGetItem(baseQuery: Partial<GetItemInput>, request: CrudRequest): GetItemInput {
    const query: GetItemInput = {
      ...baseQuery,
      TableName: baseQuery.TableName || this.options.tableName,
      Key: {},
    };
    const ctx: DynamoDBQueryContext = { allowKeySplitting: true };

    this.adaptProjection(query, request.select);
    this.adaptFilter(query, ctx, request.where);

    if (ctx.key)
      query.Key = this.marshall(ctx.key);

    return query;
  }

  /**
   * Adapts a list of select fields into a projection expression
   *
   * @param query The DynamoDB query
   * @param select The select fields
   */
  protected adaptProjection(query: DynamoDBQuery, select: ParsedRequestSelect): void {
    if (select.length === 0)
      return;

    const existing = query.ProjectionExpression?.split(',').map(exp => exp.trim()).filter(exp => !!exp) || [];
    const attributes = select.map(f => this.registerAttribute(query, f.field));

    query.ProjectionExpression = [...new Set([...existing, ...attributes])].join(', ');
  }

  /**
   * Adapts the order field that matches the sort key to a DynamoDB Query
   *
   * @param query The DynamoDB query
   * @param order The order fields
   */
  protected adaptOrder(query: DynamoDBQuery, order: CrudRequestOrder[]): void {
    const sortKey = this.sortKey;

    if (!sortKey)
      return;

    const sort = order.find(o => pathEquals(o.field, sortKey));

    if (!sort)
      return;

    query.ScanIndexForward = sort.order === 'ASC';
  }

  /**
   * Adapts a where condition into a DynamoDB filter
   *
   * @param query The DynamoDB query
   * @param ctx The builder context
   * @param where The where condition
   */
  protected adaptFilter(query: DynamoDBQuery, ctx: DynamoDBQueryContext, where: CrudRequestWhere): void {
    const filter = this.mapWhere(query, ctx, where, true);

    if (!filter)
      return;

    const existingFilter = query.FilterExpression;

    query.FilterExpression = existingFilter ? `(${existingFilter}) AND (${filter})` : filter;
  }

  /**
   * Adapts the limit
   *
   * @param query The DynamoDB query
   * @param limit The limit value
   */
  protected adaptLimit(query: DynamoDBQuery, limit: number | undefined): void {
    if (limit)
      query.Limit = limit;
  }

  /**
   * Adapts the key object into a key expression
   *
   * @param query The DynamoDB query
   * @param key The key object
   */
  protected adaptKeyExpression(query: QueryInput, key: Record<string, unknown>): void {
    const condition: string[] = [];
    const params: Record<string, unknown> = {};

    for (const name of Object.keys(key)) {
      const attribute = this.registerAttribute(query, [name]);
      const param = attribute.replace('#', ':');

      condition.push(`${attribute} = ${param}`);
      params[param] = key[name];
    }

    query.KeyConditionExpression = condition.join(' AND ');

    query.ExpressionAttributeValues = {
      ...(query.ExpressionAttributeValues || {}),
      ...this.marshall(params),
    };
  }

  /**
   * Maps a where condition into a filter expression
   *
   * @param query The DynamoDB query
   * @param ctx The query builder context
   * @param where The where condition
   * @param isTopLevelAnd Whether this is the top level AND condition
   */
  protected mapWhere(
    query: DynamoDBQuery,
    ctx: DynamoDBQueryContext,
    where: CrudRequestWhere,
    isTopLevelAnd: boolean = false,
  ): string | undefined {
    // AND
    if (where.and && where.and.length > 0) {
      if (where.and.length === 1)
        return this.mapWhere(query, ctx, where.and[0], isTopLevelAnd);

      return '(' + where.and
        .map(item => this.mapWhere(query, ctx, item, isTopLevelAnd))
        .filter(query => !!query)
        .join(' AND ') + ')';
    }

    // OR
    if (where.or && where.or.length > 0) {
      if (where.or.length === 1)
        return this.mapWhere(query, ctx, where.or[0], isTopLevelAnd);

      return '(' + where.or
        .map(item => this.mapWhere(query, ctx, item, false))
        .filter(query => !!query)
        .join(' OR ') + ')';
    }

    // Condition
    if (where.field) {
      // Checks whether this field is in the top-level AND condition and is the partition key
      if (
        isTopLevelAnd &&
        ctx.allowKeySplitting &&
        pathEquals(this.partitionKey, where.field) &&
        where.operator === CrudRequestWhereOperator.EQ
      ) {
        ctx.key = { [where.field.join('.')]: where.value };

        return undefined;
      }

      const result = this.mapWhereOperators(query, where);

      query.ExpressionAttributeValues = {
        ...(query.ExpressionAttributeValues || {}),
        ...this.marshall(result.params),
      };

      return result.where;
    }
  }

  /**
   * Maps a where condition into an expression and its parameters
   *
   * @param query The DynamoDB query
   * @param where The where condition
   */
  protected mapWhereOperators(
    query: DynamoDBQuery,
    where: CrudRequestWhereField,
  ): { where: string, params: Record<string, any> } {
    const field = this.registerAttribute(query, where.field);
    const param = field.replace('#', ':');

    let value = where.value;

    switch (where.operator) {
      case CrudRequestWhereOperator.EQ:
        return { where: `${field} = ${param}`, params: { [param]: value } };

      case CrudRequestWhereOperator.NEQ:
        return { where: `${field} <> ${param}`, params: { [param]: value } };

      case CrudRequestWhereOperator.LT:
        return { where: `${field} < ${param}`, params: { [param]: value } };

      case CrudRequestWhereOperator.LTE:
        return { where: `${field} <= ${param}`, params: { [param]: value } };

      case CrudRequestWhereOperator.GT:
        return { where: `${field} > ${param}`, params: { [param]: value } };

      case CrudRequestWhereOperator.GTE:
        return { where: `${field} >= ${param}`, params: { [param]: value } };

      case CrudRequestWhereOperator.STARTS:
        return { where: `begins_with(${field}, ${param})`, params: { [param]: value } };

      case CrudRequestWhereOperator.CONTAINS:
        return { where: `contains(${field}, ${param})`, params: { [param]: value } };

      case CrudRequestWhereOperator.NOT_CONTAINS:
        return { where: `NOT contains(${field}, :${param})`, params: { [param]: value } };

      case CrudRequestWhereOperator.BETWEEN:
        const arr = ensureArray('BETWEEN operator', value, 2);

        return {
          where: `${field} BETWEEN ${param}_start AND ${param}_end`,
          params: { [`${param}_start`]: arr[0], [`${param}_end`]: arr[1] },
        };

      case CrudRequestWhereOperator.IN:
        value = ensureArray('IN operator', value, 1);

        return {
          where: `${field} IN (${value.map((_, i) => param + '_' + i).join(', ')})`,
          params: value.reduce((val, i) => ({
            [param + '_' + i]: val,
          }), {}),
        };

      case CrudRequestWhereOperator.NOT_IN:
        value = ensureArray('NOT IN operator', value, 1);

        return {
          where: `NOT (${field} IN (${value.map((_, i) => param + '_' + i).join(', ')}))`,
          params: value.reduce((val, i) => ({
            [param + '_' + i]: val,
          }), {}),
        };

      case CrudRequestWhereOperator.IS_NULL:
        ensureEmpty('IS NULL operator', value);

        return { where: `(attribute_not_exists(${field}) OR ${field} = :null)`, params: { ':null': null } };

      case CrudRequestWhereOperator.NOT_NULL:
        ensureEmpty('NOT NULL operator', value);

        return { where: `(attribute_exists(${field}) AND ${field} <> :null)`, params: { ':null': null } };

      default:
        throw new Error(`Operator not supported in DynamoDB "${where.operator}"`);
    }
  }

  /**
   * Generates the attribute name and registers an attribute to the query
   *
   * @param query The DynamoDB query
   * @param field The field path
   */
  protected registerAttribute(query: DynamoDBQuery, field: FieldPath): string {
    const fieldName = field.join('.');
    const baseName = '#' + fieldName.replace(/[^A-Za-z0-9_]/g, '_');

    let attributeName = baseName;
    let i = 1;

    const names = query.ExpressionAttributeNames || {};

    // This avoids attribute name conflicts
    while (names[attributeName] && names[attributeName] !== fieldName) {
      attributeName = baseName + i.toString();
      i++;
    }

    names[attributeName] = fieldName;
    query.ExpressionAttributeNames = names;

    return attributeName;
  }

  /**
   * Converts an object into DynamoDB's attribute key-value structure
   *
   * @param data The object
   */
  protected marshall<T>(data: T): Record<string, AttributeValue> {
    return marshall(data);
  }

  /**
   * Converts a DynamoDB's attribute key-value structure into an object
   *
   * @param data The attribute key-value
   */
  protected unmarshall<T>(data: Record<string, AttributeValue>): T {
    return unmarshall(data) as T;
  }

}
