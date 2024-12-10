import { CrudRequest } from './crud-request';
import { OpenAPIParameter } from './openapi-parameter';

export type RequestParamValue = string | string[] | object | object[] | undefined | null;

export interface RequestParser {

  /**
   * Parses a query string into a parsed request object
   *
   * @param query The query string map or URLSearchParams
   */
  parse(query: Record<string, RequestParamValue> | URLSearchParams): CrudRequest;

  /**
   * Gets the OpenAPI query parameters documentation
   */
  getOpenAPIParameters(): OpenAPIParameter[];

}
