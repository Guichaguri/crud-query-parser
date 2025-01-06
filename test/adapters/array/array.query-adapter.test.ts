import { describe, expect, test } from 'vitest';
import { ArrayQueryAdapter } from '../../../src/adapters/array';
import { CrudRequest, CrudRequestWhereOperator } from '../../../src';

interface Sample { id: number, name: string, category: string, isActive: boolean, meta?: object | null }

const adapter = new ArrayQueryAdapter<Sample>();

const data: Sample[] = [
  { id: 1, name: 'Foo', category: 'Finance', isActive: true, meta: {} },
  { id: 2, name: 'Bar', category: 'Finance', isActive: true, meta: null },
  { id: 3, name: 'Hello', category: 'Sports', isActive: false, meta: {} },
  { id: 4, name: 'World', category: 'Sports', isActive: true, meta: undefined },
  { id: 5, name: 'foo', category: 'Fashion', isActive: true, meta: {} },
];

const emptyQuery: CrudRequest = {
  select: [],
  where: { and: [] },
  order: [],
  relations: [],
};

describe('build', () => {
  test('should return as is', () => {
    const result = adapter.build(data, emptyQuery);

    expect(result).toEqual(data);
  });
});

describe('applyLimits', () => {
  test('should limit and offset', () => {
    const result = adapter.build(data, {
      ...emptyQuery,
      offset: 1,
      limit: 2,
    });

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(data[1]);
    expect(result[1]).toEqual(data[2]);
  });

  test('should only limit', () => {
    const result = adapter.build(data, {
      ...emptyQuery,
      limit: 2,
    });

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(data[0]);
    expect(result[1]).toEqual(data[1]);
  });
});

describe('applyOrder', () => {
  test('should sort numbers', () => {
    const result = adapter.build(data, {
      ...emptyQuery,
      order: [{ field: ['id'], order: 'DESC' }],
    });

    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].id).toBeGreaterThan(result[i].id);
    }
  });

  test('should sort strings', () => {
    const result = adapter.build(data, {
      ...emptyQuery,
      order: [{ field: ['name'], order: 'ASC' }],
    });

    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].name.localeCompare(result[i].name)).toBeLessThanOrEqual(0);
    }
  });

  test('should sort booleans', () => {
    const result = adapter.build(data, {
      ...emptyQuery,
      order: [{ field: ['isActive'], order: 'ASC' }],
    });

    for (let i = 1; i < result.length; i++) {
      expect(+result[i - 1].isActive).toBeLessThanOrEqual(+result[i].isActive);
    }
  });

  test('should not sort objects', () => {
    const result = adapter.build(data, {
      ...emptyQuery,
      order: [{ field: ['meta'], order: 'ASC' }],
    });

    expect(result).toEqual(data);
  });
});

describe('applySelect', () => {
  test('should select fields', () => {
    const result = adapter.build(data, {
      ...emptyQuery,
      select: [{ field: ['name'] }],
    });

    expect(result).toHaveLength(data.length);

    for (const item of result) {
      expect(Object.keys(item)).toHaveLength(1);
      expect(item.name).toBeDefined();
    }
  });

  test('should select fields with custom object', () => {
    const adapter = new ArrayQueryAdapter<{ name?: string, hello?: boolean }>({
      createEmptyEntity: () => ({ hello: true }),
    });

    const result = adapter.build(data, {
      ...emptyQuery,
      select: [{ field: ['name'] }],
    });

    expect(result).toHaveLength(data.length);

    for (const item of result) {
      expect(Object.keys(item)).toHaveLength(2);
      expect(item.name).toBeDefined();
      expect(item.hello).toBe(true);
    }
  });
});

