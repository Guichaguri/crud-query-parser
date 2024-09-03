import { Brackets, ObjectLiteral, SelectQueryBuilder, WhereExpressionBuilder } from 'typeorm';
import { QueryAdapter } from '../../models/query-adapter';
import { CrudRequest, CrudRequestOrder, CrudRequestRelation, ParsedRequestSelect } from '../../models/crud-request';
import { CrudRequestWhere, CrudRequestWhereField, CrudRequestWhereOperator } from '../../models/crud-request-where';
import { GetManyResult } from '../../models/get-many-result';
import { ensureArray, ensureFalsy, isValid } from '../../utils/functions';
import { pathHasBase } from '../../utils/field-path';

export interface TypeOrmQueryAdapterOptions {
  /**
   * Whether it will use ILIKE for case-insensitive operations.
   *
   * If undefined, it will be enabled by default for postgres and aurora-postgres databases
   */
  ilike?: boolean;
}

/**
 * Adapts queries to TypeORM query builder object
 */
export class TypeOrmQueryAdapter implements QueryAdapter<SelectQueryBuilder<any>, ObjectLiteral> {

  constructor(
    private readonly options: TypeOrmQueryAdapterOptions = {},
  ) {}

  /**
   * @inheritDoc
   */
  public build<E extends ObjectLiteral>(qb: SelectQueryBuilder<E>, query: CrudRequest): SelectQueryBuilder<E> {
    qb = this.createBaseQuery(qb, query);
    qb = this.paginateQuery(qb, query);

    return qb;
  }

  /**
   * @inheritDoc
   */
  public async getOne<E extends ObjectLiteral>(qb: SelectQueryBuilder<E | any>, request: CrudRequest): Promise<E | null> {
    const query = this.createBaseQuery(qb, request);
    const entity = await query.getOne();

    return entity ?? null;
  }

  /**
   * @inheritDoc
   */
  public async getMany<E extends ObjectLiteral>(qb: SelectQueryBuilder<E | any>, request: CrudRequest): Promise<GetManyResult<E>> {
    const offset = request.offset ?? (request.page && request.limit ? request.limit * request.page : 0);

    const fullQuery = this.createBaseQuery(qb, request);
    const paginatedQuery = this.paginateQuery(fullQuery.clone(), request, offset);

    const data = await paginatedQuery.getMany();
    const total = await fullQuery.getCount();

    const limit = request.limit ?? total;

    const count = data.length;
    const page = Math.floor(offset / limit) + 1;
    const pageCount = Math.ceil(total / limit);

    return {
      data,
      count,
      page,
      pageCount,
      total,
    };
  }

  /**
   * Creates a query filtered from the parsed request
   *
   * @param qb The base query builder
   * @param query The parsed query
   */
  protected createBaseQuery<E extends ObjectLiteral>(qb: SelectQueryBuilder<E>, query: CrudRequest): SelectQueryBuilder<E> {
    const paramsDefined: string[] = [];
    const isILikeEnabled = this.isILikeEnabled(qb);

    this.adaptSelect(qb, query.select);
    this.adaptRelations(qb, query.relations, query.select);
    this.adaptWhere(qb.alias, qb, query.where, false, paramsDefined, isILikeEnabled);
    this.adaptOrder(qb, query.order);

    return qb;
  }

  /**
   * Paginates a query based on the parsed request
   *
   * @param qb The query builder
   * @param query The parsed query
   * @param offset The parsed query offset
   */
  protected paginateQuery<E extends ObjectLiteral>(qb: SelectQueryBuilder<E>, query: CrudRequest, offset?: number): SelectQueryBuilder<E> {
    return qb.limit(query.limit).offset(offset);
  }

  /**
   * Adapts a select
   *
   * @param qb The query builder
   * @param select The parsed select fields
   */
  protected adaptSelect<E extends ObjectLiteral>(qb: SelectQueryBuilder<E>, select: ParsedRequestSelect): void {
    if (select.length === 0)
      return;

    // Only fields that are one level deep
    const fields = select.filter(f => f.field.length === 1);

    qb.select(fields.map(s => [qb.alias, ...s.field].join('.')));
  }

