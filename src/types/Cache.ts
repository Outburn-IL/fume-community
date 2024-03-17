/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
export interface ICache<T> {
  get: (key: string) => T
  set: (key: string, value: T) => void
  remove: (key: string) => void
  keys: () => string[]
  reset: () => void
  populate: (dict: Record<string, T>) => void
  getDict: () => Record<string, T>
}
