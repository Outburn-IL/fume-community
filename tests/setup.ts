import { FumeServer } from '../src/server';

async function setup () {
  console.log('starting server...');
  globalThis.fumeServer = new FumeServer();
  await globalThis.fumeServer.warmUp();
  globalThis.app = globalThis.fumeServer.getExpressApp();
  console.log('server started!');
}

export default setup;
