/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
import { afterEach, describe, expect, jest, test } from '@jest/globals';

import { FumeEngine } from '../../src/engine';
import { FHIR_PACKAGE_CACHE_DIR } from '../config';

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

    const engine = await FumeEngine.create({
      config: {
        SERVER_PORT: 0,
        FUME_REQUEST_BODY_LIMIT: '400mb',

        // Keep mapping sources disabled; we only need the global FHIR context initialized.
        FHIR_SERVER_BASE: 'n/a',
        FHIR_SERVER_AUTH_TYPE: 'NONE',
        FHIR_SERVER_UN: '',
        FHIR_SERVER_PW: '',
        FHIR_SERVER_TIMEOUT: 30000,

        MAPPINGS_FOLDER: 'n/a',

        FHIR_VERSION: '4.0.1',
        FHIR_PACKAGES: 'il.core.fhir.r4@0.14.2,fume.outburn.r4@0.1.1,il.tasmc.fhir.r4@0.1.1',
        FHIR_PACKAGE_CACHE_DIR
      }
    });
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
    const mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };

    const engine = await FumeEngine.create({
      config: {
        SERVER_PORT: 0,
        FUME_REQUEST_BODY_LIMIT: '400mb',

        // Keep mapping sources disabled; we only need the global FHIR context initialized.
        FHIR_SERVER_BASE: 'n/a',
        FHIR_SERVER_AUTH_TYPE: 'NONE',
        FHIR_SERVER_UN: '',
        FHIR_SERVER_PW: '',
        FHIR_SERVER_TIMEOUT: 30000,

        MAPPINGS_FOLDER: 'n/a',

        FHIR_VERSION: '4.0.1',
        FHIR_PACKAGES: 'il.core.fhir.r4@0.14.2,fume.outburn.r4@0.1.1,il.tasmc.fhir.r4@0.1.1',
        FHIR_PACKAGE_CACHE_DIR
      },
      logger: mockLogger
    });

    jest.clearAllMocks();
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
