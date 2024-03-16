/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME
 */
import expressions from './jsonataExpression';
import { isEmpty as isEmp } from './jsonataFunctions/isEmpty';

const selectKeys = async (obj: object, skeys: string[]): Promise<object> => {
  const res = await expressions.selectKeys.evaluate({}, { in: obj, skeys });
  return res;
};

const omitKeys = async (obj: object, okeys: string[]): Promise<object> => {
  const res = await expressions.omitKeys.evaluate({}, { in: obj, okeys });
  return res;
};

const isEmpty = async (value: any): Promise<boolean> => {
  if (value === undefined || value === null) return true;
  const res = isEmp(value);
  return await res;
};

export { isEmpty, omitKeys, selectKeys };
