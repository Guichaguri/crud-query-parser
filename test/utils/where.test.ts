import { test } from 'vitest';
import { validateWhereField } from '../../src/utils/where';
import { CrudRequestWhereOperator } from '../../src';

test('validateWhereField', () => {
  validateWhereField({ field: ['field'], operator: CrudRequestWhereOperator.EQ, value: 'sample' });
  validateWhereField({ field: ['field'], operator: CrudRequestWhereOperator.IN, value: ['sample'] });
  validateWhereField({ field: ['field'], operator: CrudRequestWhereOperator.IS_NULL, value: null });
});
