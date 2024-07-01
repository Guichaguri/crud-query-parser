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

export function ensureArray<T>(fieldName: string, data: T[] | any, minLength: number = 0): T[] {
  if (!Array.isArray(data) || data.length < minLength)
    throw new Error(`${fieldName} must be an array with at least ${minLength} items`);

  return data;
}

export function ensureFalsy(fieldName: string, data: any) {
  if (data)
    throw new Error(`${fieldName} must be null`);
}

export function isValid(value: any): value is object {
  return value !== null && value !== undefined;
}
