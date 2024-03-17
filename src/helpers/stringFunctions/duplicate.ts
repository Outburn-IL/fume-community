/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import expressions from '../jsonataExpression';

export const duplicate = async (str: string, times: number): Promise<string> => {
  if (times === 1) return str;
  if (times === 0) return '';
  return await expressions.duplicate.evaluate({}, { times, str });
};
