import { posts } from './schema';

export async function setup(): Promise<void> {
  await posts.drop();
  await posts.insertMany([
    {
      title: 'Hello World',
      content: 'Lorem ipsum dolor sit amet',
      isActive: true,
      author: { name: 'Guilherme' },
    },
    {
      title: 'Lorem Ipsum',
      content: 'Lorem ipsum dolor sit amet',
      isActive: false,
      author: { name: 'Guilherme' },
    },
    {
      title: 'Lorem Ipsum 2',
      content: '...',
      isActive: true,
      author: { name: 'Foo' },
    },
    {
      title: 'Lorem Ipsum 3',
      content: '...',
      isActive: true,
      author: { name: 'Bar' },
    },
    {
      title: 'Lorem Ipsum 4',
      content: '...',
      isActive: false,
      author: { name: 'Foo' },
    },
  ]);
}
