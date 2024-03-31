/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import _ from 'lodash';

// returns the diff between opening and closing parenthesis in  a single line
export const bundleToArrayOfResources = (bundleArray): any => {
  const arr = bundleArray.map(entry => _.get(entry, ['entry', '0', 'resource']));
  return !arr.filter(Boolean).length ? [] : arr;
};
