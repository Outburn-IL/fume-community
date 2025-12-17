/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import * as dotenv from 'dotenv';
import { z } from 'zod';

import { IConfig } from './types';

export const FumeConfigSchema = z.object({
	SERVER_PORT: z.preprocess((a) => typeof a === 'string' ? parseInt(a) : a, z.number().int('Must be an integer').positive('Must be positive').default(42420)),
	SERVER_STATELESS: z.preprocess((a) => a === 'true', z.boolean().default(false)),
	FHIR_SERVER_BASE: z.string().min(1).url().default('http://hapi-fhir.outburn.co.il/fhir'),
	FHIR_SERVER_AUTH_TYPE: z.string().default('NONE'),
	FHIR_SERVER_UN: z.string().default(''),
	FHIR_SERVER_PW: z.string().default(''),
	FHIR_SERVER_TIMEOUT: z.preprocess((a) => typeof a === 'string' ? parseInt(a) : a, z.number().int('Must be an integer').positive('Must be positive').default(30000)),
	FHIR_VERSION: z.string().min(1).default('4.0.1'),
	FHIR_PACKAGES: z.string().default(''),
	FHIR_PACKAGE_REGISTRY_URL: z.string().url().optional(),
	FHIR_PACKAGE_REGISTRY_TOKEN: z.string().optional(),
	FHIR_PACKAGE_CACHE_DIR: z.string().optional()
});

dotenv.config();
export const config: IConfig = FumeConfigSchema.parse(process.env);
export default config;
