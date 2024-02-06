import { v2tableUrl } from './v2tableUrl';

import { test } from '@jest/globals';

describe('v2codeLookup', () => {
    test('gets link for existing table',  async () => {
        const res = await v2tableUrl(761);
        expect(res).toBe('http://terminology.hl7.org/CodeSystem/v2-0761');
    });

    test('gets undefined for non existing table',  async () => {
        const res = await v2tableUrl(7611);
        expect(res).toBe(undefined);
    });
});