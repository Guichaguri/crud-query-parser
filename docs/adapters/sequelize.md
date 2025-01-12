# Sequelize Adapter

The Sequelize adapter builds FindOptions and runs queries.

It supports [Sequelize](https://www.npmjs.com/package/sequelize) version 6.

## Usage

```ts
import { SequelizeQueryAdapter } from 'crud-query-parser/adapters/sequelize';

const adapter = new SequelizeQueryAdapter();

// Then, you can pass a FindOptions to it:
const result = await adapter.getMany({}, crudRequest);

// Or...
// const result = await adapter.getOne({}, crudRequest);
```
