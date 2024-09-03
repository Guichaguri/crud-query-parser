import { RequestParamValue, RequestParser } from '../../models/request-parser';
import { CrudRequest, CrudRequestOrder, CrudRequestRelation, ParsedRequestSelect } from '../../models/crud-request';
import { OpenAPIParameter } from '../../models/openapi-parameter';
import { CrudRequestWhereBuilder } from '../../utils/crud-request-where.builder';
import { parseCrudFilters, parseCrudSearch } from './parseCrudSearch';
import { isValid } from '../../utils/functions';
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

    const limit = this.options.disableLimit ? undefined : this.parseNumber(query['limit'] || query['per_page']);
    const offset = this.options.disableOffset ? undefined : this.parseNumber(query['offset']);
    const page = this.options.disableOffset ? undefined : this.parseNumber(query['page']);

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
    if (!rawSelect)
      return;

    const selectFields = Array.isArray(rawSelect) ? rawSelect : rawSelect.split(',');

    selectFields.forEach(field => {
      select.push({
        field: field.split('.'),
      });
    });
  }

  protected parseJoin(requestFields: ParsedRequestSelect, relations: CrudRequestRelation[], rawJoin: RequestParamValue): void {
    if (!rawJoin)
      return;

    if (Array.isArray(rawJoin)) {
      rawJoin.forEach(value => this.parseJoin(requestFields, relations, value));
      return;
    }

    const join = rawJoin.toString();

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

  protected parseOrder(ordering: CrudRequestOrder[], rawOrder: RequestParamValue): void {
    if (!rawOrder)
      return;

    if (Array.isArray(rawOrder)) {
      rawOrder.forEach(value => this.parseOrder(ordering, value));
      return;
    }

    const [field, direction] = rawOrder.split(',');

    ordering.push({
      field: field.split('.'),
      order: direction?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC',
    });
  }

  protected parseNumber(raw: RequestParamValue): number | undefined {
    if (Array.isArray(raw))
      raw = raw.length > 0 ? raw[0] : undefined;

    if (!isValid(raw))
      return undefined;

    const num = +raw;

    return isNaN(num) ? undefined : num;
  }

  protected parseSearch(builder: CrudRequestWhereBuilder, rawSearch: RequestParamValue, rawFilter: RequestParamValue, rawOr: RequestParamValue): void {
    if (Array.isArray(rawSearch))
      rawSearch = rawSearch.length > 0 ? rawSearch[0] : undefined;

    if (!rawSearch) {
      // In case the search is not defined, we'll read the filter and or parameters
      this.parseFilter(builder, rawFilter, rawOr);
      return;
    }

    const search: SCondition = JSON.parse(rawSearch);

    parseCrudSearch(builder, search);
  }

  protected parseFilter(builder: CrudRequestWhereBuilder, rawFilter: RequestParamValue, rawOr: RequestParamValue): void {
    let andFilters: string[] = [];
    let orFilters: string[] = [];

    if (rawFilter)
      andFilters = Array.isArray(rawFilter) ? rawFilter : [rawFilter];

    if (rawOr)
      orFilters = Array.isArray(rawOr) ? rawOr : [rawOr];

    parseCrudFilters(builder, andFilters, orFilters);
  }

}
