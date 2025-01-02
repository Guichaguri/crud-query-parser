import { expect, test } from 'vitest';
import { CrudRequest } from '../../../src';
import { ensureLimit } from '../../../src/filters';

test('should set default limit when omitted', () => {
  let req: CrudRequest = {
    select: [],
    where: { and: [] },
    order: [],
    relations: [],
  };

  req = ensureLimit(req, 25, 100);

  expect(req.limit).toEqual(25);
});

test('should leave limit as is when it is within bounds', () => {
  let req: CrudRequest = {
    select: [],
    where: { and: [] },
    order: [],
    relations: [],
    limit: 50,
  };

  req = ensureLimit(req, 25, 100);

  expect(req.limit).toEqual(50);
});

test('should lower limit if it goes above the maximum', () => {
  let req: CrudRequest = {
    select: [],
    where: { and: [] },
    order: [],
    relations: [],
    limit: 150,
  };

  req = ensureLimit(req, 25, 100);

  expect(req.limit).toEqual(100);
});

test('should ensure limit is at least 1', () => {
  let req: CrudRequest = {
    select: [],
    where: { and: [] },
    order: [],
    relations: [],
    limit: 0,
  };

  req = ensureLimit(req, 25, 100);

  expect(req.limit).toEqual(1);
});
