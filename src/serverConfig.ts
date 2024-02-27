/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME
 */

import * as dotenv from 'dotenv';
import { IConfig } from './types';
import { FumeConfigSchema } from './serverConfigSchema';

dotenv.config();
export const config: IConfig = FumeConfigSchema.parse(process.env);
export default config;
