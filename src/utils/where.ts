import { CrudRequestWhereField, CrudRequestWhereOperator } from '../models/crud-request-where';
import { ensureArray, ensureEmpty, ensurePrimitiveOrNull } from './functions';

export enum WhereOperatorValueType {
  PRIMITIVE = 'primitive',
  ARRAY = 'array',
  EMPTY = 'empty'
}

const operatorValueTypes: Record<CrudRequestWhereOperator, WhereOperatorValueType> = {
  [CrudRequestWhereOperator.EQ]: WhereOperatorValueType.PRIMITIVE,
  [CrudRequestWhereOperator.NEQ]: WhereOperatorValueType.PRIMITIVE,
  [CrudRequestWhereOperator.GT]: WhereOperatorValueType.PRIMITIVE,
  [CrudRequestWhereOperator.LT]: WhereOperatorValueType.PRIMITIVE,
  [CrudRequestWhereOperator.GTE]: WhereOperatorValueType.PRIMITIVE,
  [CrudRequestWhereOperator.LTE]: WhereOperatorValueType.PRIMITIVE,
  [CrudRequestWhereOperator.STARTS]: WhereOperatorValueType.PRIMITIVE,
  [CrudRequestWhereOperator.ENDS]: WhereOperatorValueType.PRIMITIVE,
  [CrudRequestWhereOperator.CONTAINS]: WhereOperatorValueType.PRIMITIVE,
  [CrudRequestWhereOperator.NOT_CONTAINS]: WhereOperatorValueType.PRIMITIVE,
  [CrudRequestWhereOperator.IN]: WhereOperatorValueType.ARRAY,
  [CrudRequestWhereOperator.NOT_IN]: WhereOperatorValueType.ARRAY,
  [CrudRequestWhereOperator.BETWEEN]: WhereOperatorValueType.ARRAY,
  [CrudRequestWhereOperator.IS_NULL]: WhereOperatorValueType.EMPTY,
  [CrudRequestWhereOperator.NOT_NULL]: WhereOperatorValueType.EMPTY,
  [CrudRequestWhereOperator.EQ_LOWER]: WhereOperatorValueType.PRIMITIVE,
  [CrudRequestWhereOperator.NEQ_LOWER]: WhereOperatorValueType.PRIMITIVE,
  [CrudRequestWhereOperator.STARTS_LOWER]: WhereOperatorValueType.PRIMITIVE,
  [CrudRequestWhereOperator.ENDS_LOWER]: WhereOperatorValueType.PRIMITIVE,
  [CrudRequestWhereOperator.CONTAINS_LOWER]: WhereOperatorValueType.PRIMITIVE,
  [CrudRequestWhereOperator.NOT_CONTAINS_LOWER]: WhereOperatorValueType.PRIMITIVE,
  [CrudRequestWhereOperator.IN_LOWER]: WhereOperatorValueType.PRIMITIVE,
  [CrudRequestWhereOperator.NOT_IN_LOWER]: WhereOperatorValueType.PRIMITIVE,
};

export function validateWhereField(where: CrudRequestWhereField): void {
  const type = operatorValueTypes[where.operator];
  const name = 'The value of the operator ' + where.operator;

  if (type === WhereOperatorValueType.PRIMITIVE) {
    ensurePrimitiveOrNull(name, where.value);

    return;
  }

  if (type === WhereOperatorValueType.ARRAY) {
    const items = ensureArray(name, where.value);

    items.forEach(item => ensurePrimitiveOrNull(name + ' children', item));

    return;
  }

  if (type === WhereOperatorValueType.EMPTY) {
    ensureEmpty(name, where.value);

    return;
  }
}