describe('applyWhere', () => {
  test('should filter with AND operator', () => {
    const result = adapter.build(data, {
      ...emptyQuery,
      where: {
        and: [
          { field: ['category'], operator: CrudRequestWhereOperator.EQ, value: 'Finance' },
          { field: ['isActive'], operator: CrudRequestWhereOperator.EQ, value: true },
        ],
      },
    });

    expect(result).toHaveLength(2);

    for (const item of result) {
      expect(item.category).toBe('Finance');
      expect(item.isActive).toBe(true);
    }
  });

  test('should filter with OR operator', () => {
    const result = adapter.build(data, {
      ...emptyQuery,
      where: {
        or: [
          { field: ['category'], operator: CrudRequestWhereOperator.EQ, value: 'Finance' },
          { field: ['isActive'], operator: CrudRequestWhereOperator.EQ, value: true },
        ],
      },
    });

    expect(result).toHaveLength(4);

    for (const item of result) {
      expect(item.category === 'Finance' || item.isActive).toBe(true);
    }
  });

  test('should ignore invalid filter', () => {
    const result = adapter.build(data, {
      ...emptyQuery,
      where: {} as any,
    });

    expect(result).toEqual(data);
  });

  test('should validate all numeric operators', () => {
    const ops: [CrudRequestWhereOperator, number][] = [
      [CrudRequestWhereOperator.EQ, 1],
      [CrudRequestWhereOperator.NEQ, 4],
      [CrudRequestWhereOperator.GT, 2],
      [CrudRequestWhereOperator.GTE, 3],
      [CrudRequestWhereOperator.LT, 2],
      [CrudRequestWhereOperator.LTE, 3],
    ];

    for (const [op, length] of ops) {
      const result = adapter.build(data, {
        ...emptyQuery,
        where: {
          field: ['id'], operator: op, value: 3,
        },
      });

      expect(result, `id ${op} 3`).toHaveLength(length);
    }
  });

  test('should validate all string operators', () => {
    const ops: [CrudRequestWhereOperator, number][] = [
      [CrudRequestWhereOperator.EQ, 1],
      [CrudRequestWhereOperator.NEQ, 4],
      [CrudRequestWhereOperator.GT, 3],
      [CrudRequestWhereOperator.GTE, 4],
      [CrudRequestWhereOperator.LT, 1],
      [CrudRequestWhereOperator.LTE, 2],
      [CrudRequestWhereOperator.CONTAINS, 1],
      [CrudRequestWhereOperator.NOT_CONTAINS, 4],
      [CrudRequestWhereOperator.STARTS, 1],
      [CrudRequestWhereOperator.ENDS, 1],
      [CrudRequestWhereOperator.EQ_LOWER, 2],
      [CrudRequestWhereOperator.NEQ_LOWER, 3],
      [CrudRequestWhereOperator.CONTAINS_LOWER, 2],
      [CrudRequestWhereOperator.NOT_CONTAINS_LOWER, 3],
      [CrudRequestWhereOperator.STARTS_LOWER, 2],
      [CrudRequestWhereOperator.ENDS_LOWER, 2],
    ];

    for (const [op, length] of ops) {
      const result = adapter.build(data, {
        ...emptyQuery,
        where: {
          field: ['name'], operator: op, value: 'Foo',
        },
      });

      expect(result, `name ${op} Foo`).toHaveLength(length);
    }
  });

  test('should ignore string operators on numbers', () => {
    const ops: [CrudRequestWhereOperator, number][] = [
      [CrudRequestWhereOperator.CONTAINS, 0],
      [CrudRequestWhereOperator.NOT_CONTAINS, 5],
      [CrudRequestWhereOperator.STARTS, 0],
      [CrudRequestWhereOperator.ENDS, 0],
      [CrudRequestWhereOperator.EQ_LOWER, 0],
      [CrudRequestWhereOperator.NEQ_LOWER, 5],
      [CrudRequestWhereOperator.CONTAINS_LOWER, 0],
      [CrudRequestWhereOperator.NOT_CONTAINS_LOWER, 5],
      [CrudRequestWhereOperator.STARTS_LOWER, 0],
      [CrudRequestWhereOperator.ENDS_LOWER, 0],
    ];

    for (const [op, length] of ops) {
      const result = adapter.build(data, {
        ...emptyQuery,
        where: {
          field: ['id'], operator: op, value: 'Foo',
        },
      });

      expect(result, `id ${op} Foo`).toHaveLength(length);
    }
  });

  test('should validate IN operators', () => {
    const ops: [CrudRequestWhereOperator, number][] = [
      [CrudRequestWhereOperator.IN, 2],
      [CrudRequestWhereOperator.NOT_IN, 3],
      [CrudRequestWhereOperator.IN_LOWER, 3],
      [CrudRequestWhereOperator.NOT_IN_LOWER, 2],
    ];

    for (const [op, length] of ops) {
      const result = adapter.build(data, {
        ...emptyQuery,
        where: {
          field: ['name'], operator: op, value: ['Foo', 'Bar'],
        },
      });

      expect(result, `name ${op} Foo, Bar`).toHaveLength(length);
    }
  });

  test('should validate special operators', () => {
    expect(adapter.build(data, {
      ...emptyQuery,
      where: {
        field: ['id'], operator: CrudRequestWhereOperator.BETWEEN, value: [2, 4],
      },
    }), 'id between 2, 4').toHaveLength(3);

    expect(adapter.build(data, {
      ...emptyQuery,
      where: {
        field: ['meta'], operator: CrudRequestWhereOperator.IS_NULL, value: null,
      },
    }), 'meta is_null').toHaveLength(2);

    expect(adapter.build(data, {
      ...emptyQuery,
      where: {
        field: ['meta'], operator: CrudRequestWhereOperator.NOT_NULL, value: null,
      },
    }), 'meta not_null').toHaveLength(3);

    expect(() => {
      adapter.build(data, {
        ...emptyQuery,
        where: {
          field: ['meta'], operator: 'invalid' as any, value: null,
        },
      });
    }, 'invalid operator').toThrow(Error);
  });
});

describe('getMany', () => {
  test('should get all from empty query', async () => {
    const result = await adapter.getMany(data, emptyQuery);

    expect(result).toEqual({
      data: data,
      total: data.length,
      page: 1,
      count: data.length,
      pageCount: 1,
    });
  });
});

describe('getOne', () => {
  test('should return first from empty query', async () => {
    const result = await adapter.getOne(data, emptyQuery);

    expect(result).not.toBeNull();
    expect(result).toEqual(data[0]);
  });

  test('should return null from empty result set', async () => {
    const result = await adapter.getOne(data, {
      ...emptyQuery,
      where: {
        field: ['id'], operator: CrudRequestWhereOperator.EQ, value: 100,
      },
    });

    expect(result).toBeNull();
  });
});
