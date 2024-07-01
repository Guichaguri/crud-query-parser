import { CrudRequest } from './crud-request';

export type RequestParamValue = string | string[] | undefined;

export interface RequestParser {

  /**
   * Parses a query string into a parsed request object
   *
   * @param query The query string map
   */
  parse(query: Record<string, RequestParamValue>): CrudRequest;

}
