/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME
 */

import _ from 'lodash';

const filterAddedFields = (obj) => {
  return _.pickBy(obj, (_value, key) => !key.includes('__path_'));
};

/**
 * This function creates a new object without keys with empty values, recursively.
 * An empty value is an empty string, empty object, empty array or null.
 * The only exception is that it won't remove empty values from an array,
 * if key starts with _ or there's a corresponding _key
 * so it will keep the original index, but will replace those with nulls.
 * @param {*} obj the object to cleanse
 * @returns a new object without the removed keys
 */
const cleanse = (obj: any | any[]) => {
  return _cleanse(obj, false);
};

const _cleanse = (obj: any | any[], keepNulls: boolean) => {
  if (obj === '' || obj === undefined || obj === null) {
    return null;
  }
  if (Array.isArray(obj)) {
    return _cleanseArray(obj, keepNulls);
  }
  if (typeof obj === 'object') {
    return _cleanseObject(obj);
  }
  return obj;
};

const _cleanseArray = (array: any[], keepNulls: boolean) => {
  const newArray: any[] = [];
  let hasActualValue = false;
  for (const value of array) {
    const newValue = _cleanse(value, false);
    if (newValue || keepNulls) {
      newArray.push(newValue);
    }
    if (newValue) {
      hasActualValue = true;
    }
  }
  return hasActualValue ? newArray : null;
};

const _cleanseObject = (obj: any) => {
  const newObject = {};
  obj = filterAddedFields(obj);
  for (const key of Object.keys(obj)) {
    const keepNulls = _isKeyPair(obj, key);
    const value = _cleanse(obj[key], keepNulls);
    if (!_.isNil(value)) {
      newObject[key] = value;
    }
  }
  return Object.keys(newObject).length === 0 ? null : newObject;
};

const _isKeyPair = (obj: any, key: string) => {
  if (key.startsWith('_')) {
    const baseKey = key.slice(1);
    return Object.prototype.hasOwnProperty.call(obj, baseKey);
  }
  const pairKey = `_${key}`;
  return Object.prototype.hasOwnProperty.call(obj, pairKey);
};

const appendSlices = (obj: any | any[]): any => {
  if (Array.isArray(obj)) { // array
    const newArray: any[] = [];
    for (const fhirifiedChild of obj) {
      newArray.push(appendSlices(fhirifiedChild));
    }
    return newArray;
  } else if (typeof obj === 'object' && obj !== null) { // object
    const newObject = {};
    for (const key of Object.keys(obj)) {
      const value = appendSlices(obj[key]);
      const isValueAnArray = Array.isArray(value);
      const baseKey = key.endsWith(']') ? key.split('[')[0] : key;
      const isKeyBaseKey = key === baseKey;

      if (baseKey in newObject) { // allready exists
        let mergedValue = newObject[baseKey];

        // convert merged value to array if needed
        if (!Array.isArray(mergedValue)) {
          mergedValue = [mergedValue];
        }

        // add the new elements to the merged array
        if (isKeyBaseKey && isValueAnArray) {
          mergedValue = value.concat(mergedValue);
        } else if (isKeyBaseKey) {
          mergedValue.unshift(value);
        } else {
          mergedValue = mergedValue.concat(value);
        }
        newObject[baseKey] = mergedValue;
      } else if (!isKeyBaseKey && !isValueAnArray) { // make sure merged with 1 element is always an array
        newObject[baseKey] = [value];
      } else {
        newObject[baseKey] = value;
      }
    }
    return newObject;
  }

  return obj;
};

export const finalize = (obj: any) => {
  if (!_.get(obj, 'resourceType')) {
    return filterAddedFields(obj);
  };
  const res = cleanse(appendSlices(obj));
  if (res === null) return undefined;
  return res;
};
