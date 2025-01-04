import { ExecutionContext, Logger, Type } from '@nestjs/common';
import { OpenAPIParameter } from '../../models/openapi-parameter';
import { RequestParser } from '../../models/request-parser';
import { CrudRequest } from '../../models/crud-request';
import { createInstance } from '../../utils/functions';
import { CRUD_QUERY_PARSER } from './decorators';

export const ApiQuery = (() => {
  try {
    return require('@nestjs/swagger').ApiQuery; // TODO ES6 imports?
  } catch (error) {
    return (options: OpenAPIParameter): MethodDecorator => {
      return () => {};
    };
  }
})();

export function getMetadataFromContext<T>(context: ExecutionContext, key: string): T | undefined {
  const targets = [
    context.getHandler(),
    context.getClass(),
  ];

  for (const target of targets) {
    const data = Reflect.getMetadata(key, target);

    if (data)
      return data;
  }

  return undefined;
}

export function parseCrudRequest(data: RequestParser | Type<RequestParser> | undefined, ctx: ExecutionContext): CrudRequest {
  const request = ctx.switchToHttp().getRequest();
  const parser = data ? createInstance(data) : getMetadataFromContext<RequestParser>(ctx, CRUD_QUERY_PARSER);

  if (!parser) {
    new Logger('ParseCrudRequest').warn(`No crud request parser found. Please, define one with @Crud() or pass to @ParseCrudRequest()`);

    return {
      where: { and: [] },
      select: [],
      order: [],
      relations: [],
    };
  }

  return parser.parse(request.query);
}
