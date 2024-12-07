import { Collection, Condition, Document, Filter, FindCursor, WithId } from 'mongodb';
import { QueryAdapter } from '../../models/query-adapter';
import { CrudRequest, CrudRequestOrder, ParsedRequestSelect } from '../../models/crud-request';
import { GetManyResult } from '../../models/get-many-result';
import { CrudRequestWhere, CrudRequestWhereOperator, CrudRequestWhereValueType } from '../../models/crud-request-where';
import { ensureArray, ensureString, escapeRegex, getOffset } from '../../utils/functions';

export interface MongoQueryAdapterOptions {
  /**
   * Whether you want to disable the fetching the total in `getMany()`
   */
  disableCount?: boolean;
}

export class MongoQueryAdapter implements QueryAdapter<FindCursor | Collection, Document> {

  constructor(
    private readonly options: MongoQueryAdapterOptions = {},
  ) {}

  /**
   * @inheritDoc
   */
  public build<E extends Document>(base: FindCursor<WithId<E>> | Collection<E>, request: CrudRequest): FindCursor<WithId<E>> {
    const cursor = 'find' in base ? base.find() : base;

    this.adaptFilter(cursor, request.where);
    this.adaptProjection(cursor, request.select);
    this.adaptSort(cursor, request.order);
    this.adaptLimit(cursor, getOffset(request.offset, request.limit, request.page), request.limit);

    return cursor;
  }

  /**
   * @inheritDoc
   */
  public async getMany<E extends Document>(base: FindCursor<E> | Collection<E>, request: CrudRequest): Promise<GetManyResult<WithId<E>>> {
    const cursor = 'find' in base ? base.find() : base as FindCursor<WithId<E>>;

    const filter = this.adaptFilter<E>(cursor, request.where);

    const total = await this.getCount<E>(base, cursor, filter);
    const offset = getOffset(request.offset, request.limit, request.page);

    this.adaptProjection(cursor, request.select);
    this.adaptSort(cursor, request.order);
    this.adaptLimit(cursor, offset, request.limit);

    const data = await cursor.toArray();

    const limit = request.limit || data.length;
    const count = data.length;
    const page = Math.floor(offset / limit) + 1;
    const pageCount = Math.ceil(total / limit);

    return {
      data,
      count,
      total,
      page,
      pageCount,
    };
  }

  /**
   * @inheritDoc
   */
  public async getOne<E extends Document>(base: FindCursor<E> | Collection<E>, request: CrudRequest): Promise<WithId<E> | null> {
    const cursor = 'find' in base ? base.find() : base as FindCursor<WithId<E>>;

    this.adaptFilter(cursor, request.where);
    this.adaptProjection(cursor, request.select);
    this.adaptSort(cursor, request.order);
    this.adaptLimit(cursor, getOffset(request.offset, request.limit, request.page), request.limit);

    return await cursor.next();
  }

  /**
   * Fetches the count from a cursor or a collection
   *
   * @param base The cursor or collection
   * @param cursor The actual cursor
   * @param filter The filter
   */
  protected async getCount<E extends Document>(base: FindCursor<E> | Collection<E>, cursor: FindCursor<WithId<E>>, filter: Filter<E>): Promise<number> {
    if (this.options.disableCount)
      return 0;

    if ('countDocuments' in base)
      return await base.countDocuments(filter);

    if ('count' in cursor)
      return await cursor.count();

    return 0;
  }

  /**
   * Adapts the query select list into a projection
   *
   * @param cursor The cursor
   * @param select The query select fields
   */
  protected adaptProjection<E>(cursor: FindCursor<E>, select: ParsedRequestSelect): void {
    if (select.length === 0)
      return;

    cursor.project(select.reduce<Record<string, true>>((obj, item) => {
      obj[item.field.join('.')] = true;

      return obj;
    }, {}));
  }

  /**
   * Adapts the query order into a sort order
   *
   * @param cursor The cursor
   * @param order The query order
   */
  protected adaptSort<E>(cursor: FindCursor<E>, order: CrudRequestOrder[]): void {
    if (order.length === 0)
      return;

    cursor.sort(order.map<[string, -1 | 1]>(
      item => [item.field.join('.'), item.order === 'DESC' ? -1 : 1],
    ));
  }

  /**
   * Adapts the query offset and limit into the cursor skip and limit
   *
   * @param cursor The cursor
   * @param offset The query offset
   * @param limit The query limit
   */
  protected adaptLimit<E>(cursor: FindCursor<E>, offset: number, limit: number | undefined): void {
    if (offset)
      cursor.skip(offset);

    if (limit)
      cursor.limit(limit);
  }

