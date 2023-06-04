/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME
 */

import thrower from './thrower';
import uuidByString from 'uuid-by-string';
import { getStructureDefinition } from './conformance';

const primitiveParsers = {}; // cache for primitive value testing functions

export interface CastToFhirOptions {
  name: string // name of the element
  path: string // the path of the element - needed for error messages
  baseType: string // the type.code from eDef. Would be a FHIR type name or a primitive's System URI
  kind?: string // the kind of element as defined in the type's StructureDefinition
  jsonPrimitiveProfile?: string // when baseType is a System primitive, the fhirtype to take contraints from
  fixed?: any // the fixed[x] or pattern[x] from edef
};

const castToFhir = async (options: CastToFhirOptions, input: any) => {
  // this is the function that is called from parsed flash rules. it only runs
  // at runtime - when the native jsonata build of the flash script is evaluated

  const baseType: string = options?.baseType;
  // @ts-expect-error
  const kind: string = options?.kind; // primitive-type | complex-type | resource
  const elementName: string = options?.name;
  const fixed: any = options?.fixed;
  const res: { // container object for the key-value and _key/children pairs
    [k: string]: any
  } = {};

  // handle arrays
  const isInputAnArray = Array.isArray(input);
  if (isInputAnArray) {
    const resArray: any[] = [];
    for (let i = 0; i < input.length; i++) {
      const iterationRes: any = await castToFhir(options, input[i]);
      resArray.push(iterationRes[elementName]);
    };
    res[elementName] = resArray;
    return res;
  };

  if (baseType.startsWith('http://hl7.org/fhirpath/System.')) {
    // this is a true (System) primitive
    const value = input?.__value; // it is only assined inline in a rule - no children are possible
    let testValue: string; // will be passed to the tester function
    if (typeof value === 'string') {
      testValue = value;
    } else {
      testValue = JSON.stringify(value); // any value other than string is strigified
    };
    // @ts-expect-error
    const primitiveProfile: string = options?.jsonPrimitiveProfile; // the fhirtype to take the regex from
    // throw error if empty
    if (baseType.endsWith('String') && typeof testValue === 'string' && testValue.trim() === '' && !fixed) return thrower.throwRuntimeError(`got forbidden empty value in ${options.path}! (type: ${primitiveProfile})`);
    // prepare to validate and parse the value
    if (primitiveProfile) {
      // fetch a tester function
      const parser = await getPrimitiveParser(primitiveProfile);
      // perform test
      // @ts-expect-error
      if (testValue && !await parser(testValue)) {
        // failed the test, throw error
        return thrower.throwRuntimeError(`value '${testValue}' is invalid according to RegEx defined for type ${primitiveProfile} (${options.path})`);
      }
    };
    // parse to the correct primitive type
    if (['decimal', 'integer', 'positiveInt', 'integer64', 'unsignedInt'].includes(baseType)) {
      // numeric primitive - cast as number.
      // it should not fail since regex has already been tested
      // TODO: how to retain decimal percision in js?? not sure it's possible...
      res[elementName] = fixed ?? Number(value);
    } else if (baseType === 'boolean') {
      if (typeof value === 'boolean') res[elementName] = (fixed ?? value); // already boolean, take as-is
      if (typeof value === 'string') res[elementName] = (fixed ?? (value === 'true' ? true : value === 'false' ? false : undefined)); // literal string booleans are accepted
    } else {
      // the base type is some specialization of string (date, uri, code etc.)
      // regex test has already passed, just take the stringified version if not already a string
      if (typeof value === 'string') {
        res[elementName] = fixed ?? value; // already a string
      } else {
        res[elementName] = fixed ?? testValue; // stringified version of value
      }
    }
  } else if (kind === 'primitive-type') {
    // it's a fhir primitive, so it might have children
    const ruleValue = input?.__value; // a value assigned as part of an assignment rule
    const literalValue = input?.value; // a value that's been assigned directly to the 'value' property under a primitive's path
    const id = input?.id; // an element id
    const extension = input?.extension; // any element extensions
    if (literalValue || ruleValue) { // has primitive value assigned in expression
      // fetch tester function
      const parser = await getPrimitiveParser(baseType);
      let passToParser: string;
      // value to pass to the tester
      // values assigned explicitly to the "value" element override inline assignment values
      // e.g., in:
      //
      // * code = 'a'
      //   * value = 'b'
      //
      // => 'b' will override 'a' as the primitive value of the 'code' element
      const value = literalValue ?? ruleValue;
      if (typeof value === 'string') {
        passToParser = value; // pass as-is
      } else {
        // pass a stringified version of value
        passToParser = JSON.stringify(value);
      };
      // @ts-expect-error
      if (await parser(passToParser)) {
        // passed the test
        let resValue: string | number | boolean; // only possible primitive types
        if (['decimal', 'integer', 'positiveInt', 'integer64', 'unsignedInt'].includes(baseType)) {
          // numeric in the json
          resValue = fixed ?? Number(value);
        } else if (baseType === 'boolean') {
          // boolean in the json
          if (typeof value === 'boolean') resValue = fixed ?? value;
          if (typeof value === 'string') resValue = fixed ?? value === 'true';
        } else {
          // string in the json
          if (typeof value === 'string') {
            resValue = fixed ?? value;
          } else {
            resValue = fixed ?? passToParser;
          }
        };
        // @ts-expect-error
        res[elementName] = resValue; // set value to a key with the element's name
      } else {
        // failed the test, throw error
        return thrower.throwRuntimeError(`value '${passToParser}' failed RegEx defined for type ${baseType} (${options?.path})`);
      }
    };
    if (fixed) {
      // has fixed primitive value
      res[elementName] = fixed;
    }
    if (id || extension) {
      // this primitive has children, they should be placed in an
      // object with the same key, but prefixed with underscore
      res['_' + elementName] = {
        id,
        extension
      };
    }
  } else {
    // this is a complex type (or a resource?), so it's an object
    // TODO: what happens when it's an inline resource? (contained, bundle)
    let resObj = { ...input }; // copy all keys
    // value assined inline to the object is currently ignored
    // TODO: find a way to handle objects assigned this way (they might contain illegal elements)
    if (kind === 'resource' && Object.prototype.hasOwnProperty.call(resObj, '__value') && typeof resObj.__value === 'object' && !Array.isArray(resObj.__value)) {
      resObj = { ...resObj.__value };
      if (options?.path.startsWith('Bundle')) {
        // this is a resource inside a bundle
        // need to add a fullUrl
        const seed: string = JSON.stringify(resObj);
        res.fullUrl = 'urn:uuid:' + uuidByString(seed);
      }
    };
    delete resObj.__value; // remove the internal __value key

    if ((fixed && Object.keys(fixed).length > 0) || Object.keys(resObj).length > 0) {
      if (fixed) {
        res[elementName] = { ...fixed, ...resObj };
      } else {
        res[elementName] = { ...resObj };
      }
    };
  };
  return res;
};

