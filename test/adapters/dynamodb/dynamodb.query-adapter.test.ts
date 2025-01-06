import { beforeEach, describe, expect, test, vi } from 'vitest';
import { DynamoDBQueryAdapter } from '../../../src/adapters/dynamodb';
import { CrudRequest, CrudRequestWhereOperator, GetManyResult } from '../../../src';
import { DynamoDBClient, GetItemCommand, QueryCommand, ScanCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { createCrudRequest } from '../../../src/utils/objects';

let mockedResults: any[] | undefined = undefined;

const sendCommandMock = vi.fn().mockImplementation((cmd) => {
  if (cmd instanceof GetItemCommand)
    return { Item: mockedResults?.[0] ?? null };

  if (cmd instanceof QueryCommand)
    return { Items: mockedResults, Count: mockedResults?.length };

  if (cmd instanceof ScanCommand)
    return { Items: mockedResults, Count: mockedResults?.length };
});

const client: DynamoDBClient = { send: sendCommandMock } as any;

const adapter = new DynamoDBQueryAdapter({
  client: client,
  tableName: 'test',
  partitionKey: 'category.id',
  sortKey: 'id',
});

const emptyRequest: CrudRequest = createCrudRequest();

const complexRequest: CrudRequest = {
  select: [{ field: ['id'] }, { field: ['title'] }, { field: ['category', 'name'] }],
  relations: [],
  order: [{ field: ['id'], order: 'DESC' }],
  where: {
    and: [
      {
        field: ['title'],
        operator: CrudRequestWhereOperator.NOT_NULL,
        value: null,
      },
      {
        field: ['category', 'id'],
        operator: CrudRequestWhereOperator.EQ,
        value: 3,
      },
      {
        field: ['id'],
        operator: CrudRequestWhereOperator.LT,
        value: 100,
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
            value: 2,
          },
        ],
      },
    ],
  },
  limit: 25,
};

const exactRequest: CrudRequest = {
  ...emptyRequest,
  where: {
    and: [
      { field: ['id'], operator: CrudRequestWhereOperator.EQ, value: 1 },
      { field: ['category', 'id'], operator: CrudRequestWhereOperator.EQ, value: 4 },
    ],
  },
};

const exactWithoutSortKeyRequest: CrudRequest = {
  ...emptyRequest,
  where: {
    and: [
      { field: ['id'], operator: CrudRequestWhereOperator.EQ, value: 1 },
    ],
  },
};

beforeEach(() => {
  sendCommandMock.mockClear();
});

