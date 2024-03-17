import { expressions } from '../jsonataExpr';

export const literal = (query: string, params?: Record<string, any>): string | undefined => {
  const res = expressions.literal(query);
  return res;
};
