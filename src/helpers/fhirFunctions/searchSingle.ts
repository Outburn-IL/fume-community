/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
import { getFhirClient } from '../fhirServer';
import { expressions } from '../jsonataExpr';

export const searchSingle = async (query: string, params?: Record<string, any>): Promise<any | undefined> => {
  const url: string = encodeURI(query);
  let options: Record<string, any> = {
    _count: 1
  };
  if (typeof params === 'object' && !Array.isArray(params) && Object.keys(params).length > 0) {
    options = {
      ...options,
      ...params
    };
  };

  const bundle = await getFhirClient().search(url, options);
  const res = expressions.searchSingle(bundle);
  return res;
};
