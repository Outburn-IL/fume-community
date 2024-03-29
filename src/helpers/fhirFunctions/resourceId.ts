/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
import { searchSingle } from './searchSingle';

export const resourceId = (query: string, params?: Record<string, any>): string | undefined => {
  // fork: os
  const resource: any = searchSingle(query, params);
  let resourceId: string | undefined;
  if (resource === undefined) {
    resourceId = undefined;
  } else {
    resourceId = resource.id;
  }
  return resourceId;
};
