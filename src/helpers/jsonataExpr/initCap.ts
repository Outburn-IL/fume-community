/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME
 */
import { initCapOnce } from '../stringFunctions';

export const initCap = (string: string): string => {
  const words = string.trim().split(' ');
  const capitalizedWords = words.map(word => initCapOnce(word));
  return capitalizedWords.join(' ');
};
