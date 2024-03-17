/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
import { z } from 'zod';

export const FumeConfigSchema = z.object({
  SERVER_PORT: z.preprocess((a) => typeof a === 'string' ? parseInt(a) : a, z.number().int('Must be an integer').positive('Must be positive').default(42420)),
  SERVER_STATELESS: z.preprocess((a) => a === 'true', z.boolean().default(false)),
  FHIR_SERVER_BASE: z.string().min(1).url().default('http://hapi-fhir.outburn.co.il/fhir'),
  FHIR_SERVER_AUTH_TYPE: z.string().default('NONE'),
  FHIR_SERVER_UN: z.string().default(''),
  FHIR_SERVER_PW: z.string().default(''),
  FHIR_SERVER_TIMEOUT: z.preprocess((a) => typeof a === 'string' ? parseInt(a) : a, z.number().int('Must be an integer').positive('Must be positive').default(30000)),
  FHIR_VERSION: z.string().min(1).default('4.0.1'),
  SEARCH_BUNDLE_PAGE_SIZE: z.preprocess((a) => typeof a === 'string' ? parseInt(a) : a, z.number().int('Must be an integer').positive('Must be positive').default(20)),
  FHIR_PACKAGES: z.string().default(''),
  EXCLUDE_FHIR_PACKAGES: z.string().default('')
});
