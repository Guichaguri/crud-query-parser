
interface ApiQueryOptions {
  name: string;
  type: string;
  isArray?: boolean;
}

export const ApiQuery = (() => {
  try {
    return require('@nestjs/swagger').ApiQuery;
  } catch (error) {
    return (options: ApiQueryOptions): MethodDecorator => {
      return () => {};
    };
  }
})();
