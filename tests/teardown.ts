function teardown () {
  console.log('closing server');
  globalThis.fumeServer.shutDown();
}

export default teardown;