describe('build', () => {
  test('should build an empty query', () => {
    const query = adapter.build({}, emptyRequest);

    expect(query).toEqual({
      TableName: 'test',
    });
  });

  test('should build a complex query', () => {
    const query = adapter.build({}, complexRequest);

    expect(query).toEqual({
      TableName: 'test',
      ProjectionExpression: '#id, #title, #category_name',
      FilterExpression: '(attribute_exists(#title) AND #title <> :null) AND (#isActive = :isActive OR #id <= :id)',
      KeyConditionExpression: '#category_id = :category_id AND #id < :id1',
      Limit: 25,
      ScanIndexForward: false,
      ExpressionAttributeNames: {
        '#category_id': 'category.id',
        '#category_name': 'category.name',
        '#id': 'id',
        '#isActive': 'isActive',
        '#title': 'title',
      },
      ExpressionAttributeValues: {
        ':category_id': { N: '3' },
        ':id': { N: '2' },
        ':id1': { N: '100' },
        ':isActive': { BOOL: true },
        ':null': { NULL: true },
      },
    });
  });

  test('should build a exact query', () => {
    const query = adapter.build({}, exactRequest);

    expect(query).toEqual({
      TableName: 'test',
      Key: {
        'category.id': { N: '4' },
        'id': { N: '1' },
      },
    });
  });

  test('should build a exact query without sort key', () => {
    const adapter = new DynamoDBQueryAdapter({
      client,
      tableName: 'test',
      partitionKey: 'id',
    });

    const query = adapter.build({}, exactWithoutSortKeyRequest);

    expect(query).toEqual({
      TableName: 'test',
      Key: {
        'id': { N: '1' },
      },
    });
  });

  test('should build a DynamoDB Query command', () => {
    const query = adapter.buildQuery({}, {
      ...emptyRequest,
      where: { field: ['id'], operator: CrudRequestWhereOperator.EQ, value: 10 },
    });

    expect(query).toEqual({
      TableName: 'test',
      KeyConditionExpression: '#id = :id',
      ExpressionAttributeNames: { '#id': 'id' },
      ExpressionAttributeValues: { ':id': { N: '10' } },
    });
  });

  test('should build a DynamoDB Scan command', () => {
    const query = adapter.buildScan({}, emptyRequest);

    expect(query).toEqual({
      TableName: 'test',
    });
  });

  test('should build a DynamoDB GetItem command', () => {
    const query = adapter.buildGetItem({ Key: {} }, {
      ...emptyRequest,
      where: {
        and: [
          { field: ['id'], operator: CrudRequestWhereOperator.EQ, value: 10 },
          { field: ['category.id'], operator: CrudRequestWhereOperator.EQ, value: 3 },
          { field: ['id'], operator: CrudRequestWhereOperator.LT, value: 100 },
        ],
      },
    });

    expect(query).toEqual({
      TableName: 'test',
      Key: { id: { N: '10' } },
    });
  });

  test('should build with an existing DynamoDB Query command', () => {
    const query = adapter.build({
      ProjectionExpression: '#category_id',
      KeyConditionExpression: '#category_id = :category_id',
      ExpressionAttributeNames: { '#category_id': 'category.id' },
      ExpressionAttributeValues: { ':category_id': { N: '3' } },
    }, {
      ...emptyRequest,
      select: [{ field: ['id'] }],
    });

    expect(query).toEqual({
      TableName: 'test',
      ProjectionExpression: '#category_id, #id',
      KeyConditionExpression: '#category_id = :category_id',
      ExpressionAttributeNames: { '#category_id': 'category.id', '#id': 'id' },
      ExpressionAttributeValues: { ':category_id': { N: '3' } },
    });
  });

  test('should build with an existing DynamoDB GetItem command', () => {
    const query = adapter.build({
      Key: { id: { N: '10' } },
    }, emptyRequest);

    expect(query).toEqual({
      TableName: 'test',
      Key: { id: { N: '10' } },
    });
  });
});

