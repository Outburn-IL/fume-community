/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME
 */

// returns the diff between opening and closing parenthesis in  a single line
export const bundleToArrayOfResources = (bundleArray): any => {
  const arr = bundleArray.map(entry => entry?.entry[0]?.resource);
  return !arr.filter(Boolean).length ? [] : arr;
};
