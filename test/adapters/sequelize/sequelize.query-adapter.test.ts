import { DataTypes, FindOptions, Op, Sequelize } from 'sequelize';
import { SequelizeQueryAdapter } from '../../../src/adapters/sequelize';
import { beforeAll, describe, expect, test } from 'vitest';
import { createCrudRequest, CrudRequest, CrudRequestWhereOperator } from '../../../src';

const sequelize = new Sequelize('sqlite::memory:', { logging: false });

const Category = sequelize.define(
  'Category',
  {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {},
);

const Post = sequelize.define(
  'Post',
  {
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
  },
  {},
);

Category.hasMany(Post);
Post.belongsTo(Category);

const adapter = new SequelizeQueryAdapter<any>(Post);

beforeAll(async () => {
  await sequelize.authenticate();
  await sequelize.sync();

  await Category.create({ id: 1, name: 'Finance' });
  await Category.create({ id: 2, name: 'Sports' });
  await Category.create({ id: 3, name: 'Fashion' });

  await Post.create({ id: 1, title: 'Foo', CategoryId: 1, content: '', isActive: true });
  await Post.create({ id: 2, title: 'Bar', CategoryId: 1, content: '', isActive: true });
  await Post.create({ id: 3, title: 'Hello', CategoryId: 2, content: '', isActive: false });
  await Post.create({ id: 4, title: 'World', CategoryId: 2, content: '', isActive: true });
  await Post.create({ id: 5, title: 'foo', CategoryId: 3, content: '', isActive: true });
});

const emptyRequest: CrudRequest = createCrudRequest();

const complexRequest: CrudRequest = {
  select: [{ field: ['id'] }, { field: ['title'] }, { field: ['Category', 'name'] }],
  relations: [{ field: ['Category'] }],
  order: [{ field: ['id'], order: 'DESC' }],
  where: {
    and: [
      {
        field: ['title'],
        operator: CrudRequestWhereOperator.NOT_NULL,
        value: null,
      },
      {
        field: ['Category', 'name'],
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
  page: 2,
};

const noResultsRequest: CrudRequest = {
  select: [],
  relations: [{ field: ['Category'] }],
  order: [],
  where: {
    and: [
      {
        field: ['Category', 'name'],
        operator: CrudRequestWhereOperator.CONTAINS_LOWER,
        value: 'Music',
      },
    ],
  },
};


describe('build', () => {
  test('should not modify the builder with an empty query', () => {
    const options = adapter.build({}, emptyRequest);

    expect(options).toEqual({});
  });

  test('should create a complex query', () => {
    const options = adapter.build({}, complexRequest);

    const expected: FindOptions = {
      attributes: ['id', 'title'],
      include: [{
        model: Category,
        attributes: ['name'],
      }],
      order: [
        ['id', 'DESC'],
      ],
      where: {
        [Op.and]: [
          { title: { [Op.ne]: null } },
          { '$Category.name$': 'Sports' },
          {
            [Op.or]: [
              { isActive: true },
              { id: { [Op.lte]: 1 } },
            ],
          },
        ],
      },
      offset: 25,
      limit: 25,
    };

    expect(options).toEqual(expected);
  });

  test('should create a nested relation query', () => {
    const options = adapter.build({}, {
      select: [{ field: ['Category', 'Posts', 'title'] }],
      relations: [
        { field: ['Category'] },
        { field: ['Category', 'Posts'] },
      ],
      order: [{ field: ['Category', 'Posts', 'id'], order: 'DESC' }],
      where: { field: ['Category', 'Posts', 'title'], operator: CrudRequestWhereOperator.NOT_NULL, value: null },
    });

    const expected: FindOptions = {
      attributes: [],
      include: [{
        model: Category,
        attributes: [],
        include: [{
          model: Post,
          attributes: ['title'],
        }],
      }],
      order: [
        ['Category', 'Posts', 'id', 'DESC'],
      ],
      where: { '$Category.Posts.title$': { [Op.ne]: null } },
    };

    expect(options).toEqual(expected);
  });
});

describe('getOne', () => {
  test('should return first inserted post', async () => {
    const entity = await adapter.getOne({}, emptyRequest);

    expect(entity).toBeDefined();
    expect(entity.id).toBe(1);
    expect(entity.title).toBe('Foo');
    expect(entity.CategoryId).toBe(1);
    expect(entity.content).toBe('');
    expect(entity.isActive).toBe(true);
    expect(entity.Category).toBeUndefined();
  });

  test('should return last sports post', async () => {
    const entity = await adapter.getOne({}, complexRequest);

    expect(entity).toBeDefined();
    expect(entity!.id).toBe(4);
    expect(entity!.title).toBe('World');
    expect(entity!.CategoryId).toBeUndefined();
    expect(entity!.content).toBeUndefined();
    expect(entity!.isActive).toBeUndefined();
    expect(entity!.Category).toBeDefined();
    expect(entity!.Category!.id).toBeUndefined();
    expect(entity!.Category!.name).toBe('Sports');
  });

  test('should return null', async () => {
    const entity = await adapter.getOne({}, noResultsRequest);

    expect(entity).toBeNull();
  });
});

describe('getMany', () => {
  test('should return all posts', async () => {
    const result = await adapter.getMany({}, emptyRequest);

    expect(result.data).toHaveLength(5);
    expect(result.page).toBe(1);
    expect(result.count).toBe(5);
    expect(result.total).toBe(5);
    expect(result.pageCount).toBe(1);
  });

  test('should return active sports posts', async () => {
    const result = await adapter.getMany({}, complexRequest);

    expect(result.data).toHaveLength(0);
    expect(result.page).toBe(2);
    expect(result.count).toBe(0);
    expect(result.total).toBe(1);
    expect(result.pageCount).toBe(1);
  });

  test('should return nothing', async () => {
    const result = await adapter.getMany({}, noResultsRequest);

    expect(result.data).toHaveLength(0);
    expect(result.page).toBe(1);
    expect(result.count).toBe(0);
    expect(result.total).toBe(0);
    expect(result.pageCount).toBe(0);
  });
});

describe('validateField', () => {
  test('should ignore invalid fields', () => {
    const adapter = new SequelizeQueryAdapter(Post, {
      invalidFields: {
        select: 'ignore',
        order: 'ignore',
        where: 'ignore',
        relations: 'ignore',
      },
    });

    const options = adapter.build({}, {
      select: [{ field: ['invalid'] }],
      order: [{ field: [], order: 'ASC' }],
      relations: [{ field: ['invalid'] }],
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

    expect(options).toEqual({
      attributes: [],
      where: {
        [Op.and]: [],
      },
    });
  });

  test('should allow unsafe fields', () => {
    const adapter = new SequelizeQueryAdapter(Post, {
      invalidFields: {
        order: 'allow-unsafe',
      },
    });

    const options = adapter.build({}, {
      ...emptyRequest,
      order: [{ field: ['non_existent'], order: 'ASC' }],
    });

    expect(options).toEqual({
      order: [
        ['non_existent', 'ASC'],
      ],
    });
  });

  test('should throw on denied fields', () => {
    const adapter = new SequelizeQueryAdapter(Post, {
      invalidFields: {
        select: 'deny',
      },
    });

    expect(() => {
      adapter.build({}, {
        ...emptyRequest,
        select: [{ field: ['non_existent'] }],
      });
    }).toThrow(Error);
  });

  test('should throw on denied fields by default for where conditions', () => {
    const adapter = new SequelizeQueryAdapter(Post, {
      invalidFields: {},
    });

    expect(() => {
      adapter.build({}, {
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
    const val = 3;

    const ops: [CrudRequestWhereOperator, any][] = [
      [CrudRequestWhereOperator.EQ, val],
      [CrudRequestWhereOperator.NEQ, { [Op.ne]: val }],
      [CrudRequestWhereOperator.GT, { [Op.gt]: val }],
      [CrudRequestWhereOperator.GTE, { [Op.gte]: val }],
      [CrudRequestWhereOperator.LT, { [Op.lt]: val }],
      [CrudRequestWhereOperator.LTE, { [Op.lte]: val }],
    ];

    for (const [op, expectedCondition] of ops) {
      const result = adapter.build({}, {
        ...emptyRequest,
        where: {
          field: ['id'], operator: op, value: val,
        },
      });

      expect(result, `id ${op} ${val}`).toEqual({
        where: {
          id: expectedCondition,
        }
      });
    }
  });

  test('should generate string operators', () => {
    const col = 'title';
    const val = 'sample';

    const ops: [CrudRequestWhereOperator, object][] = [
      [CrudRequestWhereOperator.EQ, { [col]: val }],
      [CrudRequestWhereOperator.NEQ, { [col]: { [Op.ne]: val } }],
      [CrudRequestWhereOperator.GT, { [col]: { [Op.gt]: val } }],
      [CrudRequestWhereOperator.GTE, { [col]: { [Op.gte]: val } }],
      [CrudRequestWhereOperator.LT, { [col]: { [Op.lt]: val } }],
      [CrudRequestWhereOperator.LTE, { [col]: { [Op.lte]: val } }],
      [CrudRequestWhereOperator.CONTAINS, { [col]: { [Op.substring]: val } }],
      [CrudRequestWhereOperator.NOT_CONTAINS, { [col]: { [Op.notLike]: `%${val}%` } }],
      [CrudRequestWhereOperator.STARTS, { [col]: { [Op.startsWith]: val } }],
      [CrudRequestWhereOperator.ENDS, { [col]: { [Op.endsWith]: val } }],
      [CrudRequestWhereOperator.EQ_LOWER,
        sequelize.where(sequelize.fn('lower', sequelize.col(col)), { [Op.eq]: val })],
      [CrudRequestWhereOperator.NEQ_LOWER,
        sequelize.where(sequelize.fn('lower', sequelize.col(col)), { [Op.ne]: val })],
      [CrudRequestWhereOperator.CONTAINS_LOWER,
        sequelize.where(sequelize.fn('lower', sequelize.col(col)), { [Op.like]: `%${val}%` })],
      [CrudRequestWhereOperator.NOT_CONTAINS_LOWER,
        sequelize.where(sequelize.fn('lower', sequelize.col(col)), { [Op.notLike]: `%${val}%` })],
      [CrudRequestWhereOperator.STARTS_LOWER,
        sequelize.where(sequelize.fn('lower', sequelize.col(col)), { [Op.like]: `${val}%` })],
      [CrudRequestWhereOperator.ENDS_LOWER,
        sequelize.where(sequelize.fn('lower', sequelize.col(col)), { [Op.like]: `%${val}` })],
    ];

    for (const [op, expectedCondition] of ops) {
      const result = adapter.build({}, {
        ...emptyRequest,
        where: {
          field: [col], operator: op, value: val,
        },
      });

      expect(result, `${col} ${op} ${val}`).toEqual({
        where: expectedCondition,
      });
    }
  });

  test('should generate ILIKE string operators', () => {
    const adapter = new SequelizeQueryAdapter(Post, {
      ilike: true,
    });

    const val = 'sample';

    const ops: [CrudRequestWhereOperator, object][] = [
      [CrudRequestWhereOperator.CONTAINS_LOWER, { [Op.iLike]: `%${val}%` }],
      [CrudRequestWhereOperator.NOT_CONTAINS_LOWER, { [Op.notILike]: `%${val}%` }],
      [CrudRequestWhereOperator.STARTS_LOWER, { [Op.iLike]: `${val}%` }],
      [CrudRequestWhereOperator.ENDS_LOWER, { [Op.iLike]: `%${val}` }],
    ];

    for (const [op, expectedCondition] of ops) {
      const result = adapter.build({}, {
        ...emptyRequest,
        where: {
          field: ['title'], operator: op, value: val,
        },
      });

      expect(result, `title ${op} ${val}`).toEqual({
        where: {
          title: expectedCondition,
        },
      });
    }
  });

  test('should generate IN operators', () => {
    const col = 'title';
    const val = ['foo', 'bar'];

    const ops: [CrudRequestWhereOperator, object][] = [
      [CrudRequestWhereOperator.IN, { [col]: { [Op.in]: val } }],
      [CrudRequestWhereOperator.NOT_IN, { [col]: { [Op.notIn]: val } }],
      [CrudRequestWhereOperator.IN_LOWER,
        sequelize.where(sequelize.fn('lower', sequelize.col(col)), { [Op.in]: val })],
      [CrudRequestWhereOperator.NOT_IN_LOWER,
        sequelize.where(sequelize.fn('lower', sequelize.col(col)), { [Op.notIn]: val })],
    ];

    for (const [op, expectedCondition] of ops) {
      const result = adapter.build({}, {
        ...emptyRequest,
        where: {
          field: [col], operator: op, value: val,
        },
      });

      expect(result, `${col} ${op} ${val.join(', ')}`).toEqual({
        where: expectedCondition,
      });
    }
  });

  test('should validate special operators', () => {
    const options = adapter.build({}, {
      ...emptyRequest,
      where: {
        and: [
          { field: ['id'], operator: CrudRequestWhereOperator.BETWEEN, value: [2, 4] },
          { field: ['content'], operator: CrudRequestWhereOperator.IS_NULL, value: null },
          { field: ['title'], operator: CrudRequestWhereOperator.NOT_NULL, value: null },
        ],
      },
    });

    expect(options).toEqual({
      where: {
        [Op.and]: [
          { id: { [Op.between]: [2, 4] } },
          { content: { [Op.eq]: null } },
          { title: { [Op.ne]: null } },
        ],
      },
    });
  });

  test('should throw with an unsupported operator', () => {
    expect(() => {
      adapter.build({}, {
        ...emptyRequest,
        where: {
          field: ['title'], operator: 'invalid' as any, value: null,
        },
      });
    }).toThrow(Error);
  });
});
