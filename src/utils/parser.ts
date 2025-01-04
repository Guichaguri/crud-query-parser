import { RequestParamValue } from '../models/request-parser';
import { isValid } from './functions';

export function createParamGetter(query: Record<string, RequestParamValue> | URLSearchParams): (name: string) => RequestParamValue {
  if (query instanceof URLSearchParams) {
    return query.get.bind(query);
  }

  return (name: string) => query[name] ?? null;
}

export function getParamString(value: RequestParamValue): string | undefined {
  if (Array.isArray(value))
    value = value[0];

  if (typeof value !== 'string')
    return undefined;

  return value;
}

export function getParamStringArray(value: RequestParamValue, split?: string): string[] {
  if (Array.isArray(value))
    return value.filter(item => typeof item === 'string');

  if (typeof value === 'string')
    return split ? value.split(split) : [value];

  return [];
}

export function getParamNumber(value: RequestParamValue): number | undefined {
  if (Array.isArray(value))
    value = value.length > 0 ? value[0] : undefined;

  if (!isValid(value))
    return undefined;

  const num = Number(value);

  return isNaN(num) ? undefined : num;
}

export function getParamJSON<T>(value: RequestParamValue): T | undefined {
  if (Array.isArray(value))
    value = value.length > 0 ? value[0] : undefined;

  if (typeof value === 'string')
    return JSON.parse(value);

  if (typeof value === 'object')
    return value as T;

  return undefined;
}
