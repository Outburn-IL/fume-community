/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import { randomUUID } from 'crypto';
import { sha256 } from 'js-sha256';
import uuidByString from 'uuid-by-string';

export const startsWith = (str: string | undefined, startStr: string): boolean | undefined => {
  // undefined inputs always return undefined
  if (typeof str === 'undefined') return undefined;
  return str.startsWith(startStr);
};

export const endsWith = (str: string | undefined, endStr: string): boolean | undefined => {
  // undefined inputs always return undefined
  if (typeof str === 'undefined') return undefined;
  return str.endsWith(endStr);
};

export const substringBefore = (str: string, chars: string): string => {
  // undefined inputs always return undefined
  if (typeof str === 'undefined') {
    return '';
  }
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

// clean and split an expression. returns a line array
export const splitToLines = (expr: string): string[] => removeEmptyLines(expr.split(/\r?\n/));

export const hashKey = (str: string): string => sha256(str + uuid(str));

export const uuid = (seed?: string): string => seed ? uuidByString(seed) : randomUUID();

export const matches = (str: string, regex: string) => {
  /* match whole string (like fhirpath) */
  const fn = new RegExp(`^${regex}$`);
  return fn.test(str);
};

export const isNumeric = (n: any): boolean | undefined => {
  if (typeof n === 'number') return true;
  if (typeof n === 'undefined') return undefined;

  // RegEx taken form the FHIR spec for the decimal datatype: https://www.hl7.org/fhir/r4/datatypes.html
  const isStrNumeric = (str: string) => /^-?(0|[1-9][0-9]*)(.[0-9]+)?([eE][+-]?[0-9]+)?$/.test(str);

  if (typeof n === 'string') return isStrNumeric(n);

  if (Array.isArray(n) && n.length === 1) {
    return isNumeric(n[0]);
  }

  return false;
};
