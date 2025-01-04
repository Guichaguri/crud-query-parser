import { describe, expect, test } from 'vitest';
import { CrudRequestParser } from '../../../src/parsers/crud';
import { CrudRequest, CrudRequestWhereOperator } from '../../../src';

describe('getOpenAPIParameters', () => {
  test('should return all parameters', () => {
    const parameters = new CrudRequestParser().getOpenAPIParameters();
    const paramNames = parameters.map(param => param.name);

    expect(parameters).toHaveLength(7);
    expect(paramNames).toContain('fields');
    expect(paramNames).toContain('s');
    expect(paramNames).toContain('sort');
    expect(paramNames).toContain('join');
    expect(paramNames).toContain('limit');
    expect(paramNames).toContain('offset');
    expect(paramNames).toContain('limit');
  });

  test('should disable all parameters', () => {
    const parser = new CrudRequestParser({
      disableSelect: true,
      disableWhere: true,
      disableOrder: true,
      disableRelations: true,
      disableLimit: true,
      disableOffset: true,
    });

    const parameters = parser.getOpenAPIParameters();

    expect(parameters).toHaveLength(0);
  });
});

describe('parse', () => {
  test('should parse a complete query string', () => {
    const query = {
      fields: 'id,name',
      join: ['posts||id,title', 'comments'],
      sort: ['id,DESC', 'name,ASC', 'description'],
      s: JSON.stringify({ id: 10 }),
      limit: '25',
      page: '1',
    };

    const request = new CrudRequestParser().parse(query);

    expect(request).toEqual({
      select: [
        { field: ['id'] }, { field: ['name'] },
        { field: ['posts', 'id'] }, { field: ['posts', 'title'] },
      ],
      relations: [{ field: ['posts'] }, { field: ['comments'] }],
      order: [
        { field: ['id'], order: 'DESC' },
        { field: ['name'], order: 'ASC' },
        { field: ['description'], order: 'ASC' },
      ],
      where: {
        and: [{ field: ['id'], operator: CrudRequestWhereOperator.EQ, value: 10 }],
      },
      limit: 25,
      page: 1,
      offset: undefined,
    } satisfies CrudRequest);
  });

  test('should parse a legacy parameters', () => {
    const query = {
      select: 'id,name',
      filter: ['id||$gt||10', 'isActive||$eq||true'],
      or: ['id||$lt||5', 'isActive||$eq||false'],
      per_page: '25',
      offset: '0',
    };

    const request = new CrudRequestParser().parse(query);

    expect(request).toEqual({
      select: [{ field: ['id'] }, { field: ['name'] }],
      relations: [],
      order: [],
      where: {
        and: [{
          or: [
            {
              and: [
                { field: ['id'], operator: CrudRequestWhereOperator.GT, value: '10' },
                { field: ['isActive'], operator: CrudRequestWhereOperator.EQ, value: 'true' },
              ],
            },
            {
              and: [
                { field: ['id'], operator: CrudRequestWhereOperator.LT, value: '5' },
                { field: ['isActive'], operator: CrudRequestWhereOperator.EQ, value: 'false' },
              ],
            },
          ],
        }],
      },
      limit: 25,
      offset: 0,
      page: undefined,
    } satisfies CrudRequest);
  });

  test('should not parse disabled parameters', () => {
    const query = {
      fields: 'id,name',
      join: ['posts||id,title', 'comments'],
      sort: 'id,DESC',
      s: JSON.stringify({ id: 10 }),
      limit: '25',
      page: '1',
    };

    const parser = new CrudRequestParser({
      disableSelect: true,
      disableWhere: true,
      disableOrder: true,
      disableRelations: true,
      disableLimit: true,
      disableOffset: true,
    });

    const request = parser.parse(query);

    expect(request).toEqual({
      select: [],
      relations: [],
      order: [],
      where: {
        and: [],
      },
      limit: undefined,
      page: undefined,
      offset: undefined,
    } satisfies CrudRequest);
  });
});
