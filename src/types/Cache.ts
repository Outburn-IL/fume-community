export interface ICache {
  get: (key: string) => any
  set: (key: string, value: any) => void
  keys: () => string[]
  reset: () => void
}
