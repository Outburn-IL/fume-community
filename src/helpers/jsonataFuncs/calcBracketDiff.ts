/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

// returns the diff between opening and closing parenthesis in  a single line
export const calcBracketDiff = (line: string): number => {
  return line.split('').filter(c => c === '(').length - line.split('').filter(c => c === ')').length;
};
