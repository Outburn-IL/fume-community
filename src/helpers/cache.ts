/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME
 */

export const tables: Record<string, any> = {};
export const snapshots = {}; // cache for generated StructureDefinition snapshots
export const aliases: Record<string, any> = {};
export const v2keyMap = {};

export const expressions = {}; // previously parsed expressions
export const mappings = {}; // user defined functions
export const fhirCacheIndex = {}; // complete index of all cached fhir packages

export default {
  snapshots,
  tables,
  mappings,
  aliases,
  expressions,
  v2keyMap,
  fhirCacheIndex
};
