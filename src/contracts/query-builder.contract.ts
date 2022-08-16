import { ParsedRequest } from '../models/parsed-request';
import { GetManyProxy } from '../models/get-many.proxy';

export interface QueryBuilderContract<T> {

  /**
   * Converts a parsed request object into a database query format
   *
   * @param baseQuery The base query to start of
   * @param request The parsed request object
   */
  build<E>(baseQuery: T, request: ParsedRequest): T;

  /**
   * Runs a parsed request object
   *
   * @param baseQuery The base query to start of
   * @param request The parsed request object
   */
  run<E>(baseQuery: T, request: ParsedRequest): Promise<GetManyProxy<E>>;

}
