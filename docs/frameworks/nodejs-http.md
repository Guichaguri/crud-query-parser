# NodeJS HTTP

You can parse the query string (being through the `querystring` package, the `qs` package, the WHATWG URL API or any other mean of parsing it), and then you can pass it to a parser to obtain a `CrudRequest`.
Here's an example:

```ts
import * as http from 'http';
import { CrudRequestParser } from 'crud-query-parser/parsers/crud';
import { TypeOrmQueryAdapter } from 'crud-query-parser/adapters/typeorm';

const parser = new CrudRequestParser();
const adapter = new TypeOrmQueryAdapter();

const server = http.createServer((req, res) => {
  processRequest(req)
    .then(result => res.end(JSON.stringify(result)))
    .catch(error => res.end(error.message));
});

async function processRequest(req: http.IncomingMessage) {
  const url = new URL(req.url!, 'https://localhost');
  const crudRequest = parser.parse(url.searchParams);

  return await adapter.getMany(repository.createQueryBuilder(), crudRequest);
}

server.listen(3000);
```
