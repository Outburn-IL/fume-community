/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import { randomUUID } from 'crypto';
import { sha256 } from 'js-sha256';
import uuidByString from 'uuid-by-string';

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
