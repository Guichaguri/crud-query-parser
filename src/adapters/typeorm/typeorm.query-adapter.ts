import { Brackets, ObjectLiteral, SelectQueryBuilder, WhereExpressionBuilder } from 'typeorm';
import { Alias } from 'typeorm/query-builder/Alias';
import { QueryAdapter } from '../../models/query-adapter';
import { CrudRequest, CrudRequestOrder, CrudRequestRelation, ParsedRequestSelect } from '../../models/crud-request';
import { CrudRequestWhere, CrudRequestWhereField, CrudRequestWhereOperator } from '../../models/crud-request-where';
import { GetManyResult } from '../../models/get-many-result';
import { FieldPath } from '../../models/field-path';
import { ensureArray, ensureEmpty, getOffset, isValid } from '../../utils/functions';
import { pathEquals, pathGetBaseAndName, pathGetFieldName, pathHasBase } from '../../utils/field-path';
import { createGetManyResult } from '../../utils/objects';

export interface TypeOrmQueryAdapterOptions {
  /**
   * Whether it will use ILIKE for case-insensitive operations.
   *
   * If undefined, it will be enabled by default for postgres and aurora-postgres databases
   */
  ilike?: boolean;

  /**
   * What it will do when it finds invalid fields.
   *
   * By default, `select` and `order` will ignore invalid fields, and `where` will deny invalid fields.
   */
  invalidFields?: {
    /**
     * What it will do when it finds invalid fields in `select`.
     *
     * If "ignore", it will remove invalid fields
     * If "deny", it will throw an exception for invalid fields
     * If "allow-unsafe", it will not validate any fields. Unsafe: this can allow SQL injection
     * If undefined, it will default to "ignore"
     */
    select?: 'ignore' | 'deny' | 'allow-unsafe';

    /**
     * What it will do when it finds invalid fields in `order`.
     *
     * If "ignore", it will remove invalid fields
     * If "deny", it will throw an exception for invalid fields
     * If "allow-unsafe", it will not validate any fields. Unsafe: this can allow SQL injection
     * If undefined, it will default to "ignore"
     */
    order?: 'ignore' | 'deny' | 'allow-unsafe';

    /**
     * What it will do when it finds invalid fields in `order`.
     *
     * If "ignore", it will remove invalid fields
     * If "deny", it will throw an exception for invalid fields
     * If "allow-unsafe", it will not validate any fields. Unsafe: this can allow SQL injection
     * If undefined, it will default to "deny"
     */
    where?: 'ignore' | 'deny' | 'allow-unsafe';
  }
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
    const offset = getOffset(query.offset, query.limit, query.page);

    qb = this.createBaseQuery(qb, query);
    qb = this.paginateQuery(qb, query, offset);

