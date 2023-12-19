/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME
 */

import express from 'express';
import rootControl from '../controllers/root';
import { failOnStateless } from '../middleware/failOnStateless';

const root = express.Router();

root.get('/recache', failOnStateless, rootControl.recache);

root.get('/', rootControl.get);

/**
 * @swagger
 * /:
 *   post:
 *     tags: 
 *      - Evaluation
 *     description: Evaluating an input according to a specific mapping. "input" - The input data - json/hl7v2/csv, "fume" - The mapping string.
 *     produces:
 *       - application/json
 *     requestBody:
 *      required: true
 *      content:
 *        application/json: 
 *          schema:
 *            type: object  
 *            properties:
 *              input:      
 *                type: string
 *              fume:   
 *                type: string
 *            required:
 *              - input
 *              - fume
 *     responses:
 *       200:
 *         description: The input was evaluated and a resource was returned.
 *       4**:
 *         description: An error occurred during the evaluation. An explanation is included.
 *       500:
 *         description: Internal fume server error.
 */
root.post('/', rootControl.evaluate);

export default root;
