
import express from 'express';

const notFound = express.Router();

notFound.use((_req, res, next) => {
  res.status(404).json({ message: 'not found' });
});

export default notFound;
