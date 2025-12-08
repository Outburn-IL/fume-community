/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import expressions from './jsonataExpression';

const selectKeys = async (obj: object, skeys: string[]): Promise<object> => {
  const res = await (await expressions).selectKeys.evaluate({}, { in: obj, skeys });
  return res;
};

const omitKeys = async (obj: object, okeys: string[]): Promise<object> => {
  const res = await (await expressions).omitKeys.evaluate({}, { in: obj, okeys });
  return res;
};

export { omitKeys, selectKeys };
