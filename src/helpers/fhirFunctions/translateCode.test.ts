/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
import { test } from '@jest/globals';

import { initCache } from '../cache';
import { getTable } from '../conformance';
import { translateCode } from './translateCode';

jest.mock('../conformance', () => ({
  getTable: jest.fn()
}));

jest.mock('../logger', () => ({
  getLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    error: jest.fn()
  })
}));

describe('translateCode', () => {
  let mockGetTable;

  beforeEach(() => {
    initCache();
    mockGetTable = getTable as jest.Mock;
    mockGetTable.mockResolvedValue({ tableId: { input: [{ code: 1 }] } });
  });

  afterEach(() => {
    (getTable as jest.Mock).mockRestore();
  });

  test('returns undefined on error', async () => {
    mockGetTable.mockRejectedValueOnce('error');
    const res = await translateCode('input', 'tableId');
    expect(mockGetTable).toHaveBeenCalledTimes(1);
    expect(res).toEqual(undefined);
  });

  test('fetches table if not cached, returns code', async () => {
    const res = await translateCode('input', 'tableId');
    expect(mockGetTable).toHaveBeenCalledTimes(1);
    expect(res).toEqual(1);
  });

  test('uses cached table if exists, returns code', async () => {
    await translateCode('input', 'tableId');
    const res = await translateCode('input', 'tableId');
    expect(mockGetTable).toHaveBeenCalledTimes(1);
    expect(res).toEqual(1);
  });
});
