/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME
 */

import config from './config';

const logger = config.getLogger();

const info = (message: any): undefined => {
  logger.info(message);
  return undefined;
};

const warn = (message: any): undefined => {
  logger.warn(message);
  return undefined;
};

const error = (message: any): undefined => {
  logger.error(message);
  return undefined;
};

export default {
  info,
  warn,
  error
};
