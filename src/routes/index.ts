/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME
 */

import express from 'express';
import mapping from './mapping';
import root from './root';
import notFound from './notFound';

const routes = express.Router();

routes.use('/Mapping/', mapping);
routes.use('/', root);

export {
  routes,
  notFound
};
