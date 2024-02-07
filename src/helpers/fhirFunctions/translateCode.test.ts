import { translateCode } from './translateCode';
import { test } from '@jest/globals';
import conformance from '../conformance';
import cache from '../cache';

jest.mock('../logger', () => ({
  getLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    error: jest.fn()
  })
}));

describe('translateCode', () => {
  let mockGetTable;

  beforeEach(() => {
    mockGetTable = jest.spyOn(conformance, 'getTable');
    mockGetTable.mockResolvedValue({ tableId: { input: [{ code: 1 }] } });
  });

  afterEach(() => {
    cache.tables = {};
    mockGetTable.mockRestore();
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
