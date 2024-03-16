/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME
 */

import { splitToLines } from '../stringFunctions';

// returns the diff between opening and closing parenthesis in  a single line
export const parseFumeExpression = async (expression: string, lineParser: Function): Promise<string> => {
  let lines = splitToLines(expression);
  lines = lines.filter(line => !(line.trim().startsWith('*') && line.trim().endsWith('undefined ')));
  lines.push(''); // Add an empty line at the end
  const parsedLines: any = [];
  for (let i = 0; i < lines.length; i++) {
    const parsedLine = await lineParser(lines[i], i, lines);
    parsedLines.push(parsedLine);
  }
  const result = parsedLines.join('\r\n');

  return result;
};
