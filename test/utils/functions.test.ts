import { expect, test } from 'vitest';
import {
  createInstance,
  ensureArray,
  ensureEmpty,
  ensurePrimitive,
  ensurePrimitiveOrNull,
  ensureString,
  escapeRegex,
  getOffset,
  isValid
} from '../../src/utils/functions';

test('ensurePrimitive', () => {
  expect(ensurePrimitive('field', 10)).toBe(10);
  expect(ensurePrimitive('field', 'sample')).toBe('sample');
  expect(ensurePrimitive('field', true)).toBe(true);
  expect(ensurePrimitive('field', new Date(1))).toStrictEqual(new Date(1));
  expect(() => ensurePrimitive('field', null)).toThrow(Error);
  expect(() => ensurePrimitive('field', undefined)).toThrow(Error);
  expect(() => ensurePrimitive('field', {})).toThrow(Error);
  expect(() => ensurePrimitive('field', [])).toThrow(Error);
  expect(() => ensurePrimitive('field', () => {})).toThrow(Error);
});

test('ensurePrimitiveOrNull', () => {
  expect(ensurePrimitiveOrNull('field', 10)).toBe(10);
  expect(ensurePrimitiveOrNull('field', 'sample')).toBe('sample');
  expect(ensurePrimitiveOrNull('field', true)).toBe(true);
  expect(ensurePrimitiveOrNull('field', new Date(1))).toStrictEqual(new Date(1));
  expect(ensurePrimitiveOrNull('field', null)).toBe(null);
  expect(ensurePrimitiveOrNull('field', undefined)).toBe(undefined);
  expect(() => ensurePrimitiveOrNull('field', {})).toThrow(Error);
  expect(() => ensurePrimitiveOrNull('field', [])).toThrow(Error);
  expect(() => ensurePrimitive('field', () => {})).toThrow(Error);
});

test('ensureString', () => {
  expect(ensureString('field', 'sample')).toBe('sample');
  expect(() => ensureString('field', 10)).toThrow(Error);
  expect(() => ensureString('field', true)).toThrow(Error);
  expect(() => ensureString('field', new Date(1))).toThrow(Error);
  expect(() => ensureString('field', null)).toThrow(Error);
  expect(() => ensureString('field', undefined)).toThrow(Error);
  expect(() => ensureString('field', {})).toThrow(Error);
  expect(() => ensureString('field', [])).toThrow(Error);
  expect(() => ensureString('field', () => {})).toThrow(Error);
});

test('ensureArray', () => {
  expect(ensureArray('field', ['sample'])).toEqual(['sample']);
  expect(ensureArray('field', [])).toEqual([]);
  expect(ensureArray('field', ['sample'], 1)).toEqual(['sample']);
  expect(() => ensureArray('field', [], 1)).toThrow(Error);
  expect(() => ensureArray('field', 10)).toThrow(Error);
  expect(() => ensureArray('field', 'sample')).toThrow(Error);
  expect(() => ensureArray('field', true)).toThrow(Error);
  expect(() => ensureArray('field', new Date(1))).toThrow(Error);
  expect(() => ensureArray('field', null)).toThrow(Error);
  expect(() => ensureArray('field', undefined)).toThrow(Error);
  expect(() => ensureArray('field', {})).toThrow(Error);
  expect(() => ensureArray('field', () => {})).toThrow(Error);
});

test('ensureEmpty', () => {
  ensureEmpty('field', true);
  ensureEmpty('field', null);
  ensureEmpty('field', undefined);

  expect(() => ensureEmpty('field', 10)).toThrow(Error);
  expect(() => ensureEmpty('field', 'sample')).toThrow(Error);
  expect(() => ensureEmpty('field', false)).toThrow(Error);
  expect(() => ensureEmpty('field', new Date(1))).toThrow(Error);
  expect(() => ensureEmpty('field', {})).toThrow(Error);
  expect(() => ensureEmpty('field', [])).toThrow(Error);
  expect(() => ensureEmpty('field', () => {})).toThrow(Error);
});

test('isValid', () => {
  expect(isValid(null)).toBe(false);
  expect(isValid(undefined)).toBe(false);
  expect(isValid(10)).toBe(true);
  expect(isValid(0)).toBe(true);
  expect(isValid('sample')).toBe(true);
  expect(isValid('')).toBe(true);
  expect(isValid(true)).toBe(true);
  expect(isValid(false)).toBe(true);
  expect(isValid(new Date())).toBe(true);
  expect(isValid({})).toBe(true);
  expect(isValid([])).toBe(true);
  expect(isValid(() => {})).toBe(true);
});

test('getOffset', () => {
  expect(getOffset(10)).toBe(10);
  expect(getOffset(undefined)).toBe(0);
  expect(getOffset(undefined, 2, 3)).toBe(4);
});

test('createInstance', () => {
  class Something {}

  expect(createInstance(Something)).toBeInstanceOf(Something);
  expect(createInstance(new Something())).toBeInstanceOf(Something);
  expect(createInstance(undefined)).toBeUndefined();
});

test('escapeRegex', () => {
  expect(escapeRegex('regular-text')).toBe('regular-text');
  expect(escapeRegex('(special)')).toBe('\\(special\\)');
});
