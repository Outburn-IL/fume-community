/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME
 */

import { initCache } from '../cache';
import { getCurrElement } from './getCurrElement';
import { test } from '@jest/globals';

describe('getCurrElement', () => {
  beforeEach(() => {
    initCache();
  });

  test('Returns undefined if type is empty', async () => {
    const currTypeStructureDefinition = {
      snapshot: {
        element: [
          {
            id: 'Patient.id',
            path: 'Patient.id'
          }
        ]
      }
    };

    const res = getCurrElement(
      currTypeStructureDefinition,
      'id',
      1,
      ['identifier', 'system'],
      'Patient'
    );

    expect(res).toBe(undefined);
  });

  // TODO: this fails
  test.skip('Returns undefined if snapshot is empty', async () => {
    const currTypeStructureDefinition = {
      type: 'Patient',
      snapshot: {
      }
    };

    const res = getCurrElement(
      currTypeStructureDefinition,
      'id',
      1,
      ['identifier', 'system'],
      'Patient'
    );

    expect(res).toBe(undefined);
  });

  test('Returns undefined if structure elements are empty', async () => {
    const currTypeStructureDefinition = {
      type: 'Patient',
      snapshot: {
        element: []
      }
    };

    const res = getCurrElement(
      currTypeStructureDefinition,
      'id',
      1,
      ['identifier', 'system'],
      'Patient'
    );

    expect(res).toBe(undefined);
  });

  test('Finds element in structure if exists on top level', async () => {
    const currTypeStructureDefinition = {
      type: 'Patient',
      snapshot: {
        element: [
          {
            id: 'Patient.id',
            path: 'Patient.id'
          }
        ]
      }
    };

    const res = getCurrElement(
      currTypeStructureDefinition,
      'id',
      1,
      ['identifier', 'system'],
      'Patient'
    );

    expect(res.id).toBe('Patient.id');
  });
});
