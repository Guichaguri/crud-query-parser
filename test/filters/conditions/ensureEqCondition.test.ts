import { expect, test } from 'vitest';
import { ensureEqCondition } from '../../../src/filters';
import { CrudRequest, CrudRequestWhere, CrudRequestWhereOperator } from '../../../src';

test('should create an eq condition', () => {
  let req: CrudRequest = {
    select: [],
    where: { and: [] },
    order: [],
    relations: [],
  };

  req = ensureEqCondition(req, {
    isActive: true,
  });

  expect(req.where).toEqual({
    and: [
      {
        field: ['isActive'],
        operator: CrudRequestWhereOperator.EQ,
        value: true,
      },
    ]
  } satisfies CrudRequestWhere);
});

test('should create multiple eq conditions', () => {
  let req: CrudRequest = {
    select: [],
    where: { and: [] },
    order: [],
    relations: [],
  };

  req = ensureEqCondition(req, {
    isActive: true,
    type: 'post',
    category: {
      id: 7,
    },
    author: {
      user: {
        id: 10,
      },
    },
  });

  expect(req.where).toEqual({
    and: [
      {
        field: ['author', 'user', 'id'],
        operator: CrudRequestWhereOperator.EQ,
        value: 10,
      },
      {
        field: ['category', 'id'],
        operator: CrudRequestWhereOperator.EQ,
        value: 7,
      },
      {
        field: ['type'],
        operator: CrudRequestWhereOperator.EQ,
        value: 'post',
      },
      {
        field: ['isActive'],
        operator: CrudRequestWhereOperator.EQ,
        value: true,
      },
    ]
  } satisfies CrudRequestWhere);
});
