# DynamoDB Adapter

The DynamoDB Adapter generates and executes `Query`, `Scan` and `GetItem` commands through the AWS SDK v3.

It requires both [@aws-sdk/client-dynamodb](https://www.npmjs.com/package/@aws-sdk/client-dynamodb) and [@aws-sdk/util-dynamodb](https://www.npmjs.com/package/@aws-sdk/util-dynamodb) 3.x.x

## Getting Started

Install the AWS SDK for DynamoDB

```sh
npm i @aws-sdk/client-dynamodb @aws-sdk/util-dynamodb
```

Here's an example on how to use it:

```ts
import { DynamoDBQueryAdapter } from 'crud-query-parser/adapters/dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

const client = new DynamoDBClient({
  region: 'us-east-1',
  // ...credentials
});

const adapter = new DynamoDBQueryAdapter({
  client: client,
  tableName: 'posts',
  partitionKey: 'categoryId',
  sortKey: 'id',
  
  // Whether it should fetch the total count of items in getMany()
  disableCount: false,

  // Whether it should error when scan is the only possible command to complete the request
  disableScan: false,
});

// Then, you can pass a partial Query/Scan/GetItem input to it:
const result = await adapter.getMany<Post>({}, crudRequest);

// Or...
// const result = await adapter.getOne<Post>({}, crudRequest);
```

## Commands

The command is determined by whether the top-level where conditions contain primary keys.

- If the full primary key is present but not any other filter, it will run the `GetItem` command.
- If at least the partition key is present, it will run the `Query` command.
- Otherwise, it will run the `Scan` command.

The "primary key" is either a combination of the partition key and the sort key, or just the partition key if the table doesn't have a sort key.

As the `Scan` command can be slow and expensive, it can be disabled by setting the `disableScan` option.

The `getMany()` method also fetches the total count of items which costs extra read capacity units. You can disable it by setting the `disableCount` option.

## Caveats

- Pagination is not supported (both `page` and `offset` parameters are ignored)
- The following where operators are not supported in DynamoDB:
  - Any case-insensitive operator (e.g. `EQ_LOWER`, `CONTAINS_LOWER`, `STARTS_LOWER` and so on)
  - Ends With (`ENDS`)
- Relations are completely ignored as DynamoDB is a NoSQL database.
- Ordering is only supported for the sort key in a `Query` command.
