/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
import { uuid } from '../stringFunctions';

export const reference = (resource: any): string | undefined => {
  if (typeof resource === 'object' && Object.keys(resource).length > 0 && !Array.isArray(resource)) {
    return 'urn:uuid:' + uuid(JSON.stringify(resource));
  }

  return undefined;
};
