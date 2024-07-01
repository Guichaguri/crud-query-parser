import { ParsedRequestFields } from './parsed-request';

export interface RequestFilter {

  select?: ParsedRequestFields;

  relations?: ParsedRequestFields;

  where?: ParsedRequestFields;

  limit?: number;

}
