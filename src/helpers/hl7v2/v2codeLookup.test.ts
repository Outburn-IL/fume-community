import { test } from '@jest/globals';

import { v2codeLookup } from './v2codeLookup';

describe('v2codeLookup', () => {
  test('looks up existing key', async () => {
    const res = await v2codeLookup(761, '0');
    expect(res).toBe('Valid code');
  });

  test('looks up missing key', async () => {
    const res = await v2codeLookup(761, '9');
    expect(res).toBe(undefined);
  });
});
