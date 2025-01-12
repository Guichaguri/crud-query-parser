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
  /**
   * Equals (`==`) (accepts string, number, boolean and Date)
   */
  EQ = 'eq',

  /**
   * Not Equals (`!=`) (accepts string, number, boolean and Date)
   */
  NEQ = 'neq',

  /**
   * Greater than (`>`) (accepts string, number, boolean and Date)
   */
  GT = 'gt',

  /**
   * Greater than or equal (`>=`) (accepts string, number, boolean and Date)
   */
  GTE = 'gte',

  /**
   * Less than (`<`) (accepts string, number, boolean and Date)
   */
  LT = 'lt',

  /**
   * Less than or equal (`<=`) (accepts string, number, boolean and Date)
   */
  LTE = 'lte',

  /**
   * Starts with (accepts string)
   */
  STARTS = 'starts',

  /**
   * Ends with (accepts string)
   */
  ENDS = 'ends',

  /**
   * Contains (accepts string)
   */
  CONTAINS = 'contains',

  /**
   * Not contains (accepts string)
   */
  NOT_CONTAINS = 'not_contains',

  /**
   * Includes (accepts an array of string, number, boolean or Date)
   */
  IN = 'in',

  /**
   * Not includes (accepts an array of string, number, boolean or Date)
   */
  NOT_IN = 'not_in',

  /**
   * Between (`value >= arr[0] && value <= arr[1]`) (accepts an array of two values being string, number or Date)
   */
  BETWEEN = 'between',

  /**
   * Is `null` (the value must be `null`, `undefined` or `true`)
   */
  IS_NULL = 'is_null',

  /**
   * Is not `null` (the value must be `null`, `undefined` or `true`)
   */
  NOT_NULL = 'not_null',

  /**
   * Equals (case-insensitive) (`==`) (accepts string)
   */
  EQ_LOWER = 'eq_lower',

  /**
   * Not equals (case-insensitive) (`!=`) (accepts string)
   */
  NEQ_LOWER = 'neq_lower',

  /**
   * Starts with (case-insensitive) (accepts string)
   */
  STARTS_LOWER = 'starts_lower',

  /**
   * Ends with (case-insensitive) (accepts string)
   */
  ENDS_LOWER = 'ends_lower',

  /**
   * Contains (case-insensitive) (accepts string)
   */
  CONTAINS_LOWER = 'contains_lower',

  /**
   * Not contains (case-insensitive) (accepts string)
   */
  NOT_CONTAINS_LOWER = 'not_contains_lower',

  /**
   * Includes (case-insensitive) (accepts an array of strings)
   */
  IN_LOWER = 'in_lower',

  /**
   * Not includes (case-insensitive) (accepts an array of strings)
   */
  NOT_IN_LOWER = 'not_in_lower',
}
