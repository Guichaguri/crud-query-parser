export type FieldRule = 'allow-unsafe' | 'deny' | 'ignore';

export function validateFieldRule(rule: FieldRule, source: string, path: string[]): boolean {
  if (rule === 'allow-unsafe')
    return true;

  if (rule === 'deny')
    throw new Error(`${source} field "${path.join('.')}" is invalid.`);

  // rule === 'ignore'
  return false;
}
