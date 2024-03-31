/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME
 */

export const extractNextLink = (bundle: any): any => {
  return bundle?.link.find(link => link.relation === 'next')?.url;
};
