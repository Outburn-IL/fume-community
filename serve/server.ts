/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME
 */

import express from 'express';
import serverConfig from './serverConfig';
import fume from '../dist/fume';
import cors from 'cors';
import routes from './routes/routes';

async function warmUp () {
  // set init options according to .env params

  const initOptions = {
    fhirVersion: serverConfig.FHIR_VERSION,
    fhirPackages: serverConfig.FHIR_PACKAGES,
    fhirServer: serverConfig.SERVER_STATELESS ? undefined : serverConfig.FHIR_SERVER_BASE,
    fhirServerTimeout: serverConfig.FHIR_SERVER_TIMEOUT,
    searchBundleSize: serverConfig.SEARCH_BUNDLE_PAGE_SIZE
  };

  // initialize fume engine
  console.log({ initOptions });
  await fume.init(initOptions);
}

const app = express();

app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.json({ limit: '50mb', type: ['application/json', 'application/fhir+json'] }));
app.use(express.text({ limit: '50mb', type: ['text/plain', 'application/vnd.outburn.fume', 'x-application/hl7-v2+er7', 'text/csv'] }));
app.use(cors());
app.use('/', routes);

warmUp().then(() => {
  console.log('Finished warming up');
  app.listen(serverConfig.SERVER_PORT);
  console.log(`FUME server started on port: ${serverConfig.SERVER_PORT}`);
}).catch(err => {
  console.log('Error warming up: ', err);
});

module.exports = { app };
