# NestJS Helper

## `@Crud()`

This decorator can be added to a controller method in order to enable define which parser will be enabled.
It also adds the OpenAPI metadata for the query parameters.

It should be used alongside `@ParseCrudRequest()`.

## `@ParseCrudRequest()`

This decorator can be added to a controller method parameter in order to bind the parsed `CrudRequest`.

It should be used alongside `@Crud()`.

## Usage

```ts
@Controller('posts')
export class PostController {

  constructor(
    private service: PostService,
  ) {}

  @Get()
  @Crud(CrudRequestParser) // <- You specify which parser to use
  public async getMany(@ParseCrudRequest() crudRequest: CrudRequest) { // <- The request query will be automatically parsed
    return this.service.getMany(crudRequest);
  }

}
```
