import { applyDecorators, createParamDecorator, SetMetadata, Type } from '@nestjs/common';
import { RequestParser } from '../../models/request-parser';
import { createInstance } from '../../utils/functions';
import { ApiQuery, CRUD_QUERY_PARSER, parseCrudRequest } from './utils';

export { CRUD_QUERY_PARSER } from './utils';

/**
 * Defines which parser will be used for parsing the request. This also adds the OpenAPI query parameters.
 *
 * @param parserContract The parser that will be used
 */
export function Crud(parserContract: RequestParser | Type<RequestParser>): MethodDecorator & ClassDecorator {
  const parser = createInstance(parserContract);

  if (!parser) {
    throw new Error('The request parser passed to @Crud() is invalid');
  }

  const openApi = parser.getOpenAPIParameters().map(param => ApiQuery(param));

  return applyDecorators(
    SetMetadata(CRUD_QUERY_PARSER, parser),
    ...openApi,
  );
}

/**
 * A parameter decorator that converts the query string into a `CrudRequest` object
 */
export const ParseCrudRequest = createParamDecorator<RequestParser | Type<RequestParser>>(parseCrudRequest);
