/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

export const eDefSelector = (fullPath: string, structDef: any): object => {
  return structDef?.differential.element.filter(e => e.path === fullPath);
};
