import {
  ParsedRequestWhere, ParsedRequestWhereAND, ParsedRequestWhereField,
  ParsedRequestWhereOperator, ParsedRequestWhereOR,
  ParsedRequestWhereValueType
} from '../models/parsed-request-where';

/**
 * A helper class that makes it easier to create a ParsedRequestWhere
 */
export class ParsedRequestWhereBuilder {

  constructor(
    private readonly where: ParsedRequestWhereAND | ParsedRequestWhereOR = { and: [] },
    private readonly parent?: ParsedRequestWhereBuilder,
  ) { }

  /**
   * Adds an AND bracket
   */
  public addAnd(): ParsedRequestWhereBuilder {
    if (!this.where.or) {
      return this;
    }

    const inside: ParsedRequestWhereAND = { and: [] };
    const builder = new ParsedRequestWhereBuilder(inside, this);

    this.where.or.push(inside);

    return builder;
  }

  /**
   * Adds an OR bracket
   */
  public addOr(): ParsedRequestWhereBuilder {
    if (!this.where.and) {
      return this;
    }

    const inside: ParsedRequestWhereOR = { or: [] };
    const builder = new ParsedRequestWhereBuilder(inside, this);

    this.where.and.push(inside);

    return builder;
  }

  /**
   * Adds a field comparison
   *
   * @param field The field path
   * @param operator The comparison operator
   * @param value The value to compare
   */
  public addField(field: string[], operator: ParsedRequestWhereOperator, value: ParsedRequestWhereValueType): ParsedRequestWhereBuilder {
    const whereField: ParsedRequestWhereField = {
      field,
      operator,
      value,
    };

    if (this.where.and) {
      this.where.and.push(whereField);
    } else if (this.where.or) {
      this.where.or.push(whereField);
    } else {
      throw new Error('Invalid where');
    }

    return this;
  }

  /**
   * Constructs the final where condition
   */
  public build(): ParsedRequestWhere {
    if (this.parent) {
      return this.parent.build();
    }

    return this.where;
  }

}
