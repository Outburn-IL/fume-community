/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME
 */

import expressions from '../jsonataExpression';
import { initCapOnce } from './stringFunctions';

export const initCap = async (str: string): Promise<string> => {
  // fork: os
  const res = await expressions.initCap.evaluate(str, { initCapOnce });
  return res;
};
