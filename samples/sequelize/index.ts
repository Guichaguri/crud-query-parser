import { SequelizeQueryAdapter } from '../../src/adapters/sequelize';
import { CrudRequestParser } from '../../src/parsers/crud';
import { setup } from './setup';
import { Post } from './schema';

const parser = new CrudRequestParser();
const adapter = new SequelizeQueryAdapter(Post);

async function run() {
  await setup();

  const qs: Record<string, string | string[]> = {};

  qs['s'] = JSON.stringify({ title: { $contL: 'hello', $notnull: true }, isActive: true });
  qs['fields'] = 'id,title,Category.name';
  qs['join'] = 'Category';
  qs['limit'] = '5';

  const request = parser.parse(qs);

  console.dir(request, { depth: 5 });

  const result = await adapter.getMany({}, request);

  console.log(JSON.stringify(result, null, 2));
}

run().catch(error => console.error(error));
