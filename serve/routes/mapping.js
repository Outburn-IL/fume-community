/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME
 */

import express from 'express';
import mappingControl from '../controllers/mapping';
import { failOnStateless } from '../middleware/failOnStateless';

const mapping = express.Router();

mapping.use(failOnStateless);

/**
 * @swagger
 * /Mapping/{id}:
 *   get:
 *     tags: 
 *      - Mapping
 *     description: Get specific mapping.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: mappingId
 *         description: The name of the mapping
 *         in: url
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Mapping exists.
 *       404:
 *         description: Mapping was not found.
 */
mapping.get('/:mappingId/', mappingControl.get);

/**
 * @swagger
 * /Mapping/{id}:
 *   post:
 *     tags: 
 *      - Mapping
 *     description: Evaluating the input according to the current mapping.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: mappingId
 *         description: The name of the mapping
 *         in: url
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *      required: true
 *      description: The input data (csv/json/hl7v2)
 *      content:
 *        application/json: 
 *          schema:
 *            type: string
 *     responses:
 *       200:
 *         description: Mapping exists, and the input was transformed according to it.
 *       404:
 *         description: Mapping was not found.
 */
mapping.post('/:mappingId/', mappingControl.transform);

export default mapping;
