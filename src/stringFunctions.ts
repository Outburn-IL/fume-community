/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME
 */

// import jsonata from 'jsonata';
import config from './config';
import { sha256 } from 'js-sha256';
import { randomUUID } from 'crypto';
import uuidByString from 'uuid-by-string';
import csvToJson from 'csvtojson';
import expressions from './jsonataExpression';

const logger = config.getLogger();

const startsWith = (str: string, startStr: string): boolean => str.startsWith(startStr);

const endsWith = (str: string, endStr: string): boolean => str.endsWith(endStr);

const initCapOnce = (str: string): string => {
  // used for polymorhic element names, where all type names need to
  // be appended to base element names but the result must be camelCased
  // e.g. if chosen type for value[x] is string, the element name will be valueString
  return str[0].toUpperCase() + str.slice(1);
};

const substringBefore = (str: string, chars: string): string | undefined => {
  // undefined inputs always return undefined
  if (typeof str === 'undefined') {
    return undefined;
  };
  const pos = str.indexOf(chars);
  if (pos > -1) {
    return str.substring(0, pos);
  } else {
    return str;
  }
};

const substringAfter = (str: string, chars: string): string | undefined => {
  // undefined inputs always return undefined
  if (typeof str === 'undefined') {
    return undefined;
  }
  const pos = str.indexOf(chars);
  if (pos > -1) {
    return str.substring(pos + chars.length);
  } else {
    return str;
  }
};

export const removeEmptyLines = (arr: string[] | string): string[] => {
  // removes empty lines from a line array
  let lines: string[] = [];
  if (typeof arr === 'string') {
    lines.push(arr);
  } else {
    lines = arr;
  }
  return lines.filter((line) => line.trim() !== '');
};

// takes out all comments from expression
// TODO: add support for end-of-line // type comments
export const removeComments = (expr: string): string => expr.replace(/(\/\*[^*]*\*\/)/g, '');

// clean and split an expression. returns a line array
export const splitToLines = (expr: string): string[] => removeEmptyLines(removeComments(expr).split(/\r?\n/));

export const hashKey = (str: string): string => sha256(str + uuid(str));

const uuid = (seed?: string): string => seed ? uuidByString(seed) : randomUUID();

export const parseCsv = async (csv: string) => {
  logger.info('Parsing CSV...');
  let json = {};
  try {
    json = await csvToJson().fromString(csv);
  } catch (e) {
    json = [];
  }
  return json;
};

const initCap = async (str: string): Promise<string> => {
  // full initCap on all words in a string
  const res = await expressions.initCap.evaluate(str, { initCapOnce });
  return res;
};

const matches = (str: string, regex: string) => {
  /* match whole string (like fhirpath) */
  const fn = new RegExp(`^${regex}$`);
  return fn.test(str);
};

const duplicate = async (str: string, times: number): Promise<string> => {
  if (times === 1) return str;
  if (times === 0) return '';
  return await expressions.duplicate.evaluate({}, { times, str });
};

const isNumeric = (n: any) => {
  if (typeof n === 'number') {
    return true;
  };
  if (typeof n === 'string') {
    return !isNaN(Number(n)) && isFinite(Number(n));
  };
  if (Array.isArray(n) && n.length === 1) {
    return isNumeric(n[0]);
  };
  return false;
};

export default {
  startsWith,
  endsWith,
  initCapOnce,
  initCap,
  substringBefore,
  substringAfter,
  uuid,
  matches,
  duplicate,
  isNumeric
};
