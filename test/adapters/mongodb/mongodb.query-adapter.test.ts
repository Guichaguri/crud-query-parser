import { beforeEach, describe, expect, test, vi } from 'vitest';
import { Collection, Condition, Filter, FindCursor } from 'mongodb';
import { MongoDBQueryAdapter } from '../../../src/adapters/mongodb';
import { CrudRequest, CrudRequestWhereOperator, GetManyResult } from '../../../src';

const adapter = new MongoDBQueryAdapter();

const cursorMocks = {
  filter: vi.fn(),
  skip: vi.fn(),
  limit: vi.fn(),
  sort: vi.fn(),
  project: vi.fn(),
  toArray: vi.fn(),
  next: vi.fn(),
  count: vi.fn(),
} satisfies Partial<FindCursor>;

const collectionMocks = {
  find: vi.fn(() => cursor),
  countDocuments: vi.fn(),
} satisfies Partial<Collection>;

const cursor = cursorMocks as any as FindCursor;
const collection = collectionMocks as any as Collection;

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
    adapter.build(cursor, emptyRequest);

    expect(cursorMocks.project).toHaveBeenCalledTimes(0);
    expect(cursorMocks.sort).toHaveBeenCalledTimes(0);
    expect(cursorMocks.filter).toHaveBeenCalledWith({});
    expect(cursorMocks.skip).toHaveBeenCalledTimes(0);
    expect(cursorMocks.limit).toHaveBeenCalledTimes(0);
  });

  test('should build a complex request', () => {
    adapter.build(cursor, complexRequest);

    expect(cursorMocks.project).toHaveBeenCalledWith({
      id: true,
      title: true,
      'category.name': true,
    });
    expect(cursorMocks.sort).toHaveBeenCalledWith([
      ['id', -1],
      ['title', 1],
    ]);
    expect(cursorMocks.filter).toHaveBeenCalledWith({
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
    expect(cursorMocks.skip).toHaveBeenCalledWith(25);
    expect(cursorMocks.limit).toHaveBeenCalledWith(25);
  });

  test('should allow passing a collection', () => {
    const result = adapter.build(collection, emptyRequest);

    expect(collectionMocks.find).toHaveBeenCalled();
    expect(result).toBe(cursor);
  });
});

describe('buildFilter', () => {
  test('should generate basic operators', () => {
    const ops: [CrudRequestWhereOperator, any, Condition<any>][] = [
      [CrudRequestWhereOperator.EQ, 10, 10],
      [CrudRequestWhereOperator.NEQ, 10, { $ne: 10 }],
      [CrudRequestWhereOperator.GT, 10, { $gt: 10 }],
      [CrudRequestWhereOperator.GTE, 10, { $gte: 10 }],
      [CrudRequestWhereOperator.LT, 10, { $lt: 10 }],
      [CrudRequestWhereOperator.LTE, 10, { $lte: 10 }],
      [CrudRequestWhereOperator.IN, [2, 4], { $in: [2, 4] }],
      [CrudRequestWhereOperator.NOT_IN, [2, 4], { $nin: [2, 4] }],
      [CrudRequestWhereOperator.IS_NULL, null, { $eq: null }],
      [CrudRequestWhereOperator.NOT_NULL, null, { $ne: null }],
      [CrudRequestWhereOperator.BETWEEN, [2, 4], { $gte: 2, $lte: 4 }],
      [CrudRequestWhereOperator.CONTAINS, 'foo', { $regex: 'foo' }],
      [CrudRequestWhereOperator.NOT_CONTAINS, 'foo', { $not: { $regex: 'foo' } }],
      [CrudRequestWhereOperator.STARTS, 'foo', { $regex: '^foo' }],
      [CrudRequestWhereOperator.ENDS, 'foo', { $regex: 'foo$' }],
      [CrudRequestWhereOperator.EQ_LOWER, 'foo', { $regex: '^foo$', $options: 'i' }],
      [CrudRequestWhereOperator.NEQ_LOWER, 'foo', { $not: { $regex: '^foo$', $options: 'i' } }],
      [CrudRequestWhereOperator.CONTAINS_LOWER, 'foo', { $regex: 'foo', $options: 'i' }],
      [CrudRequestWhereOperator.NOT_CONTAINS_LOWER, 'foo', { $not: { $regex: 'foo', $options: 'i' } }],
      [CrudRequestWhereOperator.STARTS_LOWER, 'foo', { $regex: '^foo', $options: 'i' }],
      [CrudRequestWhereOperator.ENDS_LOWER, 'foo', { $regex: 'foo$', $options: 'i' }],
      [CrudRequestWhereOperator.IN_LOWER, ['foo', 'bar'], {
        $in: [{ $regex: '^foo$', $options: 'i' }, { $regex: '^bar$', $options: 'i' }],
      }],
      [CrudRequestWhereOperator.NOT_IN_LOWER, ['foo', 'bar'], {
        $nin: [{ $regex: '^foo$', $options: 'i' }, { $regex: '^bar$', $options: 'i' }],
      }],
    ];

    for (const [op, value, condition] of ops) {
      const filter = adapter.buildFilter({
        ...emptyRequest,
        where: { field: ['id'], operator: op, value: value },
      });

      expect(filter, op).toEqual({ id: condition });
    }
  });

  test('should throw with invalid operators', () => {
    expect(() => {
      adapter.buildFilter({
        ...emptyRequest,
        where: { field: ['id'], operator: 'invalid' as any, value: 10 },
      });
    }).toThrow(Error);
  });
});

