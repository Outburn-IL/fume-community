/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import type { FhirClient } from '@outburn/fhir-client';
import type { FumeMappingProvider } from '@outburn/fume-mapping-provider';
import type { Logger } from '@outburn/types';
import type { FumifierOptions } from 'fumifier';

import type { IConfig } from './Config';
import type { EvaluateVerboseReport } from './VerboseReport';
export type IAppBinding = unknown;

/**
 * Transport-agnostic engine interface.
 * Implemented by {@link FumeEngine}.
 */
export interface IFumeEngine<ConfigType extends IConfig = IConfig> {
  registerLogger: (logger: Logger) => void;

  setAstCache: (cache: NonNullable<FumifierOptions['astCache']>) => void;

  registerBinding: (key: string, binding: IAppBinding) => void;
  getBindings: () => Record<string, IAppBinding>;

  setConfig: (config: Partial<ConfigType>) => void;
  getConfig: () => ConfigType;

  warmUp: (options?: ConfigType) => Promise<void>;

  getFhirClient: () => FhirClient;
  getMappingProvider: () => FumeMappingProvider;

  convertInputToJson: (input: unknown, contentType?: string) => Promise<unknown>;

  /**
   * Evaluate a mapping and return a full verbose report.
   *
   * `extraBindings` are merged *after* the engine's global bindings and therefore override them.
   * This is the supported way for JS/module consumers to override fumifier policy thresholds per call:
   * - `throwLevel`
   * - `logLevel`
   * - `collectLevel`
   * - `validationLevel`
   *
   * Note: the HTTP API does not currently allow arbitrary bindings to be provided by clients.
   */
  transformVerbose: (input: unknown, expression: string, extraBindings?: Record<string, IAppBinding>) => Promise<EvaluateVerboseReport>;

  /**
   * Evaluate a mapping and return only the transformed result (throws on fatal/unhandled failures).
   *
   * See `transformVerbose` for how `extraBindings` overrides global bindings (including threshold overrides).
   */
  transform: (input: unknown, expression: string, extraBindings?: Record<string, IAppBinding>) => Promise<unknown>;
}
