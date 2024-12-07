# Condition Filters

These filters are applied to `WHERE` conditions.

## `ensureCondition(req: CrudRequest, condition: CrudRequestWhere): CrudRequest`

Adds a condition and ensures it is enforced. This basically adds a top-level `AND` condition appending the passed condition.

Examples:
```ts
import { ensureCondition } from 'crud-query-parser/filters';

// This adds (title LIKE '%World%')
crudRequest = ensureCondition(crudRequest, {
  field: ['title'],
  operator: CrudRequestWhereOperator.CONTAINS,
  value: 'World',
});

// This appends (isActive = true)
// The resulting condition is (title LIKE '%World%' AND isActive = true)
crudRequest = ensureCondition(crudRequest, {
  field: ['isActive'],
  operator: CrudRequestWhereOperator.EQ,
  value: true,
});
```
```ts
// This adds (title LIKE '%World%' OR category.id = 3)
crudRequest = ensureCondition(crudRequest, {
  or: [
    {
      field: ['title'],
      operator: CrudRequestWhereOperator.CONTAINS,
      value: 'World',
    },
    {
      field: ['category', 'id'],
      operator: CrudRequestWhereOperator.EQ,
      value: 3,
    },
  ],
});
```

## `ensureEqCondition<T>(req: CrudRequest, entity: Partial<T>): CrudRequest`

Adds an "equals" condition and ensures it is enforced. This is the same as `ensureCondition()`, but applies multiple `EQ` conditions with a less verbose syntax.

Examples:
```ts
import { ensureEqCondition } from 'crud-query-parser/filters';

// This adds (isActive = true)
crudRequest = ensureEqCondition(crudRequest, {
  isActive: true,
});
```
```ts
// This adds (isActive = true AND category.id = 3)
crudRequest = ensureEqCondition(crudRequest, {
  isActive: true,
  category: {
    id: 3,
  },
});
```
