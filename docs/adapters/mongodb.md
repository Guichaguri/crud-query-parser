# MongoDB Adapter

The MongoDB Adapter generates and executes `find()` queries. It supports the [official MongoDB driver](https://www.npmjs.com/package/mongodb) and [Mongoose](https://www.npmjs.com/package/mongoose).

This adapter also works with [Amazon DocumentDB](https://aws.amazon.com/documentdb/) and [Azure Cosmos DB for MongoDB](https://learn.microsoft.com/en-us/azure/cosmos-db/mongodb/introduction).

## Usage with `mongodb`

```ts
import { MongoDBQueryAdapter } from 'crud-query-parser/adapters/mongodb';
import { MongoClient } from 'mongodb';

const client = new MongoClient('mongodb://admin:admin@localhost:27017');
const posts = client.db('test').collection<Post>('posts');

const adapter = new MongoDBQueryAdapter();

const result = await adapter.getMany(posts, crudRequest);
// const result = await adapter.getOne(posts, crudRequest);
```

## Usage with `mongoose`

```ts
import { MongooseQueryAdapter } from 'crud-query-parser/adapters/mongodb';
import * as mongoose from 'mongoose';

await mongoose.connect('mongodb://admin:admin@localhost:27017/test');
const Post = mongoose.model('Post', ...);

const adapter = new MongooseQueryAdapter();

const result = await adapter.getMany(Post.find(), crudRequest);
// const result = await adapter.getOne(Post.find(), crudRequest);
```

## Caveats

- Relations are completely ignored as this is a NoSQL database.
- All case-insensitive operators (such as `EQ_LOWER`) use `$regex` under the hood.
- The operators `CONTAINS`, `NOT_CONTAINS`, `STARTS` and `ENDS` also use `$regex`.
