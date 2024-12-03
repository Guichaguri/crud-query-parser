import { Request, RequestHandler, Response } from 'express';
import { RequestParser } from '../../models/request-parser';
import { CrudRequest } from '../../models/crud-request';
import { createInstance, Type } from '../../utils/functions';

declare global {
  namespace Express {
    interface Request {
      /**
       * Gets the CrudRequest for this request.
       * This will parse the request once and memoize it.
       *
       * @param ignoreMemoized Whether it should parse again and ignore the memoized value.
       */
      getCrudRequest: (ignoreMemoized?: boolean) => CrudRequest;
    }
  }
}

/**
 * The crud middleware allows getting the CrudRequest through `req.getCrudRequest()`,
 * which parses and memoizes the query parameters.
 *
 * @param instance The parser instance or class
 */
export function crud(instance: RequestParser | Type<RequestParser>): RequestHandler {
  const parser = createInstance(instance);

  if (!parser)
    throw new Error('Invalid RequestParser instance passed');

  return (req: Request, res: Response, done: (error?: Error) => void) => {
    let crudRequest: CrudRequest | undefined;

    req.getCrudRequest = (ignoreMemoized?: boolean) => {
      if (!crudRequest || ignoreMemoized)
        crudRequest = parser.parse(req.query);

      return crudRequest;
    };

    done();
  };
}
