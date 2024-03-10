import { v2 as compose } from 'docker-compose';

async function teardown () {
  console.log('stopping FHIR server...');
  await compose.stopMany(globalThis.services);

  console.log('closing server');
  globalThis.fumeServer.shutDown();
}

export default teardown;