  /**
   * Adapts the join relation list
   *
   * @param qb The query builder
   * @param relations The parsed relation list
   * @param select The parsed select fields
   */
  protected adaptRelations<E extends ObjectLiteral>(qb: SelectQueryBuilder<E>, relations: CrudRequestRelation[], select: ParsedRequestSelect): void {
    for (const relation of relations) {
      const path = [qb.alias, ...relation.field].join('.');
      const alias = relation.alias || path.replace('.', '_');

      const fields = select.filter(f => pathHasBase(f.field, relation.field));

      if (fields.length === 0) {
        qb.leftJoinAndSelect(path, alias);
      } else {
        qb.leftJoin(path, alias);
        qb.addSelect(fields.map(f => [alias, f.field[f.field.length - 1]].join('.')));
      }
    }
  }

  /**
   * Adapts the order by list
   *
   * @param qb The query builder
   * @param ordering The parsed ordering
   */
  protected adaptOrder<E extends ObjectLiteral>(qb: SelectQueryBuilder<E>, ordering: CrudRequestOrder[]): void {
    for (const order of ordering) {
      const path = [qb.alias, ...order.field].join('.');

      qb.addOrderBy(path, order.order);
    }
  }

  /**
   * Adapts a where condition
   *
   * @param alias The query builder alias
   * @param qb The query builder
   * @param where The quere condition
   * @param or Whether this where condition is AND/OR
   * @param params The registered parameter name list
   * @param isILikeEnabled Whether the ILIKE operator can be used
   */
  protected adaptWhere(
    alias: string,
    qb: WhereExpressionBuilder,
    where: CrudRequestWhere,
    or: boolean,
    params: string[],
    isILikeEnabled: boolean,
  ): void {
    const addWhere = (or ? qb.orWhere : qb.andWhere).bind(qb);

    if (where.or && where.or.length > 0) {
      addWhere(new Brackets(
        wqb => where.or!.forEach(item => this.adaptWhere(alias, wqb, item, true, params, isILikeEnabled))
      ));
    } else if (where.and && where.and.length > 0) {
      addWhere(new Brackets(
        wqb => where.and!.forEach(item => this.adaptWhere(alias, wqb, item, false, params, isILikeEnabled))
      ));
    } else if (where.field) {
      const param = this.createParam(params, where.field);
      const query = this.mapWhereOperators(alias, where as CrudRequestWhereField, param, isILikeEnabled);

      addWhere(query.where, query.params);
    }
  }

  /**
   * Creates a query parameter name based on a field
   *
   * @param paramsDefined The array the parameter will be registered onto
   * @param field The field path
   */
  protected createParam(paramsDefined: string[], field: string[]): string {
    const name = field.length > 0 ? field[field.length - 1] : '';
    let param: string;
    let iteration: number = 0;

    do {
      param = 'req_' + name + '_' + iteration;
      iteration++;
    } while (paramsDefined.includes(param));

    paramsDefined.push(param);
    return param;
  }

