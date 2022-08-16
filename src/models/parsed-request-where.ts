
export type ParsedRequestWhere = ParsedRequestWhereAND | ParsedRequestWhereOR | ParsedRequestWhereField;

export interface ParsedRequestWhereAND {
  field?: never;
  or?: never;
  and: ParsedRequestWhere[];
}

export interface ParsedRequestWhereOR {
  field?: never;
  or: ParsedRequestWhere[];
  and?: never;
}

export interface ParsedRequestWhereField {

  /**
   * Field path
   *
   * For post.category.name, this would be ["post", "category", "name"]
   */
  field: string[];

  /**
   * The operator of the comparison
   */
  operator: ParsedRequestWhereOperator;

  /**
   * The value to compare
   */
  value: ParsedRequestWhereValueType | ParsedRequestWhereValueType[];

  or?: never;
  and?: never;
}

export type ParsedRequestWhereValueType = string | number | boolean | Date | null | undefined;

export enum ParsedRequestWhereOperator {
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
