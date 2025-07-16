import { AppDataSource } from './data-source';
import { CategoryEntity } from './entities/category.entity';
import { PostEntity } from './entities/post.entity';
import { UserEntity } from './entities/user.entity';

export async function setupDatabase(): Promise<void> {
  await AppDataSource.initialize();

  const postRepository = AppDataSource.getRepository(PostEntity);
  const categoryRepository = AppDataSource.getRepository(CategoryEntity);
  const userRepository = AppDataSource.getRepository(UserEntity);

  await postRepository.clear();
  await categoryRepository.clear();
  await userRepository.clear();

  await userRepository.save(new UserEntity({
    id: 1,
    name: 'John Doe',
  }))

  await categoryRepository.save(new CategoryEntity({
    id: 1,
    name: 'Games',
    creatorId: 1,
  }));

  await postRepository.save(new PostEntity({
    id: 1,
    categoryId: 1,
    title: 'Hello World',
    content: 'This is a sample post',
    isActive: true,
  }));
}
