/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME
 */

import { snapshots, getSnapshot } from './getSnapshot';
import * as snapshotBuilder from '../snapshotBuilder';

import { test } from '@jest/globals';

describe('getSnapshot', () => {
  afterEach(() => {
    // Clean cache
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    Object.keys(snapshots).forEach(key => delete snapshots[key]);
    // Clean mocks
    jest.restoreAllMocks();
  });

  test('stores snapshot', async () => {
    const generateSnapshotSpy = jest.spyOn(snapshotBuilder, 'generateSnapshot').mockResolvedValue('banana');
    const firstSnap = await getSnapshot('type1');
    const secondSnap = await getSnapshot('type1');
    expect(firstSnap).toBe('banana');
    expect(secondSnap).toBe('banana');
    expect(generateSnapshotSpy).toHaveBeenCalledTimes(1);
  });

  test('returns multiple snaps', async () => {
    jest.spyOn(snapshotBuilder, 'generateSnapshot').mockResolvedValueOnce('banana');
    const firstSnap = await getSnapshot('type1');
    jest.spyOn(snapshotBuilder, 'generateSnapshot').mockResolvedValueOnce('apple');
    const secondSnap = await getSnapshot('type2');
    expect(firstSnap).toBe('banana');
    expect(secondSnap).toBe('apple');
  });
});
