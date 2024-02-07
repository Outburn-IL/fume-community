/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME
 */

import { initCapOnce } from './stringFunctions';
import expressions from '../jsonataExpression';

export const initCap = async (str: string): Promise<string> => {
  // fork: os
  const res = await expressions.initCap.evaluate(str, { initCapOnce });
  return res;
};
