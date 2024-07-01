import { applyDecorators, createParamDecorator, ExecutionContext, Logger, SetMetadata, Type } from '@nestjs/common';
import { RequestParser } from '../../models/request-parser';
import { ApiQuery, createInstance, getMetadataFromContext } from './utils';

export const CRUD_QUERY_PARSER = 'crud-query-parser';

/**
 * Defines which parser will be used for parsing the request
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
export const ParseCrudRequest = createParamDecorator<RequestParser | Type<RequestParser>>(
  (data: RequestParser | Type<RequestParser>, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const parser = data ? createInstance(data) : getMetadataFromContext<RequestParser>(ctx, CRUD_QUERY_PARSER);

    if (!parser) {
      new Logger('ParseCrudRequest').warn(`No crud request parser found. Please, define one with @Crud() or pass to @CrudRequest()`);

      return {
        where: { and: [] },
        select: [],
        order: [],
        relations: [],
      };
    }

    return parser.parse(request.query);
  },
);

