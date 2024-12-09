import * as mongoose from 'mongoose';

const authorSchema = new mongoose.Schema({
  name: String,
}, { _id: false });


const postSchema = new mongoose.Schema({
  title: String,
  content: String,
  isActive: Boolean,
  author: authorSchema,
});

export const Post = mongoose.model('Post', postSchema);
