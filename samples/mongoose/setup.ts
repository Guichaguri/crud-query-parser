import * as mongoose from 'mongoose';
import { Post } from './schema';

export async function setup() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://admin:admin@localhost:27017/?authSource=admin');

  await Post.deleteMany({});
  await Post.create({
    title: 'Hello World',
    content: 'Lorem ipsum dolor sit amet',
    isActive: true,
    author: { name: 'Guilherme' },
  });
}
