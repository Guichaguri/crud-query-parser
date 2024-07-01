import { FieldPath } from './field-path';
import { CrudRequestWhere } from './crud-request-where';

export interface CrudRequestFields {
  field: FieldPath;
}

export interface CrudRequestRelation extends CrudRequestFields {
  alias?: string;
}

export interface CrudRequestOrder extends CrudRequestFields {
  order: 'ASC' | 'DESC';
}

export type ParsedRequestSelect = CrudRequestFields[];

export interface CrudRequest {

  select: ParsedRequestSelect;

  relations: CrudRequestRelation[];

  order: CrudRequestOrder[];

  where: CrudRequestWhere;

  limit?: number;

  offset?: number;

}
