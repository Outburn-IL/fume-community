/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

const throwParseError = (msg: string): undefined => {
  const error = new Error(`FLASH Parse error: ${msg}`);
  throw (error);
};

const throwRuntimeError = (msg: string): undefined => {
  const error = new Error(`Transformation error: ${msg}`);
  throw (error);
};

export default {
  throwParseError,
  throwRuntimeError
};
