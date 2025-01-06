import { describe, expect, test } from 'vitest';
import { createCrudRequest, createGetManyResult } from '../../src/utils/objects';
import { CrudRequest, CrudRequestWhereOperator, GetManyResult } from '../../src';

describe('createCrudRequest', () => {
  test('should be completely empty', () => {
    const request = createCrudRequest();

    expect(request).toEqual({
      select: [],
      relations: [],
      order: [],
      where: { and: [] },
    } satisfies CrudRequest);
  });

  test('should allow passing a full request', () => {
    const fullRequest: CrudRequest = {
      select: [{ field: ['id'] }],
      relations: [{ field: ['category'] }],
      order: [{ field: ['title'], order: 'ASC' }],
      where: {
        field: ['id'],
        operator: CrudRequestWhereOperator.EQ,
        value: 10,
      },
      limit: 25,
      page: 2,
    };

    const request = createCrudRequest(fullRequest);

    expect(request).toEqual(fullRequest);
  });

  test('should allow passing a partial request', () => {
    const request = createCrudRequest({
      select: [{ field: ['id'] }],
      offset: 100,
    });

    expect(request).toEqual({
      select: [{ field: ['id'] }],
      relations: [],
      order: [],
      where: { and: [] },
      offset: 100,
    } satisfies CrudRequest);
  });
});

describe('createGetManyResult', () => {
  test('should create an empty result', () => {
    const result = createGetManyResult([], 0, 0);

    expect(result).toEqual({
      data: [],
      count: 0,
      total: 0,
      page: 1,
      pageCount: 0,
    } satisfies GetManyResult<any>);
  });

  test('should create a complete result', () => {
    const data = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const result = createGetManyResult(data, 25, 6, 3);

    expect(result).toEqual({
      data: data,
      count: 3,
      total: 25,
      page: 3,
      pageCount: 9,
    } satisfies GetManyResult<any>);
  });
});
