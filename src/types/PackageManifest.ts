/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import { PackageIndex } from './PackageIndex';

/**
 * A basic interface for package.json structure with some extra elements
 */
export interface PackageManifest {
  name: string
  version: string
  dependencies?: { [key: string]: string }
  installedPath?: string
  '.index.json'?: PackageIndex
  [key: string]: any
}
