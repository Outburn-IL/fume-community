/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
import { getLogger } from '../logger';

export const logInfo = (message) => {
  getLogger().info(message);
};

export const logWarn = (message) => {
  getLogger().warn(message);
};
