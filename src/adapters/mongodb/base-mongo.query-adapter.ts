import type { Condition, Filter } from 'mongodb';
import { CrudRequest } from '../../models/crud-request';
import { CrudRequestWhere, CrudRequestWhereOperator, CrudRequestWhereValueType } from '../../models/crud-request-where';
import { ensureArray, ensureString, escapeRegex, getOffset } from '../../utils/functions';

export abstract class BaseMongoQueryAdapter {

  /**
   * Adapts the query select list into a MongoDB projection
   *
   * @param crudRequest The crud request
   */
  public buildProjection(crudRequest: CrudRequest): Record<string, true> {
    return crudRequest.select.reduce<Record<string, true>>((obj, item) => {
      obj[item.field.join('.')] = true;

      return obj;
    }, {});
  }

  /**
   * Adapts the query order into a MongoDB sort order
   *
   * @param crudRequest The crud request
   */
  public buildSort(crudRequest: CrudRequest): [string, -1 | 1][] {
    return crudRequest.order.map<[string, -1 | 1]>(
      item => [item.field.join('.'), item.order === 'DESC' ? -1 : 1],
    );
  }

  /**
   * Adapts the query offset, page and limit into the MongoDB skip
   *
   * @param crudRequest The crud request
   */
  public buildSkip(crudRequest: CrudRequest): number {
    return getOffset(crudRequest.offset, crudRequest.page, crudRequest.limit);
  }

  /**
   * Adapts the query where conditions into a MongoDB filter
   *
   * @param crudRequest The crud request
   */
  public buildFilter<E>(crudRequest: CrudRequest): Filter<E> {
    return this.mapFilter<E>(crudRequest.where);
  }

  /**
   * Maps the where condition into a cursor filter
   *
   * @param where The where condition
   */
  protected mapFilter<E>(where: CrudRequestWhere): Filter<E> {
    if (where.and) {
      return { $and: where.and.map(item => this.mapFilter(item)) };
    }

    if (where.or) {
      return { $or: where.or.map(item => this.mapFilter(item)) };
    }

    if (where.field) {
      return { [where.field.join('.') as any]: this.mapCondition(where.operator, where.value) };
    }

    return {};
  }

  /**
   * Maps the query operator into a cursor condition operator
   *
   * @param operator The condition operator
   * @param value The condition value
   */
  protected mapCondition(
    operator: CrudRequestWhereOperator,
    value: CrudRequestWhereValueType | CrudRequestWhereValueType[],
  ): Condition<any> {
    switch (operator) {
      case CrudRequestWhereOperator.EQ:
        return value;

      case CrudRequestWhereOperator.NEQ:
        return { $ne: value };

      case CrudRequestWhereOperator.GT:
        return { $gt: value };

      case CrudRequestWhereOperator.GTE:
        return { $gte: value };

      case CrudRequestWhereOperator.LT:
        return { $lt: value };

      case CrudRequestWhereOperator.LTE:
        return { $lte: value };

      case CrudRequestWhereOperator.IN:
        return { $in: value };

      case CrudRequestWhereOperator.NOT_IN:
        return { $nin: value };

      case CrudRequestWhereOperator.IS_NULL:
        return { $eq: null };

      case CrudRequestWhereOperator.NOT_NULL:
        return { $ne: null };

      case CrudRequestWhereOperator.BETWEEN:
        const arr = ensureArray('BETWEEN operator', value, 2);

        return { $gte: arr[0], $lte: arr[1] };

      case CrudRequestWhereOperator.CONTAINS:
        return { $regex: escapeRegex(ensureString('CONTAINS operator', value)) };

      case CrudRequestWhereOperator.NOT_CONTAINS:
        return { $not: { $regex: escapeRegex(ensureString('CONTAINS operator', value)) } };

      case CrudRequestWhereOperator.STARTS:
        return { $regex: '^' + escapeRegex(ensureString('STARTS operator', value)) };

      case CrudRequestWhereOperator.ENDS:
        return { $regex: escapeRegex(ensureString('ENDS operator', value)) + '$' };

      case CrudRequestWhereOperator.EQ_LOWER:
        return { $regex: '^' + escapeRegex(ensureString('EQ LOWER operator', value)) + '$', $options: 'i' };

      case CrudRequestWhereOperator.NEQ_LOWER:
        return { $not: { $regex: '^' + escapeRegex(ensureString('NEQ LOWER operator', value)) + '$', $options: 'i' } };

      case CrudRequestWhereOperator.CONTAINS_LOWER:
        return { $regex: '^' + escapeRegex(ensureString('CONTAINS LOWER operator', value)), $options: 'i' };

      case CrudRequestWhereOperator.NOT_CONTAINS_LOWER:
        return { $not: { $regex: escapeRegex(ensureString('NOT CONTAINS LOWER operator', value)) + '$', $options: 'i' } };

      case CrudRequestWhereOperator.STARTS_LOWER:
        return { $regex: '^' + escapeRegex(ensureString('STARTS LOWER operator', value)), $options: 'i' };

      case CrudRequestWhereOperator.ENDS_LOWER:
        return { $regex: escapeRegex(ensureString('ENDS LOWER operator', value)) + '$', $options: 'i' };

      case CrudRequestWhereOperator.IN_LOWER:
        return {
          $in: ensureArray('IN LOWER operator', value, 1).map((item, i) => (
            { $regex: '^' + escapeRegex(ensureString(`IN LOWER [${i}] operator`, item)) + '$', $options: 'i' }
          )),
        };

      case CrudRequestWhereOperator.NOT_IN_LOWER:
        return {
          $nin: ensureArray('NOT IN LOWER operator', value, 1).map((item, i) => (
            { $regex: '^' + escapeRegex(ensureString(`NOT IN LOWER [${i}] operator`, item)) + '$', $options: 'i' }
          )),
        };

      default:
        throw new Error(`Unsupported operator ${operator}.`);
    }
  }

}
