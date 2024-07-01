import { CrudRequest } from '../../models/crud-request';

/**
 * Filters access to an allowlist of relations.
 *
 * @param request The parsed request
 * @param allowedRelations The list of relations (in case of a field path, separated by dot) that will be allowed
 */
export function filterRelations(
  request: CrudRequest,
  allowedRelations: string[],
): CrudRequest {
  const relations = request.relations.filter(item => allowedRelations.includes(item.field.join('.')));

  return {
    ...request,
    relations,
  };
}
