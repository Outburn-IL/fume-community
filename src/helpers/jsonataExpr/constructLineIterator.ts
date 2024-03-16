/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME
 */

// returns the diff between opening and closing parenthesis in  a single line
export const constructLineIterator = async (nodes: string[],
  constructLine: Function,
  prefix: string,
  value: string = '',
  context: string = ''): Promise<string> => {
  const first = await constructLine(prefix, nodes[0], '', context, true);
  const middle = await Promise.all(nodes.slice(1, -1).map(node => constructLine('', node, '', '', true)));
  const last = await constructLine('', nodes[nodes.length - 1], value, '', false);

  return [first, ...middle, last].join('');
};
