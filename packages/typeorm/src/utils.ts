
export function ensureArray<T>(fieldName: string, data: T[] | any, minLength: number = 0): T[] {
  if (!Array.isArray(data) || data.length < minLength)
    throw new Error(`${fieldName} must be an array with at least ${minLength} items`);

  return data;
}

export function ensureFalsy(fieldName: string, data: any) {
  if (data)
    throw new Error(`${fieldName} must be null`);
}
