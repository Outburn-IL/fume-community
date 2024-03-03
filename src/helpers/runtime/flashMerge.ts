/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME
 */

import _ from 'lodash';

import thrower from '../thrower';

export interface FlashMergeOptions {
  key: string // name of the element
  max?: string // maximum cardinality
  min?: number // minimum cardinality
  baseMax?: string // maximum cardinality from base definition. >1 or * means value is always an array
  path?: string // The path to this element of the object
  eDefPath?: string // The path of the definition.
  kind?: string // the kind of element as defined in the type's StructureDefinition
  mandatory?: any // object containing all mandory elements that have fixed children
};

const deleteEntriesWithSamePath = (obj, path) => {
  const tempObj = Object.fromEntries(Object.entries(obj).filter(([key, value]) => value === path || (path.includes('[x]') && String(value).includes(path.slice(0, -3)))));
  if (!_.isEmpty(tempObj)) {
    const keyName = _.keys(tempObj)[0].split('__path_')[1];
    return Object.fromEntries(Object.entries(obj).filter(([key, value]) => !key.includes(keyName)));
  } else {
    return obj;
  }
};

const sliceByMax = (arr, max) => {
  return arr.length ? arr.slice(-1 * Number(max))[0] : null;
};

const addToArr = (arr, value) => {
  if (Array.isArray(value)) {
    arr = arr.concat(value);
  } else {
    arr.push(value);
  }
  return arr;
};

