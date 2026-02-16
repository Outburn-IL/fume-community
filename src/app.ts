/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
import { FumeServer } from './server';
import { loadFumeConfigFromEnv } from './serverConfigEnv';
import { createConsoleLogger, parseLogLevel, withLevelFilter, withPrefix } from './utils/logging';

const server = new FumeServer();

// Standalone app: load .env and derive config from env vars.
const envConfig = loadFumeConfigFromEnv();

const configuredLogLevel = parseLogLevel(process.env.LOG_LEVEL) ?? 'info';
const rootLogger = withLevelFilter(createConsoleLogger(), configuredLogLevel);
server.getEngine().registerLogger(rootLogger);

server.warmUp(envConfig).then(() => {
  // warmUp already logs initialization; keep a final line for parity
  withPrefix(rootLogger, '[app]').info('FUME is ready!');
}).catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  rootLogger.error(`FUME failed to initialize: ${message}`);
});
