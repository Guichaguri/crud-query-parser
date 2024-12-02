import { RequestParamValue, RequestParser } from '../../models/request-parser';
import { CrudRequest, CrudRequestOrder, CrudRequestRelation, ParsedRequestSelect } from '../../models/crud-request';
import { OpenAPIParameter } from '../../models/openapi-parameter';
import { CrudRequestWhereBuilder } from '../../utils/crud-request-where.builder';
import { getParamJSON, getParamNumber, getParamStringArray } from '../../utils/parser';
import { parseCrudFilters, parseCrudSearch } from './parseCrudSearch';
import { SCondition } from './types';

export interface CrudRequestParserOptions {
  /**
   * Whether the `fields` and `select` parameters will be disabled
   */
  disableSelect?: boolean;

  /**
   * Whether the `s`, `filter` and `or` parameters will be disabled
   */
  disableWhere?: boolean;

  /**
   * Whether the `sort` parameter will be disabled
   */
  disableOrder?: boolean;

  /**
   * Whether the `join` parameter will be disabled
   */
  disableRelations?: boolean;

  /**
   * Whether the `limit` and `per_page` parameters will be disabled
   */
  disableLimit?: boolean;

  /**
   * Whether the `offset` and `page` parameters will be disabled
   */
  disableOffset?: boolean;
}

/**
 * Parses a request based on the @nestjsx/crud format.
 */
export class CrudRequestParser implements RequestParser {

  constructor(
    protected readonly options: CrudRequestParserOptions = {},
  ) {
  }

  public getOpenAPIParameters(): OpenAPIParameter[] {
    // We'll not add the `per_page`, `filter`, `or` and `select` parameters here
    // as those are only kept for compatibility purposes and not recommended.
    // TODO improve docs

    const arraySchema = {
      type: 'array',
      items: {
        type: 'string',
      },
    };

    const params: OpenAPIParameter[] = [];

    if (!this.options.disableSelect) {
      params.push({
        name: 'fields',
        description: 'Selects resource fields',
        required: false,
        schema: arraySchema,
        style: 'form',
        explode: false,
      });
    }

    if (!this.options.disableWhere) {
      params.push({
        name: 's',
        description: 'Search condition',
        required: false,
        schema: {
          type: 'string',
        },
      });
    }

    if (!this.options.disableOrder) {
      params.push({
        name: 'sort',
        description: 'Sorting',
        required: false,
        schema: arraySchema,
        style: 'form',
        explode: true,
      });
    }

    if (!this.options.disableRelations) {
      params.push({
        name: 'join',
        description: 'Relations',
        required: false,
        schema: arraySchema,
        style: 'form',
        explode: true,
      });
    }

    if (!this.options.disableLimit) {
      params.push({
        name: 'limit',
        description: 'Page limit',
        required: false,
        schema: {
          type: 'integer',
        },
      });
    }

    if (!this.options.disableOffset) {
      params.push({
        name: 'offset',
        description: 'Offset amount',
        required: false,
        schema: {
          type: 'integer',
        },
      }, {
        name: 'page',
        description: 'Page number',
        required: false,
        schema: {
          type: 'integer',
        },
      });
    }

    return params;
  }

  public parse(query: Record<string, RequestParamValue>): CrudRequest {
    const select: ParsedRequestSelect = [];
    const relations: CrudRequestRelation[] = [];
    const ordering: CrudRequestOrder[] = [];
    const where = new CrudRequestWhereBuilder();

    if (!this.options.disableSelect)
      this.parseSelect(select, query['fields'] || query['select']);

    if (!this.options.disableRelations)
      this.parseJoin(select, relations, query['join']);

    if (!this.options.disableOrder)
      this.parseOrder(ordering, query['sort']);

    if (!this.options.disableWhere)
      this.parseSearch(where, query['s'], query['filter'], query['or']);

    const limit = this.options.disableLimit ? undefined : getParamNumber(query['limit'] || query['per_page']);
    const offset = this.options.disableOffset ? undefined : getParamNumber(query['offset']);
    const page = this.options.disableOffset ? undefined : getParamNumber(query['page']);

    return {
      select,
      relations,
      order: ordering,
      where: where.build(),
      limit,
      offset,
      page,
    };
  }

  protected parseSelect(select: ParsedRequestSelect, rawSelect: RequestParamValue): void {
    const selectFields = getParamStringArray(rawSelect, ',');

    selectFields.forEach(field => {
      select.push({
        field: field.split('.'),
      });
    });
  }

  protected parseJoin(requestFields: ParsedRequestSelect, relations: CrudRequestRelation[], rawJoin: RequestParamValue): void {
    const joins = getParamStringArray(rawJoin);

    for (const join of joins) {
      const [field, select] = join.split('||', 2);
      const fieldPath = field.split('.');

      relations.push({
        field: fieldPath,
      });

      if (select) {
        const selectFields = select.split(',');

        selectFields.forEach(f => {
          requestFields.push({
            field: [...fieldPath, f],
          });
        });
      }
    }
  }

  protected parseOrder(ordering: CrudRequestOrder[], rawOrder: RequestParamValue): void {
    const order = getParamStringArray(rawOrder);

    for (const entry of order) {
      const [field, direction] = entry.split(',');

      ordering.push({
        field: field.split('.'),
        order: direction?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC',
      });
    }
  }

  protected parseSearch(builder: CrudRequestWhereBuilder, rawSearch: RequestParamValue, rawFilter: RequestParamValue, rawOr: RequestParamValue): void {
    const search = getParamJSON<SCondition>(rawSearch);

    if (!search) {
      // In case the search is not defined, we'll read the filter and or parameters
      this.parseFilter(builder, rawFilter, rawOr);
      return;
    }

    parseCrudSearch(builder, search);
  }

  protected parseFilter(builder: CrudRequestWhereBuilder, rawFilter: RequestParamValue, rawOr: RequestParamValue): void {
    const andFilters = getParamStringArray(rawFilter);
    const orFilters = getParamStringArray(rawOr);

    parseCrudFilters(builder, andFilters, orFilters);
  }

}
