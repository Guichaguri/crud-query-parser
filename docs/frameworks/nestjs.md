# NestJS Support

## With Decorators

### `@Crud()`

This decorator can be added to a controller method in order to define which parser will be enabled.
It also adds the OpenAPI metadata for the query parameters.

It should be used alongside `@ParseCrudRequest()`.

### `@ParseCrudRequest()`

This decorator can be added to a controller method parameter in order to bind the parsed `CrudRequest`.

### Usage

```ts
import { Crud, ParseCrudRequest } from 'crud-query-parser/helpers/nestjs';

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

  @Get(':id')
  @Crud(new CrudRequestParser({
    // You can customize which parameters you want to disable
    disableWhere: true,
    disableOrder: true,
    disableLimit: true,
    disableOffset: true,
  }))
  public async getOne(
    @Param('id') id: string,
    @ParseCrudRequest() crudRequest: CrudRequest,
  ) {
    return this.service.getOne(id, crudRequest);
  }

}
```
```ts
@Injectable()
export class UserService {

  protected adapter = new TypeOrmQueryAdapter();

  constructor(
    @InjectRepository(UserEntity)
    private repository: Repository<UserEntity>,
  ) {}

  public async getMany(crudRequest: CrudRequest) {
    return await this.adapter.getMany(this.repository.createQueryBuilder(), crudRequest);
  }

  public async getOne(id: string, crudRequest: CrudRequest) {
    // Adds the id to the where condition
    crudRequest = ensureEqCondition(crudRequest, { id });
    
    return await this.adapter.getOne(this.repository.createQueryBuilder(), crudRequest);
  }

}
```

## Without Decorators

You can parse the query parameters manually and also do the OpenAPI/Swagger definition by yourself. Here's an example:

```ts
@Controller('posts')
export class PostController {

  constructor(
    private service: PostService,
  ) {}

  @Get()
  // You have to add all @ApiQuery() manually here for OpenAPI/Swagger support
  public async getMany(@Query() query) {
    return this.service.getMany(query);
  }

  @Get(':id')
  // You have to add all @ApiQuery() manually here for OpenAPI/Swagger support
  public async getOne(
    @Param('id') id: string,
    @Query() query,
  ) {
    return this.service.getOne(id, query);
  }

}
```
```ts
@Injectable()
export class UserService {

  protected parser = new CrudRequestParser();
  protected adapter = new TypeOrmQueryAdapter();

  constructor(
    @InjectRepository(UserEntity)
    private repository: Repository<UserEntity>,
  ) {
  }

  public async getMany(query: any) {
    const crudRequest = this.parser.parse(query);
    
    return await this.adapter.getMany(this.repository.createQueryBuilder(), crudRequest);
  }

  public async getOne(id: string, query: any) {
    const crudRequest = this.parser.parse(query);
    
    // Adds the id to the where condition
    crudRequest = ensureEqCondition(crudRequest, { id });

    return await this.adapter.getOne(this.repository.createQueryBuilder(), crudRequest);
  }
  
}
```
