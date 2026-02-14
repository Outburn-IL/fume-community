/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
export interface IConfig {
  SERVER_PORT: number
  SERVER_REQUEST_BODY_LIMIT?: string
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

  // Sizing knobs for default internal caches (ignored when external caches are injected)
  FUME_DEFAULT_AST_CACHE_MAX_BYTES?: number
  FUME_DEFAULT_COMPILED_EXPRESSION_CACHE_MAX_ENTRIES?: number
}
