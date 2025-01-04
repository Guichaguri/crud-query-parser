import { describe, expect, test } from 'vitest';
import { parseCrudFilters, parseCrudSearch } from '../../../src/parsers/crud/parseCrudSearch';
import { CrudRequestWhere, CrudRequestWhereBuilder, CrudRequestWhereOperator } from '../../../src';

describe('parseCrudSearch', () => {
  test('should parse a flat AND condition', () => {
    const builder = new CrudRequestWhereBuilder();

    parseCrudSearch(builder, {
      id: 10,
      isActive: true,
      'category.name': { $cont: 'foo' },
    });

    expect(builder.build()).toEqual({
      and: [
        { field: ['id'], operator: CrudRequestWhereOperator.EQ, value: 10 },
        { field: ['isActive'], operator: CrudRequestWhereOperator.EQ, value: true },
        { field: ['category', 'name'], operator: CrudRequestWhereOperator.CONTAINS, value: 'foo' },
      ],
    } satisfies CrudRequestWhere);
  });

  test('should parse both flat AND and $and condition', () => {
    const builder = new CrudRequestWhereBuilder();

    parseCrudSearch(builder, {
      id: 10,
      isActive: true,
      $and: [
        { name: { $starts: 'Hello' } },
      ],
    } as any);

    expect(builder.build()).toEqual({
      and: [
        { field: ['name'], operator: CrudRequestWhereOperator.STARTS, value: 'Hello' },
        { field: ['id'], operator: CrudRequestWhereOperator.EQ, value: 10 },
        { field: ['isActive'], operator: CrudRequestWhereOperator.EQ, value: true },
      ],
    } satisfies CrudRequestWhere);
  });

  test('should parse an OR condition', () => {
    const builder = new CrudRequestWhereBuilder();

    parseCrudSearch(builder, {
      $or: [
        { id: 10 },
        { isActive: true },
        {
          $and: [
            { id: 5 },
            { age: { $gte: 18 } },
          ],
        },
      ],
    });

    expect(builder.build()).toEqual({
      and: [
        {
          or: [
            { field: ['id'], operator: CrudRequestWhereOperator.EQ, value: 10 },
            { field: ['isActive'], operator: CrudRequestWhereOperator.EQ, value: true },
            {
              and: [
                { field: ['id'], operator: CrudRequestWhereOperator.EQ, value: 5 },
                { field: ['age'], operator: CrudRequestWhereOperator.GTE, value: 18 },
              ],
            },
          ],
        },
      ],
    } satisfies CrudRequestWhere);
  });

  test('should parse a single condition wrapped in OR', () => {
    const builder = new CrudRequestWhereBuilder();

    parseCrudSearch(builder, {
      $or: [
        { isActive: true },
      ],
    });

    expect(builder.build()).toEqual({
      and: [
        { field: ['isActive'], operator: CrudRequestWhereOperator.EQ, value: true },
      ],
    } satisfies CrudRequestWhere);
  });

  test('should parse an OR mixed with AND conditions', () => {
    const builder = new CrudRequestWhereBuilder();

    parseCrudSearch(builder, {
      $or: [
        { id: 10 },
        { isActive: true },
      ],
      age: { $gte: 18 },
    });

    expect(builder.build()).toEqual({
      and: [
        {
          or: [
            { field: ['id'], operator: CrudRequestWhereOperator.EQ, value: 10 },
            { field: ['isActive'], operator: CrudRequestWhereOperator.EQ, value: true },
          ],
        },
        { field: ['age'], operator: CrudRequestWhereOperator.GTE, value: 18 },
      ],
    } satisfies CrudRequestWhere);
  });

  test('should parse a single condition wrapped in OR mixed with AND conditions', () => {
    const builder = new CrudRequestWhereBuilder();

    parseCrudSearch(builder, {
      $or: [
        { isActive: true },
      ],
      age: { $gte: 18 },
    });

    expect(builder.build()).toEqual({
      and: [
        { field: ['age'], operator: CrudRequestWhereOperator.GTE, value: 18 },
        { field: ['isActive'], operator: CrudRequestWhereOperator.EQ, value: true },
      ],
    } satisfies CrudRequestWhere);
  });

  test('should parse nested conditions', () => {
    const builder = new CrudRequestWhereBuilder();

    parseCrudSearch(builder, {
      posts: [{
        id: 10,
      }],
      level: {
        $or: {
          $lte: 5,
          $gte: 20,
        },
      },
    });

    expect(builder.build()).toEqual({
      and: [
        { field: ['posts', 'id'], operator: CrudRequestWhereOperator.EQ, value: 10 },
        {
          or: [
            { field: ['level'], operator: CrudRequestWhereOperator.LTE, value: 5 },
            { field: ['level'], operator: CrudRequestWhereOperator.GTE, value: 20 },
          ],
        },
      ],
    } satisfies CrudRequestWhere);
  });

  test('should ignore invalid or empty conditions', () => {
    const builder = new CrudRequestWhereBuilder();

    parseCrudSearch(builder, 'nope' as any);
    parseCrudSearch(builder, {});
    parseCrudSearch(builder, { $and: [] });
    parseCrudSearch(builder, {
      id: { $invalid: 10 } as any,
      age: null as any,
    });

    expect(builder.build()).toEqual({
      and: [],
    } satisfies CrudRequestWhere);
  });
});

describe('parseCrudFilters', () => {
  test('should parse both filter and or parameters', () => {
    const builder = new CrudRequestWhereBuilder();

    parseCrudFilters(builder, ['id||$eq||10', 'age||$gte||18'], ['id||$eq||5']);

    expect(builder.build()).toEqual({
      and: [
        {
          or: [
            {
              and: [
                { field: ['id'], operator: CrudRequestWhereOperator.EQ, value: '10' },
                { field: ['age'], operator: CrudRequestWhereOperator.GTE, value: '18' },
              ],
            },
            { and: [{ field: ['id'], operator: CrudRequestWhereOperator.EQ, value: '5' }] },
          ],
        },
      ],
    } satisfies CrudRequestWhere);
  });

  test('should parse filter parameter', () => {
    const builder = new CrudRequestWhereBuilder();

    parseCrudFilters(builder, ['id||$eq||10', 'age||$gte||18'], []);

    expect(builder.build()).toEqual({
      and: [
        { field: ['id'], operator: CrudRequestWhereOperator.EQ, value: '10' },
        { field: ['age'], operator: CrudRequestWhereOperator.GTE, value: '18' },
      ],
    } satisfies CrudRequestWhere);
  });

  test('should parse or parameter', () => {
    const builder = new CrudRequestWhereBuilder();

    parseCrudFilters(builder, [], ['id||$eq||10', 'age||$gte||18']);

    expect(builder.build()).toEqual({
      and: [
        {
          or: [
            { field: ['id'], operator: CrudRequestWhereOperator.EQ, value: '10' },
            { field: ['age'], operator: CrudRequestWhereOperator.GTE, value: '18' },
          ],
        },
      ],
    } satisfies CrudRequestWhere);
  });

  test('should ignore invalid operator', () => {
    const builder = new CrudRequestWhereBuilder();

    parseCrudFilters(builder, ['id||$invalid||10'], []);

    expect(builder.build()).toEqual({
      and: [],
    } satisfies CrudRequestWhere);
  });
});
