/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
export interface IConfig {
  SERVER_PORT: number
  FUME_REQUEST_BODY_LIMIT?: string
  FUME_EVAL_THROW_LEVEL?: number
  FUME_EVAL_LOG_LEVEL?: number
  FUME_EVAL_DIAG_COLLECT_LEVEL?: number
  FUME_EVAL_VALIDATION_LEVEL?: number
  FHIR_SERVER_BASE: string
  FHIR_SERVER_TIMEOUT: number
  FHIR_VERSION: string
  FHIR_PACKAGES: string
  FHIR_SERVER_AUTH_TYPE: string
  FHIR_SERVER_UN: string
  FHIR_SERVER_PW: string
  FHIR_PACKAGE_REGISTRY_URL?: string
  FHIR_PACKAGE_REGISTRY_TOKEN?: string
  FHIR_PACKAGE_CACHE_DIR?: string
  FHIR_PACKAGE_REGISTRY_ALLOW_HTTP?: boolean // Allow HTTP registry usage (for testing against local mock Artifactory)
  MAPPINGS_FOLDER?: string
  MAPPINGS_FILE_EXTENSION?: string
  MAPPINGS_FILE_POLLING_INTERVAL_MS?: number
  MAPPINGS_SERVER_POLLING_INTERVAL_MS?: number
  MAPPINGS_FORCED_RESYNC_INTERVAL_MS?: number
  FUME_COMPILED_EXPR_CACHE_MAX_ENTRIES?: number
}
