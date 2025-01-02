import { CrudRequest } from '../../models/crud-request';
import { CrudRequestWhere } from '../../models/crud-request-where';

/**
 * Filters access to an allowlist of properties and relations.
 * No selecting, filtering, sorting and joining can be done on a property that is not listed.
 *
 * @param request The parsed request
 * @param allowedProperties The list of properties (in case of a field path, separated by dot) that will be allowed
 */
export function filterProperties(
  request: CrudRequest,
  allowedProperties: string[],
): CrudRequest {
  let select = request.select;

  if (select.length === 0) {
    select = allowedProperties.map(prop => ({ field: prop.split('.') }));
  } else {
    select = request.select.filter(item => allowedProperties.includes(item.field.join('.')));
  }

  const where = filterPropertyAccessWhere(request.where, allowedProperties) ?? { and: [] };

  const order = request.order.filter(item => allowedProperties.includes(item.field.join('.')));

  // TODO allow relations by the first part of field paths
  const relations = request.relations.filter(item => allowedProperties.includes(item.field.join('.')));

  return {
    ...request,
    select,
    where,
    order,
    relations,
  };
}

function filterPropertyAccessWhere(
  where: CrudRequestWhere,
  allowedProperties: string[],
): CrudRequestWhere | undefined {
  if (where.or) {
    return {
      or: where.or
        .map(w => filterPropertyAccessWhere(w, allowedProperties))
        .filter(w => !!w),
    };
  }

  if (where.and) {
    return {
      and: where.and
        .map(w => filterPropertyAccessWhere(w, allowedProperties))
        .filter(w => !!w),
    };
  }

  if (where.field) {
    // We'll return an empty AND where if the field is not allowed
    if (!allowedProperties.includes(where.field.join('.')))
      return undefined;
  }

  return where;
}

