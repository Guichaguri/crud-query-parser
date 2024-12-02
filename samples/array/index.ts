import { ArrayQueryAdapter } from '../../src/adapters/array';
import { CrudRequestParser } from '../../src/parsers/crud';

interface Post {
  id: number;
  title: string;
  category?: Category;
  isActive: boolean;
}

interface Category {
  id: number;
  name: string;
}

const cat1: Category = { id: 1, name: 'git' };
const cat2: Category = { id: 2, name: 'npm' };
const cat3: Category = { id: 3, name: 'TypeScript' };

const data: Post[] = [
  { id: 1, title: 'Hello World', category: cat1, isActive: true },
  { id: 2, title: 'Lorem Ipsum', category: cat3, isActive: true },
  { id: 3, title: 'Hello Ipsum', category: cat2, isActive: true },
  { id: 4, title: 'Lorem Ipsum', category: cat2, isActive: true },
  { id: 5, title: 'Lorem Ipsum', category: cat1, isActive: false },
];

const parser = new CrudRequestParser();
const adapter = new ArrayQueryAdapter();

export async function run() {
  const qs: Record<string, string | string[]> = {};

  qs['s'] = JSON.stringify({ title: { $contL: 'hello', $notnull: true }, isActive: true });
  qs['fields'] = 'id,title,category.name';
  qs['join'] = 'category';
  qs['limit'] = '5';

  const request = parser.parse(qs);

  const result = await adapter.getMany(data, request);

  console.dir(result, { depth: 5 });
}

run();
