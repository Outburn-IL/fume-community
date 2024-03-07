/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME
 */

const getInitCapKey = (code: string, lastNode: string) => {
  const typeCodeInitCap = code.slice(0, 1).toUpperCase() + code.slice(1);
  return lastNode.split('[x]')[0] + typeCodeInitCap;
};

export const getJsonElementName = async (element: any, fshKey: string): Promise<any> => {
  const path = element.path;
  const lastNode = path.split('.')[path.split('.').length - 1];
  if (lastNode.slice(-3) === '[x]') {
    if (element.type.length > 1) {
      const possibleKeys = element.type.map(t => getInitCapKey(t.code, lastNode));
      if (possibleKeys.includes(fshKey)) {
        return fshKey;
      }
    } else {
      const typeCode = element.type[0].code;
      return getInitCapKey(typeCode, lastNode);
    }
  } else {
    return fshKey;
  }
};
