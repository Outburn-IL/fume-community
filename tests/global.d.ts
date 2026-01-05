/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
import type { Application } from 'express';

import type { FumeServer } from '../src/server';

declare global {
  // Set during tests/global setup
  // Accessed as globalThis.app, globalThis.fumeServer, etc.
  // eslint-disable-next-line no-var
  var app: Application;

  // eslint-disable-next-line no-var
  var fumeServer: FumeServer;

  // docker-compose services list (shape comes from docker-compose v2)
  // eslint-disable-next-line no-var
  var services: Array<{
    name: string;
    command: string;
    state: string;
    ports: unknown;
  }>;

  // Optional: only used when enabling the mock Artifactory setup
  // eslint-disable-next-line no-var
  var mockArtifactoryServer: unknown;
}

export {};
