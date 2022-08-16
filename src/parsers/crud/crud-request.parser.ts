import { RequestParamValue, RequestParserContract } from '../../contracts/request-parser.contract';
import {
  ParsedRequest,
  ParsedRequestOrder, ParsedRequestRelation,
  ParsedRequestSelect
} from '../../models/parsed-request';
import { ParsedRequestWhereBuilder } from '../parsed-request-where.builder';
import { parseCrudSearch } from './parseCrudSearch';
import { isValid } from '../../utils/functions';
import { SCondition } from './types';

/**
 * Parses a request based on the @nestjsx/crud format.
 */
export class CrudRequestParser implements RequestParserContract {

  public parse(query: Record<string, RequestParamValue>): ParsedRequest {
    const select: ParsedRequestSelect = [];
    const relations: ParsedRequestRelation[] = [];
    const ordering: ParsedRequestOrder[] = [];
    const where = new ParsedRequestWhereBuilder();

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

  protected parseJoin(requestFields: ParsedRequestSelect, relations: ParsedRequestRelation[], rawJoin: RequestParamValue): void {
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

  protected parseOrder(ordering: ParsedRequestOrder[], rawOrder: RequestParamValue): void {
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

  protected parseSearch(builder: ParsedRequestWhereBuilder, rawSearch: RequestParamValue): void {
    if (Array.isArray(rawSearch))
      rawSearch = rawSearch.length > 0 ? rawSearch[0] : undefined;

    if (!rawSearch)
      return;

    const search: SCondition = JSON.parse(rawSearch);

    parseCrudSearch(builder, search);
  }

}
