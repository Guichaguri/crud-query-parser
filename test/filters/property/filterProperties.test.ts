import { expect, test } from 'vitest';
import { filterProperties } from '../../../src/filters';
import { CrudRequest, CrudRequestWhereOperator } from '../../../src';

const baseReq: CrudRequest = {
  select: [{ field: ['id'] }, { field: ['name'] }],
  where: {
    and: [
      {
        field: ['id'],
        operator: CrudRequestWhereOperator.GT,
        value: 10,
      },
      {
        or: [
          {
            field: ['name'],
            operator: CrudRequestWhereOperator.CONTAINS,
            value: 'Foo',
          },
        ],
      },
    ],
  },
  order: [
    {
      field: ['id'],
      order: 'DESC',
    },
    {
      field: ['name'],
      order: 'ASC',
    },
  ],
  relations: [
    {
      field: ['posts'],
    },
  ],
};

test('should filter everything', () => {
  const req = filterProperties(baseReq, ['id']);

  expect(req.select).toEqual([{ field: ['id'] }]);
  expect(req.order).toEqual([{ field: ['id'], order: 'DESC' }]);
  expect(req.relations).toEqual([]);
  expect(req.where.and).toEqual([
    {
      field: ['id'],
      operator: CrudRequestWhereOperator.GT,
      value: 10,
    },
    {
      or: [],
    },
  ]);
});

test('should keep everything', () => {
  const req = filterProperties(baseReq, ['id', 'name', 'posts']);

  expect(req).toEqual(baseReq);
});

test('should add select when it is empty', () => {
  let req: CrudRequest = {
    ...baseReq,
    select: [],
  };

  req = filterProperties(req, ['id', 'name']);

  expect(req.select).toEqual([
    { field: ['id'] },
    { field: ['name'] },
  ]);
});

test('should remove the one field condition', () => {
  let req: CrudRequest = {
    ...baseReq,
    where: {
      field: ['name'],
      operator: CrudRequestWhereOperator.CONTAINS,
      value: 'Foo',
    },
  };

  req = filterProperties(req, []);

  expect(req.where).toEqual({ and: [] });
});
