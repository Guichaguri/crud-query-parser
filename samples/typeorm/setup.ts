import { AppDataSource } from './data-source';
import { CategoryEntity } from './entities/category.entity';
import { PostEntity } from './entities/post.entity';

export async function setupDatabase(): Promise<void> {
  await AppDataSource.initialize();

  const postRepository = AppDataSource.getRepository(PostEntity);
  const categoryRepository = AppDataSource.getRepository(CategoryEntity);

  await postRepository.clear();
  await categoryRepository.clear();

  await categoryRepository.save(new CategoryEntity({
    id: 1,
    name: 'Games',
  }));

  await postRepository.save(new PostEntity({
    id: 1,
    categoryId: 1,
    title: 'Hello World',
    content: 'This is a sample post',
    isActive: true,
  }));
}
