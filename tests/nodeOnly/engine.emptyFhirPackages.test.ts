/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import { describe, expect, test } from '@jest/globals';

import { FumeEngine } from '../../src/engine';

describe('FumeEngine - empty FHIR_PACKAGES', () => {
  test('Initializes global FHIR context when FHIR_PACKAGES is unset', async () => {
    const engine = await FumeEngine.create({
      config: {
        FHIR_PACKAGE_CACHE_DIR: 'tests/.fhir-packages'
      } as any
    });

    expect(engine.getGlobalFhirContext().isInitialized).toBe(true);
    const contextPackages = engine.getContextPackages();
    expect(contextPackages.length).toBeGreaterThan(0);
    expect(contextPackages.every((p) => typeof p.id === 'string' && p.id.trim().length > 0)).toBe(true);
    expect(contextPackages.some((p) => p.id === 'hl7.fhir.r4.core')).toBe(true);
  });

  test('Ignores whitespace/empty entries in FHIR_PACKAGES', async () => {
    const engine = await FumeEngine.create({
      config: {
        FHIR_PACKAGES: ' ,  ,\n\t ,',
        FHIR_PACKAGE_CACHE_DIR: 'tests/.fhir-packages'
      } as any
    });

    expect(engine.getGlobalFhirContext().isInitialized).toBe(true);
    const contextPackages = engine.getContextPackages();
    expect(contextPackages.length).toBeGreaterThan(0);
    expect(contextPackages.every((p) => typeof p.id === 'string' && p.id.trim().length > 0)).toBe(true);
    expect(contextPackages.some((p) => p.id === 'hl7.fhir.r4.core')).toBe(true);
  });
});
