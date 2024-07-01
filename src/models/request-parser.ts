import { CrudRequest } from './crud-request';
import { OpenAPIParameter } from './openapi-parameter';

export type RequestParamValue = string | string[] | undefined;

export interface RequestParser {

  /**
   * Parses a query string into a parsed request object
   *
   * @param query The query string map
   */
  parse(query: Record<string, RequestParamValue>): CrudRequest;

  /**
   * Gets the OpenAPI query parameters documentation
   */
  getOpenAPIParameters(): OpenAPIParameter[];

}
