/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import { expressions } from '../jsonataExpr';

export const duplicate = (str: string, times: number): string => {
  if (times === 1) return str;
  if (times === 0) return '';
  return expressions.duplicate(times, str);
};