describe('getMany', () => {
  test('should return empty results', async () => {
    cursorMocks.toArray.mockResolvedValue([]);
    cursorMocks.count.mockResolvedValue(0);

    const result = await adapter.getMany(cursor, emptyRequest);

    expect(cursorMocks.toArray).toHaveBeenCalled();
    expect(cursorMocks.count).toHaveBeenCalled();
    expect(result).toEqual({
      data: [],
      count: 0,
      page: 1,
      pageCount: 0,
      total: 0,
    } satisfies GetManyResult<any>);
  });

  test('should return two results', async () => {
    cursorMocks.toArray.mockResolvedValue([{ foo: 'bar' }, { foo: 'baz' }]);
    cursorMocks.count.mockResolvedValue(5);

    const result = await adapter.getMany(cursor, complexRequest);

    expect(cursorMocks.toArray).toHaveBeenCalled();
    expect(cursorMocks.count).toHaveBeenCalled();
    expect(result).toEqual({
      data: [{ foo: 'bar' }, { foo: 'baz' }],
      count: 2,
      page: 2,
      pageCount: 1,
      total: 5,
    } satisfies GetManyResult<any>);
  });

  test('should allow passing a collection', async () => {
    cursorMocks.toArray.mockResolvedValue([]);
    collectionMocks.countDocuments.mockResolvedValue(0);

    const result = await adapter.getMany(collection, complexRequest);

    expect(collectionMocks.find).toHaveBeenCalled();
    expect(cursorMocks.toArray).toHaveBeenCalled();
    expect(collectionMocks.countDocuments).toHaveBeenCalled();
    expect(cursorMocks.count).toHaveBeenCalledTimes(0);
    expect(result).toEqual({
      data: [],
      count: 0,
      page: 2,
      pageCount: 0,
      total: 0,
    } satisfies GetManyResult<any>);
  });

  test('should disable count', async () => {
    cursorMocks.toArray.mockResolvedValue([{ foo: 'bar' }]);

    const adapter = new MongoDBQueryAdapter({ disableCount: true });

    const result = await adapter.getMany(collection, emptyRequest);

    expect(cursorMocks.toArray).toHaveBeenCalled();
    expect(collectionMocks.countDocuments).toHaveBeenCalledTimes(0);
    expect(cursorMocks.count).toHaveBeenCalledTimes(0);
    expect(result).toEqual({
      data: [{ foo: 'bar' }],
      count: 1,
      page: 1,
      pageCount: 0,
      total: 0,
    } satisfies GetManyResult<any>);
  });

  test('should ignore if count not implemented', async () => {
    cursorMocks.toArray.mockResolvedValue([]);

    const cursorWithoutCount: any = {
      ...cursorMocks,
      count: undefined,
    };

    const result = await adapter.getMany(cursorWithoutCount, emptyRequest);

    expect(cursorMocks.toArray).toHaveBeenCalled();
    expect(cursorMocks.count).toHaveBeenCalledTimes(0);
    expect(result).toEqual({
      data: [],
      count: 0,
      page: 1,
      pageCount: 0,
      total: 0,
    } satisfies GetManyResult<any>);
  });
});

describe('getOne', () => {
  test('should return null if no result is available', async () => {
    cursorMocks.next.mockResolvedValue(null);

    const result = await adapter.getOne(cursor, emptyRequest);

    expect(cursorMocks.next).toHaveBeenCalled();
    expect(result).toBeNull();
  });

  test('should return a result', async () => {
    cursorMocks.next.mockResolvedValue({ foo: 'bar' });

    const result = await adapter.getOne(cursor, complexRequest);

    expect(cursorMocks.next).toHaveBeenCalled();
    expect(result).toEqual({ foo: 'bar' });
  });

  test('should allow passing a collection', async () => {
    cursorMocks.next.mockResolvedValue(null);

    const result = await adapter.getOne(collection, complexRequest);

    expect(collectionMocks.find).toHaveBeenCalled();
    expect(cursorMocks.next).toHaveBeenCalled();
    expect(result).toBeNull();
  });
});
