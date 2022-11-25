import { RequestParserContract } from './contracts/request-parser.contract';
import { QueryBuilderContract } from './contracts/query-builder.contract';
import { RequestFilterContract } from './contracts/request-filter.contract';
import { RequestParser } from './request-parser';

export class RequestParserBuilder<T = any> {

  private parser: RequestParserContract | undefined;

  private filters: RequestFilterContract[] = [];

  private queryBuilder: QueryBuilderContract<T> | undefined;

  constructor() {

  }

  public setParser(parser: RequestParserContract): RequestParserBuilder<T> {
    this.parser = parser;

    return this;
  }

  public addFilter(filter: RequestFilterContract): RequestParserBuilder<T> {
    this.filters.push(filter);

    return this;
  }

  public setQueryBuilder<E>(queryBuilder: QueryBuilderContract<E>): RequestParserBuilder<E> {
    this.queryBuilder = queryBuilder as QueryBuilderContract<any>;

    return this as RequestParserBuilder;
  }

  public build(): RequestParser<T> {
    if (!this.parser)
      throw new Error('The request parser was not defined');

    if (!this.queryBuilder)
      throw new Error('The query builder was not defined');

    return new RequestParser<T>(this.parser, this.filters, this.queryBuilder);
  }

}
