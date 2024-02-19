export interface ICache<T> {
  get: (key: string) => T
  set: (key: string, value: T) => void
  keys: () => string[]
  reset: () => void
  populate: (dict: Record<string, T>) => void
  getDict: () => Record<string, T>
}
