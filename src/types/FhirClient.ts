/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
export interface IFhirClient {
  read: (url: string) => Promise<any>
  search: (query: string, params?: object) => Promise<any>
  getClient?: () => any
}
