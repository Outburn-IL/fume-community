import { searchSingle } from './searchSingle';

export const resourceId = async (query: string, params?: Record<string, any>): Promise<string | undefined> => {
  // fork: os
  const resource = await searchSingle(query, params);
  let resourceId: string | undefined;
  if (resource === undefined) {
    resourceId = undefined;
  } else {
    resourceId = resource.id;
  }
  return resourceId;
};
