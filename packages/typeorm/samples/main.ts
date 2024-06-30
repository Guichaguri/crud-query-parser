import "reflect-metadata";
import { AppDataSource } from './data-source';
import { PostEntity } from './entities/post.entity';
import { CrudRequestParser } from '@crud-query-parser/core/parsers/crud';
import { TypeormQueryBuilder } from '../src/typeorm.query-builder';

const parser = new CrudRequestParser();
const queryBuilder = new TypeormQueryBuilder();

const repository = AppDataSource.getRepository(PostEntity);

async function run() {
  await AppDataSource.initialize();

  const qs: Record<string, string> = {};

  qs['s'] = JSON.stringify({ isActive: true });
  qs['limit'] = '5';

  const request = parser.parse(qs);
  const data = await queryBuilder.getMany<PostEntity>(repository.createQueryBuilder(), request);

  console.dir(data);
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
