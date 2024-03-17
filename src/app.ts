/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
import { FumeServer } from './server';

const server = new FumeServer();
server.warmUp().then((res) => {
  console.log('FUME is ready!');
}).catch((err) => {
  console.error('FUME failed to initialize:', err);
});
