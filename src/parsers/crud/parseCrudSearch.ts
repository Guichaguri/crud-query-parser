import { CrudRequestWhereBuilder } from '../../utils/crud-request-where.builder';
import { CrudRequestWhereOperator } from '../../models/crud-request-where';
import { SCondition, SField, SFieldOperator, SFields } from './types';
import { isValid } from '../../utils/functions';

type OperatorType = Exclude<keyof SFieldOperator, '$or' | '$and'>;

// Operator
// { field: { $gte: 10 } }
const operatorMap: Record<OperatorType, CrudRequestWhereOperator> = {
  $eq: CrudRequestWhereOperator.EQ,
  $ne: CrudRequestWhereOperator.NEQ,
  $gt: CrudRequestWhereOperator.GT,
  $lt: CrudRequestWhereOperator.LT,
  $gte: CrudRequestWhereOperator.GTE,
  $lte: CrudRequestWhereOperator.LTE,
  $starts: CrudRequestWhereOperator.STARTS,
  $ends: CrudRequestWhereOperator.ENDS,
  $cont: CrudRequestWhereOperator.CONTAINS,
  $excl: CrudRequestWhereOperator.NOT_CONTAINS,
  $in: CrudRequestWhereOperator.IN,
  $notin: CrudRequestWhereOperator.NOT_IN,
  $between: CrudRequestWhereOperator.BETWEEN,
  $isnull: CrudRequestWhereOperator.IS_NULL,
  $notnull: CrudRequestWhereOperator.NOT_NULL,
  $eqL: CrudRequestWhereOperator.EQ_LOWER,
  $neL: CrudRequestWhereOperator.NEQ_LOWER,
  $startsL: CrudRequestWhereOperator.STARTS_LOWER,
  $endsL: CrudRequestWhereOperator.ENDS_LOWER,
  $contL: CrudRequestWhereOperator.CONTAINS_LOWER,
  $exclL: CrudRequestWhereOperator.NOT_CONTAINS_LOWER,
  $inL: CrudRequestWhereOperator.IN_LOWER,
  $notinL: CrudRequestWhereOperator.NOT_IN_LOWER,
};

/**
 * Parses a crud request condition and inserts into a CrudRequestWhereBuilder
 *
 * @param builder The builder that the condition will be inserted to
 * @param cond The condition that must be parsed
 * @param context The field context
 */
export function parseCrudSearch(builder: CrudRequestWhereBuilder, cond: SCondition, context: string[] = []): void {
  if (typeof cond !== 'object')
    return;

  const keys = Object.keys(cond);

  if (keys.length === 0)
    return;

  const { $or, $and, ...innerFields } = cond;

  // { $and: [..., ...] }
  if ($and) {
    const andBuilder = $and.length > 1 || keys.length > 1 ? builder.addAnd() : builder;

    $and.forEach(c => parseCrudSearch(andBuilder, c, context));

    parseCrudSearchFields(andBuilder, innerFields as Omit<SFields, '$or' | '$and'>, context);

    return;
  }

  // { $or: [..., ...] }
  if ($or && keys.length === 1) {
    const orBuilder = $or.length > 1 ? builder.addOr() : builder;

    $or.forEach(c => parseCrudSearch(orBuilder, c, context));

    return;
  }

  // { $or: [...], field1: ..., field2: ... }
  if ($or) {
    const andBuilder = builder.addAnd();
    const orBuilder = $or.length > 1 ? andBuilder.addOr() : andBuilder;

    parseCrudSearchFields(andBuilder, innerFields as Omit<SFields, '$or' | '$and'>, context);

    $or.forEach(c => parseCrudSearch(orBuilder, c, context));

    return;
  }

  if (keys.length > 1)
    builder = builder.addAnd();

  parseCrudSearchFields(builder, innerFields as Omit<SFields, '$or' | '$and'>, context);
}

/**
 * Parses an object from the crud request full of fields
 *
 * @param builder The builder
 * @param fields The fields object
 * @param context The context
 */
function parseCrudSearchFields(builder: CrudRequestWhereBuilder, fields: Omit<SFields, '$or' | '$and'>, context: string[]): void {
  // { name: 'John', age: { $gte: 18 }, 'posts.name': { $cont: 'Greetings' } }
  for (const name of Object.keys(fields)) {
    const field = fields[name];

    if (!isValid(field))
      continue;

    const fieldPath = [...context, ...name.split('.')];

    // { name: [{ $or: [...] }] }
    if (Array.isArray(field)) {
      field.forEach(f => parseCrudSearch(builder, f, fieldPath));
      continue;
    }

    parseCrudSearchField(builder, fieldPath, field);
  }
}

/**
 * Parses a single field
 *
 * @param builder The builder
 * @param name The name path
 * @param field The field value or operator
 */
function parseCrudSearchField(builder: CrudRequestWhereBuilder, name: string[], field: SField): void {
  // Primitive Value
  // { field: 'text', field2: 12, field3: true }
  if (typeof field !== 'object') {
    builder.addField(name, CrudRequestWhereOperator.EQ, field);
    return;
  }

  const keys = Object.keys(field) as OperatorType[];

  for (let key of keys) {
    if (!operatorMap[key])
      continue;

    builder.addField(name, operatorMap[key], field[key]);
  }

  // { level: { $or: { $gt: 10, $lt: 5 } } }
  if (field.$or) {
    parseCrudSearchField(builder.addOr(), name, field.$or);
  }
}

/**
 * Parses the legacy "filter" and "or" parameters
 *
 * @param builder The where builder
 * @param andFilters The "filter" parameter
 * @param orFilters The "or" parameter
 */
export function parseCrudFilters(builder: CrudRequestWhereBuilder, andFilters: string[], orFilters: string[]): void {
  // Based on rules from https://github.com/nestjsx/crud/wiki/Requests#or
  // "If present both or and filter in any amount (one or miltiple each) then both interpreted
  // as a combination of AND conditions and compared with each other by OR condition"
  // "If there are one or and one filter then it will be interpreted as OR condition"
  if (andFilters.length > 0 && orFilters.length > 0) {
    const or = builder.addOr();

    parseCrudFilter(or.addAnd(), andFilters);
    parseCrudFilter(or.addAnd(), orFilters);

    return;
  }

  // "If there are multiple or present (without filter) then it will be interpreted as a combination of OR conditions"
  if (orFilters.length > 0) {
    parseCrudFilter(builder.addOr(), orFilters);

    return;
  }

  if (andFilters.length > 0) {
    parseCrudFilter(builder.addAnd(), andFilters);

    return;
  }
}

/**
 * Parses the legacy "filter" or "or" parameters
 *
 * @param builder The where builder
 * @param rawFilters The parameter value
 */
function parseCrudFilter(builder: CrudRequestWhereBuilder, rawFilters: string[]): void {
  for (const rawFilter of rawFilters) {
    const [name, op, value] = rawFilter.toString().split('||', 3);
    const operator = operatorMap[op as OperatorType];

    if (!operator)
      continue;

    builder.addField(name.split('.'), operator, value);
  }
}
