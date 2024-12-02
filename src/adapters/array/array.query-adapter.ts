import { QueryAdapter } from '../../models/query-adapter';
import { CrudRequest, CrudRequestOrder, ParsedRequestSelect } from '../../models/crud-request';
import { GetManyResult } from '../../models/get-many-result';
import { CrudRequestWhere, CrudRequestWhereOperator, CrudRequestWhereValueType } from '../../models/crud-request-where';
import { ensureArray, ensurePrimitive, ensureString, getOffset, isValid } from '../../utils/functions';
import { pathGetValue, pathSetValue } from '../../utils/field-path';

/**
 * Adapts queries to plain JS arrays
 */
export class ArrayQueryAdapter<T extends object> implements QueryAdapter<T[], T> {
  /**
   * @inheritDoc
   */
  public build(data: T[], request: CrudRequest): T[] {
    data = this.applyWhere(data, request.where);
    data = this.applyOrder(data, request.order);
    data = this.applyLimits(data, getOffset(request.offset, request.limit, request.page), request.limit);
    data = this.applySelect(data, request.select);

    return data;
  }

  /**
   * @inheritDoc
   */
  public async getMany<E extends T = T>(data: T[], request: CrudRequest): Promise<GetManyResult<E>> {
    data = this.applyWhere(data, request.where);
    data = this.applyOrder(data, request.order);

    const total = data.length;
    const offset = getOffset(request.offset, request.limit, request.page);
    const limit = request.limit || total;

    data = this.applyLimits(data, offset, limit);
    data = this.applySelect(data, request.select);

    const count = data.length;
    const page = Math.floor(offset / limit) + 1;
    const pageCount = Math.ceil(total / limit);

    return {
      data: data as E[],
      total,
      page,
      count,
      pageCount,
    };
  }

  /**
   * @inheritDoc
   */
  public async getOne<E extends T = T>(data: T[], request: CrudRequest): Promise<E | null> {
    data = this.applyWhere(data, request.where);
    data = this.applyOrder(data, request.order);
    data = data.slice(0, 1);
    data = this.applySelect(data, request.select);

    if (data.length === 0)
      return null;

    return data[0] as E;
  }

  /**
   * Creates new objects containing only the select fields
   *
   * @param data The original data
   * @param select The fields to keep
   */
  protected applySelect(data: T[], select: ParsedRequestSelect): T[] {
    if (select.length === 0)
      return data;

    return data.map(item => {
      const newObject = <T>{};

      for (const field of select) {
        pathSetValue(newObject, field.field, pathGetValue(item, field.field));
      }

      return newObject;
    })
  }

  /**
   * Filters the data based on where conditions
   *
   * @param data The original data
   * @param where The where conditions
   */
  protected applyWhere(data: T[], where: CrudRequestWhere): T[] {
    return data.filter(item => this.checkWhere(item, where));
  }

  /**
   * Sorts the data based on the order list
   *
   * @param data The original data
   * @param order The ordering rules
   */
  protected applyOrder(data: T[], order: CrudRequestOrder[]): T[] {
    return data.sort((a, b) => {

      for (const o of order) {
        const valueA = pathGetValue(a, o.field);
        const valueB = pathGetValue(b, o.field);

        let comparison = this.compareOrder(valueA, valueB);

        if (o.order === 'DESC')
          comparison = -comparison;

        if (comparison !== 0)
          return comparison;
      }

      return 0;
    });
  }

  /**
   * Slices the data based on the offset and limit
   *
   * @param data The original data
   * @param offset The offset
   * @param limit The limit
   */
  protected applyLimits(data: T[], offset: number, limit: number | undefined): T[] {
    if (!offset && !limit)
      return data;

    return data.slice(offset, offset && limit ? offset + limit : limit);
  }

  /**
   * Compare two values.
   *
   * Returns positive when B is greater than A;
   * Returns negative when A is greater than B;
   * Returns 0 when both values are equal.
   *
   * @param a The first value
   * @param b The second value
   */
  protected compareOrder(a: any, b: any): number {
    if (typeof a === 'number' && typeof b === 'number')
      return b - a;

    if (typeof a === 'string' && typeof b === 'string')
      return b.localeCompare(a);

    if (typeof a === 'boolean' && typeof b === 'boolean')
      return +b - +a;

    return 0;
  }

