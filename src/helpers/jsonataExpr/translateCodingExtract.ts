/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME
 */

// returns the diff between opening and closing parenthesis in  a single line
export const translateCodingExtract = (result: any, input: any): string => {
  return result.map(item => [{
    system: item.target,
    code: item.code
  }, {
    system: item.source,
    code: input
  }]);
};
