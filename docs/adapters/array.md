# Array Adapter

This adapter allows working directly with JS arrays instead of databases. The adapter filters, sorts and maps a plain JS array based on the given request.

## Usage

```ts
import { ArrayQueryAdapter } from 'crud-query-parser/adapters/array';

const adapter = new ArrayQueryAdapter();

const entities = [
  { id: 1, title: 'Hello' },
  { id: 2, title: 'World' },
];

// Then, you can pass the array of entities to it:
const result = await adapter.getMany(entities, crudRequest);

// Or...
// const result = await adapter.getOne(entities, crudRequest);
```

## Caveats

- Relations are completely ignored.
- Passing a select list makes it create new objects containing only the select fields. An empty select list makes it return the objects as-is.
  - The creation of the new object can be changed by passing the `createEmptyEntity` option.
