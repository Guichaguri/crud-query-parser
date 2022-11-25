import { ParsedRequest } from '../models/parsed-request';
import { GetManyProxy } from '../models/get-many.proxy';

/**
 * Represents a class that can build queries based on parsed requests
 *
 * @param T The database adapter query builder object
 */
export interface QueryBuilderContract<T> {

  /**
   * Converts a parsed request object into a database query format
   *
   * @param baseQuery The base query to start of
   * @param request The parsed request object
   */
  build<E>(baseQuery: T, request: ParsedRequest): T;

  /**
   * Fetches one entity based on a parsed request object
   *
   * @param baseQuery The base query to start of
   * @param request The parsed request object
   */
  getOne<E>(baseQuery: T, request: ParsedRequest): Promise<E | null>;

  /**
   * Fetches a paginated list of entities based on a parsed request object
   *
   * @param baseQuery The base query to start of
   * @param request The parsed request object
   */
  getMany<E>(baseQuery: T, request: ParsedRequest): Promise<GetManyProxy<E>>;

}
