/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME
 */

import { aliasResourceToObject } from './aliasResourceToObject';
import { bundleToArrayOfResources } from './bundleToArrayOfResources';
import { checkPackagesMissingFromIndex } from './checkPackagesMissingFromIndex';
import { conceptMapToTable } from './conceptMapToTable';
import { constructLineIterator } from './constructLineIterator';
import { createRawPackageIndexObject } from './createRawPackageIndexObject';
import { duplicate } from './duplicate';
import { extractNextLink } from './extractNextLink';
import { fixPackageIndexObject } from './fixPackageIndexObject';
import { initCap } from './initCap';
import { literal } from './literal';
import { omitKeys } from './omitKeys';
import { parseFumeExpression } from './parseFumeExpression';
import { searchSingle } from './searchSingle';
import { selectKeys } from './selectKeys';
import { structureMapsToMappingObject } from './structureMapsToMappingObject';
import { translateCodeExtract } from './translateCodeExtract';
import { translateCodingExtract } from './translateCodingExtract';
import { v2json } from './v2json';
import { v2normalizeKey } from './v2normalizeKey';

export const expressions = {
  translateCodeExtract,
  translateCodingExtract,
  searchSingle,
  literal,
  initCap,
  duplicate,
  selectKeys,
  omitKeys,
  v2normalizeKey,
  v2json,
  parseFumeExpression,
  constructLineIterator,
  extractNextLink,
  bundleToArrayOfResources,
  structureMapsToMappingObject,
  aliasResourceToObject,
  conceptMapToTable,
  createRawPackageIndexObject,
  fixPackageIndexObject,
  checkPackagesMissingFromIndex
};
