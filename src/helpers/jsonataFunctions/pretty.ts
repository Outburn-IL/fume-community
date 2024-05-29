/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
import { duplicate } from '../stringFunctions';

export const pretty = async (expression: string): Promise<string> => {
  let indentLevel: number = 0;
  const exprLen: number = expression.length;
  let prettyExpr: string = '';
  let currentChar: string;
  let indent: string = '';
  let stringOpening: string = ''; // if we are inside a string, this will hold the opening quote symbol (single/double)
  let closingBracket: string = '';
  let openingBracket: string = '';
  const bracketMap = { '(': ')', '[': ']', '{': '}' };

  for (let i = 0; i < exprLen; i++) {
    currentChar = expression.charAt(i);
    switch (currentChar) {
      case '(':
      case '[':
      case '{':
        if (stringOpening === '') {
          openingBracket = currentChar;
          closingBracket = bracketMap[openingBracket];
          indentLevel++;
          if (expression.charAt(i + 1) === closingBracket) {
            prettyExpr += currentChar;
          } else {
            indent = await duplicate('  ', indentLevel);
            prettyExpr += currentChar + '\n' + indent;
          }
        } else {
          prettyExpr += currentChar;
        };
        break;
      case ')':
      case ']':
      case '}':
        if (stringOpening === '') {
          if (indentLevel > 0) {
            indentLevel--;
          };
          if (expression.charAt(i - 1) === openingBracket) {
            prettyExpr += currentChar;
          } else {
            indent = await duplicate('  ', indentLevel);
            prettyExpr += '\n' + indent + currentChar;
          }
        } else {
          prettyExpr += currentChar;
        }
        break;
      case ',':
      case ';':
        if (stringOpening === '' && !(expression.charAt(i + 1) === '\r' || expression.charAt(i + 1) === '\n')) {
          prettyExpr += currentChar + '\n' + indent;
        } else {
          prettyExpr += currentChar;
        }
        break;
      case '"':
      case '\'':
        stringOpening = (stringOpening === currentChar && (expression.charAt(i - 1) !== '\\' || expression.charAt(i - 2) === '\\')) ? '' : currentChar;
        prettyExpr += currentChar;
        break;
      case '\n':
      case '\r':
        if (stringOpening === '' && expression.charAt(i - 1) !== '\\' && !(expression.charAt(i + 1) === '\r' || expression.charAt(i + 1) === '\n')) {
          // it's an unescaped newline symbol (\n or \r) not followed by the other one
          prettyExpr += currentChar + indent;
        } else {
          prettyExpr += currentChar;
        }
        break;
      default:
        prettyExpr += currentChar;
    }
  };
  return prettyExpr;
};
