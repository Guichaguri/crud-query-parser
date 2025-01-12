import sequelize, { Attributes, FindOptions, Model, ModelStatic, Op, OrderItem, WhereOptions } from 'sequelize';
import { IncludeOptions, WhereAttributeHashValue } from 'sequelize/types/model';
import { GetManyResult } from '../../models/get-many-result';
import { QueryAdapter } from '../../models/query-adapter';
import { FieldPath } from '../../models/field-path';
import { CrudRequest, CrudRequestOrder, CrudRequestRelation, ParsedRequestSelect } from '../../models/crud-request';
import { CrudRequestWhere, CrudRequestWhereField, CrudRequestWhereOperator } from '../../models/crud-request-where';
import { ensureArray, ensurePrimitive, ensurePrimitiveOrNull, getOffset, isValid } from '../../utils/functions';
import { createGetManyResult } from '../../utils/objects';
import { pathGetFieldName, pathHasBase } from '../../utils/field-path';

export interface SequelizeQueryAdapterOptions {
  /**
   * Whether it will use ILIKE for case-insensitive operations.
   *
   * If undefined, it will be enabled by default for postgres databases
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

    /**
     * What it will do when it finds invalid associations in `relations`.
     *
     * If "ignore", it will remove invalid relations
     * If "deny", it will throw an exception for invalid relations
     * If undefined, it will default to "ignore"
     */
    relations?: 'ignore' | 'deny';
  }
}

export class SequelizeQueryAdapter<T extends Model = Model> implements QueryAdapter<FindOptions, T> {
  /**
   * Whether it should use the ILIKE operator
   */
  protected ilikeEnabled: boolean;

  constructor(
    protected readonly model: ModelStatic<T>,
    protected readonly options: SequelizeQueryAdapterOptions = {},
  ) {
    this.ilikeEnabled = this.isILikeEnabled();
  }

  /**
   * @inheritDoc
   */
  public build<A>(baseQuery: FindOptions<A>, request: CrudRequest): FindOptions<A> {
    const query = this.createBaseQuery(baseQuery, request);

    const offset = getOffset(request.offset, request.limit, request.page);

    this.adaptOffsetAndLimit(query, offset, request.limit);

    return query;
  }

  /**
   * @inheritDoc
   */
  public async getOne<E extends T>(baseQuery: FindOptions<Attributes<T>>, request: CrudRequest): Promise<E | null> {
    const query = this.createBaseQuery(baseQuery, request);

    return await this.model.findOne(query) as E | null;
  }

  /**
   * @inheritDoc
   */
  public async getMany<E extends T>(baseQuery: FindOptions<Attributes<T>>, request: CrudRequest): Promise<GetManyResult<E>> {
    const query = this.createBaseQuery(baseQuery, request);

    const offset = getOffset(request.offset, request.limit, request.page);

    this.adaptOffsetAndLimit(query, offset, request.limit);

    const { rows, count } = await this.model.findAndCountAll(query);

    return createGetManyResult<E>(rows as E[], count, offset, request.limit);
  }

  /**
   * Creates the base query, without offset and limit
   *
   * @param baseQuery The base query
   * @param request The request
   */
  protected createBaseQuery(baseQuery: FindOptions<Attributes<T>>, request: CrudRequest): FindOptions<Attributes<T>> {
    const query = { ...baseQuery };

    this.adaptSelect(query, request.select);
    this.adaptOrder(query, request.order);
    this.adaptRelations(query, request.relations, request.select);
    this.adaptWhere(query, request.where);

    return query;
  }

  /**
   * Adapts the request select to Sequelize attributes
   *
   * @param query The Sequelize query
   * @param select The request select fields
   */
  protected adaptSelect(query: FindOptions, select: ParsedRequestSelect): void {
    if (select.length === 0)
      return;

    query.attributes = select
      .filter(f => f.field.length === 1)
      .filter(f => this.validateField(f.field, 'select'))
      .map(f => f.field[0]);
  }

  /**
   * Adapts the request order to Sequelize
   *
   * @param query The Sequelize query
   * @param order The request order list
   */
  protected adaptOrder(query: FindOptions, order: CrudRequestOrder[]): void {
    const sequelizeOrder = order
      .filter(f => this.validateField(f.field, 'order'))
      .map(f => [...f.field, f.order] as OrderItem);

    if (sequelizeOrder.length === 0)
      return;

    query.order = sequelizeOrder;
  }

