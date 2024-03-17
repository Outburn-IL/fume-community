/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import { generateSnapshot } from '../snapshotBuilder';

// TODO: add support for multiline contexts and values
// TODO: support single line comments using "//"
export const snapshots = {}; // cache for generated StructureDefinition snapshots

export const getSnapshot = async (rootType: string) => {
  // fetch a snapshot from cache or build it if not chached
  if (snapshots[rootType]) return snapshots[rootType];
  const snapshot = await generateSnapshot(rootType);
  snapshots[rootType] = snapshot;
  return snapshot;
};
