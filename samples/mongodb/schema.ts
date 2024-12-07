import { MongoClient } from 'mongodb';

export interface Post {
  title: string;
  content: string;
  isActive: boolean;
  author: Author;
}

export interface Author {
  name: string;
}

const uri = process.env.MONGO_URI || 'mongodb://admin:admin@localhost:27017/?authSource=admin';
export const client = new MongoClient(uri);

export const posts = client.db('test').collection<Post>('posts');
