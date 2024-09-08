/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

export const wait = async (milliseconds: number) => {
  return await new Promise(resolve => setTimeout(resolve, milliseconds));
};
