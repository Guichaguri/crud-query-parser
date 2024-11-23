import { CrudRequestFields } from '../models/crud-request';

/*export function setFieldByPath<T>(obj: ParsedRequestFields<T>, field: string, value: T): void {
  const parts = field.split('.');

  while (parts.length > 1) {
    const name = parts.shift();

    if (!Array.isArray(obj[name]))
      obj[name] = {};

    obj = obj[name] as ParsedRequestFields<T>;
  }

  obj[parts.shift()] = value;
}*/

export function ensurePrimitive(fieldName: string, data: any) {
  if (data === null || data === undefined)
    return;

  if (typeof data === 'number' || typeof data === 'string' || typeof data === 'boolean')
    return;

  if (data instanceof Date)
    return;

  throw new Error(`${fieldName} must be a string, number, boolean or null`);
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
