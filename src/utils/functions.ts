import { CrudRequestFields } from '../models/crud-request';

export function ensurePrimitive(fieldName: string, data: any): number | string | boolean | Date {
  if (typeof data === 'number' || typeof data === 'string' || typeof data === 'boolean' || data instanceof Date)
    return data;

  throw new Error(`${fieldName} must be a string, number or boolean`);
}

export function ensurePrimitiveOrNull(fieldName: string, data: any): number | string | boolean | Date | undefined | null {
  if (data === null || data === undefined)
    return data;

  if (typeof data === 'number' || typeof data === 'string' || typeof data === 'boolean' || data instanceof Date)
    return data;

  throw new Error(`${fieldName} must be a string, number, boolean or null`);
}

export function ensureString(fieldName: string, data: any): string {
  if (typeof data === 'string')
    return data;

  throw new Error(`${fieldName} must be a string, number or boolean`);
}

export function ensureArray<T>(fieldName: string, data: T[] | any, minLength: number = 0): T[] {
  if (!Array.isArray(data) || data.length < minLength)
    throw new Error(`${fieldName} must be an array with at least ${minLength} items`);

  return data;
}

export function ensureEmpty(fieldName: string, data: any) {
  if (isValid(data) && data !== true)
    throw new Error(`${fieldName} must be true, null or undefined`);
}

export function isValid<T>(value: T | undefined | null): value is T {
  return value !== null && value !== undefined;
}

export function getOffset(offset: number | undefined, limit?: number, page?: number): number {
  return offset ?? (limit && page ? limit * page : 0);
}

export interface Type<T> extends Function { new (... args: any[]): T; }

export function createInstance<T extends object>(clazzOrInstance: T | Type<T> | undefined): T | undefined {
  if (typeof clazzOrInstance === 'function')
    return new clazzOrInstance();

  if (typeof clazzOrInstance === 'object')
    return clazzOrInstance as T;

  return undefined;
}
