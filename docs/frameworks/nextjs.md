# NextJS Support

## Using the App Router

You can create a [Route Handler](https://nextjs.org/docs/app/building-your-application/routing/route-handlers) to receive API requests and then pass the `URLSearchParams` to a parser to obtain a `CrudRequest`.

```ts
// app/api/users/route.ts

import { NextRequest } from 'next/server';
import { CrudRequestParser } from 'crud-query-parser/parsers/crud';
import { TypeOrmQueryAdapter } from 'crud-query-parser/adapters/typeorm';

const parser = new CrudRequestParser();
const adapter = new TypeOrmQueryAdapter();

export async function GET(request: NextRequest) {
  const crudRequest = parser.parse(request.nextUrl.searchParams);

  const result = await adapter.getMany(repository.createQueryBuilder(), crudRequest);

  return Response.json(result);
}
```

## Using the Pages Router

You can create an [API Route](https://nextjs.org/docs/pages/building-your-application/routing/api-routes) to receive API requests and then pass the NextJS query params object to a parser to obtain a `CrudRequest`.

```ts
// pages/api/users.ts

import { NextApiRequest, NextApiResponse } from 'next';
import { CrudRequestParser } from 'crud-query-parser/parsers/crud';
import { TypeOrmQueryAdapter } from 'crud-query-parser/adapters/typeorm';

const parser = new CrudRequestParser();
const adapter = new TypeOrmQueryAdapter();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const crudRequest = parser.parse(req.query);

    const result = await adapter.getMany(repository.createQueryBuilder(), crudRequest);

    res.status(200).json(result);
  } catch {
    res.status(500).json({ error: 'Failed to fetch data' });
  }
}
```
