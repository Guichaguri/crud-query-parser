import { CrudRequest } from '../../models/crud-request';
import { ensureCondition } from './ensureCondition';
import { CrudRequestWhereOperator } from '../../models/crud-request-where';

/**
 * Ensures a condition is always applied to the query
 *
 * @param request The parsed request
 * @param entity The property that need to be applied
 * @param basePath The field path prefix
 */
export function ensureEqCondition<T extends Record<string, any>>(request: CrudRequest, entity: Partial<T>, basePath: string[] = []): CrudRequest {
  for (const key of Object.keys(entity)) {
    if (typeof entity[key] === 'object' && !Array.isArray(entity[key])) {
      request = ensureEqCondition(request, entity[key], [...basePath, key]);
      continue;
    }

    request = ensureCondition(request, {
      field: [...basePath, key],
      operator: CrudRequestWhereOperator.EQ,
      value: entity[key],
    });
  }

  return request;
}
