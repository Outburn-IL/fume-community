/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import { FumifierError } from 'fumifier';

export type FumeError = FumifierError & {
  __isFumeError: true
};
