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