describe('getMany', () => {
  test('should send a Scan command on an empty query', async () => {
    mockedResults = [{ foo: { S: 'bar' } }, { foo: { S: 'baz' } }];

    const result = await adapter.getMany({}, emptyRequest);

    expect(result).toEqual({
      data: [{ foo: 'bar' }, { foo: 'baz' }],
      count: 2,
      page: 1,
      pageCount: 1,
      total: 2,
    } satisfies GetManyResult<unknown>);
    expect(sendCommandMock).toHaveBeenCalledTimes(2);
    expect(sendCommandMock.mock.calls[0][0]).toBeInstanceOf(ScanCommand);
    expect(sendCommandMock.mock.calls[1][0]).toBeInstanceOf(ScanCommand);
  });

  test('should send a Query command on a complex query', async () => {
    mockedResults = [{ foo: { S: 'bar' } }, { foo: { S: 'baz' } }];

    const result = await adapter.getMany({}, complexRequest);

    expect(result).toEqual({
      data: [{ foo: 'bar' }, { foo: 'baz' }],
      count: 2,
      page: 1,
      pageCount: 1,
      total: 2,
    } satisfies GetManyResult<unknown>);
    expect(sendCommandMock).toHaveBeenCalledTimes(2);
    expect(sendCommandMock.mock.calls[0][0]).toBeInstanceOf(QueryCommand);
    expect(sendCommandMock.mock.calls[1][0]).toBeInstanceOf(QueryCommand);
  });

  test('should send a GetItem command on an exact query', async () => {
    mockedResults = [];

    const result = await adapter.getMany({}, exactRequest);

    expect(result).toEqual({
      data: [],
      count: 0,
      page: 1,
      pageCount: 0,
      total: 0,
    } satisfies GetManyResult<unknown>);
    expect(sendCommandMock).toHaveBeenCalledTimes(1);
    expect(sendCommandMock.mock.calls[0][0]).toBeInstanceOf(GetItemCommand);
  });

  test('should send a GetItem command on a exact query without sort key', async () => {
    const adapter = new DynamoDBQueryAdapter({
      client,
      tableName: 'test',
      partitionKey: 'id',
    });

    mockedResults = [{ foo: { S: 'bar' } }, { foo: { S: 'baz' } }];

    const result = await adapter.getMany({}, exactWithoutSortKeyRequest);

    expect(result).toEqual({
      data: [{ foo: 'bar' }],
      count: 1,
      page: 1,
      pageCount: 1,
      total: 1,
    } satisfies GetManyResult<unknown>);
    expect(sendCommandMock).toHaveBeenCalledTimes(1);
    expect(sendCommandMock.mock.calls[0][0]).toBeInstanceOf(GetItemCommand);
  });

  test('should throw when the Scan command is disabled', async () => {
    const adapter = new DynamoDBQueryAdapter({
      client: client,
      tableName: 'test',
      partitionKey: 'id',
      disableScan: true,
    });

    await expect(async () => {
      await adapter.getMany({}, emptyRequest);
    }).rejects.toBeInstanceOf(Error);
  });

  test('should return empty with a invalid Scan response', async () => {
    mockedResults = undefined;

    const result = await adapter.getMany({}, emptyRequest);

    expect(result).toEqual({
      data: [],
      count: 0,
      page: 1,
      pageCount: 0,
      total: 0,
    } satisfies GetManyResult<unknown>);
    expect(sendCommandMock).toHaveBeenCalledTimes(2);
    expect(sendCommandMock.mock.calls[0][0]).toBeInstanceOf(ScanCommand);
    expect(sendCommandMock.mock.calls[1][0]).toBeInstanceOf(ScanCommand);
  });

  test('should return empty with a invalid Query response', async () => {
    mockedResults = undefined;

    const result = await adapter.getMany({}, complexRequest);

    expect(result).toEqual({
      data: [],
      count: 0,
      page: 1,
      pageCount: 0,
      total: 0,
    } satisfies GetManyResult<unknown>);
    expect(sendCommandMock).toHaveBeenCalledTimes(2);
    expect(sendCommandMock.mock.calls[0][0]).toBeInstanceOf(QueryCommand);
    expect(sendCommandMock.mock.calls[1][0]).toBeInstanceOf(QueryCommand);
  });
});

describe('getOne', () => {
  test('should send a Scan command on an empty query', async () => {
    mockedResults = [{ foo: { S: 'bar' } }, { foo: { S: 'baz' } }];

    const entity = await adapter.getOne({}, emptyRequest);

    expect(entity).toEqual({ foo: 'bar' });
    expect(sendCommandMock).toHaveBeenCalledTimes(1);
    expect(sendCommandMock.mock.calls[0][0]).toBeInstanceOf(ScanCommand);
  });

  test('should send a Query command on a complex query', async () => {
    mockedResults = [{ foo: { S: 'bar' } }, { foo: { S: 'baz' } }];

    const entity = await adapter.getOne({}, complexRequest);

    expect(entity).toEqual({ foo: 'bar' });
    expect(sendCommandMock).toHaveBeenCalledTimes(1);
    expect(sendCommandMock.mock.calls[0][0]).toBeInstanceOf(QueryCommand);
  });

  test('should send a GetItem command on an exact query', async () => {
    mockedResults = [{ foo: { S: 'bar' } }, { foo: { S: 'baz' } }];

    const entity = await adapter.getOne({}, exactRequest);

    expect(entity).toEqual({ foo: 'bar' });
    expect(sendCommandMock).toHaveBeenCalledTimes(1);
    expect(sendCommandMock.mock.calls[0][0]).toBeInstanceOf(GetItemCommand);
  });

  test('should send a GetItem command on a exact query without sort key', async () => {
    const adapter = new DynamoDBQueryAdapter({
      client,
      tableName: 'test',
      partitionKey: 'id',
    });

    mockedResults = [{ foo: { S: 'bar' } }, { foo: { S: 'baz' } }];

    const entity = await adapter.getOne({}, exactWithoutSortKeyRequest);

    expect(entity).toEqual({ foo: 'bar' });
    expect(sendCommandMock).toHaveBeenCalledTimes(1);
    expect(sendCommandMock.mock.calls[0][0]).toBeInstanceOf(GetItemCommand);
  });

  test('should return null when no entity is found', async () => {
    mockedResults = [];

    const entity = await adapter.getOne({}, emptyRequest);

    expect(entity).toBeNull();
  });
});

