import { ParsedRequest } from '../../parsed-request.decorator';
import { CrudRequestParser } from '@crud-query-parser/core/parsers/crud';
import { applyDecorators } from '@nestjs/common';
import { ApiQuery } from '../../utils/openapi';

/**
 * A parameter decorator that converts the query string into a `ParsedRequest` object
 */
export function ParsedCrudRequest(): ParameterDecorator {
  return ParsedRequest(new CrudRequestParser());
}

/**
 * A method or class decorator that adds the OpenAPI query parameters
 */
export function ApiCrudQuery(): MethodDecorator & ClassDecorator {
  // TODO add description

  return applyDecorators(
    ApiQuery({ name: 's', type: 'string' }),
    ApiQuery({ name: 'fields', type: 'string', isArray: true }),
    ApiQuery({ name: 'sort', type: 'string', isArray: true }),
    ApiQuery({ name: 'join', type: 'string', isArray: true }),
    ApiQuery({ name: 'limit', type: 'integer' }),
    ApiQuery({ name: 'offset', type: 'integer' }),
    ApiQuery({ name: 'page', type: 'integer' }),
  );
}
