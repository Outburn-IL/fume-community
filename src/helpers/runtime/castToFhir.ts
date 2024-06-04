/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import _ from 'lodash';
import uuidByString from 'uuid-by-string';

import { getStructureDefinition } from '../conformance';
import expressions from '../jsonataExpression';
import thrower from '../thrower';

export interface CastToFhirOptions {
  name: string // name of the element
  path: string // the path of the element - needed for error messages
  baseType: string // the type.code from eDef. Would be a FHIR type name or a primitive's System URI
  kind?: string // the kind of element as defined in the type's StructureDefinition
  jsonPrimitiveProfile?: string // when baseType is a System primitive, the fhirtype to take contraints from
  fixed?: any // the fixed[x] or pattern[x] from edef
  vsDictionary?: any[] // codes for required bindings
};

const primitiveParsers = {}; // cache for primitive value testing functions

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

const testCodingAgainstVS = async (coding: any, vs: any[]): Promise<string | string[] | undefined> => {
  return await expressions.testCodingAgainstVS.evaluate({}, { coding, vs });
};

export const castToFhir = async (options: CastToFhirOptions, input: any) => {
  // this is the function that is called from parsed flash rules. it only runs
  // at runtime - when the native jsonata build of the flash script is evaluated

  const baseType: string = options?.baseType;
  const kind: string | undefined = options?.kind; // primitive-type | complex-type | resource
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
    const primitiveProfile: string | undefined = options?.jsonPrimitiveProfile; // the fhirtype to take the regex from
    // throw error if empty
    if (baseType.endsWith('String') && typeof testValue === 'string' && testValue.trim() === '' && !fixed) return thrower.throwRuntimeError(`got forbidden empty value in ${options.path}! (type: ${primitiveProfile})`);
    // prepare to validate and parse the value
    if (primitiveProfile) {
      // fetch a tester function
      const parser = await getPrimitiveParser(primitiveProfile);
      // perform test
      if (testValue && parser && !await parser(testValue)) {
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
    let extension;
    try {
      // @ts-expect-error
      extension = input?.extension || input[Object.keys(input).find(key => key.includes('extension'))]; // any element extensions
    } catch (e) {}
    if (literalValue || !_.isNil(ruleValue)) { // has primitive value assigned in expression
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
      let value = literalValue ?? ruleValue;
      if (typeof value === 'string') {
        if (!isNaN(new Date(value).getTime()) && options.baseType === 'date') {
          value = value.split('T')[0];
        }
        passToParser = value; // pass as-is, remove time if Datetime
      } else {
        // pass a stringified version of value
        passToParser = JSON.stringify(value);
      }
      if (parser && await parser(passToParser)) {
        // passed the test
        if (options.vsDictionary) {
          // it's a primitive that has binding
          const vsTest: string = await expressions.testCodeAgainstVS.evaluate({}, { value: passToParser, vs: options.vsDictionary });
          if (!vsTest) {
            return thrower.throwRuntimeError(`value '${passToParser}' is invalid for element ${options?.path}. This code is not in the required value set`);
          }
        }
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
        res[elementName] = resValue!; // set value to a key with the element's name
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
        // logger.info(seed);
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

    if (options.vsDictionary && options.baseType === 'CodeableConcept') {
      // required bindings on CodeableConcept
      if (resObj?.coding) {
        const vsTest = await expressions.testCodeableAgainstVS.evaluate({}, { codeable: resObj, vs: options.vsDictionary, testCodingAgainstVS });
        if (!vsTest) {
          return thrower.throwRuntimeError(`Element ${options?.path} is invalid since none of the codings provided are in the required value set`);
        }
      }
    };

    if (options.vsDictionary && (options.baseType === 'Quantity' || options.baseType === 'Coding')) {
      // required bindings on Quantity or Coding
      if (resObj?.system || resObj?.code) {
        const vsTest = await testCodingAgainstVS(resObj, options.vsDictionary);
        if (!vsTest) {
          const system: string = resObj?.system ?? '';
          const code: string = resObj?.code ?? '';
          return thrower.throwRuntimeError(`The code '${system}#${code}' is invalid for element ${options?.path}. This code is not in the required value set`);
        }
      }
    }
  };
  return res;
};
