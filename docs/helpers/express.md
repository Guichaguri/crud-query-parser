# Express Helper

The Express integration has a middleware that automatically parses and memoizes the request.

## `crud()` middleware

```ts
import express from 'express';
import { crud } from 'crud-query-parser/helpers/express';
import { CrudRequestParser } from 'crud-query-parser/parsers/crud';
import { CrudRequest } from 'crud-query-parser';

const app = express();

// Register the middleware for this endpoint
app.get('/users', crud(CrudRequestParser), (req, res) => {
  const crudRequest = req.getCrudRequest();

  getManyUsers(crudRequest)
    .then(result => res.json(result))
    .catch(error => res.json({ error: error }));
});
```

```ts
const adapter = new TypeOrmQueryAdapter();
const repository = AppDataSource.getRepository(UserEntity);

export async function getManyUsers(crudRequest: CrudRequest) {
  return await adapter.getMany(repository.createQueryBuilder(), crudRequest);
}
```
