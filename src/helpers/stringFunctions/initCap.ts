/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import expressions from '../jsonataExpression';
import { initCapOnce } from './stringFunctions';

export const initCap = async (str: string): Promise<string> => {
  // fork: os
  const res = await ((await expressions).initCap).evaluate(str, { initCapOnce });
  return res;
};
