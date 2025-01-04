import { expect, test } from 'vitest';
import {
  createParamGetter,
  getParamJSON,
  getParamNumber,
  getParamString,
  getParamStringArray
} from '../../src/utils/parser';

test('createParamGetter', () => {
  const objectGetter = createParamGetter({ field: 'true' });

  expect(objectGetter('field')).toBe('true');
  expect(objectGetter('another')).toBe(null);

  const searchGetter = createParamGetter(new URLSearchParams({ field: 'true' }));

  expect(searchGetter('field')).toBe('true');
  expect(searchGetter('another')).toBe(null);
});

test('getParamString', () => {
  expect(getParamString('sample')).toBe('sample');
  expect(getParamString(['sample', 'another'])).toBe('sample');
  expect(getParamString(undefined)).toBe(undefined);
});

test('getParamStringArray', () => {
  expect(getParamStringArray(['sample', 'another'])).toEqual(['sample', 'another']);
  expect(getParamStringArray(['sample', {}, undefined, 'another'])).toEqual(['sample', 'another']);
  expect(getParamStringArray('sample')).toEqual(['sample']);
  expect(getParamStringArray('sample,another')).toEqual(['sample,another']);
  expect(getParamStringArray('sample,another', ',')).toEqual(['sample', 'another']);
  expect(getParamStringArray(undefined)).toEqual([]);
});

test('getParamNumber', () => {
  expect(getParamNumber('10')).toBe(10);
  expect(getParamNumber(['10', '23'])).toBe(10);
  expect(getParamNumber('nope')).toBe(undefined);
  expect(getParamNumber([])).toBe(undefined);
  expect(getParamNumber(undefined)).toBe(undefined);
});

test('getParamJSON', () => {
  expect(getParamJSON('{"something": true}')).toEqual({ something: true });
  expect(getParamJSON(['10', '"hello"'])).toBe(10);
  expect(getParamJSON({ something: true })).toEqual({ something: true });
  expect(getParamJSON([])).toBe(undefined);
  expect(getParamJSON(undefined)).toBe(undefined);
});
