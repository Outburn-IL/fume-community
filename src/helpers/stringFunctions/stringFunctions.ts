/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

// import jsonata from 'jsonata';
import { randomUUID } from 'crypto';
import csvToJson from 'csvtojson';
import { sha256 } from 'js-sha256';
import uuidByString from 'uuid-by-string';

import { getLogger } from '../logger';

export const startsWith = (str: string, startStr: string): boolean => str.startsWith(startStr);

export const endsWith = (str: string, endStr: string): boolean => str.endsWith(endStr);

export const initCapOnce = (str: string): string => {
  // used for polymorhic element names, where all type names need to
  // be appended to base element names but the result must be camelCased
  // e.g. if chosen type for value[x] is string, the element name will be valueString
  return str[0].toUpperCase() + str.slice(1);
};

export const substringBefore = (str: string, chars: string): string => {
  // undefined inputs always return undefined
  if (typeof str === 'undefined') {
    return '';
  };
  const pos = str.indexOf(chars);
  if (pos > -1) {
    return str.substring(0, pos);
  } else {
    return str;
  }
};

export const substringAfter = (str: string, chars: string): string => {
  // undefined inputs always return undefined
  if (typeof str === 'undefined') {
    return '';
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

export const uuid = (seed?: string): string => seed ? uuidByString(seed) : randomUUID();

export const parseCsv = async (csv: string) => {
  // fork: os
  getLogger().info('Parsing CSV...');
  let json = {};
  try {
    json = await csvToJson().fromString(csv);
  } catch (e) {
    json = [];
  }
  return json;
};

export const matches = (str: string, regex: string) => {
  /* match whole string (like fhirpath) */
  const fn = new RegExp(`^${regex}$`);
  return fn.test(str);
};

export const isNumeric = (n: any) => {
  if (typeof n === 'number') {
    return true;
  };
  if (typeof n === 'string') {
    return !isNaN(parseFloat(n)) && isFinite(parseFloat(n));
  };
  if (Array.isArray(n) && n.length === 1) {
    return isNumeric(n[0]);
  };
  return false;
};
