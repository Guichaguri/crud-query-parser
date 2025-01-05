import { Brackets, Column, DataSource, Entity, ManyToOne, OneToMany, PrimaryColumn, SelectQueryBuilder } from 'typeorm';
import { beforeAll, describe, expect, test } from 'vitest';
import { TypeOrmQueryAdapter } from '../../../src/adapters/typeorm';
import { CrudRequest, CrudRequestWhereOperator } from '../../../src';

@Entity('posts')
class PostEntity {
  @PrimaryColumn({ type: 'int' })
  public id!: number;

  @Column({ type: 'varchar', length: 150 })
  public title!: string;

  @Column({ type: 'text' })
  public content!: string;

  @Column({ type: 'int' })
  public categoryId!: number;

  @Column({ type: 'boolean', default: true })
  public isActive!: boolean;

  @ManyToOne(() => CategoryEntity, entity => entity.posts)
  public category!: CategoryEntity;

  constructor(entity?: Partial<PostEntity>) {
    Object.assign(this, { ...entity });
  }
}

@Entity('category')
class CategoryEntity {
  @PrimaryColumn({ type: 'int' })
  public id!: number;

  @Column({ type: 'varchar', length: 150 })
  public name!: string;

  @OneToMany(() => PostEntity, entity => entity.category)
  public posts!: PostEntity[];

  constructor(entity?: Partial<CategoryEntity>) {
    Object.assign(this, { ...entity });
  }
}

const adapter = new TypeOrmQueryAdapter();

const dataSource = new DataSource({
  type: "better-sqlite3",
  database: ':memory:',
  synchronize: true,
  entities: [PostEntity, CategoryEntity],
});

const postRepository = dataSource.getRepository(PostEntity);
const categoryRepository = dataSource.getRepository(CategoryEntity);

beforeAll(async () => {
  await dataSource.initialize();

  await categoryRepository.save([
    new CategoryEntity({ id: 1, name: 'Finance' }),
    new CategoryEntity({ id: 2, name: 'Sports' }),
    new CategoryEntity({ id: 3, name: 'Fashion' }),
  ]);

  await postRepository.save([
    new PostEntity({ id: 1, title: 'Foo', categoryId: 1, content: '', isActive: true }),
    new PostEntity({ id: 2, title: 'Bar', categoryId: 1, content: '', isActive: true }),
    new PostEntity({ id: 3, title: 'Hello', categoryId: 2, content: '', isActive: false }),
    new PostEntity({ id: 4, title: 'World', categoryId: 2, content: '', isActive: true }),
    new PostEntity({ id: 5, title: 'foo', categoryId: 3, content: '', isActive: true }),
  ]);
});

const emptyRequest: CrudRequest = {
  select: [],
  relations: [],
  order: [],
  where: { and: [] },
};

const complexRequest: CrudRequest = {
  select: [{ field: ['id'] }, { field: ['title'] }, { field: ['category', 'name'] }],
  relations: [{ field: ['category'] }],
  order: [{ field: ['id'], order: 'DESC' }],
  where: {
    and: [
      {
        field: ['title'],
        operator: CrudRequestWhereOperator.NOT_NULL,
        value: null,
      },
      {
        field: ['category', 'name'],
        operator: CrudRequestWhereOperator.EQ,
        value: 'Sports',
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
            value: 1,
          },
        ],
      },
    ],
  },
  limit: 25,
  page: 1,
};

const noResultsRequest: CrudRequest = {
  select: [],
  relations: [{ field: ['category'], alias: 'category' }],
  order: [],
  where: {
    and: [
      {
        field: ['category', 'name'],
        operator: CrudRequestWhereOperator.CONTAINS_LOWER,
        value: 'Music',
      },
    ],
  },
};

