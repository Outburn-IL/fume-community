import { expressions } from '../jsonataExpr';

export const literal = async (query: string, params?: Record<string, any>): Promise<string | undefined> => {
  const res = await expressions.literal(query);
  return res;
};
