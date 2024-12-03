
export interface GetManyResult<T> {

  /**
   * The entity list
   */
  data: T[];

  /**
   * The amount of entities returned
   */
  count: number;

  /**
   * The total amount of entities in the database
   */
  total: number;

  /**
   * The current page number, starting at 1
   */
  page: number;

  /**
   * The total page amount
   */
  pageCount: number;

}
