/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

const isUrlPart = (charIndex: number, expr: string): boolean => {
  // the minimum index for a url's // part is after the 'http(s):' part
  // so undex lower than 7 means it's a comment and not a url
  if (charIndex < 7) return false;
  const prevSevenChars: string = expr.substring(charIndex - 7, charIndex);
  const prevSixChars: string = prevSevenChars.substring(1);
  if (
    ['https:', '[https:'].includes(prevSevenChars.trimStart()) || ['http:', '[http:'].includes(prevSixChars.trimStart())
  ) {
    return true;
  } else {
    return false;
  }
};

export const removeComments = (expr: string): string => {
  const exprLen: number = expr.length;
  if (exprLen === 0) return expr;
  let accExpr: string = '';
  let currentChar: string = '';
  let nextChar: string = '';
  let prevChar: string = '';
  let prevPrevChar: string = '';
  let openedQuote: string = '';
  let openedComment: string = '';

  for (let i = 0; i < exprLen; i++) {
    currentChar = expr.charAt(i);
    nextChar = i < (exprLen - 1) ? expr.charAt(i + 1) : '';
    prevChar = i > 0 ? expr.charAt(i - 1) : '';
    prevPrevChar = i > 1 ? expr.charAt(i - 2) : '';

    if (openedComment !== '') {
      // inside a comment
      const twoChars: string = prevChar + currentChar;

      if (openedComment === '//' && (currentChar === '\r' || currentChar === '\n')) {
        // this is the end of the // comment
        openedComment = '';
        accExpr += '\n';
      } else {
        if (openedComment === '/*' && twoChars === '*/' && prevPrevChar !== '/') {
          // this is the end of the /* comment
          openedComment = '';
        }
      };
      continue;
    };

    // not inside a comment
    if ((currentChar === '"' || currentChar === '\'') && prevChar !== '\\') {
      // quote sign, unescaped
      if (openedQuote === '') {
        // it's an opening quote
        openedQuote = currentChar;
      } else {
        // it's a closing quote
        if (openedQuote === currentChar) {
          openedQuote = '';
        }
      }
    } else {
      // not a quote sign
      const twoChars: string = currentChar + nextChar;
      const notUrl: boolean = !isUrlPart(i, expr);
      if (openedQuote === '' && (twoChars === '/*' || (twoChars === '//' && notUrl))) {
        // opening comment, not inside quotes
        openedComment = twoChars;
        continue;
      }
    }
    accExpr += currentChar;
  };

  return accExpr;
};
