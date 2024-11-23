import "reflect-metadata";
import { AppDataSource } from './data-source';
import { PostEntity } from './entities/post.entity';
import { CrudRequestParser } from '../../src/parsers/crud';
import { TypeOrmQueryAdapter } from '../../src/adapters/typeorm';
import { setupDatabase } from './setup';

const parser = new CrudRequestParser();
const queryBuilder = new TypeOrmQueryAdapter();

const repository = AppDataSource.getRepository(PostEntity);

async function run() {
  await setupDatabase();

  const qs: Record<string, string | string[]> = {};

  qs['s'] = JSON.stringify({ title: { $contL: 'hello', $notnull: true }, isActive: true });
  qs['fields'] = 'id,title,category.name';
  qs['join'] = 'category';
  qs['limit'] = '5';

  const request = parser.parse(qs);

  console.dir(request, { depth: 5 });

  const data = await queryBuilder.getMany<PostEntity>(repository.createQueryBuilder(), request);

  console.dir(data, { depth: 5 });
}

run();
