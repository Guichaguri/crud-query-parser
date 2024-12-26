# Express Support

## With a Middleware

The Express integration has a middleware that automatically parses and memoizes the request.

```ts
import express from 'express';
import { crud } from 'crud-query-parser/helpers/express';
import { CrudRequestParser } from 'crud-query-parser/parsers/crud';

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

## Without a Middleware

```ts
import express from 'express';
import { CrudRequestParser } from 'crud-query-parser/parsers/crud';

const app = express();
const parser = new CrudRequestParser();

app.get('/users', (req, res) => {
  const crudRequest = parser.parse(req.query);

  getManyUsers(crudRequest)
    .then(result => res.json(result))
    .catch(error => res.json({ error: error }));
});
```
