import { v2parse } from './v2parse';
import { test } from '@jest/globals';

describe('v2parse', () => {
    test('parses message',  async () => {
        const res = await v2parse('MSH|^~\\&|1|2|3|4');
        const segment = (res as any).segments[0];
        expect(segment.fields[0].value).toBe('MSH');
        expect(segment.sendingApplication).toBe('1');
    });
});