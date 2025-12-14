/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import express from 'express';

import rootControl from '../controllers/root';
import { failOnStateless } from '../middleware/failOnStateless';

const root = express.Router();

root.post('/:operation', rootControl.operation);
root.get('/recache', failOnStateless, rootControl.recache);
root.get('/', rootControl.get);
root.post('/', rootControl.evaluate);

export default root;
