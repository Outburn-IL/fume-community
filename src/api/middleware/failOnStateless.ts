/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import express from 'express';

import config from '../../config';

export const failOnStateless = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const serverConfig = config.getServerConfig();
  if (serverConfig.SERVER_STATELESS) {
    res.status(405).json({ message: 'Endpoint unavailable without FHIR server' });
    return;
  }
  next();
};
