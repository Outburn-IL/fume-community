/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME
 */

export const checkPackagesMissingFromIndex = (dirList: any, currentPackages: any): any => {
  const fixedDirList = dirList.map(d => d.replace('#', '@'));

  const missingFromIndex = currentPackages.filter(pkg => !fixedDirList.includes(pkg));
  const missingFromCache = fixedDirList.filter(pkg => !currentPackages.includes(pkg));

  return [...missingFromIndex, ...missingFromCache];
};
