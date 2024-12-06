# Express Helper

The Express integration has a middleware that automatically parses and memoizes the request.

## `crud()` middleware

```ts
import express from 'express';
import { crud } from 'crud-query-parser/helpers/express';
import { CrudRequestParser } from 'crud-query-parser/parsers/crud';
import { CrudRequest } from 'crud-query-parser';

const app = express();

// Register the middleware only for this endpoint
app.get('/users', crud(CrudRequestParser), (req, res) => {
  const crudRequest = req.getCrudRequest();
  
  // ...
});

// ---- OR ----

// Register for all routes in app
app.use(crud(CrudRequestParser));
app.get('/users', (req, res) => {
  const crudRequest = req.getCrudRequest();

  // ...
});
```
