/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME
 */
import { expressions } from './jsonataExpr';
import { isEmpty as isEmp } from './jsonataFunctions/isEmpty';

const selectKeys = (obj: object, skeys: string[]): object => {
  const res = expressions.selectKeys(obj, skeys);
  return res;
};

const omitKeys = (obj: object, okeys: string[]): object => {
  const res = expressions.omitKeys(obj, okeys);
  return res;
};

const isEmpty = (value: any): boolean => {
  if (value === undefined || value === null) return true;
  const res = isEmp(value);
  return res;
};

export { isEmpty, omitKeys, selectKeys };
