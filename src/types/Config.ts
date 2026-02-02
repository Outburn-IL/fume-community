/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
export interface IConfig {
  SERVER_PORT: number
  SERVER_STATELESS: boolean
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
}
