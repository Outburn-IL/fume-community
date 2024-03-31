/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import { expressions } from '../jsonataExpr';

export const initCap = (str: string): string | undefined => {
  // fork: os
  const res = expressions.initCap(str);
  return res;
};
