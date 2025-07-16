import { DataSource } from 'typeorm';
import { PostEntity } from './entities/post.entity';
import { CategoryEntity } from './entities/category.entity';
import { UserEntity } from './entities/user.entity';

export const AppDataSource = new DataSource({
  type: "better-sqlite3",
  database: './samples.db',
  synchronize: true,
  logging: true,
  entities: [PostEntity, CategoryEntity, UserEntity],
  subscribers: [],
  migrations: [],
});