describe('build', () => {
  test('should not modify the builder with an empty query', () => {
    const emptyQuery = postRepository.createQueryBuilder().getQuery();

    const qb = adapter.build(postRepository.createQueryBuilder(), emptyRequest);

    expect(qb.getQuery()).toBe(emptyQuery);
  });

  test('should create a complex query', () => {
    const qb = adapter.build(postRepository.createQueryBuilder(), complexRequest);

    const expected = postRepository.createQueryBuilder()
      .select(['PostEntity.id', 'PostEntity.title', 'PostEntity_category.name'])
      .leftJoin('PostEntity.category', 'PostEntity_category')
      .addOrderBy('PostEntity.id', 'DESC')
      .andWhere(new Brackets(wb => {
        wb
          .andWhere('PostEntity.title IS NOT NULL')
          .andWhere('PostEntity_category.name = :req_name_0', { req_name_0: 'Sports' })
          .andWhere(new Brackets(wb2 => {
            wb2
              .orWhere('PostEntity.isActive = :req_isActive_0', { req_isActive_0: true })
              .orWhere('PostEntity.id <= :req_id_0', { req_id_0: 1 });
          }));
      }))
      .limit(25)
      .offset(25)
      .getQuery();

    expect(qb.getQuery()).toBe(expected);
  });

  test('should throw if main alias is not defined', () => {
    expect(() => {
      // construct a SelectQueryBuilder by hand, which will not have a main alias defined
      adapter.build(new SelectQueryBuilder(dataSource), emptyRequest);
    }).toThrow(Error);
  });
});

describe('getOne', () => {
  test('should return first inserted post', async () => {
    const entity = await adapter.getOne(postRepository.createQueryBuilder(), emptyRequest);

    expect(entity).toBeDefined();
    expect(entity!.id).toBe(1);
    expect(entity!.title).toBe('Foo');
    expect(entity!.categoryId).toBe(1);
    expect(entity!.content).toBe('');
    expect(entity!.isActive).toBe(true);
    expect(entity!.category).toBeUndefined();
  });

  test('should return last sports post', async () => {
    const entity = await adapter.getOne(postRepository.createQueryBuilder(), complexRequest);

    expect(entity).toBeDefined();
    expect(entity!.id).toBe(4);
    expect(entity!.title).toBe('World');
    expect(entity!.categoryId).toBeUndefined();
    expect(entity!.content).toBeUndefined();
    expect(entity!.isActive).toBeUndefined();
    expect(entity!.category).toBeDefined();
    expect(entity!.category!.id).toBeUndefined();
    expect(entity!.category!.name).toBe('Sports');
  });

  test('should return null', async () => {
    const entity = await adapter.getOne(postRepository.createQueryBuilder(), noResultsRequest);

    expect(entity).toBeNull();
  });
});

describe('getMany', () => {
  test('should return all posts', async () => {
    const result = await adapter.getMany(postRepository.createQueryBuilder(), emptyRequest);

    expect(result.data).toHaveLength(5);
    expect(result.page).toBe(1);
    expect(result.count).toBe(5);
    expect(result.total).toBe(5);
    expect(result.pageCount).toBe(1);
  });

  test('should return active sports posts', async () => {
    const result = await adapter.getMany(postRepository.createQueryBuilder(), complexRequest);

    expect(result.data).toHaveLength(0);
    expect(result.page).toBe(2);
    expect(result.count).toBe(0);
    expect(result.total).toBe(1);
    expect(result.pageCount).toBe(1);
  });

  test('should return nothing', async () => {
    const result = await adapter.getMany(postRepository.createQueryBuilder(), noResultsRequest);

    expect(result.data).toHaveLength(0);
    expect(result.page).toBe(1);
    expect(result.count).toBe(0);
    expect(result.total).toBe(0);
    expect(result.pageCount).toBe(0);
  });
});

