import { QueryBuilderContract } from '../contracts/query-builder.contract';
import { ParsedRequest } from '../models/parsed-request';
import { GetManyProxy } from '../models/get-many.proxy';

/**
 * Adapts queries to TypeORM 0.3+ repository.find() object
 */
export class PrismaQueryBuilder implements QueryBuilderContract<PrismaEntityFindManyArgs> {

  /**
   * @inheritDoc
   */
  public build(baseQuery: PrismaEntityFindManyArgs, request: ParsedRequest): PrismaEntityFindManyArgs {
    return {
      ...baseQuery,
      /*select: query.select,
      include: query.relations,*/

      /*where: query.where,
      order: query.order,
      take: query.limit,
      skip: query.offset,*/
    };
  }

  /**
   * @inheritDoc
   */
  public async run<E>(baseQuery: PrismaEntityFindManyArgs, request: ParsedRequest): Promise<GetManyProxy<E>> {
    throw new Error('Not implemented');
  }

}

export interface PrismaEntityArgs {

  select?: Record<string, boolean | PrismaEntityArgs>;

  include?: Record<string, boolean | PrismaEntityFindManyArgs>;

}

export interface PrismaEntityFindManyArgs extends PrismaEntityArgs {




}

export interface PrismaEntityWhereInput {



}
