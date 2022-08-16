import { ParsedRequest } from '../models/parsed-request';

export type RequestParamValue = string | string[] | undefined;

export interface RequestParserContract {

  /**
   * Parses a query string into a parsed request object
   *
   * @param query The query string map
   */
  parse(query: Record<string, RequestParamValue>): ParsedRequest;
  
}