describe('conditions', () => {
  test('should return valid conditions', () => {
    const ops: [CrudRequestWhereOperator, string, any, object][] = [
      [CrudRequestWhereOperator.EQ, '#id = :id', 10, { ':id': 10 }],
      [CrudRequestWhereOperator.NEQ, '#id <> :id', 10, { ':id': 10 }],
      [CrudRequestWhereOperator.LT, '#id < :id', 10, { ':id': 10 }],
      [CrudRequestWhereOperator.GT, '#id > :id', 10, { ':id': 10 }],
      [CrudRequestWhereOperator.LTE, '#id <= :id', 10, { ':id': 10 }],
      [CrudRequestWhereOperator.GTE, '#id >= :id', 10, { ':id': 10 }],
      [CrudRequestWhereOperator.STARTS, 'begins_with(#id, :id)', 'foo', { ':id': 'foo' }],
      [CrudRequestWhereOperator.CONTAINS, 'contains(#id, :id)', 'foo', { ':id': 'foo' }],
      [CrudRequestWhereOperator.NOT_CONTAINS, 'NOT contains(#id, :id)', 'foo', { ':id': 'foo' }],
      [CrudRequestWhereOperator.BETWEEN, '#id BETWEEN :id_start AND :id_end', [2, 4], { ':id_start': 2, ':id_end': 4 }],
      [CrudRequestWhereOperator.IN, '#id IN (:id_0, :id_1)', [2, 4], { ':id_0': 2, ':id_1': 4 }],
      [CrudRequestWhereOperator.NOT_IN, 'NOT (#id IN (:id_0, :id_1))', [2, 4], { ':id_0': 2, ':id_1': 4 }],
      [CrudRequestWhereOperator.IS_NULL, '(attribute_not_exists(#id) OR #id = :null)', null, { ':null': null }],
      [CrudRequestWhereOperator.NOT_NULL, '(attribute_exists(#id) AND #id <> :null)', null, { ':null': null }],
    ];

    for (const [op, where, value, params] of ops) {
      const query = adapter.build({}, {
        ...emptyRequest,
        where: {
          field: ['id'],
          operator: op,
          value: value,
        },
      });

      expect(query.FilterExpression, `${op} expression`).toBe(where);
      expect(query.ExpressionAttributeNames, `${op} attribute names`).toEqual({ '#id': 'id' });
      expect(query.ExpressionAttributeValues, `${op} attribute values`).toEqual(marshall(params));
    }
  });

  test('should throw with invalid operators', () => {
    const ops = [
      CrudRequestWhereOperator.ENDS,
      CrudRequestWhereOperator.EQ_LOWER,
      CrudRequestWhereOperator.NEQ_LOWER,
      CrudRequestWhereOperator.CONTAINS_LOWER,
      CrudRequestWhereOperator.NOT_CONTAINS_LOWER,
      CrudRequestWhereOperator.STARTS_LOWER,
      CrudRequestWhereOperator.ENDS_LOWER,
      CrudRequestWhereOperator.IN_LOWER,
      CrudRequestWhereOperator.NOT_IN_LOWER,
      'invalid' as any,
    ];

    for (const op of ops) {
      expect(() => {
        adapter.build({}, {
          ...emptyRequest,
          where: { field: ['id'], operator: op, value: '' }
        })
      }, op).toThrow(Error);
    }
  });

  test('should throw with invalid values', () => {
    const ops: [CrudRequestWhereOperator, any][] = [
      [CrudRequestWhereOperator.BETWEEN, []],
      [CrudRequestWhereOperator.BETWEEN, 'foo'],
      [CrudRequestWhereOperator.IN, []],
      [CrudRequestWhereOperator.NOT_IN, []],
      [CrudRequestWhereOperator.IS_NULL, 'foo'],
      [CrudRequestWhereOperator.NOT_NULL, 'foo'],
    ];

    for (const [op, value] of ops) {
      expect(() => {
        adapter.build({}, {
          ...emptyRequest,
          where: { field: ['id'], operator: op, value: value }
        })
      }, op).toThrow(Error);
    }
  });

  test('should append to an existing filter', () => {
    const query = adapter.build({
      FilterExpression: '#type = :type',
      ExpressionAttributeNames: { '#type': 'type' },
      ExpressionAttributeValues: { ':type': { N: '2' } },
    }, {
      ...emptyRequest,
      where: {
        or: [
          { field: ['name'], operator: CrudRequestWhereOperator.EQ, value: 'Foo' },
        ],
      },
    });

    expect(query).toEqual({
      TableName: 'test',
      FilterExpression: '(#type = :type) AND (#name = :name)',
      ExpressionAttributeNames: { '#type': 'type', '#name': 'name' },
      ExpressionAttributeValues: { ':type': { N: '2' }, ':name': { S: 'Foo' } },
    });
  });

  test('should prepend keys to existing filter', () => {
    const query = adapter.build({
      FilterExpression: '#type = :type',
      ExpressionAttributeNames: { '#type': 'type' },
      ExpressionAttributeValues: { ':type': { N: '2' } },
    }, {
      ...emptyRequest,
      where: {
        or: [
          { field: ['id'], operator: CrudRequestWhereOperator.EQ, value: 10 },
        ],
      },
    });

    expect(query).toEqual({
      TableName: 'test',
      FilterExpression: '#id = :id AND (#type = :type)',
      ExpressionAttributeNames: { '#type': 'type', '#id': 'id' },
      ExpressionAttributeValues: { ':type': { N: '2' }, ':id': { N: '10' } },
    });
  });
});

