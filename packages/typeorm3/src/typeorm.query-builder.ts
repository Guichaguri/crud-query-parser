import { Brackets, ObjectLiteral, SelectQueryBuilder, WhereExpressionBuilder } from 'typeorm';
import {
  QueryBuilderContract,
  ParsedRequest,
  ParsedRequestOrder,
  ParsedRequestRelation,
  ParsedRequestSelect,
  ParsedRequestWhere,
  ParsedRequestWhereField,
  ParsedRequestWhereOperator,
  GetManyProxy,
} from '@crud-query-parser/core';
import { ensureArray, ensureFalsy } from '@crud-query-parser/core/utils';

/**
 * Adapts queries to TypeORM 0.3+ repository.find() object
 */
export class TypeormQueryBuilder implements QueryBuilderContract<SelectQueryBuilder<any>, ObjectLiteral> {

  /**
   * @inheritDoc
   */
  public build<E extends ObjectLiteral>(qb: SelectQueryBuilder<E>, query: ParsedRequest): SelectQueryBuilder<E> {
    qb = this.createBaseQuery(qb, query);
    qb = this.paginateQuery(qb, query);

    return qb;
  }

  /**
   * @inheritDoc
   */
  public async getOne<E extends ObjectLiteral>(qb: SelectQueryBuilder<E | any>, request: ParsedRequest): Promise<E | null> {
    const query = this.createBaseQuery(qb, request);
    const entity = await query.getOne();

    return entity ?? null;
  }

