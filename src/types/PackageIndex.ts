/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import { FileInPackageIndex } from './FileInPackageIndex';

/**
 * The structure of a package's `.index.json` and `fume.index.json` files, according to version 2 @see https://hl7.org/fhir/packages.html
 */
export interface PackageIndex {
  'index-version': number
  files: FileInPackageIndex[]
}
