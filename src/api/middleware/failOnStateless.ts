/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import type { NextFunction, Request, Response } from 'express';

import type { FumeEngine } from '../../engine';
import { hasMappingSources } from '../../utils/mappingSources';

export const failOnStateless = (req: Request, res: Response, next: NextFunction) => {
  const engine = req.app.locals.engine as FumeEngine;
  if (!hasMappingSources(engine.getConfig())) {
    res.status(405).json({ message: 'Endpoint unavailable without mapping sources (FHIR server or mappings folder).' });
    return;
  }
  next();
};
