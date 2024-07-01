# crud-query-parser

This library parses HTTP requests and converts them to TypeORM query builders, allowing advanced filtering, column selection, pagination and relations.

## Install

```sh
npm install @crud-query-parser/core
```

### Other modules

- `@crud-query-parser/typeorm`: TypeORM adapter
- `@crud-query-parser/nestjs`: NestJS utilities

## Usage

```ts
import { CrudRequestParser } from '@crud-query-parser/core/parsers/crud';
import { TypeormQueryBuilder } from '@crud-query-parser/typeorm';

const parser = new CrudRequestParser();
const builder = new TypeormQueryBuilder();

const requestQuery = { ... };

const crudRequest = parser.parse(requestQuery);
const result = builder.getMany(repository.createQueryBuilder(), crudRequest);

// 
```
