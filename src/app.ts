import { FumeServer } from './server';

const server = new FumeServer();
server.warmUp().then((res) => {
  console.log('FUME is ready!');
}).catch((err) => {
  console.error('FUME failed to initialize:', err);
});
