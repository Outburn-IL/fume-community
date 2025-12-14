/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import express from 'express';

import mappingControl from '../controllers/mapping';
import { failOnStateless } from '../middleware/failOnStateless';

const mapping = express.Router();

mapping.use(failOnStateless);
mapping.get('/:mappingId/:operation', mappingControl.operation);
mapping.get('/:mappingId/', mappingControl.get);
mapping.post('/:mappingId/', mappingControl.transform);

export default mapping;
