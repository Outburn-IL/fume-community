/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME
 */

import { findClosingBrackets } from './findClosingBrackets';
import { calcBracketDiff } from './calcBracketDiff';
import { isTypeNameValid } from './isTypeNameValid';
import { eDefSelector } from './eDefSelector';
import { getMandatoriesOfStructure } from './getMandatoriesOfStructure';
import { getMandatoriesOfElement } from './getMandatoriesOfElement';
import { getJsonElementName } from './getJsonElementName';

export const funcs = {
  findClosingBrackets,
  calcBracketDiff,
  isTypeNameValid,
  eDefSelector,
  getMandatoriesOfStructure,
  getMandatoriesOfElement,
  getJsonElementName
};
