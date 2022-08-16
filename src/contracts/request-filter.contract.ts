import { ParsedRequest } from '../models/parsed-request';
import { RequestFilter } from '../models/request-filter';

export interface RequestFilterContract {

  /**
   * Filters a parsed request object
   *
   * @param query The original request
   * @param filter The filter to apply
   */
  filter(query: ParsedRequest, filter: RequestFilter): ParsedRequest;

}
