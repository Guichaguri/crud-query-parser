# CrudRequest

## FieldPath

All fields represented in a `CrudRequest` are field paths.

Field paths represent the path to reach a field. For instance, `category.name` become `['category', 'name']`.

## Properties

### `select`

The list of fields to return. The equivalent in SQL is `SELECT`

In case the list is empty, all fields are returned.

```ts
// SELECT title, category.name
select: [
  { field: ['title'] },
  { field: ['category', 'name'] }
]
```

### `relations`

The list of relations to join. The equivalent in SQL is `LEFT JOIN`

```ts
// LEFT JOIN category ON post.categoryId = category.id
relations: [
  { field: ['category'] },
]
```

### `order`

The fields that the result should be sorted by. The equivalent in SQL is `ORDER BY`

```ts
// ORDER BY title DESC, id ASC
order: [
  { field: ['title'], order: 'DESC' },
  { field: ['id'], order: 'ASC' },
]
```

### `limit`

The maximum amount of entities to return. The equivalent in SQL is `LIMIT`

### `page` or `offset`

Allows offsetting the results by a number.

Either one of `page` or `offset` may exist. `offset` should take precedence.

#### `offset`

Starts at 0. Sets how many items it will offset the results.

#### `page`

Starts at 1, sets the offset by being multiplied by the limit.
The resulting offset is: `offset = (page - 1) * limit`.

This parameter requires a `limit` to be defined.

### `where`

The conditions that will filter the results. The equivalent in SQL is `WHERE`

All the where cases can be used together, here's a full example:
```ts
// WHERE title LIKE 'Hello%' AND (isActive = true OR authorId = 2)
where: {
  and: [
    { field: ['title'], operator: CrudRequestWhereOperator.STARTS, value: 'Hello' },
    {
      or: [
        { field: ['isActive'], operator: CrudRequestWhereOperator.EQ, value: true },
        { field: ['authorId'], operator: CrudRequestWhereOperator.EQ, value: 2 },
      ],
    },
  ],
}
```

#### `and`

Allows comparing the inner conditions with an `AND` operator

```ts
// WHERE ... AND ... AND ...
where: {
  and: [
    // more where conditions here
  ]
}
```

#### `or`

Allows comparing the inner conditions with an `OR` operator

```ts
// WHERE ... OR ... OR ...
where: {
  or: [
    // more where conditions here
  ]
}
```

#### `field`, `operator` and `value`

Allows comparing fields to values with the chosen operator

```ts
// WHERE category.name LIKE '%Foo%'
where: {
  field: ['category', 'name'],
  operator: CrudRequestWhereOperator.CONTAINS,
  value: 'Foo'
}
```

Operators:
- `EQ`: Equals (`column = value`)
- `NEQ`: Not Equals (`column <> value`)
- `GT`: Greater than (`column > value`)
- `GTE`: Greater than or equal (`column >= value`)
- `LT`: Less than (`column < value`)
- `LTE`: Less than or equal (`column <= value`)
- `STARTS`: Starts with (`column LIKE value + '%'`)
- `ENDS`: Ends with (`column LIKE '%' + value`)
- `CONTAINS`: Contains (`column LIKE '%' + value + '%'`)
- `NOT_CONTAINS`: Not contains (`column NOT LIKE '%' + value + '%'`)
- `IN`: Includes (`column IN (value[0], value[1], ...)`)
- `NOT_IN`: Not includes (`column NOT IN (value[0], value[1], ...)`)
- `BETWEEN`: Between (`column BETWEEN value[0] AND value[1]`)
- `IS_NULL`: Is null (`column IS NULL`)
- `NOT_NULL`: Is not null (`column IS NOT NULL`)
- `EQ_LOWER`: Equals (case-insensitive) (`LOWER(column) = value`)
- `NEQ_LOWER`: Not equals (case-insensitive) (`LOWER(column) <> value`)
- `STARTS_LOWER`: Starts with (case-insensitive) (`LOWER(column) LIKE value + '%'`)
- `ENDS_LOWER`: Ends with (case-insensitive) (`LOWER(column) LIKE '%' + value`)
- `CONTAINS_LOWER`: Contains (case-insensitive) (`LOWER(column) LIKE '%' + value + '%'`)
- `NOT_CONTAINS_LOWER`: Not contains (case-insensitive) (`LOWER(column) NOT LIKE '%' + value + '%'`)
- `IN_LOWER`: Includes (case-insensitive) (`LOWER(column) IN (value[0], value[1], ...)`)
- `NOT_IN_LOWER`: Not includes (case-insensitive) (`LOWER(column) NOT IN (value[0], value[1], ...)`)

## Full Example

```ts
const crudRequest: CrudRequest = {
  select: [
    { field: ['title'] },
    { field: ['category', 'name'] },
  ],
  relations: [
    { field: ['category'] },
  ],
  order: [
    { field: ['id'], order: 'DESC' },
  ],
  where: {
    and: [
      { field: ['id'], operator: CrudRequestWhereOperator.NEQ, value: 10 },
      { field: ['isActive'], operator: CrudRequestWhereOperator.EQ, value: true },
      { field: ['category', 'name'], operator: CrudRequestWhereOperator.CONTAINS, value: 'Music' },
      {
        or: [
          { field: ['createdAt'], operator: CrudRequestWhereOperator.LTE, value: new Date(2025, 0, 1) },
          { field: ['authorId'], operator: CrudRequestWhereOperator.EQ, value: 42 },
        ],
      }
    ],
  },
  page: 2,
  limit: 25,
};
```

The equivalent SQL would be:

```sql
SELECT post.title, category.name
FROM posts as post
LEFT JOIN categories as category ON category.id = post.categoryId
WHERE post.id <> 10 AND post.isActive = true AND category.name LIKE '%Music%' AND (post.createdAt <= '2025-01-01' OR authorId = 42)
ORDER BY post.id DESC
LIMIT 25 OFFSET 25
```