  /**
   * Maps where operators to a pseudo-SQL statement and a parameter map
   *
   * @param alias The query builder alias
   * @param where The where condition
   * @param param The parameter name
   * @param isILikeEnabled Whether the ILIKE operator can be used
   */
  protected mapWhereOperators(
    alias: string,
    where: CrudRequestWhereField,
    param: string,
    isILikeEnabled: boolean,
  ): { where: string, params: ObjectLiteral } {
    const field = [alias, ...where.field].join('.');
    const operator = where.operator;
    let value: unknown = where.value;

    switch (operator) {
      case CrudRequestWhereOperator.EQ:
        return { where: `${field} = :${param}`, params: { [param]: value } };

      case CrudRequestWhereOperator.NEQ:
        return { where: `${field} != :${param}`, params: { [param]: value } };

      case CrudRequestWhereOperator.GT:
        return { where: `${field} > :${param}`, params: { [param]: value } };

      case CrudRequestWhereOperator.GTE:
        return { where: `${field} >= :${param}`, params: { [param]: value } };

      case CrudRequestWhereOperator.LT:
        return { where: `${field} < :${param}`, params: { [param]: value } };

      case CrudRequestWhereOperator.LTE:
        return { where: `${field} <= :${param}`, params: { [param]: value } };

      case CrudRequestWhereOperator.STARTS:
        return { where: `${field} LIKE :${param}`, params: { [param]: `${value}%` } };

      case CrudRequestWhereOperator.ENDS:
        return { where: `${field} LIKE :${param}`, params: { [param]: `%${value}` } };

      case CrudRequestWhereOperator.CONTAINS:
        return { where: `${field} LIKE :${param}`, params: { [param]: `%${value}%` } };

      case CrudRequestWhereOperator.NOT_CONTAINS:
        return { where: `${field} NOT LIKE :${param}`, params: { [param]: `%${value}%` } };

      case CrudRequestWhereOperator.IN:
        value = ensureArray('IN operator', value, 1);

        return { where: `${field} IN (:...${param})`, params: { [param]: value } };

      case CrudRequestWhereOperator.NOT_IN:
        value = ensureArray('NOT IN operator', value, 1);

        return { where: `${field} NOT IN (:...${param})`, params: { [param]: value } };

      case CrudRequestWhereOperator.BETWEEN:
        const arr = ensureArray('BETWEEN operator', value, 2);

        return {
          where: `${field} BETWEEN :${param}_start AND :${param}_end`,
          params: { [`${param}_start`]: arr[0], [`${param}_end`]: arr[1] },
        };

      case CrudRequestWhereOperator.IS_NULL:
        ensureFalsy('IS NULL operator', value);

        return { where: `${field} IS NULL`, params: {} };

      case CrudRequestWhereOperator.NOT_NULL:
        ensureFalsy('NOT NULL operator', value);

        return { where: `${field} IS NOT NULL`, params: {} };

      case CrudRequestWhereOperator.EQ_LOWER:
        return { where: `LOWER(${field}) = :${param}`, params: { [param]: value } };

      case CrudRequestWhereOperator.NEQ_LOWER:
        return { where: `LOWER(${field}) != :${param}`, params: { [param]: value } };

      case CrudRequestWhereOperator.STARTS_LOWER:
        return { where: `${this.createLowerLike(isILikeEnabled, field)} :${param}`, params: { [param]: `${value}%` } };

      case CrudRequestWhereOperator.ENDS_LOWER:
        return { where: `${this.createLowerLike(isILikeEnabled, field)} :${param}`, params: { [param]: `%${value}` } };

      case CrudRequestWhereOperator.CONTAINS_LOWER:
        return { where: `${this.createLowerLike(isILikeEnabled, field)} :${param}`, params: { [param]: `%${value}%` } };

      case CrudRequestWhereOperator.NOT_CONTAINS_LOWER:
        return { where: `${this.createLowerLike(isILikeEnabled, field, true)} :${param}`, params: { [param]: `%${value}%` } };

      case CrudRequestWhereOperator.IN_LOWER:
        ensureArray('IN operator', value, 1);

        return { where: `LOWER(${field}) IN (...:${param})`, params: { [param]: value } };

      case CrudRequestWhereOperator.NOT_IN_LOWER:
        ensureArray('NOT IN operator', value, 1);

        return { where: `LOWER(${field}) NOT IN (...:${param})`, params: { [param]: value } };

      default:
        throw new Error(`Unknown operator "${operator}"`);
    }
  }

  protected createLowerLike(isILikeEnabled: boolean, field: string, not: boolean = false): string {
    if (isILikeEnabled)
      return not ? `${field} NOT ILIKE` : `${field} ILIKE`;

    return not ? `LOWER(${field}) NOT LIKE` : `LOWER(${field}) LIKE`;
  }

  protected isILikeEnabled(qb: SelectQueryBuilder<any>): boolean {
    const ilikeEnabled = this.options.ilike;

    if (isValid(ilikeEnabled))
      return ilikeEnabled;

    const type = qb.connection.options.type;
    return type === 'postgres' || type === 'aurora-postgres';
  }

}
