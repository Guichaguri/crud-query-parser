import { test, expect } from 'vitest';
import { ensureCondition } from '../../../src/filters';
import { CrudRequest, CrudRequestWhere, CrudRequestWhereOperator } from '../../../src';

const condition1: CrudRequestWhere = {
  field: ['isActive'],
  operator: CrudRequestWhereOperator.EQ,
  value: true,
};

const condition2: CrudRequestWhere = {
  field: ['age'],
  operator: CrudRequestWhereOperator.GTE,
  value: 18,
};

const condition3: CrudRequestWhere = {
  field: ['name'],
  operator: CrudRequestWhereOperator.CONTAINS,
  value: 'John',
};

test('should prepend condition to the existing AND list', () => {
  let req: CrudRequest = {
    select: [],
    where: { and: [condition3] },
    order: [],
    relations: [],
  };

  req = ensureCondition(req, condition1);
  req = ensureCondition(req, condition2);

  expect(req.where).toEqual({
    and: [condition2, condition1, condition3],
  });
});


test('should wrap an AND operator', () => {
  const baseReq: CrudRequest = {
    select: [],
    where: { or: [condition2] },
    order: [],
    relations: [],
  };

  const req = ensureCondition(baseReq, condition1);

  expect(baseReq.where.or).toBeDefined();
  expect(baseReq.where.and).toBeUndefined();
  expect(req.where).toEqual({
    and: [
      condition1,
      { or: [condition2] },
    ],
  });
});
