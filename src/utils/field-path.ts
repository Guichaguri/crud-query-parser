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