  /**
   * Adapts the query where conditions into a cursor filter
   *
   * @param cursor The cursor
   * @param where The where condition
   */
  protected adaptFilter<E>(cursor: FindCursor<WithId<E>>, where: CrudRequestWhere): Filter<E> {
    const filter = this.mapFilter<E>(where);

    cursor.filter(filter);

    return filter;
  }

  /**
   * Maps the where condition into a cursor filter
   *
   * @param where The where condition
   */
  protected mapFilter<E>(where: CrudRequestWhere): Filter<E> {
    if (where.and) {
      return { $and: where.and.map(item => this.mapFilter(item)) };
    }

    if (where.or) {
      return { $or: where.or.map(item => this.mapFilter(item)) };
    }

    if (where.field) {
      return { [where.field.join('.') as any]: this.mapCondition(where.operator, where.value) };
    }

    return {};
  }

  /**
   * Maps the query operator into a cursor condition operator
   *
   * @param operator The condition operator
   * @param value The condition value
   */
  protected mapCondition(
    operator: CrudRequestWhereOperator,
    value: CrudRequestWhereValueType | CrudRequestWhereValueType[],
  ): Condition<any> {
    switch (operator) {
      case CrudRequestWhereOperator.EQ:
        return value;

      case CrudRequestWhereOperator.NEQ:
        return { $ne: value };

      case CrudRequestWhereOperator.GT:
        return { $gt: value };

      case CrudRequestWhereOperator.GTE:
        return { $gte: value };

      case CrudRequestWhereOperator.LT:
        return { $lt: value };

      case CrudRequestWhereOperator.LTE:
        return { $lte: value };

      case CrudRequestWhereOperator.IN:
        return { $in: value };

      case CrudRequestWhereOperator.NOT_IN:
        return { $nin: value };

      case CrudRequestWhereOperator.IS_NULL:
        return { $eq: null };

      case CrudRequestWhereOperator.NOT_NULL:
        return { $ne: null };

      case CrudRequestWhereOperator.BETWEEN:
        const arr = ensureArray('BETWEEN operator', value, 2);

        return { $gte: arr[0], $lte: arr[1] };

      case CrudRequestWhereOperator.CONTAINS:
        return { $regex: escapeRegex(ensureString('CONTAINS operator', value)) };

      case CrudRequestWhereOperator.NOT_CONTAINS:
        return { $not: { $regex: escapeRegex(ensureString('CONTAINS operator', value)) } };

      case CrudRequestWhereOperator.STARTS:
        return { $regex: '^' + escapeRegex(ensureString('STARTS operator', value)) };

      case CrudRequestWhereOperator.ENDS:
        return { $regex: escapeRegex(ensureString('ENDS operator', value)) + '$' };

      case CrudRequestWhereOperator.EQ_LOWER:
        return { $regex: '^' + escapeRegex(ensureString('EQ LOWER operator', value)) + '$', $options: 'i' };

      case CrudRequestWhereOperator.NEQ_LOWER:
        return { $not: { $regex: '^' + escapeRegex(ensureString('NEQ LOWER operator', value)) + '$', $options: 'i' } };

      case CrudRequestWhereOperator.CONTAINS_LOWER:
        return { $regex: '^' + escapeRegex(ensureString('CONTAINS LOWER operator', value)), $options: 'i' };

      case CrudRequestWhereOperator.NOT_CONTAINS_LOWER:
        return { $not: { $regex: escapeRegex(ensureString('NOT CONTAINS LOWER operator', value)) + '$', $options: 'i' } };

      case CrudRequestWhereOperator.STARTS_LOWER:
        return { $regex: '^' + escapeRegex(ensureString('STARTS LOWER operator', value)), $options: 'i' };

      case CrudRequestWhereOperator.ENDS_LOWER:
        return { $regex: escapeRegex(ensureString('ENDS LOWER operator', value)) + '$', $options: 'i' };

      case CrudRequestWhereOperator.IN_LOWER:
        return {
          $in: ensureArray('IN LOWER operator', value, 1).map((item, i) => (
            { $regex: '^' + escapeRegex(ensureString(`IN LOWER [${i}] operator`, item)) + '$', $options: 'i' }
          )),
        };

      case CrudRequestWhereOperator.NOT_IN_LOWER:
        return {
          $nin: ensureArray('NOT IN LOWER operator', value, 1).map((item, i) => (
            { $regex: '^' + escapeRegex(ensureString(`NOT IN LOWER [${i}] operator`, item)) + '$', $options: 'i' }
          )),
        };

      default:
        throw new Error(`Unsupported operator ${operator}.`);
    }
  }

}
