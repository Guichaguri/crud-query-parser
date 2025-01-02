import { expect, test } from 'vitest';
import { CrudRequest } from '../../../src';
import { filterRelations } from '../../../src/filters';

test('should filter relations', () => {
  let req: CrudRequest = {
    select: [],
    where: { and: [] },
    order: [],
    relations: [
      { field: ['posts'] },
      { field: ['posts', 'author'] },
      { field: ['comments'] },
    ],
  };

  req = filterRelations(req, ['posts', 'posts.author']);

  expect(req.relations).toEqual([
    { field: ['posts'] },
    { field: ['posts', 'author'] },
  ]);
});
