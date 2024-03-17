/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import { JsonataError } from 'jsonata';

export type FumeError = JsonataError & {
  __isFumeError: true
};
