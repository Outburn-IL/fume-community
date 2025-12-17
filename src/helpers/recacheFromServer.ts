/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

/**
 * Deprecated: this module was removed in the v4 refactor.
 * Use an instance of `FumeEngine` (or `FumeServer`) instead:
 * - `engine.cacheMapping(expression)`
 * - `engine.recacheFromServer()`
 */

export const cacheMapping = () => {
  throw new Error('cacheMapping was moved to FumeEngine. Use engine.cacheMapping(expression).');
};

export const recacheFromServer = async (): Promise<boolean> => {
  throw new Error('recacheFromServer was moved to FumeEngine. Use engine.recacheFromServer().');
};
