import expressions from '../jsonataExpression';
import { search as fhirSearch } from '../client';

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

  const bundle = await fhirSearch(url, options);
  const res = await expressions.searchSingle.evaluate({}, { bundle });
  return res;
};