import { GetManyResult } from '../models/get-many-result';
import { CrudRequest } from '../models/crud-request';

/**
 * Creates a CrudRequest object, filling required missing properties with empty values
 */
export function createCrudRequest(crudRequest?: Partial<CrudRequest>): CrudRequest {
  return {
    select: [],
    relations: [],
    order: [],
    where: { and: [] },
    ...crudRequest,
  };
}

/**
 * Creates a GetManyResult object
 *
 * @param data The entity list to be returned
 * @param total The total amount of entities in the database
 * @param offset The offset used for querying
 * @param limit The limit used for querying
 */
export function createGetManyResult<T>(data: T[], total: number, offset: number, limit?: number): GetManyResult<T> {
  const count = data.length;
  const actualLimit = limit ?? total;
  const page = actualLimit > 0 ? Math.floor(offset / actualLimit) + 1 : 1;
  const pageCount = actualLimit > 0 ? Math.ceil(total / actualLimit) : 0;

  return {
    data,
    count,
    total,
    page,
    pageCount,
  };
}
