/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
import { test } from '@jest/globals';

import { fhirVersionToMinor } from './fhirVersionToMinor';

describe('fhirVersionToMinor', () => {
  test('with patch', async () => {
    expect(fhirVersionToMinor('1.2.3')).toBe('1.2');
  });

  test('without patch', async () => {
    expect(fhirVersionToMinor('1.2')).toBe('1.2');
  });
});
