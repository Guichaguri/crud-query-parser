import { describe, expect, test, vi } from 'vitest';
import { ExecutionContext } from '@nestjs/common';
import { ApiQuery, getMetadataFromContext, parseCrudRequest } from '../../../src/helpers/nestjs/utils';
import { CrudRequestParser } from '../../../src/parsers/crud';

describe('ApiQuery', () => {
  test('should return original decorator', () => {
    expect(ApiQuery).toBeTypeOf('function');
    expect(ApiQuery({ name: 'something' })).toBeTypeOf('function');
  });

  test('should return mocked decorator', async () => {
    // The code below mocks the require() function in order to throw an exception when importing @nestjs/swagger
    // A hacky test for a hacky solution
    const { Module, originalLoad } = await vi.hoisted(async () => {
      const { Module } = (await import('module')) as any;

      const originalLoad = Module._load;

      Module._load = (uri: string, parent: any): any => {
        if (uri === '@nestjs/swagger')
          throw new Error();

        return originalLoad(uri, parent);
      };

      return { Module, originalLoad };
    });

    expect(ApiQuery).toBeTypeOf('function');
    expect(ApiQuery({ name: 'something' })).toBeTypeOf('function');

    Module._load = originalLoad;
  });
});

describe('getMetadataFromContext', () => {
  test('should return existing metadata', async () => {
    const obj = {};

    Reflect.defineMetadata('sample', 'hello world', obj);

    const context: ExecutionContext = {
      getHandler: () => obj,
      getClass: () => obj,
    } as any;

    expect(getMetadataFromContext(context, 'sample')).toBe('hello world');
    expect(getMetadataFromContext(context, 'missing')).toBe(undefined);
  });
});

describe('parseCrudRequest', () => {
  const context: ExecutionContext = {
    switchToHttp: () => ({
      getRequest: () => ({
        query: { fields: 'name' },
      }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as any;

  test('should return empty when no instance is defined', () => {
    const crudRequest = parseCrudRequest(undefined, context);

    expect(crudRequest).toEqual({
      where: { and: [] },
      select: [],
      order: [],
      relations: [],
    });
  });

  test('should call parse when instance is passed', () => {
    const parser = new CrudRequestParser();
    const parse = vi.spyOn(parser, 'parse');

    parseCrudRequest(parser, context);

    expect(parse).toHaveBeenCalled();
  });
});
