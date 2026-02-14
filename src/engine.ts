/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import { FhirClient } from '@outburn/fhir-client';
import { FormatConverter } from '@outburn/format-converter';
import { FumeMappingProvider } from '@outburn/fume-mapping-provider';
import { FhirStructureNavigator } from '@outburn/structure-navigator';
import type { Logger } from '@outburn/types';
import { FhirPackageExplorer } from 'fhir-package-explorer';
import { FhirSnapshotGenerator } from 'fhir-snapshot-generator';
import { FhirTerminologyRuntime } from 'fhir-terminology-runtime';
import fumifier, { type FumifierCompiled, type FumifierOptions, type MappingCacheInterface } from 'fumifier';
import { LRUCache } from 'lru-cache';

import { version as engineVersion } from '../package.json';
import defaultConfig from './serverConfig';
import type {
  FhirPackageIdentifier,
  FhirVersion,
  IAppBinding,
  IConfig
} from './types';

interface GlobalFhirContext {
  navigator: FhirStructureNavigator | null;
  generator: FhirSnapshotGenerator | null;
  terminologyRuntime: FhirTerminologyRuntime | null;
  contextPackages: FhirPackageIdentifier[];
  normalizedPackages: FhirPackageIdentifier[];
  fhirVersion: FhirVersion;
  cachePath?: string;
  registryUrl?: string;
  registryToken?: string;
  isInitialized: boolean;
}

const createDefaultLogger = (): Logger => ({
  debug: console.debug,
  info: console.info,
  warn: console.warn,
  error: console.error
});

const defaultGlobalFhirContext = (): GlobalFhirContext => ({
  navigator: null,
  generator: null,
  terminologyRuntime: null,
  contextPackages: [],
  normalizedPackages: [],
  fhirVersion: '4.0.1',
  isInitialized: false
});

export class FumeEngine<ConfigType extends IConfig = IConfig> {
  private config: IConfig = { ...defaultConfig };
  private bindings: Record<string, IAppBinding> = {};
  private logger: Logger = createDefaultLogger();

  private fhirClient?: FhirClient;
  private mappingProvider?: FumeMappingProvider;

  private globalFhirContext: GlobalFhirContext = defaultGlobalFhirContext();

  private readonly compiledExpressionCacheMaxEntries =
    typeof defaultConfig.FUME_COMPILED_EXPR_CACHE_MAX_ENTRIES === 'number' && defaultConfig.FUME_COMPILED_EXPR_CACHE_MAX_ENTRIES > 0
      ? Math.floor(defaultConfig.FUME_COMPILED_EXPR_CACHE_MAX_ENTRIES)
      : 1000;

  private compiledExpressionCache = new LRUCache<string, FumifierCompiled>({
    max: this.compiledExpressionCacheMaxEntries,
    allowStale: false
  });

  private astCache?: NonNullable<FumifierOptions['astCache']>;

  private formatConverter?: FormatConverter;

  private startupTime: number = Date.now();

  public registerLogger (logger: Logger) {
    this.logger = logger;
    // Recreate converter with the new logger (converter captures logger)
    this.formatConverter = undefined;
  }

  public getLogger (): Logger {
    return this.logger;
  }

  public setAstCache (cache: NonNullable<FumifierOptions['astCache']>) {
    this.astCache = cache;
  }

  public registerBinding (key: string, binding: IAppBinding) {
    this.bindings[key] = binding;
  }

  public getBindings () {
    return this.bindings;
  }

  public getFhirClient (): FhirClient {
    if (!this.fhirClient) {
      throw new Error('FHIR client not registered');
    }
    return this.fhirClient;
  }

  public getMappingProvider (): FumeMappingProvider {
    if (!this.mappingProvider) {
      throw new Error('Mapping provider not initialized');
    }
    return this.mappingProvider;
  }

  public getConfig (): ConfigType {
    return this.config as ConfigType;
  }

  public getFhirVersion (): FhirVersion {
    return this.config.FHIR_VERSION as FhirVersion;
  }

  public getGlobalFhirContext (): GlobalFhirContext {
    return this.globalFhirContext;
  }

