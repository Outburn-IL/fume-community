
export interface IFhirClient {
  read: (url: string) => Promise<any>
  search: (query: string, params?: object) => Promise<any>
  create: (resource: object, resourceType: string) => Promise<any>
  update: (resourceType: string, resourceId: string, resource: object) => Promise<any>
  simpleDelete: (resourceType: string, resourceId: string) => Promise<any>
}
