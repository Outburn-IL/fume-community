/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import type { FhirClient } from '@outburn/fhir-client';
import type { FumeMappingProvider } from '@outburn/fume-mapping-provider';
import type { Logger } from '@outburn/types';
import type { FumifierCompiled } from 'fumifier';

import type { ICache } from './Cache';
import type { IConfig } from './Config';
export type IAppBinding = unknown;

/**
 * Transport-agnostic engine interface.
 * Implemented by {@link FumeEngine}.
 */
export interface IFumeEngine<ConfigType extends IConfig = IConfig> {
  registerLogger: (logger: Logger) => void;

  setCompiledExpressionCache: (cache: ICache<FumifierCompiled>) => void;

  registerBinding: (key: string, binding: IAppBinding) => void;
  getBindings: () => Record<string, IAppBinding>;

  setConfig: (config: Partial<ConfigType>) => void;
  getConfig: () => ConfigType;

  warmUp: (options?: ConfigType) => Promise<void>;

  getFhirClient: () => FhirClient;
  getMappingProvider: () => FumeMappingProvider;

  convertInputToJson: (input: unknown, contentType?: string) => Promise<unknown>;
  transform: (input: unknown, expression: string, extraBindings?: Record<string, IAppBinding>) => Promise<unknown>;
}
