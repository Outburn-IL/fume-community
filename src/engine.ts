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

import type { IAppCache, IAppCacheKeys, ICacheEntry } from './cache';
import { SimpleCache } from './cache';
import defaultConfig from './serverConfig';
import type {
  FhirPackageIdentifier,
  FhirVersion,
  IAppBinding,
  ICache,
  IConfig
} from './types';
import type { ICacheClass } from './types/FumeServer';

export interface InitCacheConfig {
  cacheClass: ICacheClass;
  cacheClassOptions: Record<string, unknown>;
}

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

  private cache?: IAppCache;
  private cacheConfig: Partial<Record<IAppCacheKeys, InitCacheConfig>> = {};

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

  public registerCacheClass (
    CacheClass: ICacheClass,
    cacheClassOptions: Record<string, unknown>,
    applyToCaches: IAppCacheKeys[]
  ) {
    if (applyToCaches.length === 0) {
      this.logger.warn('No cache keys provided to apply cache class to');
      return;
    }

    applyToCaches.forEach((cacheKey) => {
      this.cacheConfig[cacheKey] = { cacheClass: CacheClass, cacheClassOptions };
    });
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

  public getCache (): IAppCache {
    if (!this.cache) {
      throw new Error('Cache not initialized');
    }
    return this.cache;
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

    this.setConfig(options);
    const { SERVER_STATELESS, FHIR_SERVER_BASE } = this.config;

    this.initCache();
    this.logger.info('Caches initialized');

    // Create the FHIR client before building the global FHIR context so that
    // downstream components (e.g. terminology runtime) can reuse it.
    if (!SERVER_STATELESS && !this.fhirClient) {
      this.fhirClient = this.createFhirClient();
    }

    await this.initializeGlobalFhirContext();
    this.logger.info('Global FHIR context initialized');

    if (SERVER_STATELESS) {
      this.logger.info('Running in stateless mode');
      return;
    }

    this.logger.info(`Loading FUME resources from FHIR server ${FHIR_SERVER_BASE} into cache...`);

    this.mappingProvider = new FumeMappingProvider({
      fhirClient: this.fhirClient,
      logger: this.logger
    });

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
    let fhirServerBase: string | undefined = config.FHIR_SERVER_BASE ? config.FHIR_SERVER_BASE.trim() : undefined;
    let isStatelessMode: boolean | undefined = config.SERVER_STATELESS;

    if (!fhirServerBase || fhirServerBase === '' || isStatelessMode) {
      fhirServerBase = '';
      isStatelessMode = true;
    } else {
      isStatelessMode = false;
    }

    this.config = {
      ...defaultConfig,
      ...config,
      FHIR_SERVER_BASE: fhirServerBase,
      SERVER_STATELESS: isStatelessMode
    } as IConfig;
  }

  private initCache () {
    const cacheKeys: IAppCacheKeys[] = [
      'compiledExpressions',
      'compiledMappings'
    ];

    const cache = cacheKeys
      .map((key) => {
        const CacheClass = this.cacheConfig[key]?.cacheClass || SimpleCache;
        const cacheClassOptions = this.cacheConfig[key]?.cacheClassOptions || {};
        return new CacheClass(cacheClassOptions);
      })
      .reduce((acc, cacheInstance, index) => {
        acc[cacheKeys[index]] = cacheInstance as ICache<unknown>;
        return acc;
      }, {} as Record<string, ICache<unknown>>);

    this.cache = cache as unknown as IAppCache;
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
      PREBUILD_SNAPSHOTS
    } = this.config;

    const cacheMode = PREBUILD_SNAPSHOTS ? 'ensure' : 'lazy';

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
      fhirClient: this.fhirClient
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
      fhirClient: this.fhirClient
    };
  }

  private async compileExpression (expression: string): Promise<FumifierCompiled> {
    const { compiledExpressions } = this.getCache();
    let compiled = compiledExpressions.get(expression);

    if (!compiled) {
      const options = await this.getFumifierOptions();
      compiled = await fumifier(expression, options);
      compiled.setLogger(this.logger as unknown as Logger);
      compiledExpressions.set(expression, compiled);
    }

    return compiled;
  }

  public async transform (input: unknown, expression: string, extraBindings: Record<string, IAppBinding> = {}) {
    try {
      this.logger.info('Running transformation...');

      const expr = await this.compileExpression(expression);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
      let bindings: Record<string, unknown> = {};

      const converter = this.getOrCreateFormatConverter();
      bindings.parseCsv = converter.csvToJson.bind(converter);
      bindings.v2json = converter.hl7v2ToJson.bind(converter);

      if (this.mappingProvider) {
        const aliases = this.mappingProvider.getAliases();
        bindings = {
          ...aliases,
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

  // Saves a mapping's compiled function in cache, keyed by expression
  public cacheMapping (mappingExpr: string) {
    const cache = this.getCache();

    if (!cache.compiledMappings.get(mappingExpr)) {
      const mappingFunc = async (input: unknown, bindings?: Record<string, unknown>) => {
        const res = await this.transform(input, mappingExpr, bindings ?? {});
        return res;
      };

      const cacheEntry: ICacheEntry = { function: mappingFunc };
      cache.compiledMappings.set(mappingExpr, cacheEntry);
    }
  }

  public async recacheFromServer (): Promise<boolean> {
    const serverConfig = this.config;
    if (serverConfig.SERVER_STATELESS) {
      this.logger.error('FUME running in stateless mode. Cannot recache from server.');
      return false;
    }

    if (!this.mappingProvider) {
      this.logger.error('Mapping provider not initialized. Cannot recache from server.');
      return false;
    }

    try {
      const { compiledMappings } = this.getCache();

      // Clear terminology ConceptMap cache so mappings that depend on server ConceptMaps
      // will re-resolve against fresh data after a recache.
      const terminologyRuntime = this.globalFhirContext.terminologyRuntime;
      if (terminologyRuntime) {
        const ftr = terminologyRuntime as unknown as {
          clearServerConceptMapsFromCache?: () => void | Promise<void>;
        };
        if (typeof ftr.clearServerConceptMapsFromCache === 'function') {
          await ftr.clearServerConceptMapsFromCache();
          this.logger.info('Cleared FHIR terminology ConceptMap cache.');
        }
      }

      await this.mappingProvider.reloadAliases();
      const aliasKeys = Object.keys(this.mappingProvider.getAliases());
      if (aliasKeys.length > 0) {
        this.logger.info(`Updated cache with aliases: ${aliasKeys.join(', ')}.`);
      }

      await this.mappingProvider.reloadUserMappings();
      const userMappings = this.mappingProvider.getUserMappings();

      compiledMappings.reset();
      userMappings.forEach((mapping) => {
        this.cacheMapping(mapping.expression);
      });

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

// Preserve the type for downstream compatibility if anything imported it previously.
export type { PackageManifest } from 'fhir-package-installer';

// Preserve the type for downstream compatibility if anything imported it previously.
export type { ICacheEntry };
