import { ExecutionContext, Type } from '@nestjs/common';
import { OpenAPIParameter } from '../../models/openapi-parameter';

export const ApiQuery = (() => {
  try {
    return require('@nestjs/swagger').ApiQuery;
  } catch (error) {
    return (options: OpenAPIParameter): MethodDecorator => {
      return () => {};
    };
  }
})();

export function createInstance<T>(data: T | Type<T> | undefined): T | undefined {
  if (typeof data === 'function')
    return new data();

  if (typeof data === 'object')
    return data as T;

  return undefined;
}

export function getMetadataFromContext<T>(context: ExecutionContext, key: string): T | undefined {
  const targets = [
    context.getHandler(),
    context.getClass(),
  ];

  for (const target of targets) {
    const data = Reflect.getMetadata(key, target);

    if (data)
      return data;
  }

  return undefined;
}
