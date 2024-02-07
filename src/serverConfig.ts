/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME
 */

import z from 'zod';
import * as dotenv from 'dotenv';

dotenv.config();

export interface IConfig {
  SERVER_PORT: number;
  SERVER_STATELESS: boolean;
  FHIR_SERVER_BASE: string;
  FHIR_SERVER_TIMEOUT: number;
  FHIR_VERSION: string;
  SEARCH_BUNDLE_PAGE_SIZE: number;
  FHIR_PACKAGES: string;
}

export const configSchema = z.object({
  SERVER_PORT: z.preprocess((a) => typeof a === 'string' ? parseInt(a) : a, z.number().int('Must be an integer').positive('Must be positive').default(42420)),
  SERVER_STATELESS: z.preprocess((a) => a === 'true', z.boolean().default(false)),
  FHIR_SERVER_BASE: z.string().min(1).url().default('http://hapi-fhir.outburn.co.il/fhir'),
  FHIR_SERVER_TIMEOUT: z.preprocess((a) => typeof a === 'string' ? parseInt(a) : a, z.number().int('Must be an integer').positive('Must be positive').default(30000)),
  FHIR_VERSION: z.string().min(1).default('4.0.1'),
  SEARCH_BUNDLE_PAGE_SIZE: z.preprocess((a) => typeof a === 'string' ? parseInt(a) : a, z.number().int('Must be an integer').positive('Must be positive').default(20)),
  FHIR_PACKAGES: z.string().default('')
});

export const config: IConfig = configSchema.parse(process.env);
export default config;
