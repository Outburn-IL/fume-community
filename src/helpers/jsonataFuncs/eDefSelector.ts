/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME
 */

export const eDefSelector = (fullPath: string, structDef: any): object => {
  return structDef?.differential.element.filter(e => e.path === fullPath);
};
