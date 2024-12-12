# CRUD Request Parser

The CRUD parser is an implementation of the `@nestjsx/crud` [query params format](https://github.com/nestjsx/crud/wiki/Requests#query-params).

## Getting Started

```ts
import { CrudRequestParser } from 'crud-query-parser/parsers/crud';

const parser = new CrudRequestParser();

// Then, you have to pass a query string object to it
const crudRequest = parser.parse(request.query);
```

## Options

```ts
const parser = new CrudRequestParser({
  // Whether the `fields` and `select` parameters will be disabled
  disableSelect: false,
  // Whether the `s`, `filter` and `or` parameters will be disabled
  disableWhere: false,
  // Whether the `sort` parameter will be disabled
  disableOrder: false,
  // Whether the `join` parameter will be disabled
  disableRelations: false,
  // Whether the `limit` and `per_page` parameters will be disabled
  disableLimit: false,
  // Whether the `offset` and `page` parameters will be disabled
  disableOffset: false,
});
```

You can disable parameters if you wish to do so. For instance, you might want to disable order, limit and offset for getOne() calls.

## Query Parameters

### Select Fields (`fields`)

Let you list which fields will be returned by the query.
Adds a "SELECT" to the query.

- Syntax: `?fields=id,title,description`

### Sort

Let you specify the fields from that the items will be sorted.
Adds an "ORDER BY" to the query.

- Syntax: `?sort=title`
- Syntax: `?sort=title,ASC&sort=createdAt,DESC`

### Relations (`join`)

Let you specify the relational objects that will be fetched.
Adds a "LEFT JOIN" to the query.

- Syntax: `?join=category`
- Syntax: `?join=category||id,name`
- Syntax: `?join=category||id,name&join=category.parent||id,name`

### Limit

Let you specify how many items will be returned.
Adds a "LIMIT" to the query.

- Syntax: `?limit=25`

### Offset and Page

Let you specify where it will start returning items. You can specify only one of `page` and `offset`.

The first page is `1` and the first item has an offset of `0`.

- Syntax: `?page=2`
- Syntax: `?offset=230`

### Search Conditions (`s`)

Let you specify which filters it will apply to the query.
Adds a "WHERE" filter.

- Syntax: `?s={"title": "Hello World"}` (title == 'Hello World')
- Syntax: `?s={"id": 4, "isActive": true}` (id == 4 && isActive == true)
- Syntax: `?s={"createdAt": {"$lt": "2024-01-01"}}` (createdAt < '2024-01-01')
- Syntax: `?s={"$or": [ {"id": 4}, {"isActive": true} ]}` (id == 4 || isActive == true)

#### Operators

- `$eq`: equal (`=`)
- `$ne`: not equal (`!=`)
- `$gt`: greater than (`>`)
- `$lt`: lower than (`<`)
- `$gte`: greater than or equal (`>=`)
- `$lte`: lower than or equal (`<=`)
- `$starts`: starts with (`LIKE val%`)
- `$ends`: ends with (`LIKE %val`)
- `$cont`: contains (`LIKE %val%`)
- `$excl`: not contains (`NOT LIKE %val%`)
- `$in`: in range, accepts an array of values (`IN`)
- `$notin`: not in range, accepts an array of values (`NOT IN`)
- `$isnull`: is null (`IS NULL`)
- `$notnull`: not null (`IS NOT NULL`)
- `$between`: between, accepts an array of two values (`BETWEEN`)
- `$eqL`: equal lowercase (`LOWER(field) =`)
- `$neL`: not equal lowercase (`LOWER(field) !=`)
- `$startsL`: starts with lowercase (`LIKE|ILIKE val%`)
- `$endsL`: ends with lowercase (`LIKE|ILIKE %val`)
- `$contL`: contains lowercase (`LIKE|ILIKE %val%`)
- `$exclL`: not contains lowercase (`NOT LIKE|ILIKE %val%`)
- `$inL`: in range lowercase, accepts an array of values (`LOWER(field) IN`)
- `$notinL`: not in range lowercase, accepts an array of values (`LOWER(field) NOT IN`)
- `$and`: conjunction, accepts an array of conditions (`AND`)
- `$or`: disjunction, accepts an array of conditions (`OR`)

### Other parameters

The query parameters `select`, `filter`, `or` and `per_page` are also supported for compatibility purposes, but these are considered deprecated.
