import { RequestParamValue, RequestParserContract } from './contracts/request-parser.contract';
import { RequestFilter } from './models/request-filter';
import { QueryBuilderContract } from './contracts/query-builder.contract';
import { GetManyProxy } from './models/get-many.proxy';
import { ParsedRequest } from './models/parsed-request';
import { RequestFilterContract } from './contracts/request-filter.contract';

export class RequestParser<T> {

  constructor(
    private readonly parser: RequestParserContract,
    private readonly filters: RequestFilterContract[],
    private readonly queryBuilder: QueryBuilderContract<T>,
  ) {
  }

  public async getOne(baseQuery: T, params: Record<string, RequestParamValue>, filter: RequestFilter = {}): Promise<T | null> {
    return await this.queryBuilder.getOne(baseQuery, this.parseRequest(baseQuery, filter));
  }

  public async getMany<E>(baseQuery: T, params: Record<string, RequestParamValue>, filter: RequestFilter = {}): Promise<GetManyProxy<E>> {
    return await this.queryBuilder.getMany(baseQuery, this.parseRequest(baseQuery, filter));
  }

  public build<E>(baseQuery: T, params: Record<string, RequestParamValue>, filter: RequestFilter = {}): T {
    return this.queryBuilder.build(baseQuery, this.parseRequest(baseQuery, filter));
  }

  protected parseRequest(params: Record<string, RequestParamValue>, filter: RequestFilter = {}): ParsedRequest {
    let parsedRequest: ParsedRequest;

    parsedRequest = this.parser.parse(params);

    for (const filterContract of this.filters) {
      parsedRequest = filterContract.filter(parsedRequest, filter);
    }

    return parsedRequest;
  }

}
