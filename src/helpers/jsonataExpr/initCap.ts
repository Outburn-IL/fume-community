/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME
 */

export const initCap = (string: string): string => {
  if (!string) return '';
  const words = string.trim().split(' ');
  const capitalizedWords = words.map(word => `${word.charAt(0).toUpperCase()}${word.slice(1)}`);
  return capitalizedWords.join(' ');
};
