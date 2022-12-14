import { ParsedRequestWhereBuilder } from '../parsed-request-where.builder';
import { ParsedRequestWhereOperator } from '../../models/parsed-request-where';
import { SCondition, SConditionAND, SField, SFieldOperator, SFields } from './types';
import { isValid } from '../../utils/functions';

/**
 * Parses a crud request condition and inserts into a ParsedRequestWhereBuilder
 *
 * @param builder The builder that the condition will be inserted to
 * @param cond The condition that must be parsed
 * @param context The field context
 */
export function parseCrudSearch(builder: ParsedRequestWhereBuilder, cond: SCondition, context: string[] = []) {
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

    parseCrudSearchFields(andBuilder, innerFields as Omit<Omit<SFields, '$or'>, '$and'>, context);

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

    parseCrudSearchFields(andBuilder, innerFields as Omit<Omit<SFields, '$or'>, '$and'>, context);

    $or.forEach(c => parseCrudSearch(orBuilder, c, context));

    return;
  }

  if (keys.length > 1)
    builder = builder.addAnd();

  parseCrudSearchFields(builder, innerFields as Omit<Omit<SFields, '$or'>, '$and'>, context);
}

/**
 * Parses an object from the crud request full of fields
 *
 * @param builder The builder
 * @param fields The fields object
 * @param context The context
 */
function parseCrudSearchFields(builder: ParsedRequestWhereBuilder, fields: Omit<Omit<SFields, '$or'>, '$and'>, context: string[]): void {
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
function parseCrudSearchField(builder: ParsedRequestWhereBuilder, name: string[], field: SField): void {
  // Primitive Value
  // { field: 'text', field2: 12, field3: true }
  if (typeof field !== 'object') {
    builder.addField(name, ParsedRequestWhereOperator.EQ, field);
    return;
  }

  type OperatorType = Exclude<Exclude<keyof SFieldOperator, '$or'>, '$and'>;

  // Operator
  // { field: { $gte: 10 } }
  const operatorMap: Record<OperatorType, ParsedRequestWhereOperator> = {
    $eq: ParsedRequestWhereOperator.EQ,
    $ne: ParsedRequestWhereOperator.NEQ,
    $gt: ParsedRequestWhereOperator.GT,
    $lt: ParsedRequestWhereOperator.LT,
    $gte: ParsedRequestWhereOperator.GTE,
    $lte: ParsedRequestWhereOperator.LTE,
    $starts: ParsedRequestWhereOperator.STARTS,
    $ends: ParsedRequestWhereOperator.ENDS,
    $cont: ParsedRequestWhereOperator.CONTAINS,
    $excl: ParsedRequestWhereOperator.NOT_CONTAINS,
    $in: ParsedRequestWhereOperator.IN,
    $notin: ParsedRequestWhereOperator.NOT_IN,
    $between: ParsedRequestWhereOperator.BETWEEN,
    $isnull: ParsedRequestWhereOperator.IS_NULL,
    $notnull: ParsedRequestWhereOperator.NOT_NULL,
    $eqL: ParsedRequestWhereOperator.EQ_LOWER,
    $neL: ParsedRequestWhereOperator.NEQ_LOWER,
    $startsL: ParsedRequestWhereOperator.STARTS_LOWER,
    $endsL: ParsedRequestWhereOperator.ENDS_LOWER,
    $contL: ParsedRequestWhereOperator.CONTAINS_LOWER,
    $exclL: ParsedRequestWhereOperator.NOT_CONTAINS_LOWER,
    $inL: ParsedRequestWhereOperator.IN_LOWER,
    $notinL: ParsedRequestWhereOperator.NOT_IN_LOWER,
  };

  const keys = Object.keys(field) as OperatorType[];

  for (let key of keys) {
    if (!operatorMap[key])
      continue;

    const value = field[key];

    if (Array.isArray(value))
      value.forEach(val => builder.addField(name, operatorMap[key], val));
    else
      builder.addField(name, operatorMap[key], value);
  }

  if (field.$or) {
    parseCrudSearchField(builder.addOr(), name, field.$or);
  }
}
