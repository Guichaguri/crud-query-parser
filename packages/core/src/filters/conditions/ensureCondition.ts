import { ParsedRequest } from '../../models/parsed-request';
import { ParsedRequestWhere } from '../../models/parsed-request-where';

/**
 * Ensures a condition is always applied to the query
 *
 * @param request The parsed request
 * @param condition The condition that needs to be applied
 */
export function ensureCondition(request: ParsedRequest, condition: ParsedRequestWhere): ParsedRequest {
  return {
    ...request,
    where: {
      and: [
        condition,
        request.where,
      ],
    },
  };
}