  /**
   * @inheritDoc
   */
  public async getMany<E extends ObjectLiteral>(qb: SelectQueryBuilder<E | any>, request: ParsedRequest): Promise<GetManyProxy<E>> {
    const fullQuery = this.createBaseQuery(qb, request);
    const paginatedQuery = this.paginateQuery(fullQuery.clone(), request);

    const data = await paginatedQuery.getMany();
    const total = await fullQuery.getCount();

    const offset = request.offset ?? 0;
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
  protected createBaseQuery<E extends ObjectLiteral>(qb: SelectQueryBuilder<E>, query: ParsedRequest): SelectQueryBuilder<E> {
    const paramsDefined: string[] = [];

    this.adaptSelect(qb, query.select);
    this.adaptRelations(qb, query.relations);
    this.adaptWhere(qb, query.where, false, paramsDefined);
    this.adaptOrder(qb, query.order);

    return qb;
  }

  /**
   * Paginates a query based on the parsed request
   *
   * @param qb The query builder
   * @param query The parsed query
   */
  protected paginateQuery<E extends ObjectLiteral>(qb: SelectQueryBuilder<E>, query: ParsedRequest): SelectQueryBuilder<E> {
    return qb.limit(query.limit).offset(query.offset);
  }

  /**
   * Adapts a select
   *
   * @param qb The query builder
   * @param select The parsed select fields
   */
  protected adaptSelect<E extends ObjectLiteral>(qb: SelectQueryBuilder<E>, select: ParsedRequestSelect): void {
    qb.addSelect(select.map(s => s.field.join('.')));
  }

  /**
   * Adapts the join relation list
   *
   * @param qb The query builder
   * @param relations The parsed relation list
   */
  protected adaptRelations<E extends ObjectLiteral>(qb: SelectQueryBuilder<E>, relations: ParsedRequestRelation[]): void {
    for (const relation of relations) {
      const path = relation.field.join('.');
      const alias = relation.alias || path.replace('.', '_');

      qb.leftJoin(path, alias);
    }
  }

  /**
   * Adapts the order by list
   *
   * @param qb The query builder
   * @param ordering The parsed ordering
   */
  protected adaptOrder<E extends ObjectLiteral>(qb: SelectQueryBuilder<E>, ordering: ParsedRequestOrder[]): void {
    for (const order of ordering) {
      const path = order.field.join('.');

      qb.addOrderBy(path, order.order);
    }
  }

  /**
   * Adapts a where condition
   *
   * @param qb The query builder
   * @param where The quere condition
   * @param or Whether this where condition is AND/OR
   * @param params The registered parameter name list
   */
  protected adaptWhere(qb: WhereExpressionBuilder, where: ParsedRequestWhere, or: boolean, params: string[]): void {
    const addWhere = (or ? qb.orWhere : qb.andWhere).bind(qb);

    if (where.or) {
      addWhere(new Brackets(
        wqb => where.or.forEach(item => this.adaptWhere(wqb, item, true, params))
      ));
    } else if (where.and) {
      addWhere(new Brackets(
        wqb => where.and.forEach(item => this.adaptWhere(wqb, item, false, params))
      ));
    } else if (where.field) {
      console.log(where);
      const param = this.createParam(params, where.field);
      const query = this.mapWhereOperators(where as ParsedRequestWhereField, param);

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
   * @param where The where condition
   * @param param The parameter name
   */
  protected mapWhereOperators(where: ParsedRequestWhereField, param: string): { where: string, params: ObjectLiteral } {
    const field = where.field.join('.');
    const operator = where.operator;
    let value: unknown = where.value;

    switch (operator) {
      case ParsedRequestWhereOperator.EQ:
        return { where: `${field} = :${param}`, params: { [param]: value } };

      case ParsedRequestWhereOperator.NEQ:
        return { where: `${field} != :${param}`, params: { [param]: value } };

      case ParsedRequestWhereOperator.GT:
        return { where: `${field} > :${param}`, params: { [param]: value } };

      case ParsedRequestWhereOperator.GTE:
        return { where: `${field} >= :${param}`, params: { [param]: value } };

      case ParsedRequestWhereOperator.LT:
        return { where: `${field} < :${param}`, params: { [param]: value } };

      case ParsedRequestWhereOperator.LTE:
        return { where: `${field} <= :${param}`, params: { [param]: value } };

      case ParsedRequestWhereOperator.STARTS:
        return { where: `${field} LIKE :${param}`, params: { [param]: `${value}%` } };

      case ParsedRequestWhereOperator.ENDS:
        return { where: `${field} LIKE :${param}`, params: { [param]: `%${value}` } };

      case ParsedRequestWhereOperator.CONTAINS:
        return { where: `${field} LIKE :${param}`, params: { [param]: `%${value}%` } };

      case ParsedRequestWhereOperator.NOT_CONTAINS:
        return { where: `${field} NOT LIKE :${param}`, params: { [param]: `%${value}%` } };

      case ParsedRequestWhereOperator.IN:
        value = ensureArray('IN operator', value, 1);

        return { where: `${field} IN (:...${param})`, params: { [param]: value } };

      case ParsedRequestWhereOperator.NOT_IN:
        value = ensureArray('NOT IN operator', value, 1);

        return { where: `${field} NOT IN (:...${param})`, params: { [param]: value } };

      case ParsedRequestWhereOperator.BETWEEN:
        const arr = ensureArray('BETWEEN operator', value, 2);

        return {
          where: `${field} BETWEEN :${param}_start AND :${param}_end`,
          params: { [`${param}_start`]: arr[0], [`${param}_end`]: arr[1] },
        };

      case ParsedRequestWhereOperator.IS_NULL:
        ensureFalsy('IS NULL operator', value);

        return { where: `${field} IS NULL`, params: {} };

      case ParsedRequestWhereOperator.NOT_NULL:
        ensureFalsy('NOT NULL operator', value);

        return { where: `${field} IS NOT NULL`, params: {} };

      case ParsedRequestWhereOperator.EQ_LOWER:
        return { where: `LOWER(${field}) = :${param}`, params: { [param]: value } };

      case ParsedRequestWhereOperator.NEQ_LOWER:
        return { where: `LOWER(${field}) != :${param}`, params: { [param]: value } };

      case ParsedRequestWhereOperator.STARTS_LOWER:
        return { where: `LOWER(${field}) LIKE :${param}`, params: { [param]: `${value}%` } };

      case ParsedRequestWhereOperator.ENDS_LOWER:
        return { where: `LOWER(${field}) LIKE :${param}`, params: { [param]: `%${value}` } };

      case ParsedRequestWhereOperator.CONTAINS_LOWER:
        return { where: `${field} LIKE :${param}`, params: { [param]: `%${value}%` } };

      case ParsedRequestWhereOperator.NOT_CONTAINS_LOWER:
        return { where: `${field} NOT LIKE :${param}`, params: { [param]: `%${value}%` } };

      case ParsedRequestWhereOperator.IN_LOWER:
        ensureArray('IN operator', value, 1);

        return { where: `${field} IN (...:${param})`, params: { [param]: value } };

      case ParsedRequestWhereOperator.NOT_IN_LOWER:
        ensureArray('NOT IN operator', value, 1);

        return { where: `${field} NOT IN (...:${param})`, params: { [param]: value } };

      default:
        throw new Error(`Unknown operator "${operator}"`);
    }
  }

}
