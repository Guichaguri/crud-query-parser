# TypeORM Adapter

It adapts TypeORM QueryBuilders and runs queries.

It supports [TypeORM](https://www.npmjs.com/package/typeorm) versions 0.2.+ and 0.3.+.

## Getting Started

Install crud-query-parser

```sh
npm i crud-query-parser
```

Here's an example on how to use it:

```ts
import { TypeOrmQueryAdapter } from 'crud-query-parser/adapters/typeorm';

const adapter = new TypeOrmQueryAdapter();

// Then, you can pass a QueryBuilder to it:
const result = await adapter.getMany(repository.createQueryBuilder(), crudRequest);

// Or...
// const result = await adapter.getOne(repository.createQueryBuilder(), crudRequest);
```