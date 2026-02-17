/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
import type { Application } from 'express';

import type { FumeServer } from '../src/server';

declare global {
  // Set during tests/global setup
  // Accessed as globalThis.app, globalThis.fumeServer, etc.
  var app: Application | string;

  var fumeServer: FumeServer | undefined;

  // docker-compose services list (shape comes from docker-compose v2)
  var services: Array<{
    name: string;
    command: string;
    state: string;
    ports: unknown;
  }>;

  // Optional: only used when enabling the mock Artifactory setup
  var mockArtifactoryServer: unknown;
}

export {};
