/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME
 */

import { expressions } from '../jsonataExpr';

export const initCap = (str: string): string | undefined => {
  // fork: os
  const res = expressions.initCap(str);
  return res;
};