  public getUptime (): string {
    const totalSeconds = Math.floor((Date.now() - this.startupTime) / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const parts: string[] = [];
    if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
    if (hours > 0) parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
    if (minutes > 0) parts.push(`${minutes} minute${minutes > 1 ? 's' : ''}`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds} second${seconds > 1 ? 's' : ''}`);

    if (parts.length === 1) {
      return parts[0];
    }

    return parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1];
  }

  public getContextPackages (): FhirPackageIdentifier[] {
    return this.globalFhirContext.contextPackages;
  }

  public getNormalizedPackages (): FhirPackageIdentifier[] {
    return this.globalFhirContext.normalizedPackages;
  }

  public resetGlobalFhirContext () {
    this.globalFhirContext = defaultGlobalFhirContext();
  }

  /**
   * Warm-up the engine: set config, init cache, init FHIR context, optionally init mapping provider.
   */
  public async warmUp (serverOptions?: ConfigType): Promise<void> {
    const options = serverOptions ?? (defaultConfig as unknown as ConfigType);

    this.logger.info('FUME initializing...');

    const deprecatedStateless = (options as { SERVER_STATELESS?: unknown })?.SERVER_STATELESS !== undefined
      || typeof process?.env?.SERVER_STATELESS === 'string';
    if (deprecatedStateless) {
      this.logger.warn('SERVER_STATELESS is deprecated and ignored. Use FHIR_SERVER_BASE and/or MAPPINGS_FOLDER (set to n/a to disable).');
    }

    this.setConfig(options);

    // Initialize internal caches from config.
    // Compiled expressions are in-process runtime closures and cannot be swapped with an external cache.
    const compiledExprCacheMaxEntries =
      typeof this.config.FUME_COMPILED_EXPR_CACHE_MAX_ENTRIES === 'number' && this.config.FUME_COMPILED_EXPR_CACHE_MAX_ENTRIES > 0
        ? Math.floor(this.config.FUME_COMPILED_EXPR_CACHE_MAX_ENTRIES)
        : 1000;
    this.compiledExpressionCache = new LRUCache<string, FumifierCompiled>({
      max: compiledExprCacheMaxEntries,
      allowStale: false
    });

    const {
      FHIR_SERVER_BASE,
      MAPPINGS_FOLDER,
      MAPPINGS_FILE_EXTENSION,
      MAPPINGS_FILE_POLLING_INTERVAL_MS,
      MAPPINGS_SERVER_POLLING_INTERVAL_MS,
      MAPPINGS_FORCED_RESYNC_INTERVAL_MS
    } = this.config;

    const normalizedFhirServerBase = this.normalizeFhirServerBase(FHIR_SERVER_BASE);
    const normalizedMappingsFolder = this.normalizeMappingsFolder(MAPPINGS_FOLDER);
    const hasMappingSources = !!normalizedFhirServerBase || !!normalizedMappingsFolder;

    // Create the FHIR client before building the global FHIR context so that
    // downstream components (e.g. terminology runtime) can reuse it.
    if (normalizedFhirServerBase && !this.fhirClient) {
      this.fhirClient = this.createFhirClient();
    }

    await this.initializeGlobalFhirContext();
    this.logger.info('Global FHIR context initialized');

    if (!hasMappingSources) {
      this.logger.info('No mapping sources configured. Skipping mapping provider initialization.');
      return;
    }

    this.logger.info('Loading FUME mappings from configured sources into cache...');

    const mappingsFolder = normalizedMappingsFolder;
    const mappingsFileExtension = MAPPINGS_FILE_EXTENSION?.trim();
    const normalizedFileExtension = mappingsFileExtension && mappingsFileExtension.toLowerCase() !== 'n/a'
      ? mappingsFileExtension
      : undefined;
    const mappingProviderConfig: ConstructorParameters<typeof FumeMappingProvider>[0] = {
      logger: this.logger,
      ...(this.fhirClient ? { fhirClient: this.fhirClient as ConstructorParameters<typeof FumeMappingProvider>[0]['fhirClient'] } : {}),
      ...(mappingsFolder ? { mappingsFolder } : {}),
      ...(normalizedFileExtension ? { fileExtension: normalizedFileExtension } : {}),
      ...(typeof MAPPINGS_FILE_POLLING_INTERVAL_MS === 'number' ? { filePollingIntervalMs: MAPPINGS_FILE_POLLING_INTERVAL_MS } : {}),
      ...(typeof MAPPINGS_SERVER_POLLING_INTERVAL_MS === 'number' ? { serverPollingIntervalMs: MAPPINGS_SERVER_POLLING_INTERVAL_MS } : {}),
      ...(typeof MAPPINGS_FORCED_RESYNC_INTERVAL_MS === 'number' ? { forcedResyncIntervalMs: MAPPINGS_FORCED_RESYNC_INTERVAL_MS } : {})
    };

    this.mappingProvider = new FumeMappingProvider(mappingProviderConfig);

    await this.mappingProvider.initialize();
    this.logger.info('FumeMappingProvider initialized');

    const recacheResult = await this.recacheFromServer();
    if (recacheResult) {
      this.logger.info('Successfully loaded cache');
    }
  }

  /**
   * Normalize and set runtime config.
   */
  public setConfig (config: Partial<ConfigType>) {
    const { SERVER_STATELESS: _deprecated, ...rest } = config as Partial<ConfigType> & { SERVER_STATELESS?: boolean };
    void _deprecated;
    const fhirServerBase = this.normalizeFhirServerBase(rest.FHIR_SERVER_BASE ?? defaultConfig.FHIR_SERVER_BASE);

    this.config = {
      ...defaultConfig,
      ...rest,
      FHIR_SERVER_BASE: fhirServerBase ?? ''
    } as IConfig;
  }

  private normalizeFhirServerBase (value?: string): string | undefined {
    if (!value) {
      return undefined;
    }

    const trimmed = value.trim();
    if (trimmed === '' || trimmed.toLowerCase() === 'n/a') {
      return undefined;
    }

    return trimmed;
  }

  private normalizeMappingsFolder (value?: string): string | undefined {
    if (!value) {
      return undefined;
    }

    const trimmed = value.trim();
    if (trimmed === '' || trimmed.toLowerCase() === 'n/a') {
      return undefined;
    }

    return trimmed;
  }

  private getOrCreateFormatConverter (): FormatConverter {
    if (!this.formatConverter) {
      this.formatConverter = new FormatConverter(this.logger);
    }
    return this.formatConverter;
  }

  public async convertInputToJson (input: unknown, contentType?: string) {
    if (!contentType || contentType === '') {
      this.logger.info("Content-Type is empty - defaulting to 'application/json'");
      contentType = 'application/json';
    }

    const converter = this.getOrCreateFormatConverter();

    if (contentType.startsWith('x-application/hl7-v2+er7')) {
      this.logger.info('Parsing HL7 V2.x message...');
      return await converter.hl7v2ToJson(input as string);
    }

    if (contentType.startsWith('text/csv')) {
      this.logger.info('Parsing CSV to JSON...');
      return await converter.csvToJson(input as string);
    }

    if (contentType.startsWith('application/xml') || contentType.startsWith('application/fhir+xml')) {
      this.logger.info('Parsing XML to JSON...');
      return await converter.xmlToJson(input as string);
    }

    if (contentType.startsWith('application/json') || contentType.startsWith('application/fhir+json') || contentType.startsWith('text/json')) {
      this.logger.info('Using JSON input as-is');
      return input;
    }

    throw new Error(`Unsupported Content-Type: '${contentType}'`);
  }

  private createFhirClient (): FhirClient {
    const { FHIR_SERVER_BASE, FHIR_SERVER_TIMEOUT, FHIR_SERVER_AUTH_TYPE, FHIR_SERVER_UN, FHIR_SERVER_PW } = this.config;

    const auth = FHIR_SERVER_AUTH_TYPE === 'BASIC' && FHIR_SERVER_UN && FHIR_SERVER_PW
      ? { username: FHIR_SERVER_UN, password: FHIR_SERVER_PW }
      : undefined;

    const client = new FhirClient({
      baseUrl: FHIR_SERVER_BASE,
      fhirVersion: this.getFhirVersion(),
      timeout: FHIR_SERVER_TIMEOUT,
      auth
    });

    this.logger.info(`Using FHIR server: ${FHIR_SERVER_BASE}`);
    return client;
  }

  private async initializeGlobalFhirContext () {
    const {
      FHIR_VERSION,
      FHIR_PACKAGES,
      FHIR_PACKAGE_CACHE_DIR,
      FHIR_PACKAGE_REGISTRY_URL,
      FHIR_PACKAGE_REGISTRY_TOKEN,
      MAPPINGS_SERVER_POLLING_INTERVAL_MS
    } = this.config;

    const cacheMode = 'lazy';

    const packageList: FhirPackageIdentifier[] = FHIR_PACKAGES
      ? FHIR_PACKAGES.split(',').map((pkg) => {
        const trimmed = pkg.trim();
        const [id, version] = trimmed.includes('@') ? trimmed.split('@') : [trimmed, undefined];
        return { id, version };
      })
      : [];

    this.logger.info({
      packageContext: packageList,
      fhirVersion: FHIR_VERSION,
      cachePath: FHIR_PACKAGE_CACHE_DIR,
      registryUrl: FHIR_PACKAGE_REGISTRY_URL
    });

    const fpe = await FhirPackageExplorer.create({
      context: packageList,
      cachePath: FHIR_PACKAGE_CACHE_DIR || '',
      fhirVersion: FHIR_VERSION as FhirVersion,
      skipExamples: true,
      logger: this.logger,
      registryUrl: FHIR_PACKAGE_REGISTRY_URL,
      registryToken: FHIR_PACKAGE_REGISTRY_TOKEN
    });

    const generator = await FhirSnapshotGenerator.create({
      fpe,
      fhirVersion: FHIR_VERSION as FhirVersion,
      cacheMode,
      logger: this.logger
    });

    const navigator = new FhirStructureNavigator(generator, this.logger);

    const terminologyRuntime = await FhirTerminologyRuntime.create({
      fpe,
      fhirVersion: FHIR_VERSION as FhirVersion,
      cacheMode,
      logger: this.logger,
      fhirClient: this.fhirClient,
      ...(typeof MAPPINGS_SERVER_POLLING_INTERVAL_MS === 'number'
        ? { serverConceptMapPollingIntervalMs: MAPPINGS_SERVER_POLLING_INTERVAL_MS }
        : {})
    });

    const contextPackages = fpe.getContextPackages();
    const normalizedPackages = fpe.getNormalizedRootPackages();
    this.globalFhirContext = {
      navigator,
      generator,
      terminologyRuntime,
      normalizedPackages,
      contextPackages,
      fhirVersion: this.getFhirVersion(),
      cachePath: FHIR_PACKAGE_CACHE_DIR || '',
      registryUrl: FHIR_PACKAGE_REGISTRY_URL,
      registryToken: FHIR_PACKAGE_REGISTRY_TOKEN,
      isInitialized: true
    };
  }

  private createMappingCache (): MappingCacheInterface {
    return {
      getKeys: async () => {
        if (!this.mappingProvider) {
          return [];
        }
        return this.mappingProvider.getUserMappingKeys();
      },
      get: async (key: string) => {
        if (!this.mappingProvider) {
          throw new Error('Mapping provider not initialized');
        }
        const mapping = this.mappingProvider.getUserMapping(key);
        if (!mapping) {
          throw new Error(`Mapping '${key}' not found`);
        }
        if (typeof mapping.expression !== 'string') {
          throw new Error(`Mapping '${key}' does not contain a valid expression`);
        }
        return mapping.expression;
      }
    };
  }

  private async getFumifierOptions (): Promise<FumifierOptions> {
    const globalContext = this.globalFhirContext;

    if (!globalContext.isInitialized || !globalContext.navigator) {
      throw new Error('Global FHIR context is not initialized. This should be done during warmup.');
    }

    if (!globalContext.terminologyRuntime) {
      throw new Error('Global terminology runtime is not initialized. This should be done during warmup.');
    }

    return {
      mappingCache: this.createMappingCache(),
      navigator: globalContext.navigator,
      terminologyRuntime: globalContext.terminologyRuntime,
      fhirClient: this.fhirClient,
      ...(this.astCache ? { astCache: this.astCache } : {})
    };
  }

  private async compileExpression (expression: string): Promise<FumifierCompiled> {
    const cacheKey = this.getCompiledExpressionCacheKey(expression);
    let compiled = this.compiledExpressionCache.get(cacheKey);

    if (!compiled) {
      const options = await this.getFumifierOptions();
      compiled = await fumifier(expression, options);
      compiled.setLogger(this.logger as unknown as Logger);
      this.compiledExpressionCache.set(cacheKey, compiled);
    }

    return compiled;
  }

  private getCompiledExpressionCacheKey (expression: string): string {
    const normalizedPackages = this.globalFhirContext.normalizedPackages ?? [];
    const fhirContext = normalizedPackages
      .map((p) => `${p.id}@${p.version ?? ''}`)
      .sort();

    // Stable, serializable identity: different semantics => different key.
    return JSON.stringify({
      source: expression,
      engineVersion,
      fhirContext,
      recover: false
    });
  }

  private getStaticValueBindings (): Record<string, unknown> {
    if (!this.mappingProvider) {
      return {};
    }

    const provider = this.mappingProvider as unknown as {
      getStaticJsonValues?: () => Array<{ key: string; value: unknown }>;
      getStaticJsonValuesObject?: () => Record<string, unknown>;
      getStaticJsonValueKeys?: () => string[];
      getStaticJsonValue?: (key: string) => { value: unknown } | undefined;
    };

    if (provider.getStaticJsonValuesObject) {
      const valuesObject = provider.getStaticJsonValuesObject();
      return valuesObject ?? {};
    }

    if (provider.getStaticJsonValues) {
      const values = provider.getStaticJsonValues();
      if (Array.isArray(values)) {
        return values.reduce((acc, entry) => {
          if (entry && typeof entry.key === 'string') {
            acc[entry.key] = entry.value;
          }
          return acc;
        }, {} as Record<string, unknown>);
      }
    }

    if (provider.getStaticJsonValueKeys && provider.getStaticJsonValue) {
      const keys = provider.getStaticJsonValueKeys();
      return keys.reduce((acc, key) => {
        const entry = provider.getStaticJsonValue?.(key);
        if (entry) {
          acc[key] = entry.value;
        }
        return acc;
      }, {} as Record<string, unknown>);
    }

    return {};
  }

  public async transform (input: unknown, expression: string, extraBindings: Record<string, IAppBinding> = {}) {
    try {
      this.logger.info('Running transformation...');

      const expr = await this.compileExpression(expression);

      let bindings: Record<string, unknown> = {};

      const converter = this.getOrCreateFormatConverter();
      bindings.parseCsv = converter.csvToJson.bind(converter);
      bindings.v2json = converter.hl7v2ToJson.bind(converter);

      if (this.mappingProvider) {
        const aliases = this.mappingProvider.getAliases();
        const staticValues = this.getStaticValueBindings();
        bindings = {
          ...aliases,
          ...staticValues,
          ...bindings,
          ...this.bindings,
          ...extraBindings
        };
      } else {
        bindings = {
          ...bindings,
          ...this.bindings,
          ...extraBindings
        };
      }

      const res = await expr.evaluate(input, bindings);
      return res;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  public async recacheFromServer (): Promise<boolean> {
    if (!this.mappingProvider) {
      this.logger.warn('Mapping provider not initialized. Cannot recache mappings.');
      return false;
    }

    try {
      // Clear terminology ConceptMap cache so mappings that depend on server ConceptMaps
      // will re-resolve against fresh data after a recache.
      const terminologyRuntime = this.globalFhirContext.terminologyRuntime;
      if (terminologyRuntime) {
        await terminologyRuntime.clearServerConceptMapsFromCache();
        this.logger.info('Cleared FHIR terminology ConceptMap cache.');
      }
      await this.mappingProvider.reloadAliases();
      const aliasKeys = Object.keys(this.mappingProvider.getAliases());
      if (aliasKeys.length > 0) {
        this.logger.info(`Updated cache with aliases: ${aliasKeys.join(', ')}.`);
      }

      const staticValueProvider = this.mappingProvider as unknown as {
        reloadStaticJsonValues?: () => Promise<void>;
      };
      if (staticValueProvider.reloadStaticJsonValues) {
        await staticValueProvider.reloadStaticJsonValues();
        const staticValueKeys = Object.keys(this.getStaticValueBindings());
        if (staticValueKeys.length > 0) {
          this.logger.info(`Updated cache with static values: ${staticValueKeys.join(', ')}.`);
        }
      }

      await this.mappingProvider.reloadUserMappings();
      const userMappings = this.mappingProvider.getUserMappings();

      if (userMappings.length > 0) {
        this.logger.info(`Updated cache with mappings: ${userMappings.map((m) => m.key).join(', ')}.`);
      }

      return true;
    } catch (e) {
      this.logger.error(e);
      return false;
    }
  }
}
