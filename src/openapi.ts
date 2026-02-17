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
) as { info: Record<string, unknown> } & Record<string, unknown>;

// Inject runtime version as a new object to avoid mutating the parsed YAML.
export const openApiSpec = Object.freeze({
  ...raw,
  info: { ...raw.info, version }
});
