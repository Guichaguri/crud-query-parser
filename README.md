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

You have to pick a request parser and a query adapter.

```ts
const userRepository = AppDataSource.getRepository(UserEntity); // TypeORM repository

// ...

// The request query object
// This object will likely come from the HTTP request
const requestQuery = { ... };  

// Parses the query into a CrudRequest object
const crudRequest = parser.parse(requestQuery);

// Using the query adapter, you can query in your ORM from the CrudRequest
const result = adapter.getMany(userRepository.createQueryBuilder(), crudRequest); // GetManyResult<UserEntity>

// The result object has properties like data, page, total
console.log(result);
```

## Request parsers

### CRUD

This parser fully compatible with `@nestjsx/crud`

```ts
import { CrudRequestParser } from 'crud-query-parser/parsers/crud';

const parser = new CrudRequestParser();
```

## Database adapters

### TypeORM

This adapter works with TypeORM 0.3.x and 0.2.x

```ts
import { TypeormQueryAdapter } from 'crud-query-parser/adapters/typeorm';

const adapter = new TypeormQueryAdapter();

// 
```

## Helpers

### NestJS

The NestJS integration has OpenAPI support and decorators that automatically parses the request.

Sample code:

```ts
@Controller('users')
export class UserController {

  @Get()
  @Crud(CrudRequestParser)
  public async getMany(@ParseCrudRequest() crudRequest: CrudRequest) {
    return this.service.getMany(crudRequest);
  }

}
```

## Filters

You may need to filter what the user can or cannot query. You can modify the `CrudRequest` object as needed.

There are a few filters provided by the library, which are listed below.

### Enforce a "where" condition

This filter will add the condition on top of all other where conditions

```ts
import { ensureCondition } from 'crud-query-parser/filters';

// ...

crudRequest = ensureCondition(crudRequest, {
  field: ['isActive'],
  operator: ParsedRequestWhereOperator.EQ,
  value: true,
});
```

### Ensure page limit

This filter will ensure that the requested limit does not go above the maximum.
It also sets the default limit whenever the limit is omitted. 

```ts
import { ensureLimit } from 'crud-query-parser/filters';

// ...

const defaultLimit = 25;
const maxLimit = 100;

crudRequest = ensureLimit(crudRequest, defaultLimit, maxLimit);
```

### Filter property access

This filter removes any property from the request that is not in the allowlist.
It removes unallowed properties from the select fields, where conditions, relations and sorting.

```ts
import { filterProperties } from 'crud-query-parser/filters';

// ...

crudRequest = filterProperties(crudRequest, [
  'id',
  'name',
  'posts',
  'posts.id',
  'posts.name',
]);
```

### Filter relations

This filter removes any relation from the request that is not in the allowlist.
It's the same as the `filterProperties` but only filters relations.

```ts
import { filterRelations } from 'crud-query-parser/filters';

// ...

crudRequest = filterRelations(crudRequest, ['posts']);
```
