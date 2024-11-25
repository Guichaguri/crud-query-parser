import { CrudRequestParser } from '../../src/parsers/crud';
import { DynamoDBQueryAdapter } from '../../src/adapters/dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

interface UserEntity {
  id: number;
  name: string;
  email: string;
}

const parser = new CrudRequestParser();
const queryBuilder = new DynamoDBQueryAdapter({
  client: new DynamoDBClient(),
  tableName: 'test',
  partitionKey: 'id',
});

async function run() {
  const qs: Record<string, string | string[]> = {};

  qs['s'] = JSON.stringify({ name: { $cont: 'Foo', $notnull: true }, isActive: true });
  qs['fields'] = 'id,name';
  qs['limit'] = '5';

  const request = parser.parse(qs);

  console.dir(request, { depth: 5 });

  const data = await queryBuilder.getMany<UserEntity>({}, request);

  console.dir(data, { depth: 5 });
}

run();
