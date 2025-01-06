import type { HydratedDocument, Query } from 'mongoose';
import { QueryAdapter } from '../../models/query-adapter';
import { CrudRequest } from '../../models/crud-request';
import { GetManyResult } from '../../models/get-many-result';
import { BaseMongoQueryAdapter } from './base-mongo.query-adapter';

export interface MongooseQueryAdapterOptions {
  /**
   * Whether you want to disable the fetching the total count in `getMany()`
   */
  disableCount?: boolean;
}

type MongooseQuery = Query<any, any>;

export class MongooseQueryAdapter extends BaseMongoQueryAdapter implements QueryAdapter<Query<any, any>, HydratedDocument<any>> {

  constructor(
    private readonly options: MongooseQueryAdapterOptions = {},
  ) {
    super();
  }

  /**
   * @inheritDoc
   */
  public build<E extends HydratedDocument<any>, Q extends Query<any, E>>(baseQuery: Q, request: CrudRequest): Q {
    const query = baseQuery.clone();

    this.adaptFilter(query, request);
    this.adaptProjection(query, request);
    this.adaptSort(query, request);
    this.adaptSkipAndLimit(query, request);

    return query;
  }

  /**
   * @inheritDoc
   */
  public async getMany<E extends HydratedDocument<any>>(baseQuery: Query<any, E>, request: CrudRequest): Promise<GetManyResult<E>> {
    const query = baseQuery.clone();

    this.adaptFilter(query, request);

    const countQuery = query.clone();

    this.adaptProjection(query, request);
    this.adaptSort(query, request);

    const [skip, limit] = this.adaptSkipAndLimit(query, request);

    const total = await this.getCount(countQuery);
    const data = await query.exec();

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
  public async getOne<E extends HydratedDocument<any>>(baseQuery: Query<any, E>, request: CrudRequest): Promise<E | null> {
    const query = baseQuery.clone();

    this.adaptFilter(query, request);
    this.adaptProjection(query, request);
    this.adaptSort(query, request);

    const entities = await query.limit(1).exec();

    if (entities.length === 0)
      return null;

    return entities[0];
  }

  /**
   * Fetches the count from a query
   *
   * @param query The query
   */
  protected async getCount(query: MongooseQuery): Promise<number> {
    if (this.options.disableCount)
      return 0;

    return query.countDocuments();
  }

  /**
   * Adapts the request select list into a projection
   *
   * @param query The query
   * @param crudRequest The request
   */
  protected adaptProjection(query: MongooseQuery, crudRequest: CrudRequest): void {
    if (crudRequest.select.length === 0)
      return;

    query.projection(this.buildProjection(crudRequest));
  }

  /**
   * Adapts the request order into a sort order
   *
   * @param query The query
   * @param crudRequest The request
   */
  protected adaptSort(query: MongooseQuery, crudRequest: CrudRequest): void {
    if (crudRequest.order.length === 0)
      return;

    query.sort(this.buildSort(crudRequest));
  }

  /**
   * Adapts the request offset and limit into the cursor skip and limit
   *
   * @param query The query
   * @param crudRequest The request
   */
  protected adaptSkipAndLimit(query: MongooseQuery, crudRequest: CrudRequest): [number, number?] {
    const skip = this.buildSkip(crudRequest);
    const limit = crudRequest.limit;

    if (skip)
      query.skip(skip);

    if (limit)
      query.limit(limit);

    return [skip, limit];
  }

  /**
   * Adapts the request where conditions into a query where
   *
   * @param query The query
   * @param crudRequest The request
   */
  protected adaptFilter(query: MongooseQuery, crudRequest: CrudRequest): void {
    query.where(this.buildFilter(crudRequest));
  }

}
