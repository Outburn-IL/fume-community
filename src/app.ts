/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
import { FumeServer } from './server';

const server = new FumeServer();
server.warmUp().then(() => {
  // warmUp already logs initialization; keep a final line for parity
  console.info('FUME is ready!');
}).catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`FUME failed to initialize: ${message}`);
});
