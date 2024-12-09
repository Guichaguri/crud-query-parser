import * as mongoose from 'mongoose';
import { CrudRequestParser } from '../../src/parsers/crud';
import { MongooseQueryAdapter } from '../../src/adapters/mongodb';
import { Post } from './schema';
import { setup } from './setup';

const parser = new CrudRequestParser();
const adapter = new MongooseQueryAdapter();

async function run() {
  await setup();

  const qs: Record<string, string | string[]> = {};

  qs['s'] = JSON.stringify({ title: { $notnull: true }, isActive: true });
  qs['fields'] = 'title,author.name';
  qs['limit'] = '5';

  const request = parser.parse(qs);

  console.dir(request, { depth: 5 });

  const data = await adapter.getMany(Post.find(), request);

  console.dir(data, { depth: 5 });
}

run()
  .finally(() => mongoose.disconnect())
  .catch(error => console.error(error));
