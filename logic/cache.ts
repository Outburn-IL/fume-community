/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME
 */
export const fhirCorePackages = {
  '4.0.1': 'hl7.fhir.r4.core@4.0.1',
  '4.3.0': 'hl7.fhir.r4b.core@4.3.0',
  '5.0.0': 'hl7.fhir.r5.core@5.0.0'
};

export const tables: Record<string, any> = {};
export const snapshots = {}; // cache for generated StructureDefinition snapshots
export const aliases: Record<string, any> = {};
export const v2keyMap = {};
export const bindingsCacheToAdd = [];
export const bindingsFuncsToAdd = [];
export const expressions = {}; // previously parsed expressions
export const mappingCacheCompiled = {}; // user defined functions
export const fhirCacheIndex = {}; // complete index of all cached fhir packages

export default {
  snapshots,
  tables,
  mappingCacheCompiled,
  aliases,
  expressions,
  v2keyMap,
  fhirCacheIndex,
  bindingsFuncsToAdd,
  bindingsCacheToAdd
};
