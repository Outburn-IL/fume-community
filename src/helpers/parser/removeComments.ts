/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

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
    console.log({ currentChar });
    nextChar = i < (exprLen - 1) ? expr.charAt(i + 1) : '';
    prevChar = i > 0 ? expr.charAt(i - 1) : '';
    prevPrevChar = i > 1 ? expr.charAt(i - 2) : '';

    if (openedComment !== '') {
      // inside a comment
      console.log('inside a comment');
      console.log({ openedComment });
      const twoChars: string = prevChar + currentChar;

      if (openedComment === '//' && (currentChar === '\r' || currentChar === '\n')) {
        // this is the end of the // comment
        console.log('end of comment');
        openedComment = '';
        accExpr += '\n';
      } else {
        if (openedComment === '/*' && twoChars === '*/' && prevPrevChar !== '/') {
          // this is the end of the /* comment
          console.log('end of comment');
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
      if ((twoChars === '/*' || twoChars === '//') && openedQuote === '') {
        // opening comment, not inside quotes
        console.log('opened a comment');
        openedComment = twoChars;
        console.log({ openedComment });
        continue;
      }
    }
    accExpr += currentChar;
    console.log({ accExpr });
  };

  return accExpr;
};
