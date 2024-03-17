/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import * as dotenv from 'dotenv';

import { FumeConfigSchema } from './serverConfigSchema';
import { IConfig } from './types';

dotenv.config();
export const config: IConfig = FumeConfigSchema.parse(process.env);
export default config;
