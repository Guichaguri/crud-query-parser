# Property Filters

These functions can filter which entity properties you want to allow.

## `filterProperties(req: CrudRequest, allowedProperties: string[]): CrudRequest`

Filters access to an allowlist of properties and relations.
No selecting, filtering, sorting and joining can be done on a property that is not listed.

Example:
```ts
import { filterProperties } from 'crud-query-parser/filters';

// Only "id", "title" and "category.name" will be visible in crud requests
crudRequest = filterProperties(crudRequest, ['id', 'title', 'category.name']);
```

## `filterRelations(req: CrudRequest, allowedRelations: string[]): CrudRequest`

Filters access to an allowlist of relations. This is the same as `filterProperties()` but only filters `JOIN`.

Example:
```ts
import { filterRelations } from 'crud-query-parser/filters';

// Only "category" and "author" will be visible for joining in a crud requests
crudRequest = filterRelations(crudRequest, ['category', 'author']);
```
