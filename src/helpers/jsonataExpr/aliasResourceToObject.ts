/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME
 */

// returns the diff between opening and closing parenthesis in  a single line
export const aliasResourceToObject = (aliasResource: any): object => {
  const finalObj = {};
  aliasResource?.group[0]?.element.forEach(e => {
    finalObj[e.code] = e.target.code;
  });
  return finalObj;
};
