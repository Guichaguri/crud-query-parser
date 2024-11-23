import { DataSource } from 'typeorm';
import { PostEntity } from './entities/post.entity';
import { CategoryEntity } from './entities/category.entity';

export const AppDataSource = new DataSource({
  type: "better-sqlite3",
  database: './samples.db',
  synchronize: true,
  logging: true,
  entities: [PostEntity, CategoryEntity],
  subscribers: [],
  migrations: [],
});
