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

  test('uses null logger by default', async () => {
    const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {
      // noop
    });
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {
      // noop
    });
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {
      // noop
    });

    const engine = new FumeEngine();
    const logger = engine.getLogger();
    expect(logger).toBeDefined();

    expect(logger.debug).toBeUndefined();

    logger.info('hello');
    logger.warn('warn');
    logger.error('error');

    expect(infoSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
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