describe('validateField', () => {
  test('should ignore invalid fields', () => {
    const adapter = new TypeOrmQueryAdapter({
      invalidFields: {
        select: 'ignore',
        order: 'ignore',
        where: 'ignore',
      },
    });

    const qb = adapter.build(postRepository.createQueryBuilder(), {
      select: [{ field: ['invalid'] }],
      order: [{ field: [], order: 'ASC' }],
      relations: [],
      where: {
        and: [
          {
            field: ['invalid', 'id'],
            operator: CrudRequestWhereOperator.EQ,
            value: 10,
          },
        ],
      },
    });

    const expected = postRepository.createQueryBuilder()
      .select([])
      .getQuery();

    expect(qb.getQuery()).toBe(expected);
  });

  test('should allow unsafe fields', () => {
    const adapter = new TypeOrmQueryAdapter({
      invalidFields: {
        order: 'allow-unsafe',
      },
    });

    const qb = adapter.build(postRepository.createQueryBuilder(), {
      ...emptyRequest,
      order: [{ field: ['non_existent'], order: 'ASC' }],
    });

    const expected = postRepository.createQueryBuilder()
      .addOrderBy('PostEntity.non_existent', 'ASC')
      .getQuery();

    expect(qb.getQuery()).toBe(expected);
  });

  test('should throw on denied fields', () => {
    const adapter = new TypeOrmQueryAdapter({
      invalidFields: {
        select: 'deny',
      },
    });

    expect(() => {
      adapter.build(postRepository.createQueryBuilder(), {
        ...emptyRequest,
        select: [{ field: ['non_existent'] }],
      });
    }).toThrow(Error);
  });

  test('should throw on denied fields by default for where conditions', () => {
    const adapter = new TypeOrmQueryAdapter({
      invalidFields: {},
    });

    expect(() => {
      adapter.build(postRepository.createQueryBuilder(), {
        ...emptyRequest,
        where: {
          field: ['non_existent'],
          operator: CrudRequestWhereOperator.IS_NULL,
          value: null,
        },
      });
    }).toThrow(Error);
  });
});

