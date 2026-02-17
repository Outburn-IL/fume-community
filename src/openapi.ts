/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import { readFileSync } from 'fs';
import yaml from 'js-yaml';
import { resolve } from 'path';

import { version } from '../package.json';

const raw = yaml.load(
  readFileSync(resolve(__dirname, 'openapi.yaml'), 'utf8')
) as Record<string, unknown>;

// Inject runtime version
(raw as any).info.version = version;

export const openApiSpec = raw;
