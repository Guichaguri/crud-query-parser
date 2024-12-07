import { CrudRequestParser } from '../../src/parsers/crud';
import { MongoQueryAdapter } from '../../src/adapters/mongodb';
import { client, posts } from './schema';
import { setup } from './setup';

const parser = new CrudRequestParser();
const adapter = new MongoQueryAdapter();

async function run() {
  await setup();

  const qs: Record<string, string | string[]> = {};

  qs['s'] = JSON.stringify({ title: { $notnull: true }, isActive: true });
  qs['fields'] = 'title,author.name';
  qs['limit'] = '5';

  const request = parser.parse(qs);

  console.dir(request, { depth: 5 });

  const data = await adapter.getMany(posts, request);

  console.dir(data, { depth: 5 });
}

run()
  .finally(() => client.close())
  .catch(error => console.error(error));
