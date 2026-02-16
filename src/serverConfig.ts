/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import * as dotenv from 'dotenv';
import { z } from 'zod';

import { IConfig } from './types';

const normalizeRegistryUrl = (value: unknown): unknown => {
	if (typeof value !== 'string') return value;
	const trimmed = value.trim();
	if (trimmed.toLowerCase() === 'n/a') return 'n/a';
	return trimmed;
};

const normalizeOptionalUrl = (value: unknown): unknown => {
	if (typeof value !== 'string') return value;
	const trimmed = value.trim();
	if (trimmed === '') return undefined;
	if (trimmed.toLowerCase() === 'n/a') return 'n/a';
	return trimmed;
};

const normalizeOptionalPath = (value: unknown): unknown => {
	if (typeof value !== 'string') return value;
	const trimmed = value.trim();
	if (trimmed === '') return undefined;
	if (trimmed.toLowerCase() === 'n/a') return 'n/a';
	return trimmed;
};

const normalizeOptionalCacheDir = (value: unknown): unknown => {
	if (typeof value !== 'string') return value;
	const trimmed = value.trim();
	if (trimmed === '') return undefined;
	if (trimmed.toLowerCase() === 'n/a') return undefined;
	return trimmed;
};

export const FumeConfigSchema = z.object({
	SERVER_PORT: z.preprocess((a) => typeof a === 'string' ? parseInt(a) : a, z.number().int('Must be an integer').positive('Must be positive').default(42420)),
	FUME_REQUEST_BODY_LIMIT: z.string().min(1).default('400mb'),
	FUME_EVAL_THROW_LEVEL: z.preprocess(
		(a) => typeof a === 'string' ? parseInt(a) : a,
		z.number().int('Must be an integer').nonnegative('Must be non-negative').default(30)
	),
	FUME_EVAL_LOG_LEVEL: z.preprocess(
		(a) => typeof a === 'string' ? parseInt(a) : a,
		z.number().int('Must be an integer').nonnegative('Must be non-negative').default(40)
	),
	FUME_EVAL_DIAG_COLLECT_LEVEL: z.preprocess(
		(a) => typeof a === 'string' ? parseInt(a) : a,
		z.number().int('Must be an integer').nonnegative('Must be non-negative').default(70)
	),
	FUME_EVAL_VALIDATION_LEVEL: z.preprocess(
		(a) => typeof a === 'string' ? parseInt(a) : a,
		z.number().int('Must be an integer').nonnegative('Must be non-negative').default(30)
	),
	FHIR_SERVER_BASE: z.preprocess(
		normalizeOptionalUrl,
		z.string().min(1).url().or(z.literal('n/a')).default('')
	),
	FHIR_SERVER_AUTH_TYPE: z.string().default('NONE'),
	FHIR_SERVER_UN: z.string().default(''),
	FHIR_SERVER_PW: z.string().default(''),
	FHIR_SERVER_TIMEOUT: z.preprocess((a) => typeof a === 'string' ? parseInt(a) : a, z.number().int('Must be an integer').positive('Must be positive').default(30000)),
	FHIR_VERSION: z.string().min(1).default('4.0.1'),
	FHIR_PACKAGES: z.string().default(''),
	FHIR_PACKAGE_REGISTRY_URL: z.preprocess(
		normalizeRegistryUrl,
		z.string().url().or(z.literal('n/a'))
	).optional(),
	FHIR_PACKAGE_REGISTRY_TOKEN: z.string().optional(),
	FHIR_PACKAGE_CACHE_DIR: z.preprocess(normalizeOptionalCacheDir, z.string().min(1).optional()),
	MAPPINGS_FOLDER: z.preprocess(
		normalizeOptionalPath,
		z.string().min(1).or(z.literal('n/a')).optional()
	),
	MAPPINGS_FILE_EXTENSION: z.preprocess(
		normalizeOptionalPath,
		z.string().min(1).optional()
	),
	MAPPINGS_FILE_POLLING_INTERVAL_MS: z.preprocess(
		(a) => typeof a === 'string' ? parseInt(a) : a,
		z.number().int('Must be an integer')
	).optional(),
	MAPPINGS_SERVER_POLLING_INTERVAL_MS: z.preprocess(
		(a) => typeof a === 'string' ? parseInt(a) : a,
		z.number().int('Must be an integer')
	).optional(),
	MAPPINGS_FORCED_RESYNC_INTERVAL_MS: z.preprocess(
		(a) => typeof a === 'string' ? parseInt(a) : a,
		z.number().int('Must be an integer')
	).optional(),
	FUME_COMPILED_EXPR_CACHE_MAX_ENTRIES: z.preprocess(
		(a) => typeof a === 'string' ? parseInt(a) : a,
		z.number().int('Must be an integer').positive('Must be positive').default(1000)
	)
});

dotenv.config();
export const config: IConfig = FumeConfigSchema.parse(process.env);
export default config;
