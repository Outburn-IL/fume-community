/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
export interface ILogger {
  debug: (msg: any) => void
  info: (msg: any) => void
  warn: (msg: any) => void
  error: (msg: any) => void
}
