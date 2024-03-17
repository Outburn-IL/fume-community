/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
import expressions from '../jsonataExpression';
import { searchSingle } from './searchSingle';

export const literal = async (query: string, params?: Record<string, any>): Promise<string | undefined> => {
  const res = await expressions.literal.evaluate({}, { query, searchSingle, params });
  return res;
};
