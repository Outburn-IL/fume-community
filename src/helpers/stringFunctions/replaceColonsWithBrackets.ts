/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

export const replaceColonsWithBrackets = (path: string) => {
  const nodes = path.split('.');
  const final = nodes.map((n, i) => {
    if ((i === nodes.length - 1) && n.includes(':')) {
      return n.replace(':', '[') + ']';
    } else {
      return n;
    }
  });
  return final.join('.');
};
