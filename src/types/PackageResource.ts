/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

/**
 * A basic interface for a resource file in a package
 */
export interface PackageResource {
  id: string
  resourceType: string
  [key: string]: any | any[]
}
