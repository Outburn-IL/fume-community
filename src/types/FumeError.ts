/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import { JsonataError } from 'jsonata';

export type FumeError = JsonataError & {
  __isFumeError: true
  message: string
  name: string
  cause: string
};

/**
 * Factory function to create a FumeError object from any error type
 * @param error - Any error object or unknown type
 * @returns A properly formatted FumeError object
 */
export const createFumeError = (error: any): FumeError => {
  return {
    __isFumeError: true,
    message: error?.message ?? '',
    code: error?.code ?? '',
    name: error?.name ?? '',
    token: error?.token ?? '',
    cause: error?.cause ?? '',
    position: error?.position ?? ''
  };
};
