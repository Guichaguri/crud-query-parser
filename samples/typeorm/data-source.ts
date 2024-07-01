import { DataSource } from 'typeorm';
import { PostEntity } from './entities/post.entity';
import { CategoryEntity } from './entities/category.entity';

export const AppDataSource = new DataSource({
  type: "sqlite",
  database: './samples.db',
  synchronize: true,
  logging: true,
  entities: [PostEntity, CategoryEntity],
  subscribers: [],
  migrations: [],
})
