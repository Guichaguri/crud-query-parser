# Limit Filter

This filter is applied to the query `LIMIT`.

## `ensureLimit(req: CrudRequest, defaultLimit: number, maxLimit: number): CrudRequest`

Ensures that the limit will not go above the maximum. If the limit is omitted, the default one will be set.

Example:
```ts
import { ensureLimit } from 'crud-query-parser/filters';

// The limits will be clamped between 1 and 100
// It will be 25 if not defined
crudRequest = ensureLimit(crudRequest, 25, 100);
```