export const flashMerge = (options: FlashMergeOptions, baseObj: any, ruleObj: any): any => {
  if (options?.min === 0) {
    if (_.isEmpty(ruleObj)) return baseObj;
  } else {
    let amountOfElements = 1;
    if (_.isEmpty(ruleObj)) {
      amountOfElements = 0;
    } else {
      try {
        amountOfElements = JSON.parse(ruleObj[options.key]).length;
      } catch (e) {}
    }
    if (amountOfElements < Number(options.min)) {
      thrower.throwRuntimeError(`Element '${options.path ?? ''}' has a minimum cardinality of ${options.min ?? ''}, got ${amountOfElements} instead`);
    }
  }
  // this function merges key:value into an existing object
  // taking into account cardinality and children of primitives
  const isBaseArray: boolean = typeof options?.baseMax !== 'undefined' && (options?.baseMax > '1' || options?.baseMax === '*');
  const isArray: boolean = typeof options?.max !== 'undefined' && (options?.max > '1' || options?.max === '*');

  const key: string = options.key;
  const primitive: boolean = options?.kind === 'primitive-type' || !(options?.kind);
  const mandatoryObj: any = options?.mandatory;
  const newBaseObj = { ...baseObj };
  let prevKeyValue;
  if (mandatoryObj) {
    if (_.get(newBaseObj, key)) {
      prevKeyValue = newBaseObj[key];
    }
    newBaseObj[key] = mandatoryObj;
  };

  let fullUrl: string;
  if (Object.prototype.hasOwnProperty.call(ruleObj, 'fullUrl')) {
    // logger.info({ fullUrl: ruleObj.fullUrl, options });
    fullUrl = ruleObj.fullUrl;
    newBaseObj.fullUrl = fullUrl;
  };

  if (isArray && !primitive) {
    let arr: any[] = [];
    if (prevKeyValue) {
      arr = addToArr(arr, prevKeyValue);
    }
    if ((typeof newBaseObj === 'object') && newBaseObj[key] && !mandatoryObj) {
      const baseValue = newBaseObj[key];
      arr = addToArr(arr, baseValue);
    };
    if (ruleObj[key]) {
      const addValue = ruleObj[key];
      let finalObject = addValue;
      if (mandatoryObj) {
        if (Array.isArray(addValue)) {
          finalObject = { ...mandatoryObj };
          addValue.forEach(obj => {
            const [key, value] = Object.entries(obj)[0];

            if (finalObject[key] !== undefined) {
              // The key exists in both objects, convert values to an array
              if (Array.isArray(value)) {
                value.forEach(e => finalObject[key].push(e));
              } else {
                finalObject[key].push(value);
              }
            } else {
              // The key is unique to the array object, add it to the final object
              finalObject[key] = value;
            }
          });
        }
        finalObject = { ...mandatoryObj, ...finalObject };
      }
      arr = addToArr(arr, finalObject);
    };
    const resObj = { ...newBaseObj };
    if (arr.length > 0) resObj[key] = arr;
    return resObj;
  } else if (isArray && primitive) {
    // primitives in fhir have children that are represented in a dedicated object
    // when the element is repeating, the array of primitive values and the array of objects must be synced
    let arr1: any[] = [];
    if ((typeof newBaseObj === 'object') && newBaseObj[key]) {
      const baseValue = newBaseObj[key];
      arr1 = addToArr(arr1, baseValue);
    }
    let arr2: any[] = [];
    if ((typeof newBaseObj === 'object') && newBaseObj['_' + key]) {
      const baseValue = newBaseObj['_' + key];
      arr2 = addToArr(arr2, baseValue);
    };
    if (arr1.length === arr2.length) {
      if (ruleObj[key]) {
        try {
          const parsedVal = JSON.parse(ruleObj[key]);
          ruleObj[key] = typeof parsedVal === 'number' ? ruleObj[key] : parsedVal;
        } catch (e) {}

        if (Array.isArray(ruleObj[key]) && options.max !== '*') {
          ruleObj[key] = ruleObj[key].slice(Number(options.max) * -1);
        }

        const newValue = ruleObj[key];
        arr1 = addToArr(arr1, newValue);
      };
      if (ruleObj['_' + key]) {
        const newValue = ruleObj['_' + key];
        arr2 = addToArr(arr2, newValue);
      };
    } else {
      // fill in with nulls before push
      const diff: number = arr1.length - arr2.length;
      const absDiff: number = Math.abs(diff);
      const fill: any[] = Array(absDiff).fill(null);
      if (diff > 0) {
        // positive number, so fill arr2
        // but only if we have anything to add to it
        if (ruleObj['_' + key]) arr2 = [...arr2, ...fill];
      } else {
        // negative diff, so fill arr1
        // but only if we have anything to add to it
        if (ruleObj[key]) arr1 = [...arr1, ...fill];
      };
      if (ruleObj[key]) { // primitive array
        const newValue = ruleObj[key];
        arr1 = addToArr(arr1, newValue);
      }
      if (ruleObj['_' + key]) { // children object array
        const newValue = ruleObj['_' + key];
        arr2 = addToArr(arr2, newValue);
      }
    }
    const resObj = { ...newBaseObj };
    if (arr1.length > 0) resObj[key] = arr1;
    if (arr2.length > 0) resObj['_' + key] = arr2;
    return resObj;
  } else {
    // not an array
    let resObj = { ...newBaseObj };
    resObj = deleteEntriesWithSamePath(resObj, options.eDefPath);
    if (primitive) {
      try {
        const parsedValue = JSON.parse(ruleObj[key]);
        if (typeof parsedValue === 'object') {
          // The parsed value is a non-array object
          ruleObj[key] = parsedValue;
        }
      } catch (e) {}
      if (Array.isArray(ruleObj[key]) && options.max) {
        ruleObj[key] = sliceByMax(ruleObj[key], options.max);
      }
      resObj[key] = ruleObj[key];
      resObj['_' + key] = ruleObj['_' + key];
      resObj['__path_' + key] = options?.path;
    } else {
      if (ruleObj[key]) {
        if (Array.isArray(ruleObj[key]) && options.max) {
          ruleObj[key] = sliceByMax(ruleObj[key], options.max);
        }
        const newVal = ruleObj[key];
        const baseVal = resObj[key];
        const merged = { ...baseVal, ...newVal };
        resObj[key] = merged;
      }
    }
    if (isBaseArray) {
      if (resObj[key]) {
        let arr1: any[] = [];
        const val: any[] = resObj[key];
        arr1 = addToArr(arr1, val);
        resObj[key] = arr1;
      }
      if (resObj['_' + key]) {
        let arr2: any[] = [];
        const val: any[] = resObj['_' + key];
        arr2 = addToArr(arr2, val);
        resObj['_' + key] = arr2;
      }
      return resObj;
    } else {
      return resObj;
    }
  }
};
