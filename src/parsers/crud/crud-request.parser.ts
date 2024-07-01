import { RequestParamValue, RequestParser } from '../../models/request-parser';
import {
  CrudRequest,
  CrudRequestOrder,
  CrudRequestRelation,
  ParsedRequestSelect
} from '../../models/crud-request';
import { OpenAPIParameter } from '../../models/openapi-parameter';
import { CrudRequestWhereBuilder } from '../../utils/crud-request-where.builder';
import { parseCrudSearch } from './parseCrudSearch';
import { isValid } from '../../utils/functions';
import { SCondition } from './types';

/**
 * Parses a request based on the @nestjsx/crud format.
 */
export class CrudRequestParser implements RequestParser {

  public getOpenAPIParameters(): OpenAPIParameter[] {
    // TODO improve docs

    const arraySchema = {
      type: 'array',
      items: {
        type: 'string',
      },
    };

    return [
      {
        name: 'fields',
        description: 'Selects resource fields',
        required: false,
        schema: arraySchema,
        style: 'form',
        explode: false,
      },
      {
        name: 's',
        description: 'Search condition',
        required: false,
        schema: {
          type: 'string',
        },
      },
      {
        name: 'sort',
        description: 'Sorting',
        required: false,
        schema: arraySchema,
        style: 'form',
        explode: true,
      },
      {
        name: 'join',
        description: 'Relations',
        required: false,
        schema: arraySchema,
        style: 'form',
        explode: true,
      },
      {
        name: 'limit',
        description: 'Page limit',
        required: false,
        schema: {
          type: 'integer',
        },
      },
      {
        name: 'offset',
        description: 'Offset amount',
        required: false,
        schema: {
          type: 'integer',
        },
      },
      {
        name: 'page',
        description: 'Page number',
        required: false,
        schema: {
          type: 'integer',
        },
      },
    ];
  }

  public parse(query: Record<string, RequestParamValue>): CrudRequest {
    const select: ParsedRequestSelect = [];
    const relations: CrudRequestRelation[] = [];
    const ordering: CrudRequestOrder[] = [];
    const where = new CrudRequestWhereBuilder();

    this.parseSelect(select, query['fields'] || query['select']);
    this.parseJoin(select, relations, query['join']);
    this.parseOrder(ordering, query['sort']);
    this.parseSearch(where, query['s']);

    const { limit, offset } = this.parseLimits(query['limit'], query['offset'], query['page']);

    return {
      select,
      relations,
      order: ordering,
      where: where.build(),
      limit,
      offset,
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

  protected parseLimits(rawLimit: RequestParamValue, rawOffset: RequestParamValue, rawPage: RequestParamValue) {
    const limit = this.parseNumber(rawLimit);
    let offset = this.parseNumber(rawOffset);

    if (limit && !offset) {
      const page = this.parseNumber(rawPage);

      if (page)
        offset = limit * page;
    }

    return { limit, offset };
  }

  protected parseSearch(builder: CrudRequestWhereBuilder, rawSearch: RequestParamValue): void {
    if (Array.isArray(rawSearch))
      rawSearch = rawSearch.length > 0 ? rawSearch[0] : undefined;

    if (!rawSearch)
      return;

    const search: SCondition = JSON.parse(rawSearch);

    parseCrudSearch(builder, search);
  }

}
