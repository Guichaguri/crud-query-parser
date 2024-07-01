import { FieldPath } from './field-path';

export type CrudRequestWhere = CrudRequestWhereAND | CrudRequestWhereOR | CrudRequestWhereField;

export interface CrudRequestWhereAND {
  field?: never;
  or?: never;
  and: CrudRequestWhere[];
}

export interface CrudRequestWhereOR {
  field?: never;
  or: CrudRequestWhere[];
  and?: never;
}

export interface CrudRequestWhereField {

  /**
   * Field path
   *
   * For post.category.name, this would be ["post", "category", "name"]
   */
  field: FieldPath;

  /**
   * The operator of the comparison
   */
  operator: CrudRequestWhereOperator;

  /**
   * The value to compare
   */
  value: CrudRequestWhereValueType | CrudRequestWhereValueType[];

  or?: never;
  and?: never;
}

export type CrudRequestWhereValueType = string | number | boolean | Date | null | undefined;

export enum CrudRequestWhereOperator {
  EQ = 'eq',
  NEQ = 'neq',
  GT = 'gt',
  GTE = 'gte',
  LT = 'lt',
  LTE = 'lte',
  STARTS = 'starts',
  ENDS = 'ends',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  IN = 'in',
  NOT_IN = 'not_in',
  BETWEEN = 'between',
  IS_NULL = 'is_null',
  NOT_NULL = 'not_null',
  EQ_LOWER = 'eq_lower',
  NEQ_LOWER = 'neq_lower',
  STARTS_LOWER = 'starts_lower',
  ENDS_LOWER = 'ends_lower',
  CONTAINS_LOWER = 'contains_lower',
  NOT_CONTAINS_LOWER = 'not_contains_lower',
  IN_LOWER = 'in_lower',
  NOT_IN_LOWER = 'not_in_lower',
}