    return qb;
  }

  /**
   * @inheritDoc
   */
  public async getOne<E extends ObjectLiteral>(qb: SelectQueryBuilder<E>, request: CrudRequest): Promise<E | null> {
    const query = this.createBaseQuery(qb, request);
    const entity = await query.getOne();

    return entity ?? null;
  }

  /**
   * @inheritDoc
   */
  public async getMany<E extends ObjectLiteral>(qb: SelectQueryBuilder<E>, request: CrudRequest): Promise<GetManyResult<E>> {
    const offset = getOffset(request.offset, request.limit, request.page);

    const fullQuery = this.createBaseQuery(qb, request);
    const paginatedQuery = this.paginateQuery(fullQuery.clone(), request, offset);

    const data = await paginatedQuery.getMany();
    const total = await fullQuery.getCount();

    return createGetManyResult(data, total, offset, request.limit);
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
    const mainAlias = qb.expressionMap.mainAlias;

    if (!mainAlias)
      throw new Error('No main alias found in query builder');

    this.adaptSelect(qb, mainAlias, query.select);
    this.adaptRelations(qb, mainAlias, query.relations, query.select);
    this.adaptWhere(mainAlias, query.relations, qb, query.where, false, paramsDefined, isILikeEnabled);
    this.adaptOrder(qb, mainAlias, query.relations, query.order);

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
   * @param alias The base alias
   * @param select The parsed select fields
   */
  protected adaptSelect<E extends ObjectLiteral>(
    qb: SelectQueryBuilder<E>,
    alias: Alias,
    select: ParsedRequestSelect,
  ): void {
    if (select.length === 0)
      return;

    // Only fields that are one level deep
    const fields = select
      .filter(f => f.field.length === 1)
      .filter(f => this.validateField(alias, f.field, 'select'));

    qb.select(fields.map(s => [alias.name, ...s.field].join('.')));
  }

  /**
   * Adapts the join relation list
   *
   * @param qb The query builder
   * @param baseAlias The base alias
   * @param relations The parsed relation list
   * @param select The parsed select fields
   */
  protected adaptRelations<E extends ObjectLiteral>(
    qb: SelectQueryBuilder<E>,
    baseAlias: Alias,
    relations: CrudRequestRelation[],
    select: ParsedRequestSelect,
  ): void {
    for (const relation of relations) {
      const [base, field] = pathGetBaseAndName(relation.field);
      const alias = qb.expressionMap.findAliasByName([baseAlias.name, ...base].join('_'));

      const path = alias.name + '.' + field;
      const aliasName = relation.alias || (alias.name + '_' + field);

      const fields = select
        .filter(f => pathHasBase(f.field, relation.field))
        .filter(f => this.validateField(baseAlias, f.field, 'select'));

      if (fields.length === 0) {
        qb.leftJoinAndSelect(path, aliasName);
      } else {
        qb.leftJoin(path, aliasName);
        qb.addSelect(fields.map(f => [aliasName, f.field[f.field.length - 1]].join('.')));
      }
    }
  }

  /**
   * Adapts the order by list
   *
   * @param qb The query builder
   * @param alias The base alias
   * @param relations The list of relations
   * @param ordering The parsed ordering
   */
  protected adaptOrder<E extends ObjectLiteral>(
    qb: SelectQueryBuilder<E>,
    alias: Alias,
    relations: CrudRequestRelation[],
    ordering: CrudRequestOrder[],
  ): void {
    for (const order of ordering) {
      if (!this.validateField(alias, order.field, 'order'))
        continue;

      const [fieldBase, fieldName] = pathGetBaseAndName(order.field);
      const aliasName = this.getFieldAlias(alias, relations, fieldBase);

      const path = aliasName + '.' + fieldName;

      qb.addOrderBy(path, order.order);
    }
  }

  /**
   * Adapts a where condition
   *
   * @param alias The query builder alias
   * @param relations The list of relations
   * @param qb The query builder
   * @param where The quere condition
   * @param or Whether this where condition is AND/OR
   * @param params The registered parameter name list
   * @param isILikeEnabled Whether the ILIKE operator can be used
   */
  protected adaptWhere(
    alias: Alias,
    relations: CrudRequestRelation[],
    qb: WhereExpressionBuilder,
    where: CrudRequestWhere,
    or: boolean,
    params: string[],
    isILikeEnabled: boolean,
  ): void {
    const addWhere = (or ? qb.orWhere : qb.andWhere).bind(qb);

    if (where.or && where.or.length > 0) {
      addWhere(new Brackets(
        wqb => where.or!.forEach(item => this.adaptWhere(alias, relations, wqb, item, true, params, isILikeEnabled))
      ));
    } else if (where.and && where.and.length > 0) {
      addWhere(new Brackets(
        wqb => where.and!.forEach(item => this.adaptWhere(alias, relations, wqb, item, false, params, isILikeEnabled))
      ));
    } else if (where.field) {
      if (!this.validateField(alias, where.field, 'where'))
        return;

      const param = this.createParam(params, where.field);
      const query = this.mapWhereOperators(alias, relations, where as CrudRequestWhereField, param, isILikeEnabled);

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
    const name = pathGetFieldName(field);
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
   * Checks whether the field is valid
   *
   * @param alias The base alias
   * @param path The field path
   * @param source The source where the field validation comes from
   */
  protected validateField(alias: Alias, path: FieldPath, source: 'select' | 'order' | 'where'): boolean {
    const isValid = this.isFieldValid(alias, path);

    if (isValid)
      return true;

    const defaults = {
      select: 'ignore',
      order: 'ignore',
      where: 'deny',
    };

    const rule = this.options.invalidFields?.[source] || defaults[source];

    if (rule === 'allow-unsafe')
      return true;

    if (rule === 'deny')
      throw new Error(`${source} field "${path.join('.')}" is invalid.`);

    // rule === 'ignore'
    return false;
  }

  /**
   * Checks whether the field is valid
   *
   * @param alias The base alias
   * @param path The field path
   */
  protected isFieldValid(alias: Alias, path: FieldPath): boolean {
    if (path.length === 0)
      return false;

    let metadata = alias.metadata;

    const relationPath = [...path];
    const field = relationPath.pop()!;

    for (const part of relationPath) {
      const relation = metadata.findRelationWithPropertyPath(part);

      if (!relation)
        return false;

      metadata = relation.inverseEntityMetadata;
    }

    const column = metadata.findColumnWithPropertyPathStrict(field);

    return !!column;
  }

  /**
   * Maps where operators to a pseudo-SQL statement and a parameter map
   *
   * @param alias The query builder alias
   * @param relations The list of relations
   * @param where The where condition
   * @param param The parameter name
   * @param isILikeEnabled Whether the ILIKE operator can be used
   */
  protected mapWhereOperators(
    alias: Alias,
    relations: CrudRequestRelation[],
    where: CrudRequestWhereField,
    param: string,
    isILikeEnabled: boolean,
  ): { where: string, params: ObjectLiteral } {
    const [pathBase, pathField] = pathGetBaseAndName(where.field);
    const fieldAlias = this.getFieldAlias(alias, relations, pathBase);

    const field = fieldAlias + '.' + pathField;

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
        ensureEmpty('IS NULL operator', value);

        return { where: `${field} IS NULL`, params: {} };

      case CrudRequestWhereOperator.NOT_NULL:
        ensureEmpty('NOT NULL operator', value);

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

        return { where: `LOWER(${field}) IN (:...${param})`, params: { [param]: value } };

      case CrudRequestWhereOperator.NOT_IN_LOWER:
        ensureArray('NOT IN operator', value, 1);

        return { where: `LOWER(${field}) NOT IN (:...${param})`, params: { [param]: value } };
    }

    throw new Error(`Unsupported operator "${operator}"`);
  }

  /**
   * Gets a field alias based on its base path
   *
   * @param alias The query main alias
   * @param relations The relations
   * @param base The base path
   */
  protected getFieldAlias(alias: Alias, relations: CrudRequestRelation[], base: string[]): string {
    if (base.length === 0)
      return alias.name;

    const relation = relations.find(r => pathEquals(r.field, base));

    if (relation && relation.alias)
      return relation.alias;

    return [alias.name, ...base].join('_');
  }

  /**
   * Creates an ILIKE expression that works on all databases
   *
   * @param isILikeEnabled Whether ILIKE is supported
   * @param field The field name
   * @param not Whether the expression is inverted
   */
  protected createLowerLike(isILikeEnabled: boolean, field: string, not: boolean = false): string {
    if (isILikeEnabled)
      return not ? `${field} NOT ILIKE` : `${field} ILIKE`;

    return not ? `LOWER(${field}) NOT LIKE` : `LOWER(${field}) LIKE`;
  }

  /**
   * Checks whether ILIKE expressions are available for the current database
   *
   * @param qb The query builder
   */
  protected isILikeEnabled(qb: SelectQueryBuilder<any>): boolean {
    const ilikeEnabled = this.options.ilike;

    if (isValid(ilikeEnabled))
      return ilikeEnabled;

    const type = qb.connection.options.type;
    return type === 'postgres' || type === 'aurora-postgres';
  }

}
