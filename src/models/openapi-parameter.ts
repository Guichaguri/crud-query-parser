
export interface OpenAPIParameter {
  name: string;
  description?: string;
  required?: boolean;
  schema?: OpenAPISchema;
  style?: string;
  explode?: boolean;
}

export interface OpenAPISchema {
  type: string;
  default?: string;
  items?: OpenAPISchema;
}
