/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
import { v2 as compose } from 'docker-compose';
import path from 'path';

async function teardown () {
  console.log('stopping FHIR server (Using docker compose V2)...');
  await compose.stop({
    cwd: path.join(__dirname),
    config: 'docker-compose.yml',
    log: true
  });

  console.log('closing server');
  globalThis.fumeServer.shutDown();
}

export default teardown;
