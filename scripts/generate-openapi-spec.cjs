#!/usr/bin/env node

/*
 * Generates src/openapi.generated.ts from src/openapi.yaml.
 * This makes the OpenAPI spec available without runtime fs/yaml parsing.
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const repoRoot = path.resolve(__dirname, '..');
const yamlPath = path.join(repoRoot, 'src', 'openapi.yaml');
const packageJsonPath = path.join(repoRoot, 'package.json');
const outPath = path.join(repoRoot, 'src', 'openapi.generated.ts');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function main() {
  const pkg = readJson(packageJsonPath);
  const version = typeof pkg.version === 'string' ? pkg.version : '0.0.0';

  const yamlText = fs.readFileSync(yamlPath, 'utf8');
  const raw = yaml.load(yamlText);

  if (!raw || typeof raw !== 'object') {
    throw new Error('openapi.yaml did not parse to an object');
  }

  const baseInfo = raw.info && typeof raw.info === 'object' ? raw.info : {};

  const spec = {
    ...raw,
    info: {
      ...baseInfo,
      version
    }
  };

  const header = `/**\n * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved\n *   Project name: FUME-COMMUNITY\n */\n\n`;

  const body =
    `import type { OpenApiSpec } from './types';\n\n` +
    `export const openApiSpec = Object.freeze(${JSON.stringify(spec, null, 2)}) as OpenApiSpec;\n`;

  const content = header + body;

  fs.writeFileSync(outPath, content, 'utf8');
}

main();
