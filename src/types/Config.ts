/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
export interface IConfig {
  SERVER_PORT: number
  SERVER_STATELESS: boolean
  FHIR_SERVER_BASE: string
  FHIR_SERVER_TIMEOUT: number
  FHIR_VERSION: string
  SEARCH_BUNDLE_PAGE_SIZE: number
  FHIR_PACKAGES: string
  FHIR_SERVER_AUTH_TYPE: string
  FHIR_SERVER_UN: string
  FHIR_SERVER_PW: string
}
