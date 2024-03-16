/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME
 */

// returns the diff between opening and closing parenthesis in  a single line
export const searchSingle = (bundle: any): any => {
  if (!(bundle.total <= 1)) {
    throw new Error(`The search ${bundle?.link.find(link => link?.relation === 'self')?.url} returned multiple matches - criteria is not selective enough`);
  }

  return bundle.entry.find(entry => entry.search.mode === 'match')?.resource;
};
