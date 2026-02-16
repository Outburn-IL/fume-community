/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import { describe, expect, jest, test } from '@jest/globals';

import type { Logger } from '@outburn/types';

import { parseLogLevel, withLevelFilter } from '../../src/utils/logging';

describe('logging utils', () => {
  test('parseLogLevel supports silent', () => {
    expect(parseLogLevel('silent')).toBe('silent');
    expect(parseLogLevel('off')).toBe('silent');
    expect(parseLogLevel('none')).toBe('silent');
  });

  test('parseLogLevel avoids WARN vs WARNING ambiguity (accepts warning but returns warn)', () => {
    expect(parseLogLevel('warn')).toBe('warn');
    expect(parseLogLevel('warning')).toBe('warn');
  });

  test('withLevelFilter suppresses messages below threshold', () => {
    const base: Logger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };

    const filtered = withLevelFilter(base, 'warn');

    filtered.debug?.('d');
    filtered.info('i');
    filtered.warn('w');
    filtered.error('e');

    expect((base.debug as jest.Mock)).not.toHaveBeenCalled();
    expect((base.info as jest.Mock)).not.toHaveBeenCalled();
    expect((base.warn as jest.Mock)).toHaveBeenCalledWith('w');
    expect((base.error as jest.Mock)).toHaveBeenCalledWith('e');
  });

  test('withLevelFilter(silent) suppresses everything', () => {
    const base: Logger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };

    const filtered = withLevelFilter(base, 'silent');

    filtered.debug?.('d');
    filtered.info('i');
    filtered.warn('w');
    filtered.error('e');

    expect((base.debug as jest.Mock)).not.toHaveBeenCalled();
    expect((base.info as jest.Mock)).not.toHaveBeenCalled();
    expect((base.warn as jest.Mock)).not.toHaveBeenCalled();
    expect((base.error as jest.Mock)).not.toHaveBeenCalled();
  });
});
