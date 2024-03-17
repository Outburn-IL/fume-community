/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
import { test } from '@jest/globals';

import { replaceColonsWithBrackets } from './replaceColonsWithBrackets';

describe('initCap', () => {
  test('leaves text as is', async () => {
    const res = await replaceColonsWithBrackets('hello');
    expect(res).toBe('hello');
  });

  test('leaves text as is with dots', async () => {
    const res = await replaceColonsWithBrackets('hello.world');
    expect(res).toBe('hello.world');
  });

  test('replaces colons', async () => {
    const res = await replaceColonsWithBrackets('hello.world:magic');
    expect(res).toBe('hello.world[magic]');
  });
});
