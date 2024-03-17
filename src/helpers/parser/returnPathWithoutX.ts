/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

export const returnPathWithoutX = (path: string) => {
  return path.includes('[x]') ? path.slice(0, -3) : path;
};
