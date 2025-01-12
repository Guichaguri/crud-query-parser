import { Category, Post, sequelize } from './schema';

export async function setup(): Promise<void> {
  await sequelize.authenticate();
  await sequelize.sync();

  await Category.create({
    id: 1,
    name: 'Games',
  });

  await Post.create({
    id: 1,
    CategoryId: 1,
    title: 'Hello World',
    content: 'This is a sample post',
    isActive: true,
  });
}
