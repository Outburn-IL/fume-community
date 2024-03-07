/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME
 */

export const findClosingBrackets = (line: string, startPosition: number, carried: number): number => {
  // line: a single line to search for closing brackets
  // startPosition: where to start from. this will be the index of original opening brackets, or 0
  // openingCount: the number of opening brackets counted so far (carried from previous lines)
  // returns (-1 * depth) if not found, or the index of the closing brackets if found
  // TODO: ignore brackets that are inside quoted strings!
  let depth: number = carried;
  if (line === '') return -1 * depth;
  for (let i = startPosition; i < line.length; i++) {
    switch (line[i]) {
      case '(':
        depth++;
        break;
      case ')':
        if (--depth === 0) {
          return i;
        }
        break;
    }
  }
  return -1 * depth;
};