export interface FlashMergeOptions {
  key: string // name of the element
  max?: string // maximum cardinality
  baseMax?: string // maximum cardinality from base definition. >1 or * means value is always an array
  kind?: string // the kind of element as defined in the type's StructureDefinition
  mandatory?: any // object containing all mandory elements that have fixed children
};

const flashMerge = (options: FlashMergeOptions, baseObj: any, ruleObj: any): any => {
  // this function merges key:value into an existing object
  // taking into account cardinality and children of primitives
  const isBaseArray: boolean = typeof options?.baseMax !== 'undefined' && (options?.baseMax > '1' || options?.baseMax === '*');
  const isArray: boolean = typeof options?.max !== 'undefined' && (options?.max > '1' || options?.max === '*');

  const key: string = options.key;
  const primitive: boolean = options?.kind === 'primitive-type' || !(options?.kind);
  const mandatoryObj: any = options?.mandatory;
  const newBaseObj = { ...baseObj };
  if (mandatoryObj) {
    newBaseObj[key] = mandatoryObj;
  };

  let fullUrl: string;
  if (Object.prototype.hasOwnProperty.call(ruleObj, 'fullUrl')) {
    fullUrl = ruleObj.fullUrl;
    newBaseObj.fullUrl = fullUrl;
  };

  if (isArray && !primitive) {
    let arr: any[] = [];
    if ((typeof newBaseObj === 'object') && newBaseObj[key]) {
      const baseValue = newBaseObj[key];
      if (Array.isArray(baseValue)) {
        arr = arr.concat(baseValue);
      } else {
        arr.push(baseValue);
      }
    };
    if (ruleObj[key]) {
      const addValue = ruleObj[key];
      if (Array.isArray(addValue)) {
        arr = arr.concat(addValue);
      } else {
        arr.push(addValue);
      }
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
      if (Array.isArray(baseValue)) {
        arr1 = arr1.concat(baseValue);
      } else {
        arr1.push(baseValue);
      }
    }
    let arr2: any[] = [];
    if ((typeof newBaseObj === 'object') && newBaseObj['_' + key]) {
      const baseValue = newBaseObj['_' + key];
      if (Array.isArray(baseValue)) {
        arr2 = arr2.concat(baseValue);
      } else {
        arr2.push(baseValue);
      }
    };
    if (arr1.length === arr2.length) {
      if (ruleObj[key]) {
        const newValue = ruleObj[key];
        if (Array.isArray(newValue)) {
          arr1 = arr1.concat(newValue);
        } else {
          arr1.push(newValue);
        }
      };
      if (ruleObj['_' + key]) {
        const newValue = ruleObj['_' + key];
        if (Array.isArray(newValue)) {
          arr2 = arr2.concat(newValue);
        } else {
          arr2.push(newValue);
        }
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
        if (Array.isArray(newValue)) {
          arr1 = arr1.concat(newValue);
        } else {
          arr1.push(newValue);
        }
      }
      if (ruleObj['_' + key]) { // children object array
        const newValue = ruleObj['_' + key];
        if (Array.isArray(newValue)) {
          arr2 = arr2.concat(newValue);
        } else {
          arr2.push(newValue);
        }
      }
    }
    const resObj = { ...newBaseObj };
    if (arr1.length > 0) resObj[key] = arr1;
    if (arr2.length > 0) resObj['_' + key] = arr2;
    return resObj;
  } else {
    // not an array
    const resObj = { ...newBaseObj };
    if (primitive) {
      resObj[key] = ruleObj[key];
      resObj['_' + key] = ruleObj['_' + key];
    } else {
      if (ruleObj[key]) {
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
        if (Array.isArray(val)) {
          arr1 = arr1.concat(val);
        } else {
          arr1.push(val);
        };
        resObj[key] = arr1;
      }
      if (resObj['_' + key]) {
        let arr2: any[] = [];
        const val: any[] = resObj['_' + key];
        if (Array.isArray(val)) {
          arr2 = arr2.concat(val);
        } else {
          arr2.push(val);
        }
        resObj['_' + key] = arr2;
      }
      return resObj;
    } else {
      return resObj;
    }
  }
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
  for (const key of Object.keys(obj)) {
    const keepNulls = _isKeyPair(obj, key);
    const value = _cleanse(obj[key], keepNulls);
    if (value) {
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

const finalize = (obj: any) => {
  const res = cleanse(appendSlices(obj));
  if (res === null) return undefined;
  return res;
};

const checkResourceId = (resourceId: any) => {
  if (typeof resourceId === 'undefined') return undefined;
  if (typeof resourceId !== 'string') return thrower.throwRuntimeError(`Resource.id (value at Instance:) must be a string. Got: ${JSON.stringify(resourceId)}`);
  if (/^[A-Za-z0-9\-.]{1,64}$/.test(resourceId)) {
    return resourceId;
  } else {
    return thrower.throwRuntimeError(`value after 'Instance:' declaration (Resource.id) must be a combination of letters, numerals, '-' and '.', and max 64 characters. Got '${resourceId}' instead.`);
  };
};

const getPrimitiveParser = async (typeName: string): Promise<Function | undefined> => {
  // returns a function that tests primitives agaist their regex
  // returned functions are cached in memory so they are only compiled once
  if (primitiveParsers[typeName]) {
    // exists in cache, return from there
    return primitiveParsers[typeName];
  } else {
    // generate and compile the function
    let resFn: Function;
    const sDef = await getStructureDefinition(typeName);
    if (sDef === undefined) return thrower.throwRuntimeError(`error fetching structure definition for type ${typeName}`);
    const valueElementDef = sDef?.snapshot?.element[3]; // 4th element in a primitive's structdef is always the actual primitive value
    // get regular expression string from the standard extension
    const regexStr: string = valueElementDef?.type[0]?.extension?.filter((ext: any) => ext?.url === 'http://hl7.org/fhir/StructureDefinition/regex')[0]?.valueString;
    if (regexStr) {
      // found regex, compile it
      const fn = new RegExp(`^${regexStr}$`);
      resFn = (value: string): boolean => fn.test(value);
    } else {
      // no regex - function will just test for empty strings
      resFn = (value: string): boolean => value.trim() !== '';
    }
    primitiveParsers[typeName] = resFn; // cache the function
    return resFn;
  }
};

export default {
  checkResourceId,
  castToFhir,
  flashMerge,
  finalize
};
