import type { Collection, Document, Filter, FindCursor, WithId } from 'mongodb';
import { QueryAdapter } from '../../models/query-adapter';
import { CrudRequest } from '../../models/crud-request';
import { GetManyResult } from '../../models/get-many-result';
import { BaseMongoQueryAdapter } from './base-mongo.query-adapter';

export interface MongoQueryAdapterOptions {
  /**
   * Whether you want to disable the fetching the total in `getMany()`
   */
  disableCount?: boolean;
}

export class MongoDBQueryAdapter extends BaseMongoQueryAdapter implements QueryAdapter<FindCursor | Collection, Document> {

  constructor(
    private readonly options: MongoQueryAdapterOptions = {},
  ) {
    super();
  }

  /**
   * @inheritDoc
   */
  public build<E extends Document>(base: FindCursor<WithId<E>> | Collection<E>, request: CrudRequest): FindCursor<WithId<E>> {
    const cursor = 'find' in base ? base.find() : base;

    this.adaptFilter(cursor, request);
    this.adaptProjection(cursor, request);
    this.adaptSort(cursor, request);
    this.adaptSkipAndLimit(cursor, request);

    return cursor;
  }

  /**
   * @inheritDoc
   */
  public async getMany<E extends Document>(base: FindCursor<E> | Collection<E>, request: CrudRequest): Promise<GetManyResult<WithId<E>>> {
    const cursor = 'find' in base ? base.find() : base as FindCursor<WithId<E>>;

    const filter = this.adaptFilter<E>(cursor, request);

    const total = await this.getCount<E>(base, cursor, filter);

    this.adaptProjection(cursor, request);
    this.adaptSort(cursor, request);

    const [skip, limit] = this.adaptSkipAndLimit(cursor, request);

    const data = await cursor.toArray();

    const actualLimit = limit || data.length;
    const count = data.length;
    const page = actualLimit ? Math.floor(skip / actualLimit) + 1 : 1;
    const pageCount = actualLimit ? Math.ceil(total / actualLimit) : 0;

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

    this.adaptFilter(cursor, request);
    this.adaptProjection(cursor, request);
    this.adaptSort(cursor, request);
    this.adaptSkipAndLimit(cursor, request);

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

    if ('countDocuments' in base && typeof base.countDocuments === 'function')
      return await base.countDocuments(filter);

    if ('count' in base && typeof cursor.count === 'function')
      return await cursor.count();

    return 0;
  }

  /**
   * Adapts the query select list into a projection
   *
   * @param cursor The cursor
   * @param crudRequest The request
   */
  protected adaptProjection<E>(cursor: FindCursor<E>, crudRequest: CrudRequest): void {
    if (crudRequest.select.length === 0)
      return;

    cursor.project(this.buildProjection(crudRequest));
  }

  /**
   * Adapts the query order into a sort order
   *
   * @param cursor The cursor
   * @param crudRequest The request
   */
  protected adaptSort<E>(cursor: FindCursor<E>, crudRequest: CrudRequest): void {
    if (crudRequest.order.length === 0)
      return;

    cursor.sort(this.buildSort(crudRequest));
  }

  /**
   * Adapts the query offset and limit into the cursor skip and limit
   *
   * @param cursor The cursor
   * @param crudRequest The request
   */
  protected adaptSkipAndLimit<E>(cursor: FindCursor<E>, crudRequest: CrudRequest): [number, number?] {
    const skip = this.buildSkip(crudRequest);
    const limit = crudRequest.limit;

    if (skip)
      cursor.skip(skip);

    if (limit)
      cursor.limit(limit);

    return [skip, limit];
  }

  /**
   * Adapts the query where conditions into a cursor filter
   *
   * @param cursor The cursor
   * @param crudRequest The request
   */
  protected adaptFilter<E>(cursor: FindCursor<WithId<E>>, crudRequest: CrudRequest): Filter<E> {
    const filter = this.buildFilter<E>(crudRequest);

    cursor.filter(filter);

    return filter;
  }

}