describe('mapWhereOperators', () => {
  test('should generate numeric operators', () => {
    const ops: [CrudRequestWhereOperator, string][] = [
      [CrudRequestWhereOperator.EQ, 'PostEntity.id = :req_id_0'],
      [CrudRequestWhereOperator.NEQ, 'PostEntity.id != :req_id_0'],
      [CrudRequestWhereOperator.GT, 'PostEntity.id > :req_id_0'],
      [CrudRequestWhereOperator.GTE, 'PostEntity.id >= :req_id_0'],
      [CrudRequestWhereOperator.LT, 'PostEntity.id < :req_id_0'],
      [CrudRequestWhereOperator.LTE, 'PostEntity.id <= :req_id_0'],
    ];

    for (const [op, expectedCondition] of ops) {
      const result = adapter.build(postRepository.createQueryBuilder(), {
        ...emptyRequest,
        where: {
          field: ['id'], operator: op, value: 3,
        },
      });

      const expected = postRepository.createQueryBuilder()
        .andWhere(expectedCondition, { req_id_0: 3 })
        .getQuery();

      expect(result.getQuery(), `id ${op} 3`).toBe(expected);
    }
  });

  test('should generate string operators', () => {
    const ops: [CrudRequestWhereOperator, string][] = [
      [CrudRequestWhereOperator.EQ, 'PostEntity.title = :req_title_0'],
      [CrudRequestWhereOperator.NEQ, 'PostEntity.title != :req_title_0'],
      [CrudRequestWhereOperator.GT, 'PostEntity.title > :req_title_0'],
      [CrudRequestWhereOperator.GTE, 'PostEntity.title >= :req_title_0'],
      [CrudRequestWhereOperator.LT, 'PostEntity.title < :req_title_0'],
      [CrudRequestWhereOperator.LTE, 'PostEntity.title <= :req_title_0'],
      [CrudRequestWhereOperator.CONTAINS, 'PostEntity.title LIKE :req_title_0'],
      [CrudRequestWhereOperator.NOT_CONTAINS, 'PostEntity.title NOT LIKE :req_title_0'],
      [CrudRequestWhereOperator.STARTS, 'PostEntity.title LIKE :req_title_0'],
      [CrudRequestWhereOperator.ENDS, 'PostEntity.title LIKE :req_title_0'],
      [CrudRequestWhereOperator.EQ_LOWER, 'LOWER(PostEntity.title) = :req_title_0'],
      [CrudRequestWhereOperator.NEQ_LOWER, 'LOWER(PostEntity.title) != :req_title_0'],
      [CrudRequestWhereOperator.CONTAINS_LOWER, 'LOWER(PostEntity.title) LIKE :req_title_0'],
      [CrudRequestWhereOperator.NOT_CONTAINS_LOWER, 'LOWER(PostEntity.title) NOT LIKE :req_title_0'],
      [CrudRequestWhereOperator.STARTS_LOWER, 'LOWER(PostEntity.title) LIKE :req_title_0'],
      [CrudRequestWhereOperator.ENDS_LOWER, 'LOWER(PostEntity.title) LIKE :req_title_0'],
    ];

    for (const [op, expectedCondition] of ops) {
      const result = adapter.build(postRepository.createQueryBuilder(), {
        ...emptyRequest,
        where: {
          field: ['title'], operator: op, value: 'sample',
        },
      });

      const expected = postRepository.createQueryBuilder()
        .andWhere(expectedCondition, { req_title_0: 'sample' })
        .getQuery();

      expect(result.getQuery(), `title ${op} sample`).toBe(expected);
    }
  });

  test('should generate ILIKE string operators', () => {
    const adapter = new TypeOrmQueryAdapter({
      ilike: true,
    });

    const ops: [CrudRequestWhereOperator, string][] = [
      [CrudRequestWhereOperator.CONTAINS_LOWER, 'PostEntity.title ILIKE :req_title_0'],
      [CrudRequestWhereOperator.NOT_CONTAINS_LOWER, 'PostEntity.title NOT ILIKE :req_title_0'],
      [CrudRequestWhereOperator.STARTS_LOWER, 'PostEntity.title ILIKE :req_title_0'],
      [CrudRequestWhereOperator.ENDS_LOWER, 'PostEntity.title ILIKE :req_title_0'],
    ];

    for (const [op, expectedCondition] of ops) {
      const result = adapter.build(postRepository.createQueryBuilder(), {
        ...emptyRequest,
        where: {
          field: ['title'], operator: op, value: 'sample',
        },
      });

      const expected = postRepository.createQueryBuilder()
        .andWhere(expectedCondition, { req_title_0: 'sample' })
        .getQuery();

      expect(result.getQuery(), `title ${op} sample`).toBe(expected);
    }
  });

  test('should generate IN operators', () => {
    const ops: [CrudRequestWhereOperator, string][] = [
      [CrudRequestWhereOperator.IN, 'PostEntity.title IN (:...req_title_0)'],
      [CrudRequestWhereOperator.NOT_IN, 'PostEntity.title NOT IN (:...req_title_0)'],
      [CrudRequestWhereOperator.IN_LOWER, 'LOWER(PostEntity.title) IN (:...req_title_0)'],
      [CrudRequestWhereOperator.NOT_IN_LOWER, 'LOWER(PostEntity.title) NOT IN (:...req_title_0)'],
    ];

    for (const [op, expectedCondition] of ops) {
      const result = adapter.build(postRepository.createQueryBuilder(), {
        ...emptyRequest,
        where: {
          field: ['title'], operator: op, value: ['foo', 'bar'],
        },
      });

      const expected = postRepository.createQueryBuilder()
        .andWhere(expectedCondition, { req_title_0: ['foo', 'bar'] })
        .getQuery();

      expect(result.getQuery(), `title ${op} foo, bar`).toBe(expected);
    }
  });

  test('should validate special operators', () => {
    const qb = adapter.build(postRepository.createQueryBuilder(), {
      ...emptyRequest,
      where: {
        and: [
          { field: ['id'], operator: CrudRequestWhereOperator.BETWEEN, value: [2, 4] },
          { field: ['content'], operator: CrudRequestWhereOperator.IS_NULL, value: null },
          { field: ['title'], operator: CrudRequestWhereOperator.NOT_NULL, value: null },
        ],
      },
    });

    const expected = postRepository.createQueryBuilder()
      .andWhere(new Brackets(qb => {
        qb
          .andWhere('PostEntity.id BETWEEN :req_id_0_start AND :req_id_0_end', { req_id_0_start: 2, req_id_0_end: 4 })
          .andWhere('PostEntity.content IS NULL')
          .andWhere('PostEntity.title IS NOT NULL');
      }))
      .getQuery();

    expect(qb.getQuery()).toBe(expected);
  });

  test('should throw with an unsupported operator', () => {
    expect(() => {
      adapter.build(postRepository.createQueryBuilder(), {
        ...emptyRequest,
        where: {
          field: ['title'], operator: 'invalid' as any, value: null,
        },
      });
    }).toThrow(Error);
  });
});
