/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
import express from 'express';

const notFound = express.Router();

notFound.use((_req, res, next) => {
  res.status(404).json({ message: 'not found' });
});

export default notFound;
