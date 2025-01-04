import { expect, test } from 'vitest';
import {
  pathEquals,
  pathGetBaseAndName,
  pathGetFieldName,
  pathGetValue,
  pathHasBase,
  pathParse,
  pathSetValue,
  pathStartsWith
} from '../../src/utils/field-path';

test('pathParse', () => {
  expect(pathParse('path.to.field')).toEqual(['path', 'to', 'field']);
  expect(pathParse(['path', 'to', 'field'])).toEqual(['path', 'to', 'field']);
});

test('pathEquals', () => {
  expect(pathEquals(['same'], ['same'])).toBe(true);
  expect(pathEquals(['one'], ['another'])).toBe(false);
  expect(pathEquals(['one'], ['one', 'different'])).toBe(false);
});

test('pathStartsWith', () => {
  expect(pathStartsWith(['same'], ['same'])).toBe(true);
  expect(pathStartsWith(['one'], ['another'])).toBe(false);
  expect(pathStartsWith(['one'], ['one', 'different'])).toBe(false);
  expect(pathStartsWith(['one', 'different'], ['one'])).toBe(true);
});

test('pathHasBase', () => {
  expect(pathHasBase(['same'], ['same'])).toBe(false);
  expect(pathHasBase(['one'], ['another'])).toBe(false);
  expect(pathHasBase(['one'], ['one', 'different'])).toBe(false);
  expect(pathHasBase(['one', 'different'], ['one'])).toBe(true);
  expect(pathHasBase(['path', 'to', 'field'], ['path', 'to'])).toBe(true);
  expect(pathHasBase(['path', 'to', 'field'], ['path'])).toBe(false);
});

test('pathGetBaseAndName', () => {
  expect(pathGetBaseAndName(['field'])).toEqual([[], 'field']);
  expect(pathGetBaseAndName(['path', 'to', 'field'])).toEqual([['path', 'to'], 'field']);
});

test('pathGetBaseAndName throws an error', () => {
  expect(() => pathGetBaseAndName([])).toThrow(Error);
});

test('pathGetFieldName', () => {
  expect(pathGetFieldName(['field'])).toBe('field');
  expect(pathGetFieldName(['path', 'to', 'field'])).toBe('field');
});

test('pathGetValue', () => {
  expect(pathGetValue({ field: 'sample' }, ['field'])).toBe('sample');
  expect(pathGetValue({ field: { another: true } }, ['field', 'another'])).toBe(true);
  expect(pathGetValue({ field: undefined }, ['field', 'another'])).toBe(undefined);
});

test('pathGetValue throws an error', () => {
  expect(() => pathGetValue({ field: true }, ['field', 'another'])).toThrow(Error);
});

test('pathSetValue', () => {
  const obj = {};

  pathSetValue(obj, ['field'], 'sample');
  pathSetValue(obj, ['another', 'field'], true);

  expect(obj).toEqual({
    field: 'sample',
    another: {
      field: true,
    },
  });
});

test('pathSetValue throws an error', () => {
  expect(() => pathSetValue({ field: true }, ['field', 'another'], 'sample')).toThrow(Error);
});
