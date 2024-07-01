import { ParsedRequestFields } from '../models/parsed-request';

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

export function isValid(value: any): value is object {
  return value !== null && value !== undefined;
}
