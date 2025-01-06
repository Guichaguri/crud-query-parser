import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { Filter } from 'mongodb';
import { QueryWithHelpers } from 'mongoose';
import { MongooseQueryAdapter } from '../../../src/adapters/mongodb';
import { CrudRequest, CrudRequestWhereOperator, GetManyResult } from '../../../src';

const adapter = new MongooseQueryAdapter();

const queryMocks = {
  projection: vi.fn(),
  sort: vi.fn(() => query),
  skip: vi.fn(() => query),
  limit: vi.fn(() => query),
  where: vi.fn(() => query),
  exec: vi.fn(),
  countDocuments: vi.fn(),
  clone: vi.fn(() => query),
} satisfies Partial<QueryWithHelpers<any, any>>;

const query = queryMocks as any as QueryWithHelpers<any, any>;

const emptyRequest: CrudRequest = {
  select: [],
  relations: [],
  order: [],
  where: { and: [] },
};

const complexRequest: CrudRequest = {
  select: [{ field: ['id'] }, { field: ['title'] }, { field: ['category', 'name'] }],
  relations: [],
  order: [{ field: ['id'], order: 'DESC' }, { field: ['title'], order: 'ASC' }],
  where: {
    and: [
      {
        field: ['title'],
        operator: CrudRequestWhereOperator.NOT_NULL,
        value: null,
      },
      {
        field: ['category', 'name'],
        operator: CrudRequestWhereOperator.EQ,
        value: 'Sports',
      },
      {
        or: [
          {
            field: ['isActive'],
            operator: CrudRequestWhereOperator.EQ,
            value: true,
          },
          {
            field: ['id'],
            operator: CrudRequestWhereOperator.LTE,
            value: 1,
          },
        ],
      },
    ],
  },
  limit: 25,
  page: 2,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('build', () => {
  test('should build an empty request', () => {
    adapter.build(query, emptyRequest);

    expect(queryMocks.projection).toHaveBeenCalledTimes(0);
    expect(queryMocks.sort).toHaveBeenCalledTimes(0);
    expect(queryMocks.where).toHaveBeenCalledWith({});
    expect(queryMocks.skip).toHaveBeenCalledTimes(0);
    expect(queryMocks.limit).toHaveBeenCalledTimes(0);
  });

  test('should build a complex request', () => {
    adapter.build(query, complexRequest);

    expect(queryMocks.projection).toHaveBeenCalledWith({
      id: true,
      title: true,
      'category.name': true,
    });
    expect(queryMocks.sort).toHaveBeenCalledWith([
      ['id', -1],
      ['title', 1],
    ]);
    expect(queryMocks.where).toHaveBeenCalledWith({
      $and: [
        { title: { $ne: null } },
        { 'category.name': 'Sports' },
        {
          $or: [
            { isActive: true },
            { id: { $lte: 1 } },
          ]
        },
      ],
    } satisfies Filter<any>);
    expect(queryMocks.skip).toHaveBeenCalledWith(25);
    expect(queryMocks.limit).toHaveBeenCalledWith(25);
  });
});

describe('getMany', () => {
  test('should return empty results', async () => {
    queryMocks.exec.mockResolvedValue([]);
    queryMocks.countDocuments.mockResolvedValue(0);

    const result = await adapter.getMany(query, emptyRequest);

    expect(queryMocks.exec).toHaveBeenCalled();
    expect(queryMocks.countDocuments).toHaveBeenCalled();
    expect(result).toEqual({
      data: [],
      count: 0,
      page: 1,
      pageCount: 0,
      total: 0,
    } satisfies GetManyResult<any>);
  });

  test('should return two results', async () => {
    queryMocks.exec.mockResolvedValue([{ foo: 'bar' }, { foo: 'baz' }]);
    queryMocks.countDocuments.mockResolvedValue(5);

    const result = await adapter.getMany(query, complexRequest);

    expect(queryMocks.exec).toHaveBeenCalled();
    expect(queryMocks.countDocuments).toHaveBeenCalled();
    expect(result).toEqual({
      data: [{ foo: 'bar' }, { foo: 'baz' }],
      count: 2,
      page: 2,
      pageCount: 1,
      total: 5,
    } satisfies GetManyResult<any>);
  });

  test('should disable count', async () => {
    queryMocks.exec.mockResolvedValue([{ foo: 'bar' }]);

    const adapter = new MongooseQueryAdapter({ disableCount: true });

    const result = await adapter.getMany(query, emptyRequest);

    expect(queryMocks.exec).toHaveBeenCalled();
    expect(queryMocks.countDocuments).toHaveBeenCalledTimes(0);
    expect(result).toEqual({
      data: [{ foo: 'bar' }],
      count: 1,
      page: 1,
      pageCount: 0,
      total: 0,
    } satisfies GetManyResult<any>);
  });
});

describe('getOne', () => {
  test('should return null if no result is available', async () => {
    queryMocks.exec.mockResolvedValue([]);

    const result = await adapter.getOne(query, emptyRequest);

    expect(queryMocks.exec).toHaveBeenCalled();
    expect(result).toBeNull();
  });

  test('should return a result', async () => {
    queryMocks.exec.mockResolvedValue([{ foo: 'bar' }]);

    const result = await adapter.getOne(query, complexRequest);

    expect(queryMocks.exec).toHaveBeenCalled();
    expect(result).toEqual({ foo: 'bar' });
  });
});
