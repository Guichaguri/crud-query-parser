
export interface GetManyProxy<T> {

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
   * The current page number
   */
  page: number;

  /**
   * The total page amount
   */
  pageCount: number;

}
