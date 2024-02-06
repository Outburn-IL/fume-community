/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME
 */

import thrower from '../thrower';

export const checkResourceId = (resourceId: any) => {
    if (typeof resourceId === 'undefined') return undefined;
    if (typeof resourceId !== 'string') return thrower.throwRuntimeError(`Resource.id (value at Instance:) must be a string. Got: ${JSON.stringify(resourceId)}`);
    if (/^[A-Za-z0-9\-.]{1,64}$/.test(resourceId)) {
      return resourceId;
    } else {
      return thrower.throwRuntimeError(`value after 'Instance:' declaration (Resource.id) must be a combination of letters, numerals, '-' and '.', and max 64 characters. Got '${resourceId}' instead.`);
    };
  };