  /**
   * Adapts the request relations to Sequelize associations
   *
   * @param query The Sequelize query
   * @param relations The request relations list
   * @param select The request select fields
   */
  protected adaptRelations(query: FindOptions, relations: CrudRequestRelation[], select: ParsedRequestSelect): void {
    const include = this.mapRelation([], relations, select);

    if (include.length === 0)
      return;

    query.include = include;
  }

  /**
   * Maps a relation based on a base path to a Sequelize include
   *
   * @param base The base path
   * @param relations The request relation list
   * @param select The request select fields
   */
  protected mapRelation(
    base: FieldPath,
    relations: CrudRequestRelation[],
    select: ParsedRequestSelect,
  ): IncludeOptions[] {
    return relations
      .filter(relation => pathHasBase(relation.field, base))
      .map(relation => {
        const model = this.findFieldModel(relation.field);

        if (!model) {
          this.handleInvalidField(relation.field, 'relations');

          return null;
        }

        const attributes = select
          .filter(f => pathHasBase(f.field, relation.field))
          .filter(f => this.validateField(f.field, 'select'))
          .map(f => pathGetFieldName(f.field));

        const include = this.mapRelation(relation.field, relations, select);

        return {
          model,
          ...(include.length > 0) && { include },
          ...(select.length > 0) && { attributes },
        } as IncludeOptions;
      })
      .filter(relation => !!relation);
  }

  /**
   * Adapts the request offset and limit to Sequelize
   *
   * @param query The Sequelize query
   * @param offset The offset
   * @param limit The limit
   */
  protected adaptOffsetAndLimit(query: FindOptions, offset: number, limit: number | undefined): void {
    if (offset)
      query.offset = offset;

    if (limit)
      query.limit = limit;
  }

  /**
   * Adapts a where condition to Sequelize
   *
   * @param query The Sequelize query
   * @param where The request where condition
   */
  protected adaptWhere(query: FindOptions, where: CrudRequestWhere): void {
    query.where = this.mapWhere(where);
  }

  /**
   * Maps a request where condition to a Sequelize where
   *
   * @param where The request where condition
   */
  protected mapWhere(where: CrudRequestWhere): WhereOptions | undefined {
    if (where.and && where.and.length > 0) {
      return {
        [Op.and]: where.and
          .map(item => this.mapWhere(item))
          .filter(condition => !!condition),
      };
    }

    if (where.or && where.or.length > 0) {
      return {
        [Op.or]: where.or
          .map(item => this.mapWhere(item))
          .filter(condition => !!condition),
      };
    }

    if (where.field) {
      if (!this.validateField(where.field, 'where'))
        return undefined;

      return this.mapWhereOperator(where);
    }

    return undefined;
  }

  /**
   * Maps a request condition to its respective Sequelize condition
   *
   * @param where The request field condition
   */
  protected mapWhereOperator(where: CrudRequestWhereField): WhereAttributeHashValue<any> {
    const field = where.field;
    const column = field.length === 1 ? field[0] : `$${field.join('.')}$`;
    const value = where.value;

    switch (where.operator) {
      case CrudRequestWhereOperator.EQ:
        return { [column]: ensurePrimitiveOrNull('EQ operator', value) };

      case CrudRequestWhereOperator.NEQ:
        return { [column]: { [Op.ne]: ensurePrimitiveOrNull('NEQ operator', value) } };

      case CrudRequestWhereOperator.GT:
        return { [column]: { [Op.gt]: ensurePrimitive('GT operator', value) } };

      case CrudRequestWhereOperator.GTE:
        return { [column]: { [Op.gte]: ensurePrimitive('GTE operator', value) } };

      case CrudRequestWhereOperator.LT:
        return { [column]: { [Op.lt]: ensurePrimitive('LT operator', value) } };

      case CrudRequestWhereOperator.LTE:
        return { [column]: { [Op.lte]: ensurePrimitive('LTE operator', value) } };

      case CrudRequestWhereOperator.STARTS:
        return { [column]: { [Op.startsWith]: `${value}` } };

      case CrudRequestWhereOperator.ENDS:
        return { [column]: { [Op.endsWith]: `${value}` } };

      case CrudRequestWhereOperator.CONTAINS:
        return { [column]: { [Op.substring]: `${value}` } };

      case CrudRequestWhereOperator.NOT_CONTAINS:
        return { [column]: { [Op.notLike]: `%${value}%` } };

      case CrudRequestWhereOperator.IN:
        return { [column]: { [Op.in]: ensureArray('IN operator', value) } };

      case CrudRequestWhereOperator.NOT_IN:
        return { [column]: { [Op.notIn]: ensureArray('NOT IN operator', value) } };

      case CrudRequestWhereOperator.BETWEEN:
        return { [column]: { [Op.between]: ensureArray('BETWEEN operator', value, 2) } };

      case CrudRequestWhereOperator.IS_NULL:
        return { [column]: { [Op.eq]: null } };

      case CrudRequestWhereOperator.NOT_NULL:
        return { [column]: { [Op.ne]: null } };

      case CrudRequestWhereOperator.EQ_LOWER:
        return this.mapLowerCondition(field, { [Op.eq]: value });

      case CrudRequestWhereOperator.NEQ_LOWER:
        return this.mapLowerCondition(field, { [Op.ne]: value });

      case CrudRequestWhereOperator.STARTS_LOWER:
        return this.mapLowerLike(field, column, `${value}%`);

      case CrudRequestWhereOperator.ENDS_LOWER:
        return this.mapLowerLike(field, column, `%${value}`);

      case CrudRequestWhereOperator.CONTAINS_LOWER:
        return this.mapLowerLike(field, column, `%${value}%`);

      case CrudRequestWhereOperator.NOT_CONTAINS_LOWER:
        return this.mapLowerLike(field, column, `%${value}%`, true);

      case CrudRequestWhereOperator.IN_LOWER:
        return this.mapLowerCondition(field, { [Op.in]: ensureArray('IN operator', value, 1) });

      case CrudRequestWhereOperator.NOT_IN_LOWER:
        return this.mapLowerCondition(field, { [Op.notIn]: ensureArray('NOT IN operator', value, 1) });
    }

    throw new Error(`Unsupported operator "${where.operator}"`);
  }

