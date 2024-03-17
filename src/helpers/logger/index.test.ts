/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
import { test } from '@jest/globals';

import { getLogger, setLogger } from './index';

describe('getLogger', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('uses console logger by default', async () => {
    const logger = getLogger();
    expect(logger).toBeDefined();

    jest.spyOn(console, 'log');
    const warnSpy = jest.spyOn(console, 'warn');
    warnSpy.mockImplementation(() => {});
    const errorSpy = jest.spyOn(console, 'error');
    errorSpy.mockImplementation(() => {});

    logger.info('log');
    expect(console.log).toHaveBeenCalledWith('log');

    logger.warn('warn');
    expect(console.warn).toHaveBeenCalledWith('warn');

    logger.error('error');
    expect(console.error).toHaveBeenCalledWith('error');
  });

  test('allows overriding logger', async () => {
    const mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };
    setLogger(mockLogger);
    const logger = getLogger();
    expect(logger).toBeDefined();

    jest.spyOn(console, 'log');
    jest.spyOn(console, 'warn');
    jest.spyOn(console, 'error');

    logger.info('log');
    expect(mockLogger.info).toHaveBeenCalledWith('log');

    logger.warn('warn');
    expect(mockLogger.warn).toHaveBeenCalledWith('warn');

    logger.error('error');
    expect(mockLogger.error).toHaveBeenCalledWith('error');
  });
});
