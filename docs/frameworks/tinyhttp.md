# tinyhttp support

You can pass the tinyhttp's parsed query directly to a parser. Here's an example: 

```ts
import { App } from '@tinyhttp/app';
import { CrudRequestParser } from 'crud-query-parser/parsers/crud';
import { TypeOrmQueryAdapter } from 'crud-query-parser/adapters/typeorm';

const app = new App();
const parser = new CrudRequestParser();
const adapter = new TypeOrmQueryAdapter();

app
  .get('/users', async (req, res) => {
    const crudRequest = parser.parse(req.query);
    
    const result = await adapter.getMany(repository.createQueryBuilder(), crudRequest);

    res.json(result);
  })
  .listen(3000);
```
