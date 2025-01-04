import { describe, expect, test } from 'vitest';
import { CrudRequestWhere, CrudRequestWhereBuilder, CrudRequestWhereOperator } from '../../src';

describe('addAnd', () => {
  test('should return self if it is already an AND condition', () => {
    const where = new CrudRequestWhereBuilder().addAnd();

    expect(where.addAnd()).toBe(where);
    expect(where.build()).toEqual({
      and: [],
    } satisfies CrudRequestWhere);
  });

  test('should return a new instance if it is an OR condition', () => {
    const where = new CrudRequestWhereBuilder().addOr();

    expect(where.addAnd()).not.toBe(where);
  });
});

describe('addOr', () => {
  test('should return self if it is already an OR condition', () => {
    const where = new CrudRequestWhereBuilder().addOr();

    expect(where.addOr()).toBe(where);
    expect(where.build()).toEqual({
      and: [
        {
          or: [],
        },
      ],
    } satisfies CrudRequestWhere);
  });

  test('should return a new instance if it is an AND condition', () => {
    const where = new CrudRequestWhereBuilder().addAnd();

    expect(where.addOr()).not.toBe(where);
  });
});

describe('addField', () => {
  test('should add field to the AND condition', () => {
    const where = new CrudRequestWhereBuilder()
      .addAnd()
      .addField(['age'], CrudRequestWhereOperator.GTE, 18)
      .build();

    expect(where).toEqual({
      and: [{
        field: ['age'],
        operator: CrudRequestWhereOperator.GTE,
        value: 18,
      }],
    } satisfies CrudRequestWhere);
  });

  test('should add field to the OR condition', () => {
    const where = new CrudRequestWhereBuilder()
      .addOr()
      .addField(['age'], CrudRequestWhereOperator.GTE, 18)
      .build();

    expect(where).toEqual({
      and: [{
        or: [{
          field: ['age'],
          operator: CrudRequestWhereOperator.GTE,
          value: 18,
        }],
      }],
    } satisfies CrudRequestWhere);
  });

  test('should throw if base where is invalid', () => {
    expect(() => {
      new CrudRequestWhereBuilder({} as any)
        .addField(['age'], CrudRequestWhereOperator.GTE, 18);
    }).toThrow(Error);
  });
});
