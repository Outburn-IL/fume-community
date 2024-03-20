/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
import * as compose from 'docker-compose';
import path from 'path';

async function teardown () {
  console.log('stopping FHIR server...');
  await compose.stop({
    cwd: path.join(__dirname),
    config: 'docker-compose.yml',
    log: true
  });

  console.log('closing server');
  globalThis.fumeServer.shutDown();
}

export default teardown;
