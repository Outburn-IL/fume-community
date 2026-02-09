/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
import { afterEach, describe, expect, jest, test } from '@jest/globals';

import { FumeEngine } from '../../src/engine';

describe('FumeEngine logger', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('uses console logger by default', async () => {
    const engine = new FumeEngine();
    const logger = engine.getLogger();
    expect(logger).toBeDefined();

    // The default logger uses console methods directly
    expect(logger.info).toBe(console.info);
    expect(logger.warn).toBe(console.warn);
    expect(logger.error).toBe(console.error);
  });

  test('allows overriding logger', async () => {
    const engine = new FumeEngine();
    const mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };
    engine.registerLogger(mockLogger);
    const logger = engine.getLogger();
    expect(logger).toBeDefined();

    logger.info('log');
    expect(mockLogger.info).toHaveBeenCalledWith('log');

    logger.warn('warn');
    expect(mockLogger.warn).toHaveBeenCalledWith('warn');

    logger.error('error');
    expect(mockLogger.error).toHaveBeenCalledWith('error');
  });
});
