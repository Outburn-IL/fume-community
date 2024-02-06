/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME
 */

import { getLogger } from './logger';

const logger = getLogger();

const info = (message: any): undefined => {
  logger.info(message);
  return undefined;
};

const warn = (message: any): undefined => {
  logger.warn(message);
  return undefined;
};

export default {
  info,
  warn
};
