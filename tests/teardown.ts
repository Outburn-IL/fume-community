/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
import * as compose from 'docker-compose';

async function teardown () {
  console.log('stopping FHIR server...');
  await compose.stopMany(globalThis.services);

  console.log('closing server');
  globalThis.fumeServer.shutDown();
}

export default teardown;
