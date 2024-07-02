import "reflect-metadata";
import { AppDataSource } from './data-source';
import { PostEntity } from './entities/post.entity';
import { CrudRequestParser } from '../../src/parsers/crud';
import { TypeOrmQueryAdapter } from '../../src/adapters/typeorm';
import { CategoryEntity } from './entities/category.entity';

const parser = new CrudRequestParser();
const queryBuilder = new TypeOrmQueryAdapter();

const repository = AppDataSource.getRepository(PostEntity);

async function setupDatabase(): Promise<void> {
  await AppDataSource.initialize();

  const categoryRepository = AppDataSource.getRepository(CategoryEntity);

  await repository.clear();
  await categoryRepository.clear();

  await categoryRepository.save(new CategoryEntity({
    id: 1,
    name: 'Games',
  }));

  await repository.save(new PostEntity({
    id: 1,
    categoryId: 1,
    title: 'Hello World',
    content: 'This is a sample post',
    isActive: true,
  }));
}

async function run() {
  await setupDatabase();

  const qs: Record<string, string> = {};

  qs['s'] = JSON.stringify({ title: { $contL: 'hello' }, isActive: true });
  qs['fields'] = 'id,title';
  qs['join'] = 'category';
  qs['limit'] = '5';

  const request = parser.parse(qs);

  console.dir(request, { depth: 5 });

  const data = await queryBuilder.getMany<PostEntity>(repository.createQueryBuilder(), request);

  console.dir(data, { depth: 5 });
}

run();

//samples();

/*repository.find({
  select: {
    content: true,
    category: {
      name: true,
    }
  },
  where: {
    id: 2,
    or: [

    ]
  },
  relations: {
    category: true,
  },
  order: {
    id: 'DESC',
  },

});*/

/*repository.findOneBy({
  category: {
    name: 'Oi',
  }
})*/

/*

filterGetMany<PostEntity>({
  select: ['']
}, {
  filter: {
    select: {
      includes: {
        content: true,
        title: true,
        category: {
          name: true,
        }
      }
    },
    relations: {
      excludes: {
        category: true,
      }
    }
  }
});
*/
