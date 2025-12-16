/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
import { test } from '@jest/globals';

import { initCache } from '../../src/helpers/cache';
import { getTranslationTable } from '../../src/helpers/conformance';
import { translateCode } from '../../src/helpers/translate';

jest.mock('../../src/helpers/conformance', () => ({
  getTranslationTable: jest.fn()
}));

jest.mock('../../src/helpers/logger', () => ({
  getLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    error: jest.fn()
  })
}));

describe('translateCode', () => {
  let mockgetTranslationTable: jest.Mock<any, any, any>;

  beforeEach(() => {
    initCache();
    mockgetTranslationTable = getTranslationTable as jest.Mock;
    mockgetTranslationTable.mockResolvedValue({ tableId: { input: [{ code: 1 }] } });
  });

  afterEach(() => {
    (getTranslationTable as jest.Mock).mockRestore();
  });

  test('returns undefined on error', async () => {
    mockgetTranslationTable.mockRejectedValueOnce('error');
    const res = await translateCode('input', 'tableId');
    expect(mockgetTranslationTable).toHaveBeenCalledTimes(1);
    expect(res).toEqual(undefined);
  });

  test('fetches table if not cached, returns code', async () => {
    const res = await translateCode('input', 'tableId');
    expect(mockgetTranslationTable).toHaveBeenCalledTimes(1);
    expect(res).toEqual(1);
  });

  test('uses cached table if exists, returns code', async () => {
    await translateCode('input', 'tableId');
    const res = await translateCode('input', 'tableId');
    expect(mockgetTranslationTable).toHaveBeenCalledTimes(1);
    expect(res).toEqual(1);
  });
});
