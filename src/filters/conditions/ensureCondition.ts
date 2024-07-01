import { CrudRequest } from '../../models/crud-request';
import { CrudRequestWhere } from '../../models/crud-request-where';

/**
 * Ensures a condition is always applied to the query
 *
 * @param request The parsed request
 * @param condition The condition that needs to be applied
 */
export function ensureCondition(request: CrudRequest, condition: CrudRequestWhere): CrudRequest {
  // If there is already an "AND" condition, we'll just append to that
  if (request.where.and) {
    return {
      ...request,
      where: {
        and: [
          ...request.where.and,
          condition,
        ]
      }
    }
  }

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
