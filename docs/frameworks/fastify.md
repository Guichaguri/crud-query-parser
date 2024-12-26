# Fastify Support

You can pass the query string from a Fastify request directly into a parser to obtain a `CrudRequest`. Here's an example:

```ts
import Fastify, { FastifyRequest } from 'fastify';
import { CrudRequestParser } from 'crud-query-parser/parsers/crud';

const fastify = Fastify();
const parser = new CrudRequestParser();

fastify.get('/users', async (request: FastifyRequest<{ Querystring: Record<string, any> }>, reply) => {
  const crudRequest = parser.parse(request.query);
  
  return await getManyUsers(crudRequest);
});

fastify.listen({ port: 3000 });
```

```ts
const adapter = new TypeOrmQueryAdapter();
const repository = AppDataSource.getRepository(UserEntity);

export async function getManyUsers(crudRequest: CrudRequest) {
  return await adapter.getMany(repository.createQueryBuilder(), crudRequest);
}
```
