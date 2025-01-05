import { FieldPath } from './field-path';
import { CrudRequestWhere } from './crud-request-where';

export interface CrudRequestFields {
  /**
   * The field path.
   *
   * For post.category.name, this would be ["post", "category", "name"]
   */
  field: FieldPath;
}

export interface CrudRequestRelation extends CrudRequestFields {
  /**
   * The joining alias only used by adapters that do support it.
   */
  alias?: string;
}

export interface CrudRequestOrder extends CrudRequestFields {
  /**
   * The sort direction.
   *
   * "ASC" for ascending and "DESC" for descending.
   */
  order: 'ASC' | 'DESC';
}

export type ParsedRequestSelect = CrudRequestFields[];

export interface CrudRequest {

  /**
   * The list of fields to return.
   *
   * In case the list is empty, it will return all fields.
   */
  select: ParsedRequestSelect;

  /**
   * The list of relations to join
   */
  relations: CrudRequestRelation[];

  /**
   * The fields that the result should be sorted by
   */
  order: CrudRequestOrder[];

  /**
   * The conditions that will filter the results
   */
  where: CrudRequestWhere;

  /**
   * The maximum amount of entities to return
   */
  limit?: number;

  /**
   * The amount of entities to offset, starting at 0.
   *
   * In case this property is set, the `page` property will be ignored.
   */
  offset?: number;

  /**
   * The current page number, starting at 1.
   *
   * This property will be ignored if `offset` is defined.
   */
  page?: number;

}
