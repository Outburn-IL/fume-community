/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import { execSync } from 'child_process';

async function teardown () {
  console.log('Skipping HAPI container stop to speed up future test runs...');
  console.log('Note: HAPI containers will remain running. Use "cd tests && docker compose stop" manually if needed.');

  const testTarget = (process.env.FUME_TEST_TARGET ?? 'node').toLowerCase();
  const containerName = process.env.FUME_TEST_DOCKER_CONTAINER_NAME ?? 'fume_community_test_server';
  const keepContainers = (process.env.FUME_TEST_KEEP_CONTAINERS ?? '').toLowerCase() === '1' || (process.env.FUME_TEST_KEEP_CONTAINERS ?? '').toLowerCase() === 'true';

  if ((testTarget === 'docker' || testTarget === 'container') && !keepContainers) {
    try {
      console.log(`Stopping FUME test container: ${containerName}`);
      execSync(`docker rm -f ${containerName}`, { stdio: 'inherit' });
    } catch {
      // ignore
    }
  }

  if (globalThis.fumeServer) {
    console.log('closing in-process server');
    await globalThis.fumeServer.shutDown();
  }
}

export default teardown;
