/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

const throwRuntimeError = (msg: string): undefined => {
  const error = new Error(`Transformation error: ${msg}`);
  throw (error);
};

export default {
  throwRuntimeError
};
