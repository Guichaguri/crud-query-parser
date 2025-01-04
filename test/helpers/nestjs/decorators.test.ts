import { describe, expect, test, vi } from 'vitest';
import { Crud, ParseCrudRequest } from '../../../src/helpers/nestjs';
import { CrudRequestParser } from '../../../src/parsers/crud';

describe('Crud decorator', () => {
  test('should create parser and get OpenAPI params', () => {
    const parser = new CrudRequestParser();
    const openApiSpy = vi.spyOn(parser, 'getOpenAPIParameters');

    const decorator = Crud(parser);

    expect(decorator).toBeTypeOf('function');
    expect(openApiSpy).toHaveBeenCalled();
  });

  test('should fail to create invalid parser', () => {
    expect(() => Crud(null as any)).toThrow(Error);
  });
});

describe('ParseCrudRequest decorator', () => {
  test('should create get parser', () => {
    const parser = new CrudRequestParser();

    const decorator = ParseCrudRequest(parser);

    expect(decorator).toBeTypeOf('function');
  });
});
