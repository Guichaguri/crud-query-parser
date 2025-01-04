import { describe, expect, test, vi } from 'vitest';
import { Request } from 'express';
import { crud } from '../../../src/helpers/express';
import { CrudRequestParser } from '../../../src/parsers/crud';

describe('express crud middleware', () => {
  test('should create a request handler that injects getCrudRequest', async () => {
    const parser = new CrudRequestParser();
    const spy = vi.spyOn(parser, 'parse');

    const middleware = crud(parser);

    expect(middleware).toBeTypeOf('function');

    const req: Request = { query: {} } as any;

    await new Promise(resolve => middleware(req, {} as any, resolve));

    expect(req.getCrudRequest).toBeTypeOf('function');

    req.getCrudRequest();
    req.getCrudRequest();

    expect(spy).toHaveBeenCalledOnce();
  });

  test('should throw with an invalid parser', () => {
    expect(() => crud(null as any)).toThrow(Error);
  });
});