  /**
   * Maps a LIKE condition to the lower implementation,
   * being ILIKE in Postgres or LOWER(column) LIKE in other databases.
   *
   * @param field The field path
   * @param column The column name
   * @param value The value
   * @param not Whether it's an inverted condition
   */
  protected mapLowerLike(
    field: FieldPath,
    column: string,
    value: string,
    not: boolean = false,
  ): WhereAttributeHashValue<any> {
    if (this.ilikeEnabled) {
      return { [column]: { [not ? Op.notILike : Op.iLike]: value } };
    }

    return this.mapLowerCondition(field, { [not ? Op.notLike : Op.like]: value });
  }

  /**
   * Maps a LOWER(column) condition
   *
   * @param field The field path
   * @param operator The attribute hash value
   */
  protected mapLowerCondition(field: FieldPath, operator: WhereAttributeHashValue<any>): WhereAttributeHashValue<any> {
    return sequelize.where(
      sequelize.fn('lower', sequelize.col(field.join('.'))),
      operator,
    );
  }

  /**
   * Checks whether ILIKE expressions are available for the current database
   */
  protected isILikeEnabled(): boolean {
    const ilikeEnabled = this.options.ilike;

    if (isValid(ilikeEnabled))
      return ilikeEnabled;

    return this.model.options?.sequelize?.getDialect() === 'postgres';
  }

  /**
   * Checks whether the field is valid
   *
   * @param path The field path
   * @param source The source where the field validation comes from
   */
  protected validateField(path: FieldPath, source: 'select' | 'order' | 'where' | 'relations'): boolean {
    const isValid = this.isFieldValid(path);

    if (isValid)
      return true;

    return this.handleInvalidField(path, source);
  }

  /**
   * Handles an invalid field, returning `true` if it should allow unsafe, `false` if it should ignore,
   * or throwing an exception if it should deny.
   *
   * @param path The field path
   * @param source The source where the field validation comes from
   */
  protected handleInvalidField(path: FieldPath, source: 'select' | 'order' | 'where' | 'relations'): boolean {
    const defaults = {
      select: 'ignore',
      order: 'ignore',
      where: 'deny',
      relations: 'ignore',
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
   * Finds a model from a field base path
   *
   * @param base The base path
   */
  protected findFieldModel(base: FieldPath): ModelStatic<any> | null {
    let model: ModelStatic<any> = this.model;

    for (const part of base) {
      const relation = model.associations[part];

      if (!relation)
        return null;

      model = relation.target;
    }

    return model;
  }

  /**
   * Checks whether the field is valid
   *
   * @param path The field path
   */
  protected isFieldValid(path: FieldPath): boolean {
    if (path.length === 0)
      return false;

    const relationPath = [...path];
    const field = relationPath.pop()!;

    const model = this.findFieldModel(relationPath);

    if (!model)
      return false;

    const attributes = model.getAttributes();
    const column = attributes[field];

    return !!column;
  }

}
