/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME
 */

import * as dotenv from 'dotenv';

import { FumeConfigSchema } from './serverConfigSchema';
import { IConfig } from './types';

dotenv.config();
export const config: IConfig = FumeConfigSchema.parse(process.env);
export default config;
