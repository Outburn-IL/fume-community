import { search as fhirSearch } from '../client';

export const search = async (query: string, params?: Record<string, any>): Promise<Record<string, any> | undefined> => {
  const url: string = encodeURI(query);
  const res = await fhirSearch(url, params);
  return res;
};