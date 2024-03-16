/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME
 */

// returns the diff between opening and closing parenthesis in  a single line
export const bundleToArrayOfResources = (bundleArray): any => {
  return bundleArray.map(entry => entry.resource);
};
