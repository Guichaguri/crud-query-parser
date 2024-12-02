import { isValid } from './functions';

/**
 * Parses a path by splitting it by dots
 *
 * @param value The full path as a string or the parts already split
 */
export function pathParse(value: string | string[]): string[] {
  if (typeof value === 'string')
    return value.split('.');

  return value;
}

/**
 * Checks whether two field paths are equal
 *
 * E.g. ["path", "to", "field"] is equal to ["path", "to", "field"] but not ["something", "else"]
 */
export function pathEquals(path1: string[], path2: string[]): boolean {
  if (path1.length !== path2.length)
    return false;

  return path1.every((p1, i) => path2[i] === p1);
}

/**
 * Checks whether a path starts with another path.
 *
 * E.g. ["path", "to", "field"] starts with ["path"] or ["path", "to"] but not ["something", "else"]
 */
export function pathStartsWith(path: string[], start: string[]): boolean {
  if (path.length < start.length)
    return false;

  return start.every((start, i) => path[i] === start);
}

/**
 * Checks whether the base of a path matches.
 *
 * E.g. ["path", "to", "field"] has a base of ["path", "to"] but not ["path"]
 */
export function pathHasBase(path: string[], base: string[]): boolean {
  if (path.length - 1 !== base.length)
    return false;

  return base.every((start, i) => path[i] === start);
}

/**
 * Breaks a path into the base part and the field name part
 *
 * @param path The full path
 */
export function pathGetBaseAndName(path: string[]): [string[], string] {
  if (path.length === 0)
    throw new Error('Cannot break an empty path');

  const base = [...path];
  const name = base.pop()!;

  return [base, name];
}


/**
 * Gets the last part of the path: the field name
 *
 * @param path The full path
 */
export function pathGetFieldName(path: string[]): string {
  return path[path.length - 1];
}

/**
 * Sets a value for the given path
 *
 * @param obj The root object
 * @param field The full field path
 */
export function pathGetValue(obj: object, field: string[]): any {
  let value: any = obj;

  for (let i = 0; i < field.length; i++) {
    const name = field[i];

    if (!isValid(value))
      return undefined;

    if (typeof value !== 'object')
      throw new Error(`Cannot get ${name} as it is not an object (got ${typeof value})`);

    value = value[name];
  }

  return value;
}

/**
 * Sets a value for the given path
 *
 * @param obj The root object
 * @param field The full field path
 * @param value The value to be set
 */
export function pathSetValue(obj: object, field: string[], value: any): void {
  let self: any = obj;

  for (let i = 0; i < field.length; i++) {
    const name = field[i];

    if (typeof self !== 'object')
      throw new Error(`Cannot set ${name} as it is not an object (got ${typeof self})`);

    const isLast = i === field.length - 1;

    if (isLast)
      self[name] = value;
    else if (!isValid(self[name]))
      self = self[name] = {};
    else
      self = self[name];
  }
}
