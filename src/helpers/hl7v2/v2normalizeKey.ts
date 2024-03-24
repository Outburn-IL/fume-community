import { expressions } from '../jsonataExpr';

export const v2normalizeKey = (key: string) => {
  const res = expressions.v2normalizeKey(key);
  return res;
};
