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
import fumifier, { type FumifierCompiled, FumifierError, type FumifierOptions, type MappingCacheInterface } from 'fumifier';
import { LRUCache } from 'lru-cache';

import { version as engineVersion } from '../package.json';
import { defaultConfig, parseFumeConfig } from './serverConfig';
import type {
  DiagnosticEntry,
  EvaluateVerboseReport,
  FhirPackageIdentifier,
  FhirVersion,
  FumeEngineCreateOptions,
  IAppBinding,
  IConfig} from './types';
import { createNullLogger, withPrefix } from './utils/logging';

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
  private readonly config: ConfigType;
  private bindings: Record<string, IAppBinding>;
  private readonly logger: Logger;

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

  private constructor (init: {
    config: ConfigType;
    logger: Logger;
    astCache?: NonNullable<FumifierOptions['astCache']>;
    bindings?: Record<string, IAppBinding>;
  }) {
    this.config = Object.freeze({ ...(init.config as unknown as Record<string, unknown>) }) as unknown as ConfigType;
    this.logger = init.logger;
    this.astCache = init.astCache;
    this.bindings = init.bindings ?? {};
  }

  public static async create <ConfigType extends IConfig = IConfig> (
    options: FumeEngineCreateOptions<ConfigType>
  ): Promise<FumeEngine<ConfigType>> {
    const logger = options.logger ?? createNullLogger();
    const deprecatedStateless = (options.config as { SERVER_STATELESS?: unknown })?.SERVER_STATELESS !== undefined;

    const parsed = parseFumeConfig(options.config) as unknown as ConfigType;
    const normalizedFhirServerBase = FumeEngine.normalizeFhirServerBase(parsed.FHIR_SERVER_BASE);
    const normalizedConfig = {
      ...(parsed as unknown as Record<string, unknown>),
      // Preserve current runtime behavior: if disabled, store as empty string.
      FHIR_SERVER_BASE: normalizedFhirServerBase ?? ''
    } as ConfigType;

    const thresholdDefaults: Record<string, IAppBinding> = {
      throwLevel: typeof (normalizedConfig as IConfig).FUME_EVAL_THROW_LEVEL === 'number' ? (normalizedConfig as IConfig).FUME_EVAL_THROW_LEVEL : 30,
      logLevel: typeof (normalizedConfig as IConfig).FUME_EVAL_LOG_LEVEL === 'number' ? (normalizedConfig as IConfig).FUME_EVAL_LOG_LEVEL : 40,
      collectLevel: typeof (normalizedConfig as IConfig).FUME_EVAL_DIAG_COLLECT_LEVEL === 'number' ? (normalizedConfig as IConfig).FUME_EVAL_DIAG_COLLECT_LEVEL : 70,
      validationLevel: typeof (normalizedConfig as IConfig).FUME_EVAL_VALIDATION_LEVEL === 'number' ? (normalizedConfig as IConfig).FUME_EVAL_VALIDATION_LEVEL : 30
    };

    // Merge order: config-derived defaults first, then user bindings override.
    const initialBindings: Record<string, IAppBinding> = {
      ...thresholdDefaults,
      ...(options.bindings ?? {})
    };

    const engine = new FumeEngine<ConfigType>({
      config: normalizedConfig,
      logger,
      astCache: options.astCache,
      bindings: initialBindings
    });

    await engine.initialize({ deprecatedStateless });
    return engine;
  }

  private getEngineLogger (): Logger {
    return this.getChildLogger('[engine]');
  }

  private getChildLogger (prefix: string): Logger {
    return withPrefix(this.logger, prefix);
  }

  public getLogger (): Logger {
    return this.logger;
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

  private async initialize (meta?: { deprecatedStateless?: boolean }) {
    const log = this.getEngineLogger();

    log.info('FUME initializing...');

    if (meta?.deprecatedStateless) {
      log.warn('SERVER_STATELESS is deprecated and ignored. Use FHIR_SERVER_BASE and/or MAPPINGS_FOLDER (set to n/a to disable).');
    }

    // Initialize internal caches from config.
    // Compiled expressions are in-process runtime closures and cannot be swapped with an external cache.
    const compiledExprCacheConfigValue = (this.config as unknown as IConfig).FUME_COMPILED_EXPR_CACHE_MAX_ENTRIES;
    const compiledExprCacheMaxEntries =
      typeof compiledExprCacheConfigValue === 'number' && compiledExprCacheConfigValue > 0
        ? Math.floor(compiledExprCacheConfigValue)
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
    } = this.config as unknown as IConfig;

    const normalizedFhirServerBase = FumeEngine.normalizeFhirServerBase(FHIR_SERVER_BASE);
    const normalizedMappingsFolder = FumeEngine.normalizeMappingsFolder(MAPPINGS_FOLDER);
    const hasMappingSources = !!normalizedFhirServerBase || !!normalizedMappingsFolder;

    // Create the FHIR client before building the global FHIR context so that
    // downstream components (e.g. terminology runtime) can reuse it.
    if (normalizedFhirServerBase && !this.fhirClient) {
      this.fhirClient = this.createFhirClient();
    }

    await this.initializeGlobalFhirContext();
    log.info('Global FHIR context initialized');

    if (!hasMappingSources) {
      log.info('No mapping sources configured. Skipping mapping provider initialization.');
      return;
    }

    log.info('Loading FUME mappings from configured sources into cache...');

    const mappingsFolder = normalizedMappingsFolder;
    const mappingsFileExtension = MAPPINGS_FILE_EXTENSION?.trim();
    const normalizedFileExtension = mappingsFileExtension && mappingsFileExtension.toLowerCase() !== 'n/a'
      ? mappingsFileExtension
      : undefined;
    const mappingProviderConfig: ConstructorParameters<typeof FumeMappingProvider>[0] = {
      logger: this.getChildLogger('[mapping-provider]'),
      ...(this.fhirClient ? { fhirClient: this.fhirClient as ConstructorParameters<typeof FumeMappingProvider>[0]['fhirClient'] } : {}),
      ...(mappingsFolder ? { mappingsFolder } : {}),
      ...(normalizedFileExtension ? { fileExtension: normalizedFileExtension } : {}),
      ...(typeof MAPPINGS_FILE_POLLING_INTERVAL_MS === 'number' ? { filePollingIntervalMs: MAPPINGS_FILE_POLLING_INTERVAL_MS } : {}),
      ...(typeof MAPPINGS_SERVER_POLLING_INTERVAL_MS === 'number' ? { serverPollingIntervalMs: MAPPINGS_SERVER_POLLING_INTERVAL_MS } : {}),
      ...(typeof MAPPINGS_FORCED_RESYNC_INTERVAL_MS === 'number' ? { forcedResyncIntervalMs: MAPPINGS_FORCED_RESYNC_INTERVAL_MS } : {})
    };

    this.mappingProvider = new FumeMappingProvider(mappingProviderConfig);
    await this.mappingProvider.initialize();
    log.info('FumeMappingProvider initialized');

    const recacheResult = await this.recacheFromServer();
    if (recacheResult) {
      log.info('Successfully loaded cache');
    }
  }

  private static normalizeFhirServerBase (value?: string): string | undefined {
    if (!value) {
      return undefined;
    }

    const trimmed = value.trim();
    if (trimmed === '' || trimmed.toLowerCase() === 'n/a') {
      return undefined;
    }

    return trimmed;
  }

  private static normalizeMappingsFolder (value?: string): string | undefined {
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
      this.formatConverter = new FormatConverter(this.getChildLogger('[format-converter]'));
    }
    return this.formatConverter;
  }

  public async convertInputToJson (input: unknown, contentType?: string) {
    const log = this.getEngineLogger();
    if (!contentType || contentType === '') {
      log.debug?.("Content-Type is empty - defaulting to 'application/json'");
      contentType = 'application/json';
    }

    const converter = this.getOrCreateFormatConverter();

    if (contentType.startsWith('x-application/hl7-v2+er7')) {
      log.debug?.('Parsing HL7 V2.x message...', { contentType });
      return await converter.hl7v2ToJson(input as string);
    }

    if (contentType.startsWith('text/csv')) {
      log.debug?.('Parsing CSV to JSON...', { contentType });
      return await converter.csvToJson(input as string);
    }

    if (contentType.startsWith('application/xml') || contentType.startsWith('application/fhir+xml')) {
      log.debug?.('Parsing XML to JSON...', { contentType });
      return await converter.xmlToJson(input as string);
    }

    if (contentType.startsWith('application/json') || contentType.startsWith('application/fhir+json') || contentType.startsWith('text/json')) {
      log.debug?.('Using JSON input as-is', { contentType, inputType: typeof input });
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

    this.getEngineLogger().info(`Using FHIR server: ${FHIR_SERVER_BASE}`);
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

    const cachePathOverride = (typeof FHIR_PACKAGE_CACHE_DIR === 'string' && FHIR_PACKAGE_CACHE_DIR.trim() !== '')
      ? FHIR_PACKAGE_CACHE_DIR.trim()
      : undefined;

    const cacheMode = 'lazy';

    const packageList: FhirPackageIdentifier[] = (typeof FHIR_PACKAGES === 'string' ? FHIR_PACKAGES : '')
      .split(',')
      .map((pkg) => pkg.trim())
      .filter((pkg) => pkg.length > 0)
      .map((pkg) => {
        const [id, versionRaw] = pkg.includes('@') ? pkg.split('@', 2) : [pkg, undefined];
        const version = typeof versionRaw === 'string' && versionRaw.trim() !== '' ? versionRaw.trim() : undefined;
        return { id: id.trim(), version };
      })
      .filter((pkg) => pkg.id.length > 0);

    this.getEngineLogger().info({
      packageContext: packageList,
      fhirVersion: FHIR_VERSION,
      cachePath: cachePathOverride,
      registryUrl: FHIR_PACKAGE_REGISTRY_URL
    });

    const fpe = await FhirPackageExplorer.create({
      context: packageList,
      ...(cachePathOverride ? { cachePath: cachePathOverride } : {}),
      fhirVersion: FHIR_VERSION as FhirVersion,
      skipExamples: true,
      logger: this.getChildLogger('[package-explorer]'),
      registryUrl: FHIR_PACKAGE_REGISTRY_URL,
      registryToken: FHIR_PACKAGE_REGISTRY_TOKEN
    });

    const generator = await FhirSnapshotGenerator.create({
      fpe,
      fhirVersion: FHIR_VERSION as FhirVersion,
      cacheMode,
      logger: this.getChildLogger('[snapshot-generator]')
    });

    const navigator = new FhirStructureNavigator(generator, this.getChildLogger('[structure-navigator]'));

    const terminologyRuntime = await FhirTerminologyRuntime.create({
      fpe,
      fhirVersion: FHIR_VERSION as FhirVersion,
      cacheMode,
      logger: this.getChildLogger('[terminology-runtime]'),
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
      cachePath: fpe.getCachePath(),
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
      compiled.setLogger(this.getChildLogger('[fumifier]') as unknown as Logger);
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

  private getEvaluationBindings (extraBindings: Record<string, IAppBinding> = {}): Record<string, unknown> {
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

    return bindings;
  }

  public async transformVerbose (input: unknown, expression: string, extraBindings: Record<string, IAppBinding> = {}): Promise<EvaluateVerboseReport> {
    const log = this.getEngineLogger();
    const fumeHttpInvocation = (extraBindings as Record<string, unknown>)?.fumeHttpInvocation as
      | { mappingId?: unknown; method?: unknown; subpath?: unknown }
      | undefined;

    const invocationMeta = {
      invocation: 'engine.transformVerbose',
      ...(typeof fumeHttpInvocation?.mappingId === 'string' ? { mappingId: fumeHttpInvocation.mappingId } : {}),
      ...(typeof fumeHttpInvocation?.method === 'string' ? { method: fumeHttpInvocation.method } : {}),
      ...(typeof fumeHttpInvocation?.subpath === 'string' ? { subpath: fumeHttpInvocation.subpath } : {}),
    };

    log.debug?.('Starting transformation (verbose)', invocationMeta);

    const expr = await this.compileExpression(expression);
    const bindings = this.getEvaluationBindings(extraBindings);

    const report = await expr.evaluateVerbose(input, bindings);
    log.debug?.('Finished transformation (verbose)', {
      ...invocationMeta,
      executionId: (report as { executionId?: unknown })?.executionId,
      ok: (report as { ok?: unknown })?.ok,
      status: (report as { status?: unknown })?.status,
    });
    return report as EvaluateVerboseReport;
  }

  public async transform (input: unknown, expression: string, extraBindings: Record<string, IAppBinding> = {}) {
    try {
      const report = await this.transformVerbose(input, expression, extraBindings);

      if (report.ok) {
        return report.result;
      }

      const primary: DiagnosticEntry | undefined =
        report.diagnostics?.error?.[0]
        ?? report.diagnostics?.warning?.[0]
        ?? report.diagnostics?.debug?.[0];

      const code = primary?.code ?? 'EVALUATION_FAILED';
      const message = primary?.message ?? 'Evaluation failed';

      const properties: Record<string, unknown> = {
        executionId: report.executionId,
        ...(primary?.position !== undefined ? { position: primary.position } : {}),
        ...(primary?.start !== undefined ? { start: primary.start } : {}),
        ...(primary?.line !== undefined ? { line: primary.line } : {}),
        ...(typeof primary?.fhirParent === 'string' ? { fhirParent: primary.fhirParent } : {}),
        ...(typeof primary?.fhirElement === 'string' ? { fhirElement: primary.fhirElement } : {})
      };

      throw new FumifierError(code, message, properties);
    } catch (error) {
      this.getEngineLogger().error(error);
      throw error;
    }
  }

  public async recacheFromServer (): Promise<boolean> {
    const log = this.getEngineLogger();
    if (!this.mappingProvider) {
      log.warn('Mapping provider not initialized. Cannot recache mappings.');
      return false;
    }

    try {
      // Clear terminology ConceptMap cache so mappings that depend on server ConceptMaps
      // will re-resolve against fresh data after a recache.
      const terminologyRuntime = this.globalFhirContext.terminologyRuntime;
      if (terminologyRuntime) {
        await terminologyRuntime.clearServerConceptMapsFromCache();
        log.info('Cleared FHIR terminology ConceptMap cache.');
      }
      await this.mappingProvider.reloadAliases();
      const aliasKeys = Object.keys(this.mappingProvider.getAliases());
      if (aliasKeys.length > 0) {
        log.info(`Updated cache with aliases: ${aliasKeys.join(', ')}.`);
      }

      const staticValueProvider = this.mappingProvider as unknown as {
        reloadStaticJsonValues?: () => Promise<void>;
      };
      if (staticValueProvider.reloadStaticJsonValues) {
        await staticValueProvider.reloadStaticJsonValues();
        const staticValueKeys = Object.keys(this.getStaticValueBindings());
        if (staticValueKeys.length > 0) {
          log.info(`Updated cache with static values: ${staticValueKeys.join(', ')}.`);
        }
      }

      await this.mappingProvider.reloadUserMappings();
      const userMappings = this.mappingProvider.getUserMappings();

      if (userMappings.length > 0) {
        log.info(`Updated cache with mappings: ${userMappings.map((m) => m.key).join(', ')}.`);
      }

      return true;
    } catch (e) {
      log.error(e);
      return false;
    }
  }
}
