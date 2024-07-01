import { FieldPath } from './field-path';
import { ParsedRequestWhere } from './parsed-request-where';

export interface ParsedRequestFields {
  field: FieldPath;
}

export interface ParsedRequestRelation extends ParsedRequestFields {
  alias?: string;
}

export interface ParsedRequestOrder extends ParsedRequestFields {
  order: 'ASC' | 'DESC';
}

export type ParsedRequestSelect = ParsedRequestFields[];

export interface ParsedRequest {

  select: ParsedRequestSelect;

  relations: ParsedRequestRelation[];

  order: ParsedRequestOrder[];

  where: ParsedRequestWhere;

  limit?: number;

  offset?: number;

}
