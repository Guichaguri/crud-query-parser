import { CrudRequest } from './crud-request';
import { GetManyResult } from './get-many-result';

/**
 * Represents a class that can build queries based on parsed requests
 *
 * @param T The database adapter query builder object
 */
export interface QueryAdapter<T, BaseEntity = any> {

  /**
   * Converts a parsed request object into a database query format
   *
   * @param baseQuery The base query to start of
   * @param request The parsed request object
   */
  build(baseQuery: T, request: CrudRequest): T;

  /**
   * Fetches one entity based on a parsed request object
   *
   * @param baseQuery The base query to start of
   * @param request The parsed request object
   */
  getOne<E extends BaseEntity>(baseQuery: T, request: CrudRequest): Promise<E | null>;

  /**
   * Fetches a paginated list of entities based on a parsed request object
   *
   * @param baseQuery The base query to start of
   * @param request The parsed request object
   */
  getMany<E extends BaseEntity>(baseQuery: T, request: CrudRequest): Promise<GetManyResult<E>>;

}
