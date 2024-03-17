/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
import type { UserConfig } from '@commitlint/types';

const Configuration: UserConfig = {

  extends: ['@commitlint/config-conventional'],
  formatter: '@commitlint/format'
};

export default Configuration;