  /**
   * Evaluates the where condition
   *
   * @param data The entity to check
   * @param where The where condition
   */
  protected checkWhere(data: T, where: CrudRequestWhere): boolean {
    if (where.and)
      return where.and.every(item => this.checkWhere(data, item));

    if (where.or)
      return where.or.some(item => this.checkWhere(data, item));

    if (where.field)
      return this.checkWhereOperator(pathGetValue(data, where.field), where.operator, where.value);

    return true;
  }

  /**
   * Evaluates a where operator
   *
   * @param item The left value to check
   * @param operator The operator
   * @param value The right value to check
   */
  protected checkWhereOperator(item: any, operator: CrudRequestWhereOperator, value: CrudRequestWhereValueType | CrudRequestWhereValueType[]): boolean {
    switch (operator) {
      case CrudRequestWhereOperator.EQ:
        return item == value;

      case CrudRequestWhereOperator.NEQ:
        return item != value;

      case CrudRequestWhereOperator.GT:
        return item > ensurePrimitive('> operator', value);

      case CrudRequestWhereOperator.GTE:
        return item >= ensurePrimitive('>= operator', value);

      case CrudRequestWhereOperator.LT:
        return item < ensurePrimitive('< operator', value);

      case CrudRequestWhereOperator.LTE:
        return item <= ensurePrimitive('<= operator', value);

      case CrudRequestWhereOperator.BETWEEN:
        const arr = ensureArray('BETWEEN operator', value, 2);

        return item > ensurePrimitive('left BETWEEN value', arr[0]) &&
          item < ensurePrimitive('right BETWEEN value', arr[1]);

      case CrudRequestWhereOperator.IS_NULL:
        return !isValid(item);

      case CrudRequestWhereOperator.NOT_NULL:
        return isValid(item);

      case CrudRequestWhereOperator.CONTAINS:
        return typeof item !== 'string' ? false :
          item.includes(ensureString('CONTAINS', value));

      case CrudRequestWhereOperator.NOT_CONTAINS:
        return typeof item !== 'string' ? true :
          !item.includes(ensureString('NOT CONTAINS', value));

      case CrudRequestWhereOperator.STARTS:
        return typeof item !== 'string' ? false :
          item.startsWith(ensureString('STARTS', value));

      case CrudRequestWhereOperator.ENDS:
        return typeof item !== 'string' ? false :
          item.endsWith(ensureString('ENDS', value));

      case CrudRequestWhereOperator.IN:
        return Array.isArray(item) ? item.includes(ensurePrimitive('IN', value)) : false;

      case CrudRequestWhereOperator.NOT_IN:
        return Array.isArray(item) ? !item.includes(ensurePrimitive('NOT IN', value)) : true;

      case CrudRequestWhereOperator.EQ_LOWER:
        return ensureString('== LOWER', item).toLowerCase() == value?.toString().toLowerCase();

      case CrudRequestWhereOperator.NEQ_LOWER:
        return ensureString('!= LOWER', item).toLowerCase() != value?.toString().toLowerCase();

      case CrudRequestWhereOperator.CONTAINS_LOWER:
        return typeof item !== 'string' ? false :
          item.toLowerCase().includes(ensureString('CONTAINS LOWER', value).toLowerCase());

      case CrudRequestWhereOperator.NOT_CONTAINS_LOWER:
        return typeof item !== 'string' ? true :
          !item.toLowerCase().includes(ensureString('NOT CONTAINS LOWER', value).toLowerCase());

      case CrudRequestWhereOperator.STARTS_LOWER:
        return typeof item !== 'string' ? false :
          item.toLowerCase().startsWith(ensureString('STARTS LOWER', value).toLowerCase());

      case CrudRequestWhereOperator.ENDS_LOWER:
        return typeof item !== 'string' ? false :
          item.toLowerCase().endsWith(ensureString('ENDS LOWER', value).toLowerCase());

      case CrudRequestWhereOperator.IN_LOWER: {
        const val = ensureString('IN LOWER', value).toLowerCase();

        return Array.isArray(item) ? item.some(elem => val === elem?.toString().toLowerCase()) : false;
      }

      case CrudRequestWhereOperator.NOT_IN_LOWER: {
        const val = ensureString('NOT IN LOWER', value).toLowerCase();

        return Array.isArray(item) ? !item.some(elem => val === elem?.toString().toLowerCase()) : true;
      }
    }
  }
}
