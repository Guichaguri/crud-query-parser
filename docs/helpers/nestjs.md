# NestJS Helper

## `@Crud()`

This decorator can be added to a controller method in order to define which parser will be enabled.
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

  @Get(':id')
  @Crud(new CrudRequestParser({
    // You can customize which parameters you want to disable
    disableWhere: false,
    disableOrder: false,
    disableLimit: false,
    disableOffset: false,
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
