/**
 * Originally from @nestjsx/crud
 *
 * @author Michael Yali
 * @author Diluka
 * @author Ludovic Audibert
 * @licence MIT
 * @see https://github.com/nestjsx/crud/blob/master/packages/crud-request/src/types/request-query.types.ts
 */

export declare type SPrimitivesVal = string | number | boolean;
export declare type SFiledValues = SPrimitivesVal | Array<SPrimitivesVal>;
export declare type SFieldOperator = {
  $eq?: SFiledValues;
  $ne?: SFiledValues;
  $gt?: SFiledValues;
  $lt?: SFiledValues;
  $gte?: SFiledValues;
  $lte?: SFiledValues;
  $starts?: SFiledValues;
  $ends?: SFiledValues;
  $cont?: SFiledValues;
  $excl?: SFiledValues;
  $in?: SFiledValues;
  $notin?: SFiledValues;
  $between?: SFiledValues;
  $isnull?: SFiledValues;
  $notnull?: SFiledValues;
  $eqL?: SFiledValues;
  $neL?: SFiledValues;
  $startsL?: SFiledValues;
  $endsL?: SFiledValues;
  $contL?: SFiledValues;
  $exclL?: SFiledValues;
  $inL?: SFiledValues;
  $notinL?: SFiledValues;
  $or?: SFieldOperator;
  $and?: never;
};
export declare type SField = SPrimitivesVal | SFieldOperator;
export declare type SFields = {
  [key: string]: SField | Array<SFields | SConditionAND> | undefined;
  $or?: Array<SFields | SConditionAND>;
  $and?: never;
};
export declare type SConditionAND = {
  $and?: Array<SFields | SConditionAND>;
  $or?: never;
};
export declare type SConditionKey = '$and' | '$or';
export declare type SCondition = SFields | SConditionAND;
