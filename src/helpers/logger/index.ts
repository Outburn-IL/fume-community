/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
import type { ILogger } from '../../types';

/** Global logger instance */
let logger: ILogger = {
  info: (msg: any) => console.log(msg),
  warn: (msg: any) => console.warn(msg),
  error: (msg: any) => console.error(msg)
};

export const setLogger = (loggerObj: ILogger): void => {
  logger = loggerObj;
};

export const getLogger = (): ILogger => {
  return logger;
};
