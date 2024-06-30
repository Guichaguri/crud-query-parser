import { createParamDecorator, ExecutionContext, Type } from '@nestjs/common';
import { RequestParserContract } from '@crud-query-parser/core';

/**
 * A parameter decorator that converts the query string into a `ParsedRequest` object
 */
export const ParsedRequest = createParamDecorator<RequestParserContract | Type<RequestParserContract>>(
  (data: RequestParserContract | Type<RequestParserContract>, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();

    const parser = typeof data === 'function' ? new data() : data as RequestParserContract;

    return parser.parse(request.query);
  },
);