describe('conflicts', () => {
  test('should avoid attribute name conflicts', () => {
    const query = adapter.build({
      ExpressionAttributeNames: {
        '#name': 'another_thing',
      },
    }, {
      ...emptyRequest,
      select: [{ field: ['name'] }, { field: ['spécial chars'] }, { field: ['sp-cial chars'] }],
    });

    expect(query.ExpressionAttributeNames).toEqual({
      '#name': 'another_thing',
      '#name1': 'name',
      '#sp_cial_chars': 'spécial chars',
      '#sp_cial_chars1': 'sp-cial chars',
    });
  });

  test('should avoid parameter name conflicts', () => {
    const query = adapter.build({
      ExpressionAttributeValues: {
        ':name': { S: 'another_thing' },
      },
    }, {
      ...emptyRequest,
      where: {
        or: [
          { field: ['name'], operator: CrudRequestWhereOperator.EQ, value: 'foo' },
          { field: ['spécial chars'], operator: CrudRequestWhereOperator.EQ, value: 'bar' },
          { field: ['sp-cial chars'], operator: CrudRequestWhereOperator.EQ, value: 'baz' },
        ],
      },
    });

    expect(query.ExpressionAttributeValues).toEqual({
      ':name': { S: 'another_thing' },
      ':name1': { S: 'foo' },
      ':sp_cial_chars': { S: 'bar' },
      ':sp_cial_chars1': { S: 'baz' },
    });
  });
});
