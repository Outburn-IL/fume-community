import { getLogger } from '../logger';

export const logInfo = (message) => {
  getLogger().info(message);
};

export const logWarn = (message) => {
  getLogger().warn(message);
};
