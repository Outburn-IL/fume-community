/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import express from 'express';

import mapping from './mapping';
import notFound from './notFound';
import root from './root';

const routes = express.Router();

routes.use('/Mapping/', mapping);
routes.use('/', root);

export {
  notFound,
  routes
};
