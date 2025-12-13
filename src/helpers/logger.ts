/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
import type { Logger } from '../types';

/** Global logger instance */
let logger: Logger = {
  debug: console.debug,
  info: console.info,
  warn: console.warn,
  error: console.error
};

export const setLogger = (loggerObj: Logger): void => {
  logger = loggerObj;
};

export const getLogger = (): Logger => {
  return logger;
};
