/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

async function teardown () {
  console.log('Skipping container stop to speed up future test runs...');
  console.log('Note: Containers will remain running. Use "docker compose down" manually if needed.');
  // Containers are left running with restart policy "unless-stopped" for faster subsequent test runs
  // To manually stop: cd tests && docker compose stop
  
  console.log('closing server');
  globalThis.fumeServer.shutDown();
}

export default teardown;
