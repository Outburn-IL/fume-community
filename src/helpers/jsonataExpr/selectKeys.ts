/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME
 */

export const selectKeys = (obj, skeys): object => {
  return Object.keys(obj)
    .filter(key => skeys.includes(key))
    .reduce((resObj, key) => {
      resObj[key] = obj[key];
      return resObj;
    }, {});
};
