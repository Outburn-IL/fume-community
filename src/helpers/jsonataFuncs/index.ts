/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import { calcBracketDiff } from './calcBracketDiff';
import { eDefSelector } from './eDefSelector';
import { findClosingBrackets } from './findClosingBrackets';
import { getJsonElementName } from './getJsonElementName';
import { getMandatoriesOfElement } from './getMandatoriesOfElement';
import { getMandatoriesOfStructure } from './getMandatoriesOfStructure';
import { isTypeNameValid } from './isTypeNameValid';

export const funcs = {
  findClosingBrackets,
  calcBracketDiff,
  isTypeNameValid,
  eDefSelector,
  getMandatoriesOfStructure,
  getMandatoriesOfElement,
  getJsonElementName
};
