/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
import { getLogger } from './helpers/logger';
import { FumeServer } from './server';

const server = new FumeServer();
server.warmUp().then(() => {
  getLogger().info('FUME is ready!');
}).catch((err) => {
  getLogger().error({ ERROR: 'FUME failed to initialize', details: err });
});
