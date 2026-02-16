/**
 * Standalone/env-oriented config loader.
 *
 * This module is intentionally NOT used by engine/server internals so that
 * importing fume-community as a library has no process.env/dotenv side-effects.
 */

import * as dotenv from 'dotenv';

import type { IConfig } from './types';
import { FumeConfigSchema } from './serverConfig';

export const loadFumeConfigFromEnv = (opts?: dotenv.DotenvConfigOptions): IConfig => {
	dotenv.config(opts);
	return FumeConfigSchema.parse(process.env);
};
