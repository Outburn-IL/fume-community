/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME
 */

import express from 'express';
import mapping from './mapping';
import root from './root';

const routes = express.Router();

routes.use('/Mapping/', mapping);

routes.use('/', root);

routes.use((_req, res) => {
  res.status(404).json({ message: 'not found' });
});

export default routes;
